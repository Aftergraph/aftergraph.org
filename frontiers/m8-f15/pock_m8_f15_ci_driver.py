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

    check = run(["git", "apply", "--check", str(patch)], cwd=source, env=env, timeout=30)
    emit("F15_PATCH_CHECK", check, 1200)
    if check.returncode:
        return 10
    applied = run(["git", "apply", str(patch)], cwd=source, env=env, timeout=30)
    emit("F15_PATCH_APPLY", applied, 1200)
    if applied.returncode:
        return 11

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
