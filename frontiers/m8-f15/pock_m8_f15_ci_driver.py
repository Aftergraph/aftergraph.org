#!/usr/bin/env python3
"""Reconstruct F14, apply F15, and exercise authenticated pointer/ack on Lenovo KVM."""
from __future__ import annotations

from pathlib import Path, PurePosixPath
from zipfile import ZipFile
import hashlib
import json
import os
import subprocess
import sys

GUEST_TREE = Path("/root/pock-m8-f13-gueststage-36068890418/rootfs")
KERNEL = Path("/root/pock-m8-boot/vmlinux-6.18.48")
FIRECRACKER = Path("/root/pock-m8-gate/bin/firecracker")
JAILER = Path("/root/pock-m8-gate/bin/jailer")
ARCHIVE = Path("/mnt/c/Users/empir/Downloads/pock-bot-v23-m8-f9-worker-handoff.zip")
PREFIX = "pock-bot-v23-m8-f9-worker-handoff/"
BROWSER_SHA256 = "60c03e8882f4bb47459a905ede1074e1e746c5b765e437c288e460320540a8a3"
PIN = {
    "archive": "1017465270d11f99f55eb540061ce902589b45c56be7a03308db19f80d937122",
    "f11": "f22ece3e4563efc6b7cc0ad772d912ee3484364381d9b1f425277108aa1f964b",
    "f13": "8881a0822205ed218a33a9ed8bb3579993bc1fc25000568a92406adb78bc1bd9",
    "f14": "4990402199536a0228364ee930c93a06b0b9e788e17372be2abdbc38c7fcab6e",
}
GUEST_AGENT_APPEND = b'''\n\nimport argparse\n\n\ndef main(argv: list[str] | None = None) -> int:\n    parser = argparse.ArgumentParser(description="Pock M8 fixed guest workload over AF_VSOCK")\n    parser.add_argument("--port", type=int, default=4050)\n    args = parser.parse_args(argv)\n    receipt = PockGuestWorkloadAgent.connect_vsock(port=args.port)\n    print(json.dumps({"contract": receipt["contract"], "transport": receipt["transport"],\n                      "receiptHash": receipt["receiptHash"], "exitCode": receipt["exitCode"]},\n                     sort_keys=True))\n    return 0\n\n\nif __name__ == "__main__":\n    raise SystemExit(main())\n'''


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def run(command: list[str], *, cwd: Path | None, env: dict[str, str], timeout: int) -> subprocess.CompletedProcess:
    return subprocess.run(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                          capture_output=True, text=True, timeout=timeout, check=False)


def emit(label: str, proc: subprocess.CompletedProcess, tail: int = 1800) -> None:
    print(f"{label} rc={proc.returncode}", flush=True)
    combined = (proc.stdout + "\n" + proc.stderr).strip()
    if combined:
        print(combined[-tail:], flush=True)


def reconstruct_f14(run_id: str, f11: Path, f13: Path, f14: Path) -> tuple[Path, Path]:
    root = Path("/root/pock-m8-f15-source-" + run_id)
    if root.exists() or root.is_symlink():
        raise RuntimeError("f15_source_root_exists")
    root.mkdir(mode=0o700)
    if sha(ARCHIVE) != PIN["archive"]:
        raise RuntimeError("f15_archive_pin_mismatch")
    for label, path in (("f11", f11), ("f13", f13), ("f14", f14)):
        if not path.is_file() or path.is_symlink() or sha(path) != PIN[label]:
            raise RuntimeError("f15_" + label + "_pin_mismatch")

    with ZipFile(ARCHIVE) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("f15_source_zip_corrupt")
        index = archive.read(PREFIX + "F9_CHECKSUMS.sha256").decode("utf-8")
        verified = 0
        for line in index.splitlines():
            if not line or line.startswith("#"):
                continue
            expected, name = line.split("  ", 1)
            if hashlib.sha256(archive.read(PREFIX + name)).hexdigest() != expected:
                raise RuntimeError("f15_source_member_checksum_mismatch")
            verified += 1
        if verified != 719:
            raise RuntimeError("f15_source_manifest_count_mismatch")
        source = root / "source"
        source.mkdir(mode=0o700)
        members = [m for m in archive.namelist()
                   if m.startswith(PREFIX + "project/") and not m.endswith("/")]
        for name in members:
            rel = PurePosixPath(name)
            if rel.is_absolute() or ".." in rel.parts:
                raise RuntimeError("f15_source_member_path_unsafe")
            dest = source / rel.relative_to(PREFIX)
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("xb") as stream:
                stream.write(archive.read(name))

    project = source / "project"
    agent = project / "guest_workload_agent_v23.py"
    agent.write_bytes(agent.read_bytes() + GUEST_AGENT_APPEND)
    env = dict(os.environ)
    for label, patch in (("f11", f11), ("f13", f13), ("f14", f14)):
        check = run(["git", "apply", "--check", str(patch)], cwd=source, env=env, timeout=30)
        emit("F15_RECONSTRUCT_" + label.upper() + "_CHECK", check, 1000)
        if check.returncode:
            raise RuntimeError("f15_reconstruct_" + label + "_check_failed")
        applied = run(["git", "apply", str(patch)], cwd=source, env=env, timeout=30)
        emit("F15_RECONSTRUCT_" + label.upper() + "_APPLY", applied, 1000)
        if applied.returncode:
            raise RuntimeError("f15_reconstruct_" + label + "_apply_failed")
    print(f"F15_F14_SOURCE_RECONSTRUCTED filesVerified={verified}", flush=True)
    return source, project


