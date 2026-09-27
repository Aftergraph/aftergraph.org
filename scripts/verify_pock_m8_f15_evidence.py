#!/usr/bin/env python3
"""Fail-closed verifier for the F15 integrity bundle (does not independently reproduce the boot)."""
import argparse
import binascii
import hashlib
import json
from pathlib import Path
import re
import struct
import zlib

EXPECTED_DRIVER_BLOB = "a950444cfa1d6f0d7afb085170666918cc3e95bc"
EXPECTED_PACKAGER_BLOB = "c8547500a7c45918bd93bb670e37709985f9c40e"
EXPECTED_PINNED = {
    "f11Patch": "f22ece3e4563efc6b7cc0ad772d912ee3484364381d9b1f425277108aa1f964b",
    "f13Patch": "8881a0822205ed218a33a9ed8bb3579993bc1fc25000568a92406adb78bc1bd9",
    "f14Patch": "4990402199536a0228364ee930c93a06b0b9e788e17372be2abdbc38c7fcab6e",
    "f15Patch": "17e85c05d2b8130dd6c90d35076748544bdbb4d8a7047c4c57334d46e1e6f94b",
    "archive": "1017465270d11f99f55eb540061ce902589b45c56be7a03308db19f80d937122",
    "browser": "60c03e8882f4bb47459a905ede1074e1e746c5b765e437c288e460320540a8a3",
    "kernel": "9204218e8bcca6ac23848d74f45df2eb19d7f31e8277840a7d145a0df8b078d2",
    "firecracker": "99ad0f5cd0514a88aad0e9ae8cfdb3cc3b4ab9d190e1194602406c786b5de7a5",
    "jailer": "65ef226e96f0ceda55ba643f445801ef2cc0ea667ef67cad8ac4f406c9c8434f",
}
EXPECTED_TESTS = {
    "test_v23_f15_pointer_input.py": 13,
    "test_v23_f14_guest_takeover_bridge.py": 9,
    "test_v23_f13_guest_browser.py": 34,
    "test_v23_f12_guest_effect_truth.py": 4,
}
CORE_FILES = {"f15-result.json", "serial.log", "run-summary.json", "f15-driver.py"}
BROWSER_FILES = {"browser-evidence/before.png", "browser-evidence/after.png",
                 "browser-evidence/receipt.json", "browser-evidence/READY.json"}
FILES = CORE_FILES | BROWSER_FILES
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
MAX_PNG_BYTES = 8 * 1024 * 1024
MAX_RECEIPT_BYTES = 24 * 1024 * 1024
MAX_READY_BYTES = 64 * 1024


