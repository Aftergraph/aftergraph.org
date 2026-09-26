# F15 guest rootfs preflight evidence

Status: **PASS for the read-only tree walk at the recorded snapshot; not a boot or execution proof.**

- Repository: `Aftergraph/aftergraph.org`
- Branch: `worker/pock-m8-f15-pointer-input-20260926`
- Workflow commit: `7b1f324663d7977b4e64061e012a37bd928ac3a1`
- Workflow: `.github/workflows/pock-m8-f15-rootfs-preflight.yml`
- GitHub Actions run: [36227367590](https://github.com/Aftergraph/aftergraph.org/actions/runs/36227367590)
- Job: `guest-tree-manifest`, job ID `108363846861`, conclusion `success`
- Runner: `lenovo-aftergraph-site-deploy` on `JONAS-LENOVO`
- Guest tree read: `/root/pock-m8-f13-gueststage-36068890418/rootfs`
- Contract: `PockGuestRootfsTreeManifest/v1`
- Canonicalization: `sorted-json-v1`
- SHA-256: `6913577138324da1f374a7b5a7ec3ccd8c777e4ff74d07a0638e50a46d251b06`
- Entries: `13993`
- Regular-file bytes read: `889312372`

The workflow traversed with `lstat`, read regular files without following symlinks, hashed xattrs and file bytes, recorded type/mode/ownership/timestamps/link metadata, detected changes during the walk, and rejected sockets or unknown file types. Its only explicit write was a temporary Python script in runner temp; a `finally` block removes it. It contains no guest-rootfs write, checkout, package installation, cache action, deployment, or runner/VM setting change. WSL may start the Ubuntu-26.04 distro as a normal lifecycle consequence.

An independent read-only verifier checked the exact run head, branch, workflow path, job, runner/machine identity, successful conclusion, raw manifest line, and workflow source. The verifier confirmed the log line and the bounded read-only claim.

## Scope

This digest identifies the guest tree at the time of this run. It does not attest the tree's provenance, later immutability, bootability, or runtime input behavior. The raw manifest rows were not emitted, only their canonical aggregate digest. Use this value as an expected-value pin for the exact rootfs snapshot; any tree or recorded-metadata change must fail closed and require remeasurement.
