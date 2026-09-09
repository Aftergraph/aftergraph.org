# Enrich sources survey (commander-direct, 2026-09-08 ~18:25 local)

Heads are workspace-clone SHAs (verify with `git rev-parse HEAD` before generator use).

| source | local path | HEAD | visibility | generator-ready index |
|---|---|---|---|---|
| skills-vault | `workspace/skills-vault` | `8a480b9…` (full in obs file) | private | `vault.lock.json` (schema_version 1, 115 skills: name/category/source/trust/lifecycle/digest-sha256 + per-file sha256) + `registry/{circulation,overrides,policy,runtimes}.json` |
| model-registry | `workspace/ag-model-registry` (origin `Aftergraph/model-registry`) | `d5e78d9…` | private | `schemas/model-version.schema.json` + `models/afm/` + `releases/afm-*.candidate.0.json` + champion checklists |
| ISR | `workspace/intelligence-systems-research` | `08c9846…` | public | numbered research docs (`16-MISSION-BENCH-AND-EXPERIMENT-DESIGN.md` etc.); NO single study index found (gap) |
| continuum | `workspace/continuum` | `315795e…` | private | `continuum/mission_bench.py` + faults/chaos harnesses; NO results index found (gap) |
| afm | `workspace/AFM` is a build-artifact dump, NOT a git repo (gap) | n/a | private | canonical source is `Aftergraph/afm` (uncloned here; `workspace/.tmp-afm` may hold a mirror — unverified) |
| llm-research-development | not cloned locally (gap) | cut head `c6adf46` (obs file) | private | clone + survey before v0.3 |

## Boundary rule for v0.3 (open question → recommendation)

vault/model-registry/continuum/AFM are PRIVATE repos. Public `projection.json` must not leak
their internals: recommend counts + trust/lifecycle distributions + digests only (digests are
opaque), never skill names, file paths, or eval contents — or mark the whole set `withheld`
until Jonas clears skill-name publication. ISR is public: study titles + evidence classes OK.

## Generator-extension note (10 lines)

1. New predicates: `trust`, `lifecycle`, `digest` (capability, OBSERVED, skills-vault).
2. New predicates: `lifecycle_state`, `release` (model, OBSERVED, model-registry).
3. New predicates: `evidence_class`, `preregistered` (study, OBSERVED/CANONICAL, ISR).
4. Entity ids: `capability:<vault>/<skill>`, `model:<registry>/<name>@<version>`, `study:<isr-id>`.
5. Relations: `provides` vault→capability; `owns` registry→model; `evaluates` study→repo.
6. Planes: OBSERVED for lock/registry reads; CANONICAL only for ISR-published claims.
7. Private sources: aggregate-only assertions (counts/distributions) + `withheld` detail marker.
8. Every assertion keeps the v0.2 provenance block; `ref` = source repo HEAD (40-hex).
9. Conflicts: skill quarantine vs curated status → C-kind `trust` (design when seen live).
10. Tests: mirror A' style — counts match lock file, no private-detail leak, determinism.