def apply_context_patch(patch_path: Path, source: Path) -> None:
    """Apply context-only F15 hunks by exact preimage matching; fail closed."""
    raw = patch_path.read_text(encoding="utf-8").splitlines()
    i = 0
    files = 0
    hunks = 0
    while i < len(raw):
        if not raw[i].startswith("diff --git a/"):
            i += 1
            continue
        header = raw[i].split()
        rel = header[3][2:]
        target = source / rel
        i += 1
        new_file = False
        while i < len(raw) and not raw[i].startswith("@@") and not raw[i].startswith("diff --git a/"):
            if raw[i] == "--- /dev/null":
                new_file = True
            i += 1
        file_hunks = []
        while i < len(raw) and not raw[i].startswith("diff --git a/"):
            if not raw[i].startswith("@@"):
                i += 1
                continue
            i += 1
            body = []
            while i < len(raw) and not raw[i].startswith("@@") and not raw[i].startswith("diff --git a/"):
                if raw[i] != "\\ No newline at end of file":
                    body.append(raw[i])
                i += 1
            file_hunks.append(body)
        if not file_hunks:
            raise RuntimeError("f15_patch_file_without_hunks:" + rel)
        if new_file:
            if target.exists() or target.is_symlink():
                raise RuntimeError("f15_patch_new_file_exists:" + rel)
            produced = []
            for body in file_hunks:
                for line in body:
                    if line.startswith("+") or line.startswith(" "):
                        produced.append(line[1:])
                    elif line.startswith("-"):
                        raise RuntimeError("f15_patch_new_file_deletion_invalid:" + rel)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("\n".join(produced) + "\n", encoding="utf-8", newline="\n")
            files += 1
            hunks += len(file_hunks)
            continue

        if not target.is_file() or target.is_symlink():
            raise RuntimeError("f15_patch_target_missing:" + rel)
        value = target.read_text(encoding="utf-8")
        for hunk_index, body in enumerate(file_hunks, 1):
            old_lines = [line[1:] for line in body if line.startswith((" ", "-"))]
            new_lines = [line[1:] for line in body if line.startswith((" ", "+"))]
            old = "\n".join(old_lines)
            new = "\n".join(new_lines)
            positions = []
            start = 0
            while old:
                idx = value.find(old, start)
                if idx < 0:
                    break
                positions.append(idx)
                start = idx + 1
            if len(positions) != 1:
                preview = " | ".join(old_lines[:4])[:300]
                raise RuntimeError(
                    f"f15_patch_context_match_count:{rel}:hunk={hunk_index}:"
                    f"count={len(positions)}:preview={preview}"
                )
            idx = positions[0]
            value = value[:idx] + new + value[idx + len(old):]
            hunks += 1
        target.write_text(value, encoding="utf-8", newline="\n")
        files += 1
    print(f"F15_CONTEXT_PATCH_APPLIED files={files} hunks={hunks}", flush=True)