def fail(reason):
    raise SystemExit("F15_EVIDENCE_VERIFY_FAIL " + reason)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def obj(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        fail("json_root_invalid:" + path.name)
    return value


def decode_png_rgba(data):
    """Small, strict PNG decoder using only the standard library."""
    if len(data) > MAX_PNG_BYTES or not data.startswith(PNG_SIGNATURE):
        raise ValueError("png_envelope_invalid")
    offset = len(PNG_SIGNATURE)
    ihdr = None
    idat = []
    seen_iend = False
    idat_ended = False
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError("png_chunk_truncated")
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + length
        if end > len(data):
            raise ValueError("png_chunk_length_invalid")
        chunk = data[offset + 8:offset + 8 + length]
        crc = struct.unpack_from(">I", data, offset + 8 + length)[0]
        if (binascii.crc32(kind + chunk) & 0xffffffff) != crc:
            raise ValueError("png_chunk_crc_invalid")
        if kind == b"IHDR":
            if ihdr is not None or offset != len(PNG_SIGNATURE) or length != 13:
                raise ValueError("png_ihdr_invalid")
            ihdr = struct.unpack(">IIBBBBB", chunk)
        elif kind == b"IDAT":
            if idat_ended or ihdr is None:
                raise ValueError("png_idat_order_invalid")
            idat.append(chunk)
        elif kind == b"IEND":
            if length != 0 or seen_iend:
                raise ValueError("png_iend_invalid")
            seen_iend = True
            offset = end
            break
        else:
            if idat:
                idat_ended = True
            if kind[0] & 0x20 == 0:
                raise ValueError("png_critical_chunk_unsupported")
        if kind != b"IDAT" and idat:
            idat_ended = True
        offset = end
    if not seen_iend or offset != len(data) or ihdr is None or not idat:
        raise ValueError("png_structure_invalid")
    width, height, depth, color, compression, filtering, interlace = ihdr
    if (width != 800 or height != 600 or depth != 8 or color not in (2, 6)
            or compression != 0 or filtering != 0 or interlace != 0):
        raise ValueError("png_format_unsupported")
    channels = 4 if color == 6 else 3
    bpp = channels
    row_bytes = width * channels
    expected_decoded_size = height * (row_bytes + 1)
    decompressor = zlib.decompressobj()
    # Limit output at the decoder itself: DEFLATE can expand far beyond the
    # bounded input size, and flush() has no output cap.
    decoded = decompressor.decompress(b"".join(idat), expected_decoded_size + 1)
    if (len(decoded) != expected_decoded_size or not decompressor.eof
            or decompressor.unused_data or decompressor.unconsumed_tail):
        raise ValueError("png_pixel_data_length_invalid")
    rgba = bytearray(width * height * 4)
    previous = bytearray(row_bytes)
    source_offset = 0
    output_offset = 0
    for _y in range(height):
        filter_type = decoded[source_offset]
        source_offset += 1
        scanline = decoded[source_offset:source_offset + row_bytes]
        source_offset += row_bytes
        row = bytearray(row_bytes)
        for i, value in enumerate(scanline):
            left = row[i - bpp] if i >= bpp else 0
            up = previous[i]
            upper_left = previous[i - bpp] if i >= bpp else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = up
            elif filter_type == 3:
                predictor = (left + up) // 2
            elif filter_type == 4:
                p = left + up - upper_left
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - upper_left)
                predictor = left if pa <= pb and pa <= pc else up if pb <= pc else upper_left
            else:
                raise ValueError("png_filter_unsupported")
            row[i] = (value + predictor) & 0xff
        if color == 6:
            rgba[output_offset:output_offset + width * 4] = row
            output_offset += width * 4
        else:
            for i in range(0, row_bytes, 3):
                rgba[output_offset:output_offset + 4] = bytes((row[i], row[i + 1], row[i + 2], 255))
                output_offset += 4
        previous = row
    return width, height, bytes(rgba)


def analyze_frame_pair(before, after):
    width, height, before_pixels = decode_png_rgba(before)
    after_width, after_height, after_pixels = decode_png_rgba(after)
    if (after_width, after_height) != (width, height):
        raise ValueError("frame_dimensions_differ")
    changed = 0
    in_fixture_region = 0
    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        row_start = y * width * 4
        for x in range(width):
            i = row_start + x * 4
            if before_pixels[i:i + 4] != after_pixels[i:i + 4]:
                changed += 1
                if x < 600 and y < 300:
                    in_fixture_region += 1
                min_x, min_y = min(min_x, x), min(min_y, y)
                max_x, max_y = max(max_x, x), max(max_y, y)
    if changed == 0 or in_fixture_region == 0 or changed > width * height // 20:
        raise ValueError("frame_pixel_change_outside_expected_bounds")
    return {"width": width, "height": height, "changedPixels": changed,
            "changedPixelRatio": round(changed / (width * height), 8),
            "fixtureRegionChangedPixels": in_fixture_region,
            "changedBounds": [min_x, min_y, max_x, max_y]}


