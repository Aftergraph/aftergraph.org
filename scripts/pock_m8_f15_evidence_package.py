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


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--metadata", required=True)
    p.add_argument("--bundle-dir", required=True)
    p.add_argument("--driver-log", required=True)
    p.add_argument("--driver-file", required=True)
    p.add_argument("--execution-id", required=True)
    p.add_argument("--driver-exit-code", required=True, type=int)
    a = p.parse_args()
    meta = json.loads(Path(a.metadata).read_text(encoding="utf-8"))
    run_dir = Path("/root/pock-m8-ci-f15-" + a.execution_id)
    result_src = run_dir / "f15-result.json"
    serial_src = Path(str(result_src) + ".serial.log")
    image_src = run_dir / "guest-f15.ext4"
    log = Path(a.driver_log).read_text(encoding="utf-8", errors="replace")
    checks = parse_checks(log, a.driver_exit_code)
    build = json_after(log, "F15_IMAGE_BUILD rc=")
    image_sha = sha(image_src) if image_src.is_file() and not image_src.is_symlink() else None
    image_size = image_src.stat().st_size if image_sha else None
    result = json.loads(result_src.read_text(encoding="utf-8")) if result_src.is_file() else None
    tree = meta["sourcePins"]["guestTree"]
    summary = {
        "contract": "PockM8F15EvidenceRunSummary/v1",
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
        "serial": {"present": serial_src.is_file()},
    }
    bundle = Path(a.bundle_dir)
    bundle.mkdir(parents=True, exist_ok=False)
    copied = []
    if result is not None and not secret_key_found(result):
        target = bundle / "f15-result.json"
        shutil.copyfile(result_src, target)
        copied.append(target)
    serial_excluded = None
    if serial_src.is_file() and not serial_src.is_symlink():
        raw = serial_src.read_bytes()
        if SENSITIVE_TEXT.search(raw.decode("utf-8", errors="replace")):
            serial_excluded = "sensitive_marker_detected"
        else:
            target = bundle / "serial.log"
            target.write_bytes(raw)
            copied.append(target)
    shutil.copyfile(Path(a.driver_file), bundle / "f15-driver.py")
    copied.append(bundle / "f15-driver.py")
    summary["serial"]["excludedReason"] = serial_excluded
    write_json(bundle / "run-summary.json", summary)
    copied.append(bundle / "run-summary.json")
    file_rows = {}
    for path in sorted(copied, key=lambda x: x.name):
        raw = path.read_bytes()
        file_rows[path.name] = {"sha256": digest(raw), "sizeBytes": len(raw)}
    complete = (
        a.driver_exit_code == 0 and checks["driverGatePass"]
        and checks["allExpectedTestsPass"] and checks["allExpectedSuitesPresent"]
        and all(checks.get(k) == 0 for k in
                ("compileExitCode", "image_buildExitCode", "e2fsckExitCode", "host_runExitCode"))
        and summary["guestImage"]["matchesBuilder"] and summary["guestImage"]["matchesResult"]
        and result is not None and serial_src.is_file() and serial_excluded is None
        and not secret_key_found(result)
    )
    manifest = {
        "contract": "PockM8F15EvidenceBundle/v1",
        "packageStatus": "COMPLETE" if complete else "INCOMPLETE",
        "workflow": meta,
        "guestImage": summary["guestImage"],
        "resultBoundary": {
            "truthStatus": result.get("truthStatus") if result else None,
            "independentInputEffectObservation": False,
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
    print("F15_EVIDENCE_PACKAGE status=" + ("COMPLETE" if complete else "INCOMPLETE")
          + " fileCount=" + str(len(file_rows)) + " manifestSha256=" + manifest_hash, flush=True)
    return 0 if complete else 43


if __name__ == "__main__":
    raise SystemExit(main())
