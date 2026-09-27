#!/usr/bin/env python3
"""Fail-closed verifier for the F15 integrity bundle (does not independently reproduce the boot)."""
import argparse
import hashlib
import json
from pathlib import Path
import re

EXPECTED_DRIVER_BLOB = "cec4969c559624530c5b57e11628286a00e3b951"
EXPECTED_PACKAGER_BLOB = "undefined"
EXPECTED_PINNED = {
    "f11Patch": "f22ece3e4563efc6b7cc0ad772d912ee3484364381d9b1f425277108aa1f964b",
    "f13Patch": "8881a0822205ed218a33a9ed8bb3579993bc1fc25000568a92406adb78bc1bd9",
    "f14Patch": "4990402199536a0228364ee930c93a06b0b9e788e17372be2abdbc38c7fcab6e",
    "f15Patch": "9d9f88e3f6e52468535e8416549633191dd813ea0ca11bedebe3cd3fa3991010",
    "archive": "1017465270d11f99f55eb540061ce902589b45c56be7a03308db19f80d937122",
    "browser": "60c03e8882f4bb47459a905ede1074e1e746c5b765e437c288e460320540a8a3",
    "kernel": "9204218e8bcca6ac23848d74f45df2eb19d7f31e8277840a7d145a0df8b078d2",
    "firecracker": "99ad0f5cd0514a88aad0e9ae8cfdb3cc3b4ab9d190e1194602406c786b5de7a5",
    "jailer": "65ef226e96f0ceda55ba643f445801ef2cc0ea667ef67cad8ac4f406c9c8434f",
}
EXPECTED_TESTS = {
    "test_v23_f15_pointer_input.py": 12,
    "test_v23_f14_guest_takeover_bridge.py": 9,
    "test_v23_f13_guest_browser.py": 34,
    "test_v23_f12_guest_effect_truth.py": 4,
}
FILES = {"f15-result.json", "serial.log", "run-summary.json", "f15-driver.py"}


def fail(reason):
    raise SystemExit("F15_EVIDENCE_VERIFY_FAIL " + reason)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def obj(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        fail("json_root_invalid:" + path.name)
    return value


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
    if manifest.get("contract") != "PockM8F15EvidenceBundle/v1" or manifest.get("packageStatus") != "COMPLETE":
        fail("package_not_complete")
    rows = manifest.get("files", {})
    if set(rows) != FILES:
        fail("bundle_file_set_invalid")
    actual = {x.name for x in root.iterdir() if x.is_file()}
    if actual != FILES | {mp.name, "f15-evidence-manifest.sha256"}:
        fail("unexpected_or_missing_file")
    for name, row in rows.items():
        path = root / name
        if path.is_symlink() or not path.is_file() or row.get("sizeBytes") != path.stat().st_size or row.get("sha256") != sha(path):
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
    if pins.get("driver", {}).get("gitBlobSha1") != EXPECTED_DRIVER_BLOB:
        fail("driver_blob_mismatch")
    if pins.get("packager", {}).get("gitBlobSha1") != EXPECTED_PACKAGER_BLOB:
        fail("packager_blob_mismatch")

    summary = obj(root / "run-summary.json")
    if summary.get("workflowCommitSha") != a.workflow_sha:
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
            and control.get("independentInputEffectObservation") is False):
        fail("control_ack_boundary_invalid")
    if result.get("pointer") != {"x": 50, "y": 50}:
        fail("pointer_invalid")
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
    boundary = manifest.get("resultBoundary", {})
    if not (boundary.get("independentInputEffectObservation") is False
            and boundary.get("hardwareAttestation") == "BLOCKED"
            and boundary.get("canonicalHabitatMicroVMExecutionProof") is False):
        fail("overclaimed_boundary")
    report = {
        "contract": "PockM8F15ArtifactIntegrityVerification/v1",
        "status": "F15_ARTIFACT_INTEGRITY_VERIFIED",
        "workflowCommitSha": a.workflow_sha,
        "runId": a.run_id,
        "runAttempt": a.run_attempt,
        "manifestSha256": sha(mp),
        "resultSha256": sha(root / "f15-result.json"),
        "serialSha256": sha(root / "serial.log"),
        "scope": "artifact integrity and truth-boundary consistency only",
        "notEstablished": ["independent real-boot reproduction",
                           "independent observation of pointer effect",
                           "hardware attestation",
                           "canonical HabitatMicroVMExecutionProof/v1"],
    }
    (root / "verification-report.json").write_text(json.dumps(report, sort_keys=True, indent=2) + "\n",
                                                   encoding="utf-8", newline="\n")
    print("F15_ARTIFACT_INTEGRITY_PASS status=" + report["status"])
    print("F15_TRUTH_BOUNDARY independentBoot=NOT_ESTABLISHED independentPointerEffect=NOT_ESTABLISHED hardwareAttestation=BLOCKED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