def verify_browser_frame_bundle(root, result):
    evidence_dir = root / "browser-evidence"
    if evidence_dir.is_symlink() or not evidence_dir.is_dir():
        fail("browser_evidence_directory_invalid")
    expected = {"before.png", "after.png", "receipt.json", "READY.json"}
    entries = list(evidence_dir.iterdir())
    if ({p.name for p in entries} != expected or any(p.is_symlink() or not p.is_file() for p in entries)):
        fail("browser_evidence_file_set_invalid")
    size_limits = {"before.png": MAX_PNG_BYTES, "after.png": MAX_PNG_BYTES,
                   "receipt.json": MAX_RECEIPT_BYTES, "READY.json": MAX_READY_BYTES}
    if any((evidence_dir / name).stat().st_size > limit for name, limit in size_limits.items()):
        fail("browser_evidence_size_limit")
    ready_bytes = (evidence_dir / "READY.json").read_bytes()
    receipt_bytes = (evidence_dir / "receipt.json").read_bytes()
    ready = obj(evidence_dir / "READY.json")
    receipt = obj(evidence_dir / "receipt.json")
    probe = ((result.get("f13Run") or {}).get("guestBrowserProbe") or {})
    proof = ((result.get("f13Run") or {}).get("executionProof") or {})
    if ready.get("contract") != "GuestBrowserArtifactSet/v1":
        fail("browser_evidence_contract_invalid")
    if ready.get("receiptSha256") != hashlib.sha256(receipt_bytes).hexdigest():
        fail("browser_receipt_digest_invalid")
    if ready.get("receiptSha256") != probe.get("receiptSha256"):
        fail("browser_receipt_result_binding_invalid")
    if (receipt.get("contract") != "GuestBrowserProbeReceipt/v1"
            or receipt.get("bindingHash") != probe.get("bindingHash")
            or receipt.get("executionProofHash") != proof.get("proofHash")
            or receipt.get("executionProofHash") != probe.get("executionProofHash")):
        fail("browser_receipt_execution_binding_invalid")
    observation = receipt.get("observation", {})
    if (observation.get("contract") != "GuestBrowserObservation/v1"
            or observation.get("browserSource") != "GUEST_LOCAL_CHROMIUM_CDP"
            or observation.get("browserBinarySha256") != EXPECTED_PINNED["browser"]
            or observation.get("inputMethod") != "CDP_INPUT_DISPATCH_MOUSE_EVENT"
            or observation.get("inputEffectObservedInGuestBrowser") is not True
            or observation.get("independentObservation") is not False
            or observation.get("humanTakeover") is not False
            or observation.get("hardwareAttestation") != "BLOCKED"):
        fail("browser_receipt_claim_boundary_invalid")
    phases = observation.get("before"), observation.get("after")
    if any(not isinstance(phase, dict) for phase in phases):
        fail("browser_receipt_phase_invalid")
    if (phases[0].get("counter") != "0" or phases[1].get("counter") != "1"
            or observation.get("fixtureSha256") != probe.get("fixtureSha256")):
        fail("browser_receipt_state_transition_invalid")
    before = (evidence_dir / "before.png").read_bytes()
    after = (evidence_dir / "after.png").read_bytes()
    before_sha, after_sha = sha(evidence_dir / "before.png"), sha(evidence_dir / "after.png")
    if (before_sha != ready.get("beforeFrameSha256") or before_sha != probe.get("beforeFrameSha256")
            or before_sha != phases[0].get("frameSha256")
            or after_sha != ready.get("afterFrameSha256") or after_sha != probe.get("afterFrameSha256")
            or after_sha != phases[1].get("frameSha256")):
        fail("browser_frame_digest_binding_invalid")
    ack = ((result.get("guestBrowser") or {}).get("guestInputAck") or {})
    if (ack.get("contract") != "HabitatGuestInputAck/v1" or ack.get("applied") is not True
            or ack.get("afterFrameSha256") != after_sha
            or ack.get("inputEventDigest") != (result.get("guestBrowser") or {}).get("inputEventDigest")):
        fail("browser_frame_pointer_ack_binding_invalid")
    try:
        metrics = analyze_frame_pair(before, after)
    except ValueError as exc:
        fail("browser_frame_analysis_failed:" + str(exc))
    return {"status": "INDEPENDENT_PIXEL_ANALYSIS_PASS", "captureMethod": probe.get("frameCaptureMethod"),
            "beforeFrameSha256": before_sha, "afterFrameSha256": after_sha,
            "guestReceiptMacIndependentlyVerified": False,
            "controlInputAckMacIndependentlyVerified": False,
            "pixelDeltaBoundToPointerCoordinate": False,
            "guestFrameSourceIndependentlyAuthenticated": False,
            **metrics}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--bundle-dir", required=True)
    p.add_argument("--workflow-sha", required=True)
    p.add_argument("--run-id", required=True)
    p.add_argument("--run-attempt", required=True)
    a = p.parse_args()
    root = Path(a.bundle_dir)
    if root.is_symlink() or not root.is_dir():
        fail("bundle_root_invalid")
    mp = root / "f15-evidence-manifest.json"
    sc = (root / "f15-evidence-manifest.sha256").read_text(encoding="ascii").strip()
    m = re.fullmatch(r"([0-9a-f]{64})  f15-evidence-manifest\.json", sc)
    if not m or m.group(1) != sha(mp):
        fail("manifest_sidecar_mismatch")
    manifest = obj(mp)
    if manifest.get("contract") != "PockM8F15EvidenceBundle/v2" or manifest.get("packageStatus") != "COMPLETE":
        fail("package_not_complete")
    rows = manifest.get("files", {})
    if set(rows) != FILES:
        fail("bundle_file_set_invalid")
    actual = {x.relative_to(root).as_posix() for x in root.rglob("*") if x.is_file()}
    directories = {x.relative_to(root).as_posix() for x in root.rglob("*") if x.is_dir()}
    if actual != FILES | {mp.name, "f15-evidence-manifest.sha256"} or directories != {"browser-evidence"}:
        fail("unexpected_or_missing_file")
    for name, row in rows.items():
        path = root / name
        if (path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != root.parent)
                or not path.is_file() or row.get("sizeBytes") != path.stat().st_size
                or row.get("sha256") != sha(path)):
            fail("file_digest_mismatch:" + name)

    workflow = manifest.get("workflow", {})
    if workflow.get("workflowCommitSha") != a.workflow_sha:
        fail("workflow_commit_mismatch")
    if str(workflow.get("runId")) != a.run_id or str(workflow.get("runAttempt")) != a.run_attempt:
        fail("run_identity_mismatch")
    pins = workflow.get("sourcePins", {})
    for name, expected in EXPECTED_PINNED.items():
        if pins.get(name, {}).get("sha256") != expected:
            fail("source_pin_mismatch:" + name)
    if sha(root / "f15-driver.py") != pins.get("driver", {}).get("sha256"):
        fail("driver_file_digest_mismatch")
    if pins.get("driver", {}).get("gitBlobSha1") != EXPECTED_DRIVER_BLOB:
        fail("driver_blob_mismatch")
    if pins.get("packager", {}).get("gitBlobSha1") != EXPECTED_PACKAGER_BLOB:
        fail("packager_blob_mismatch")

    summary = obj(root / "run-summary.json")
    if summary.get("contract") != "PockM8F15EvidenceRunSummary/v2" or summary.get("workflowCommitSha") != a.workflow_sha:
        fail("summary_commit_mismatch")
    checks = summary.get("checks", {})
    if checks.get("driverExitCode") != 0 or checks.get("driverGatePass") is not True:
        fail("driver_failed")
    if checks.get("allExpectedTestsPass") is not True or checks.get("allExpectedSuitesPresent") is not True:
        fail("suite_failure")
    for name, count in EXPECTED_TESTS.items():
        row = checks.get("testSuites", {}).get(name, {})
        if row.get("exitCode") != 0 or row.get("passed") != count or row.get("total") != count:
            fail("test_count_mismatch:" + name)
    for key in ("compileExitCode", "image_buildExitCode", "e2fsckExitCode", "host_runExitCode"):
        if checks.get(key) != 0:
            fail("step_failed:" + key)
    if summary.get("guestImage", {}).get("matchesBuilder") is not True or summary.get("guestImage", {}).get("matchesResult") is not True:
        fail("image_digest_mismatch")
    result = obj(root / "f15-result.json")
    if result.get("contract") != "PockM8F15PointerInputRun/v1":
        fail("result_contract_invalid")
    if result.get("truthStatus") != "PRINCIPAL_F15_AUTHENTICATED_POINTER_APPLIED_ACKNOWLEDGED" or result.get("failure") is not None:
        fail("result_status_invalid")
    proof = result.get("executionProof", {})
    if proof.get("truthStatus") != "REAL_LOCAL_EXERCISED" or not re.fullmatch(r"[0-9a-f]{64}", str(proof.get("proofHash", ""))):
        fail("execution_proof_invalid")
    if result.get("interactiveBinding", {}).get("truthStatus") != "REAL_GUEST_VSOCK_BINDING_ONLY":
        fail("vsock_boundary_invalid")
    guest_probe = (result.get("f13Run") or {}).get("guestBrowserProbe") or {}
    capture_method = guest_probe.get("frameCaptureMethod")
    if capture_method not in {"CDP_PAGE_SCREENCAST", "CDP_PAGE_CAPTURESCREENSHOT_FALLBACK"}:
        fail("browser_frame_capture_method_invalid")
    browser = result.get("guestBrowser", {})
    ack = browser.get("guestInputAck", {})
    control = browser.get("controlPlaneInputAck", {})
    if browser.get("truthStatus") != "REAL_GUEST_BROWSER_SOFTWARE_OBSERVED":
        fail("browser_status_invalid")
    if not (ack.get("contract") == "HabitatGuestInputAck/v1" and ack.get("applied") is True
            and ack.get("x") == 50 and ack.get("y") == 50
            and re.fullmatch(r"[0-9a-f]{64}", str(ack.get("afterFrameSha256", "")))):
        fail("guest_ack_invalid")
    if not (control.get("status") == "applied"
            and control.get("independentInputEffectObservation") is False
            and control.get("eventDigest") == browser.get("inputEventDigest")
            and ack.get("inputEventDigest") == browser.get("inputEventDigest")
            and re.fullmatch(r"[0-9a-f]{64}", str(ack.get("ackMac", "")))):
        fail("control_ack_boundary_invalid")
    if result.get("pointer") != {"x": 50, "y": 50}:
        fail("pointer_invalid")
    frame_analysis = verify_browser_frame_bundle(root, result)
    browser_summary = summary.get("browserEvidence", {})
    if (browser_summary.get("present") is not True or browser_summary.get("matchesResult") is not True
            or browser_summary.get("fileCount") != 4
            or browser_summary.get("captureMethod") != frame_analysis.get("captureMethod")):
        fail("browser_evidence_summary_invalid")
    shutdown = result.get("shutdown", {})
    if shutdown.get("request") != "SEND_CTRL_ALT_DEL_ACCEPTED" or shutdown.get("vmmExited") is not True:
        fail("shutdown_invalid")
    serial = (root / "serial.log").read_bytes()
    evidence = result.get("serialEvidence", {})
    if not (evidence.get("verified") is True and evidence.get("kernelMarker") is True
            and evidence.get("initMarker") is True and evidence.get("panicMarker") is False
            and evidence.get("sizeBytes") == len(serial) and evidence.get("sha256") == hashlib.sha256(serial).hexdigest()):
        fail("serial_binding_invalid")
    if b"Kernel panic" in serial or b"Linux version 6.18.48" not in serial:
        fail("serial_marker_invalid")
    if result.get("rootfsSha256") != manifest.get("guestImage", {}).get("sha256"):
        fail("result_image_sha256_mismatch")
    boundary = manifest.get("resultBoundary", {})
    if not (boundary.get("guestBrowserFramesIncluded") is True
            and boundary.get("independentFrameAnalysis") is False
            and boundary.get("independentInputEffectObservation") is False
            and boundary.get("guestReceiptMacIndependentlyVerified") is False
            and boundary.get("controlInputAckMacIndependentlyVerified") is False
            and boundary.get("pixelDeltaBoundToPointerCoordinate") is False
            and boundary.get("guestFrameSourceIndependentlyAuthenticated") is False
            and boundary.get("hardwareAttestation") == "BLOCKED"
            and boundary.get("canonicalHabitatMicroVMExecutionProof") is False):
        fail("overclaimed_boundary")
    report = {
        "contract": "PockM8F15ArtifactIntegrityVerification/v2",
        "status": "F15_ARTIFACT_AND_FRAME_ANALYSIS_VERIFIED",
        "workflowCommitSha": a.workflow_sha,
        "runId": a.run_id,
        "runAttempt": a.run_attempt,
        "manifestSha256": sha(mp),
        "resultSha256": sha(root / "f15-result.json"),
        "frameCaptureMethod": capture_method,
        "independentFrameAnalysis": frame_analysis,
        "serialSha256": sha(root / "serial.log"),
        "scope": "artifact integrity and independent pixel analysis of guest-provided frames; no independent boot or pointer-device observation",
        "verificationLimits": {
            "guestReceiptMacIndependentlyVerified": False,
            "controlInputAckMacIndependentlyVerified": False,
            "pixelDeltaBoundToPointerCoordinate": False,
            "guestFrameSourceIndependentlyAuthenticated": False,
        },
        "notEstablished": ["independent real-boot reproduction",
                           "independent pointer-device observation",
                           "cryptographic verification of guest receipt or input acknowledgment MACs",
                           "causal linkage between pointer coordinates and changed frame pixels",
                           "independent authentication of guest frame acquisition",
                           "current guest-tree manifest recomputation",
                           "hardware attestation",
                           "canonical HabitatMicroVMExecutionProof/v1"],
    }
    (root / "verification-report.json").write_text(json.dumps(report, sort_keys=True, indent=2) + "\n",
                                                   encoding="utf-8", newline="\n")
    print("F15_ARTIFACT_INTEGRITY_PASS status=" + report["status"])
    print("F15_FRAME_ANALYSIS_PASS changedPixels=" + str(frame_analysis["changedPixels"])
          + " fixtureRegionChangedPixels=" + str(frame_analysis["fixtureRegionChangedPixels"]))
    print("F15_TRUTH_BOUNDARY independentBoot=NOT_ESTABLISHED independentPointerDevice=NOT_ESTABLISHED independentFrameAnalysis=PASS hardwareAttestation=BLOCKED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