def main() -> int:
    if len(sys.argv) != 6:
        raise SystemExit("usage: driver RUN_ID F11 F13 F14 F15")
    run_id = sys.argv[1]
    f11, f13, f14, f15 = map(Path, sys.argv[2:])
    try:
        source, project = reconstruct_f14(run_id, f11, f13, f14)
        apply_context_patch(f15, source)
    except Exception as exc:
        print("F15_SOURCE_OR_PATCH_FAILED " + type(exc).__name__ + ":" + str(exc), flush=True)
        return 10

    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1",
               PYTHONPATH=os.pathsep.join((str(project), str(project / "tests" / "unit"),
                                           "/root/pock-m8-gate", "/root/pock-m8-gate/pylibs")))

    for candidate in project.rglob("*.py"):
        try:
            source_text = candidate.read_text(encoding="utf-8")
        except Exception:
            continue
        needle = "class HabitatInteractiveTransportManager"
        pos = source_text.find(needle)
        if pos >= 0:
            print("F15_TRANSPORT_SOURCE " + str(candidate), flush=True)
            for method_name in ("def _normalize_input_event", "def submit_input", "def next_input_as_worker", "def ack_input_as_worker"):
                method_pos = source_text.find(method_name)
                if method_pos >= 0:
                    print("F15_TRANSPORT_METHOD " + method_name, flush=True)
                    print(source_text[method_pos:method_pos + 9000], flush=True)
            break

    tests = [
        project / "tests/unit/test_v23_f15_pointer_input.py",
        project / "tests/unit/test_v23_f14_guest_takeover_bridge.py",
        project / "tests/unit/test_v23_f13_guest_browser.py",
        project / "tests/unit/test_v23_f12_guest_effect_truth.py",
    ]
    for test in tests:
        proc = run([sys.executable, "-B", str(test)], cwd=project, env=env, timeout=180)
        emit("F15_TEST " + test.name, proc)
        if proc.returncode:
            return 20

    compile_proc = run([sys.executable, "-B", "-m", "compileall", "-q",
                        str(project / "firecracker_guest_takeover_v23.py"),
                        str(project / "guest_browser_probe_v23.py"),
                        str(project / "firecracker_guest_browser_v23.py"),
                        str(project / "scripts/pock_m8_f13_host_run.py"),
                        str(project / "scripts/pock_m8_f14_host_run.py"),
                        str(project / "scripts/pock_m8_f15_host_run.py")],
                       cwd=project, env=env, timeout=120)
    emit("F15_COMPILE", compile_proc)
    if compile_proc.returncode:
        return 21

    outdir = Path("/root/pock-m8-ci-f15-" + run_id)
    if outdir.exists() or outdir.is_symlink():
        raise SystemExit("f15_output_directory_exists")
    outdir.mkdir(mode=0o700)
    guest = outdir / "guest-f15.ext4"
    build = run([sys.executable, "-B", str(project / "scripts/build_pock_guest_browser_image.py"),
                 "--rootfs-tree", str(GUEST_TREE), "--output", str(guest), "--size-mib", "2048",
                 "--agent", str(project / "guest_workload_agent_v23.py"),
                 "--interactive-source", str(project),
                 "--browser-agent", str(project / "guest_browser_probe_v23.py"),
                 "--browser-sha256", BROWSER_SHA256],
                cwd=project, env=env, timeout=900)
    emit("F15_IMAGE_BUILD", build, 2400)
    if build.returncode:
        return 30

    fsck = run(["e2fsck", "-fn", str(guest)], cwd=None, env=env, timeout=180)
    emit("F15_E2FSCK", fsck, 1600)
    if fsck.returncode:
        return 31

    output = outdir / "f15-result.json"
    host = run([sys.executable, "-B", str(project / "scripts/pock_m8_f15_host_run.py"),
                "--run-id", run_id, "--kernel", str(KERNEL), "--rootfs", str(guest),
                "--firecracker", str(FIRECRACKER), "--jailer", str(JAILER),
                "--jail-base", str(outdir / "jails"), "--output", str(output),
                "--x", "80", "--y", "64"],
               cwd=project, env=env, timeout=900)
    emit("F15_HOST_RUN", host, 3200)
    serial_path = Path(str(output) + ".serial.log")
    if serial_path.is_file():
        serial_text = serial_path.read_text(encoding="utf-8", errors="replace")
        diagnostic_lines = [
            line for line in serial_text.splitlines()
            if any(token in line.lower() for token in (
                "pock-m8-browser", "guest_browser", "traceback", "exception",
                "error", "failed", "chrom", "4070"
            ))
        ]
        print("F15_SERIAL_DIAGNOSTICS_BEGIN", flush=True)
        print("\n".join(diagnostic_lines[-120:]), flush=True)
        print("F15_SERIAL_DIAGNOSTICS_END", flush=True)
    if output.is_file():
        result = json.loads(output.read_text(encoding="utf-8"))
        print("F15_RESULT " + json.dumps({
            "contract": result.get("contract"), "truthStatus": result.get("truthStatus"),
            "pointer": result.get("pointer"), "guestBrowser": result.get("guestBrowser"),
            "failure": result.get("failure"), "rootfsSha256": result.get("rootfsSha256"),
        }, sort_keys=True), flush=True)
    if host.returncode:
        return 40
    print("F15_GATE_PASS", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
