#!/usr/bin/env python3
"""Apply and exercise the staged Pock M8 F15 candidate on the Lenovo KVM host.

The F14 runner has already reconstructed the exact F14 source tree under
/root/pock-m8-ci-f14-<run-id>/source. This driver applies only the F15 delta,
runs focused regressions, rebuilds the guest image from the independently
measured staged rootfs, and executes the authenticated pointer/guest-ack path.
"""
from __future__ import annotations

from pathlib import Path
import json
import os
import subprocess
import sys

GUEST_TREE = Path("/root/pock-m8-f13-gueststage-36068890418/rootfs")
KERNEL = Path("/root/pock-m8-boot/vmlinux-6.18.48")
FIRECRACKER = Path("/root/pock-m8-gate/bin/firecracker")
JAILER = Path("/root/pock-m8-gate/bin/jailer")
BROWSER_SHA256 = "60c03e8882f4bb47459a905ede1074e1e746c5b765e437c288e460320540a8a3"


def run(command: list[str], *, cwd: Path | None, env: dict[str, str], timeout: int) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        cwd=cwd,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def emit(label: str, proc: subprocess.CompletedProcess, tail: int = 1800) -> None:
    print(f"{label} rc={proc.returncode}", flush=True)
    combined = (proc.stdout + "\n" + proc.stderr).strip()
    if combined:
        print(combined[-tail:], flush=True)


def apply_context_patch(patch_path: Path, source: Path) -> None:
    """Apply the staged context-only F15 delta deterministically.

    The candidate file intentionally carries context hunks without numeric range
    metadata. We therefore apply each hunk by exact old-sequence matching. A
    hunk must match exactly once; otherwise the gate fails closed.
    """
    raw = patch_path.read_text(encoding="utf-8").splitlines()
    i = 0
    files = 0
    hunks = 0
    while i < len(raw):
        if not raw[i].startswith("diff --git a/"):
            i += 1
            continue
        header = raw[i].split()
        if len(header) != 4 or not header[2].startswith("a/") or not header[3].startswith("b/"):
            raise RuntimeError("f15_patch_file_header_invalid")
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
                    if line.startswith("+"):
                        produced.append(line[1:])
                    elif line.startswith(" "):
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
        text_value = target.read_text(encoding="utf-8")
        for body in file_hunks:
            old_lines = [line[1:] for line in body if line.startswith((" ", "-"))]
            new_lines = [line[1:] for line in body if line.startswith((" ", "+"))]
            old = "\n".join(old_lines)
            new = "\n".join(new_lines)
            if old_lines:
                candidates = []
                start = 0
                while True:
                    idx = text_value.find(old, start)
                    if idx < 0:
                        break
                    candidates.append(idx)
                    start = idx + 1
                if len(candidates) != 1:
                    raise RuntimeError(
                        "f15_patch_context_match_count:" + rel + ":" + str(len(candidates))
                    )
                idx = candidates[0]
                text_value = text_value[:idx] + new + text_value[idx + len(old):]
            elif new_lines:
                raise RuntimeError("f15_patch_insertion_without_context:" + rel)
            hunks += 1
        target.write_text(text_value, encoding="utf-8", newline="\n")
        files += 1
    print(f"F15_CONTEXT_PATCH_APPLIED files={files} hunks={hunks}", flush=True)


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: pock_m8_f15_ci_driver.py RUN_ID F15_PATCH")
    run_id, patch_arg = sys.argv[1:]
    patch = Path(patch_arg)
    f14_root = Path("/root/pock-m8-ci-f14-" + run_id)
    source = f14_root / "source"
    project = source / "project"
    if not project.is_dir() or not patch.is_file():
        raise SystemExit("f15_source_or_patch_missing")
    if not GUEST_TREE.is_dir():
        raise SystemExit("f15_guest_tree_missing")

    env = dict(
        os.environ,
        PYTHONDONTWRITEBYTECODE="1",
        PYTHONPATH=os.pathsep.join(
            (str(project), str(project / "tests" / "unit"), "/root/pock-m8-gate", "/root/pock-m8-gate/pylibs")
        ),
    )

    try:
        apply_context_patch(patch, source)
    except Exception as exc:
        print("F15_CONTEXT_PATCH_FAILED " + type(exc).__name__ + ":" + str(exc), flush=True)
        return 10

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

    compile_proc = run(
        [
            sys.executable,
            "-B",
            "-m",
            "compileall",
            "-q",
            str(project / "firecracker_guest_takeover_v23.py"),
            str(project / "guest_browser_probe_v23.py"),
            str(project / "firecracker_guest_browser_v23.py"),
            str(project / "scripts/pock_m8_f13_host_run.py"),
            str(project / "scripts/pock_m8_f14_host_run.py"),
            str(project / "scripts/pock_m8_f15_host_run.py"),
        ],
        cwd=project,
        env=env,
        timeout=120,
    )
    emit("F15_COMPILE", compile_proc)
    if compile_proc.returncode:
        return 21

    outdir = Path("/root/pock-m8-ci-f15-" + run_id)
    if outdir.exists() or outdir.is_symlink():
        raise SystemExit("f15_output_directory_exists")
    outdir.mkdir(mode=0o700)
    guest = outdir / "guest-f15.ext4"

    build = run(
        [
            sys.executable,
            "-B",
            str(project / "scripts/build_pock_guest_browser_image.py"),
            "--rootfs-tree",
            str(GUEST_TREE),
            "--output",
            str(guest),
            "--size-mib",
            "2048",
            "--agent",
            str(project / "guest_workload_agent_v23.py"),
            "--interactive-source",
            str(project),
            "--browser-agent",
            str(project / "guest_browser_probe_v23.py"),
            "--browser-sha256",
            BROWSER_SHA256,
        ],
        cwd=project,
        env=env,
        timeout=900,
    )
    emit("F15_IMAGE_BUILD", build, 2400)
    if build.returncode:
        return 30

    fsck = run(["e2fsck", "-fn", str(guest)], cwd=None, env=env, timeout=180)
    emit("F15_E2FSCK", fsck, 1600)
    if fsck.returncode:
        return 31

    output = outdir / "f15-result.json"
    host = run(
        [
            sys.executable,
            "-B",
            str(project / "scripts/pock_m8_f15_host_run.py"),
            "--run-id",
            run_id,
            "--kernel",
            str(KERNEL),
            "--rootfs",
            str(guest),
            "--firecracker",
            str(FIRECRACKER),
            "--jailer",
            str(JAILER),
            "--jail-base",
            str(outdir / "jails"),
            "--output",
            str(output),
            "--x",
            "80",
            "--y",
            "64",
        ],
        cwd=project,
        env=env,
        timeout=900,
    )
    emit("F15_HOST_RUN", host, 3200)

    if output.is_file():
        result = json.loads(output.read_text(encoding="utf-8"))
        summary = {
            "contract": result.get("contract"),
            "truthStatus": result.get("truthStatus"),
            "pointer": result.get("pointer"),
            "guestBrowser": result.get("guestBrowser"),
            "failure": result.get("failure"),
            "rootfsSha256": result.get("rootfsSha256"),
        }
        print("F15_RESULT " + json.dumps(summary, sort_keys=True), flush=True)

    if host.returncode:
        return 40

    print("F15_GATE_PASS", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
