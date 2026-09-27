#!/usr/bin/env python3
"""Create a small, sanitized F15 evidence bundle; never export private source patches or raw driver logs."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

EXPECTED_TESTS = {
    "test_v23_f15_pointer_input.py": 13,
    "test_v23_f14_guest_takeover_bridge.py": 9,
    "test_v23_f13_guest_browser.py": 34,
    "test_v23_f12_guest_effect_truth.py": 4,
}
EXECUTION_ID = re.compile(r"[0-9]{1,20}-[1-9][0-9]{0,5}\Z")
MAX_PNG_BYTES = 8 * 1024 * 1024
MAX_RECEIPT_BYTES = 24 * 1024 * 1024
MAX_READY_BYTES = 64 * 1024
SENSITIVE_TEXT = re.compile(
    r"(?i)(session[_-]?key|lease[_-]?token|takeover[_-]?token|response[_-]?key|"
    r"authorization\s*:\s*bearer|password\s*[:=]|api[_-]?key\s*[:=])"
)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def path_has_symlink(path):
    """Reject symlinks anywhere in a supplied path, including its parents."""
    path = Path(path)
    return any(part.is_symlink() for part in (path, *path.parents))


def regular_file_without_symlinks(path):
    path = Path(path)
    return not path_has_symlink(path) and path.is_file()


def parse_checks(log, exit_code):
    rows = {}
    marks = list(re.finditer(r"(?m)^F15_TEST (\S+) rc=(-?\d+)\s*$", log))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(log)
        chunk = log[m.end():end]
        result = re.findall(r"(?m)^RESULT (\d+)/(\d+) PASS\s*$", chunk)
        ran = re.search(r"(?m)^Ran (\d+) tests? in ", chunk)
        unit_ok = re.search(r"(?m)^OK\s*$", chunk) is not None
        passed = int(result[-1][0]) if result else (int(ran.group(1)) if ran and unit_ok else None)
        total = int(result[-1][1]) if result else (int(ran.group(1)) if ran else None)
        rows[m.group(1)] = {
            "exitCode": int(m.group(2)),
            "passed": passed,
            "total": total,
        }
    checks = {"driverExitCode": exit_code, "driverGatePass": "F15_GATE_PASS" in log,
              "testSuites": rows}
    checks["allExpectedTestsPass"] = all(
        rows.get(name, {}).get("exitCode") == 0
        and rows.get(name, {}).get("passed") == count
        and rows.get(name, {}).get("total") == count
        for name, count in EXPECTED_TESTS.items())
    checks["allExpectedSuitesPresent"] = set(rows) == set(EXPECTED_TESTS)
    for label in ("COMPILE", "IMAGE_BUILD", "E2FSCK", "HOST_RUN"):
        m = re.search(rf"(?m)^F15_{label} rc=(-?\d+)\s*$", log)
        checks[label.lower() + "ExitCode"] = int(m.group(1)) if m else None
    return checks


def json_after(log, marker):
    lines = log.splitlines()
    for i, line in enumerate(lines):
        if line.startswith(marker):
            for candidate in lines[i + 1:i + 8]:
                try:
                    value = json.loads(candidate.strip())
                    if isinstance(value, dict):
                        return value
                except Exception:
                    pass
    return None


def secret_key_found(value):
    if isinstance(value, dict):
        for key, child in value.items():
            k = re.sub(r"[^a-z]", "", str(key).lower())
            if "secret" in k or "password" in k or k.endswith("token") or "responsekey" in k:
                return True
            if secret_key_found(child):
                return True
    if isinstance(value, list):
        return any(secret_key_found(x) for x in value)
    return False


def write_json(path, value):
    path.write_text(json.dumps(value, sort_keys=True, indent=2) + "\n", encoding="utf-8", newline="\n")


def collect_browser_artifacts(run_dir, result, bundle):
    """Copy the host-persisted PNGs and receipt only from this execution's fixed output path."""
    probe = ((result or {}).get("f13Run") or {}).get("guestBrowserProbe") or {}
    expected = run_dir / "browser-evidence"
    reported = probe.get("artifactsPath")
    names = ("before.png", "after.png", "receipt.json", "READY.json")
    if (path_has_symlink(run_dir) or not run_dir.is_dir() or path_has_symlink(expected)
            or not expected.is_dir() or reported != str(expected)):
        return {"present": False, "matchesResult": False, "fileCount": 0,
                "failureReason": "browser_artifact_path_invalid"}, []
    entries = list(expected.iterdir())
    if {entry.name for entry in entries} != set(names) or any(
            path_has_symlink(entry) or not entry.is_file() for entry in entries):
        return {"present": False, "matchesResult": False, "fileCount": 0,
                "failureReason": "browser_artifact_file_set_invalid"}, []
    size_limits = {"before.png": MAX_PNG_BYTES, "after.png": MAX_PNG_BYTES,
                   "receipt.json": MAX_RECEIPT_BYTES, "READY.json": MAX_READY_BYTES}
    if any((expected / name).stat().st_size > limit for name, limit in size_limits.items()):
        return {"present": True, "matchesResult": False, "fileCount": len(entries),
                "failureReason": "browser_artifact_size_limit"}, []
    binding_checks = {}
    try:
        frame_bytes = {name: (expected / name).read_bytes() for name in names}
        ready = json.loads(frame_bytes["READY.json"])
        receipt = json.loads(frame_bytes["receipt.json"])
        observation = receipt["observation"]
        receipt_text = frame_bytes["receipt.json"].decode("utf-8")
        binding_checks = {
            "ready_contract": ready.get("contract") == "GuestBrowserArtifactSet/v1",
            "receipt_top_level_shape": set(receipt) == {"contract", "bindingHash", "executionProofHash", "nonce",
                                                        "observation", "guestBrowserMac"},
            "observation_shape": set(observation) == {"contract", "browserSource", "browserBinarySha256", "fixtureSha256",
                                                      "before", "after", "inputMethod", "inputEffectObservedInGuestBrowser",
                                                      "independentObservation", "humanTakeover", "hardwareAttestation"},
            "phase_shape": all(set(observation[phase]) == {"counter", "frameSha256", "pngBase64"}
                               for phase in ("before", "after")),
            "observation_contract": observation.get("contract") == "GuestBrowserObservation/v1",
            "browser_source": observation.get("browserSource") == "GUEST_LOCAL_CHROMIUM_CDP",
            "input_method": observation.get("inputMethod") == "CDP_INPUT_DISPATCH_MOUSE_EVENT",
            "input_effect_flag": observation.get("inputEffectObservedInGuestBrowser") is True,
            "independent_observation_flag": observation.get("independentObservation") is False,
            "human_takeover_flag": observation.get("humanTakeover") is False,
            "hardware_attestation_flag": observation.get("hardwareAttestation") == "BLOCKED",
            "receipt_redacted": not secret_key_found(receipt) and not SENSITIVE_TEXT.search(receipt_text),
            "ready_before_hash_matches_file": ready.get("beforeFrameSha256") == digest(frame_bytes["before.png"]),
            "ready_after_hash_matches_file": ready.get("afterFrameSha256") == digest(frame_bytes["after.png"]),
            "ready_receipt_hash_matches_file": ready.get("receiptSha256") == digest(frame_bytes["receipt.json"]),
            "ready_receipt_hash_matches_result": ready.get("receiptSha256") == probe.get("receiptSha256"),
            "ready_before_hash_matches_result": ready.get("beforeFrameSha256") == probe.get("beforeFrameSha256"),
            "ready_after_hash_matches_result": ready.get("afterFrameSha256") == probe.get("afterFrameSha256"),
            "observation_before_hash_matches_ready": observation["before"]["frameSha256"] == ready.get("beforeFrameSha256"),
            "observation_after_hash_matches_ready": observation["after"]["frameSha256"] == ready.get("afterFrameSha256"),
            "before_counter": observation["before"]["counter"] == "0",
            "after_counter": observation["after"]["counter"] == "1",
        }
        matches = all(binding_checks.values())
    except (KeyError, TypeError, ValueError, json.JSONDecodeError, AttributeError):
        binding_checks = {"receipt_json_or_schema": False}
        matches = False
    if not matches:
        return {"present": True, "matchesResult": False, "fileCount": len(entries),
                "failureReason": "browser_artifact_binding_invalid",
                "failedChecks": sorted(k for k, ok in binding_checks.items() if not ok)}, []
    destination = bundle / "browser-evidence"
    destination.mkdir(mode=0o700)
    copied = []
    for name in names:
        target = destination / name
        target.write_bytes(frame_bytes[name])
        copied.append(target)
    return {"present": True, "matchesResult": True, "fileCount": len(copied),
            "captureMethod": probe.get("frameCaptureMethod")}, copied


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--metadata", required=True)
    p.add_argument("--bundle-dir", required=True)
    p.add_argument("--driver-log", required=True)
    p.add_argument("--driver-file", required=True)
    p.add_argument("--execution-id", required=True)
    p.add_argument("--driver-exit-code", required=True, type=int)
    a = p.parse_args()
    if not EXECUTION_ID.fullmatch(a.execution_id):
        raise SystemExit("F15_EVIDENCE_PACKAGE_FAIL execution_id_invalid")
    metadata_path = Path(a.metadata)
    log_path = Path(a.driver_log)
    driver_path = Path(a.driver_file)
    bundle = Path(a.bundle_dir)
    if (not regular_file_without_symlinks(metadata_path)
            or not regular_file_without_symlinks(log_path)
            or not regular_file_without_symlinks(driver_path)
            or path_has_symlink(bundle)):
        raise SystemExit("F15_EVIDENCE_PACKAGE_FAIL input_path_invalid")
    meta = json.loads(metadata_path.read_text(encoding="utf-8"))
    if not isinstance(meta, dict) or meta.get("executionId") != a.execution_id:
        raise SystemExit("F15_EVIDENCE_PACKAGE_FAIL metadata_identity_invalid")
    run_dir = Path("/root") / ("pock-m8-ci-f15-" + a.execution_id)
    result_src = run_dir / "f15-result.json"
    serial_src = Path(str(result_src) + ".serial.log")
    image_src = run_dir / "guest-f15.ext4"
    run_dir_safe = not path_has_symlink(run_dir) and run_dir.is_dir()
    result_safe = run_dir_safe and regular_file_without_symlinks(result_src)
    serial_safe = run_dir_safe and regular_file_without_symlinks(serial_src)
    image_safe = run_dir_safe and regular_file_without_symlinks(image_src)
    log = log_path.read_text(encoding="utf-8", errors="replace")
    checks = parse_checks(log, a.driver_exit_code)
    build = json_after(log, "F15_IMAGE_BUILD rc=")
    image_sha = sha(image_src) if image_safe else None
    image_size = image_src.stat().st_size if image_sha else None
    result = json.loads(result_src.read_text(encoding="utf-8")) if result_safe else None
    tree = meta["sourcePins"]["guestTree"]
    summary = {
        "contract": "PockM8F15EvidenceRunSummary/v2",
        "executionId": a.execution_id,
        "workflowCommitSha": meta["workflowCommitSha"],
        "runUrl": meta["runUrl"],
        "checks": checks,
        "guestTree": {"baselineManifestSha256": tree["sha256"],
                      "currentRunManifestRecomputed": False},
        "guestImage": {"sha256": image_sha, "sizeBytes": image_size,
                       "builderSha256": build.get("rootfsSha256") if build else None,
                       "matchesBuilder": bool(build and image_sha == build.get("rootfsSha256")
                                              and image_size == build.get("sizeBytes")),
                       "matchesResult": bool(result and image_sha == result.get("rootfsSha256"))},
        "result": {"present": result is not None,
                   "contract": result.get("contract") if result else None,
                   "truthStatus": result.get("truthStatus") if result else None},
        "serial": {"present": serial_safe},
    }
    bundle.mkdir(parents=True, exist_ok=False)
    copied = []
    if result is not None and not secret_key_found(result):
        target = bundle / "f15-result.json"
        shutil.copyfile(result_src, target)
        copied.append(target)
    browser_artifacts, browser_files = collect_browser_artifacts(run_dir, result, bundle)
    summary["browserEvidence"] = browser_artifacts
    copied.extend(browser_files)
    serial_excluded = None
    if serial_safe:
        raw = serial_src.read_bytes()
        if SENSITIVE_TEXT.search(raw.decode("utf-8", errors="replace")):
            serial_excluded = "sensitive_marker_detected"
        else:
            target = bundle / "serial.log"
            target.write_bytes(raw)
            copied.append(target)
    shutil.copyfile(driver_path, bundle / "f15-driver.py")
    copied.append(bundle / "f15-driver.py")
    summary["serial"]["excludedReason"] = serial_excluded
    write_json(bundle / "run-summary.json", summary)
    copied.append(bundle / "run-summary.json")
    file_rows = {}
    for path in sorted(copied, key=lambda x: x.relative_to(bundle).as_posix()):
        raw = path.read_bytes()
        file_rows[path.relative_to(bundle).as_posix()] = {"sha256": digest(raw), "sizeBytes": len(raw)}
    complete = (
        a.driver_exit_code == 0 and checks["driverGatePass"]
        and checks["allExpectedTestsPass"] and checks["allExpectedSuitesPresent"]
        and all(checks.get(k) == 0 for k in
                ("compileExitCode", "image_buildExitCode", "e2fsckExitCode", "host_runExitCode"))
        and summary["guestImage"]["matchesBuilder"] and summary["guestImage"]["matchesResult"]
        and browser_artifacts["present"] and browser_artifacts["matchesResult"]
        and browser_artifacts["fileCount"] == 4
        and result is not None and serial_safe and serial_excluded is None
        and not secret_key_found(result)
    )
    manifest = {
        "contract": "PockM8F15EvidenceBundle/v2",
        "packageStatus": "COMPLETE" if complete else "INCOMPLETE",
        "workflow": meta,
        "guestImage": summary["guestImage"],
        "resultBoundary": {
            "truthStatus": result.get("truthStatus") if result else None,
            "guestBrowserFramesIncluded": browser_artifacts["matchesResult"],
            "independentFrameAnalysis": False,
            "independentInputEffectObservation": False,
            "guestReceiptMacIndependentlyVerified": False,
            "controlInputAckMacIndependentlyVerified": False,
            "pixelDeltaBoundToPointerCoordinate": False,
            "guestFrameSourceIndependentlyAuthenticated": False,
            "hardwareAttestation": "BLOCKED",
            "canonicalHabitatMicroVMExecutionProof": False,
        },
        "files": file_rows,
    }
    manifest_path = bundle / "f15-evidence-manifest.json"
    write_json(manifest_path, manifest)
    manifest_hash = sha(manifest_path)
    (bundle / "f15-evidence-manifest.sha256").write_text(
        manifest_hash + "  f15-evidence-manifest.json\n", encoding="ascii", newline="\n")
    browser_probe = (((result or {}).get("f13Run") or {}).get("guestBrowserProbe") or {})
    browser_expected = run_dir / "browser-evidence"
    failure_labels = (
        "guest_browser_receipt_eof",
        "guest_browser_click_counter_invalid",
        "browser_screencast_visual_change_timeout",
        "browser_screenshot_visual_change_timeout",
        "F15_SOURCE_OR_PATCH_FAILED",
    )
    result_failure = result.get("failure") if isinstance(result, dict) else None
    probe_failure = browser_probe.get("failure") if isinstance(browser_probe, dict) else None

    def failure_label(value):
        if value is None:
            return "none"
        if isinstance(value, str):
            return next((label for label in failure_labels if label in value), "other_failure_present")
        return "non_string_failure"

    browser_diag = {
        "reason": browser_artifacts.get("failureReason", "none"),
        "resultFailureLabel": failure_label(result_failure),
        "probeFailureLabel": failure_label(probe_failure),
        "guestBrowserProbePresent": bool(browser_probe),
        "guestFailureCodes": [
            code for code in (
                "guest_browser_receipt_eof",
                "guest_browser_challenge_invalid",
                "guest_browser_challenge_contract_invalid",
                "guest_browser_challenge_identity_invalid",
                "guest_browser_response_key_invalid",
                "guest_browser_screenshot_visual_change_timeout",
                "browser_screencast_visual_change_timeout",
                "guest_browser_click_counter_invalid",
                "guest_browser_binary_unavailable",
            ) if code in log
        ],
        "browserServiceFailureMarker": "pock-m8-browser.service: Main process exited" in log,
        "browserTracebackMarker": "Traceback (most recent call last):" in log,
        "present": browser_artifacts.get("present") is True,
        "matchesResult": browser_artifacts.get("matchesResult") is True,
        "fileCount": browser_artifacts.get("fileCount", 0),
        "reportedPathPresent": bool(browser_probe.get("artifactsPath")),
        "reportedPathMatchesExpected": browser_probe.get("artifactsPath") == str(browser_expected),
        "expectedDirectoryPresent": browser_expected.is_dir(),
        "failedChecks": browser_artifacts.get("failedChecks", []),
    }
    print("F15_BROWSER_EVIDENCE " + json.dumps(browser_diag, sort_keys=True), flush=True)
    print("F15_EVIDENCE_PACKAGE status=" + ("COMPLETE" if complete else "INCOMPLETE")
          + " fileCount=" + str(len(file_rows)) + " manifestSha256=" + manifest_hash, flush=True)
    return 0 if complete else 43


if __name__ == "__main__":
    raise SystemExit(main())
