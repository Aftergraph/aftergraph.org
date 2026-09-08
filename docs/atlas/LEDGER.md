# Atlas Mission Ledger

Mission: Aftergraph Atlas — read-only evidence-aware digital twin / development observatory.
Commander: Muse Spark. Home: `Aftergraph/aftergraph.org`, route `/atlas`.
Spike: `C:/Users/empir/aftergraph-site/` (14-repo static dashboard, NOT a git repo) preserved at `docs/atlas/spike-14repo/` — visual reference only, never a truth source.

## Decisions
- D0 (2026-09-08 ~18:22 local): Jonas granted `--yolo` for this session/project — act
  autonomously incl. installs, branches, builds. Pushes to origin stay Jonas-gated per
  repo policy; work lands on `feat/atlas` until review. No process kills (standing rule).
- D1 Atlas lives in `aftergraph.org` as route `/atlas` (aggregates + routes; owns no specs/tokens/runtimes). No new repo.
- D2 Build-time generated projection: `site/atlas/projection.json` emitted by
  `site/generate-atlas-projection.mjs` (node stdlib, pinned SHAs + live cut), validated and
  bundled by the scoped `atlas/` vite build into immutable assets under `site/atlas/` for the
  existing Worker. UI is read-only, zero authority, zero runtime CDN dependencies.
- D3 Three truth planes kept separate end-to-end (data, overlays, conflicts list). Never silently reconciled.
- D4 Directed topology uses bundled React Flow + elkjs (lockfile-pinned vite deps) + D3 ONLY for
  the research-constellation exploratory view. Mobile = neighborhood focus, not whole-graph shrink.
- D9 (2026-09-08 correction round): planes live on ASSERTIONS, not entities
  (schema v0.2: Entity + Assertion + RelationAssertion; graph is derived per plane set).
  /atlas is a strict read-plane (no operational actions; future actions deep-link to owning
  surfaces). Extractive Ask Atlas is V0; the retrieval boundary is shaped for a later grounded
  reasoning layer (retrieve → assemble → generate → validate → provenance-linked answer) in
  which the model may explain but never manufacture evidence.
- D5 Mobile = neighborhood focus (selected node + 1-hop), not whole-graph shrink.
- D6 Ask Atlas is extractive over the projection (cited answers). No LLM generation of claims.
- D7 Private-source boundary: private repos surface as name + plane/role + public description only.
- D8 Delegation: discovery done direct (gh). Implementation slices delegated bounded with file handoffs; a twice-hung child is not respawned (commander finishes directly).

## Assumptions
- A1 `gh` session (JonasAbde) has org read incl. private repos. Verified: rate 5000/5000.
- A2 Governance `docs/platform-topology/1.0.json` + `docs/contracts/*` remain the canonical topology/contract source (pinned per cut).
- A3 aftergraph.org static-Worker deployment can serve two new static files (atlas.html, atlas-projection.json) via build-worker.cjs addition.

## Unresolved conflicts (planes disagree — modeled, not normalized)
- C1 WI rename: RESOLVED BY OWNER 2026-09-08 (gov #49: topology now uses wi-backend/wi-frontend).
  Residual: dependencies.yml still targets legacy slugs (see C4). Rename-redirect proof kept in E2.
- C2 Unregistered observed repos: NARROWED to `sentinel-firetest2` only (cron-fabric, veranza,
  sentinel-firetest registered by #49).
- C3 Count drift: canonical 21 (cut 2026-09-07) vs observed 25 (cut 2026-09-08) vs spike 14 (stale subset) vs landing hardcoded "21 / 12 public / 9 private".
- C4 Site self-contradiction: `build-worker.cjs` asserts llms uses `wi-backend` + no `work-intelligence-v2`; `verify-site.cjs` expects `work-intelligence-v2` in public list. One of them is wrong.
- C5 Governance checkout at `C:/Users/empir/after-graph-governance` (HEAD 40226eb, dirty `latest-org-state.json`) is BEHIND remote (pushed 2026-09-08). Workspace clone is the fresher read.
- C6 PROPOSED branch `feat/topology-add-runtime` (adds `runtime` + `agent-runtime` role enum) unmerged — check whether #49 covered it; residual tracked in projection PROPOSED assertions.
- C7 (new; projection id C4): intra-canonical drift — dependencies.yml still targets legacy WI slugs the
  reconciled topology dropped; kept verbatim as shadow entities, surfaced as conflict.

## Delegated work
- Slice A (sa-0-dfe92a3b): STOPPED before freeze — superseded v0.1/CDN. Stray file rejected+removed.
- Slice B (sa-1-da693731): STOPPED before freeze — same reason.
- Slices A'/B' (deleg_816a2f44): STALLED — 5+ min transcript silence on both children
  (hang signature: waiting on model response, same as batch 1). Treated as transient
  infrastructure stall, not mission failure. Both stopped 2026-09-08 ~18:05 local.
- Slice A' COMPLETED BY COMMANDER: `site/generate-atlas-projection.mjs` +
  `site/atlas-projection.test.mjs` (9/9 green) + `site/verify-atlas.cjs` (PASS).
  Live projection: 144 entities / 316 assertions / 187 relations / 2 conflicts (C2, C4).
- Slice B1 (sa-0-fe61b7f8): STALLED → STOPPED. COMPLETED BY COMMANDER: commits 8092285 + 12b4aac
  (scaffold, shell, worker routes, rename-aware neighborhoods, DOM PASS, 4 clean shots).
- Loop: cron `atlas-dev-loop` (2051a4babc9c) every 30m, continuity, workdir aftergraph.org,
  deliver local — keeps developing Atlas on feat/atlas (no push). First run ~19:55 local.
- Team Enrich (sa-0-6c14bd09, deleg_a55a547c): capability/model/research source survey →
  docs/atlas/enrich/. Touches generator/built-app paths FORBIDDEN (fixtures + spec only).
- Team QA-harness (sa-1-610cb4c4): gate baseline + worker route trace + CI proposal →
  docs/atlas/qa/BASELINE.md. No edits to gates/worker/CI (proposals only).
- Team Decision-pack (sa-2-12ef86a8): Danish owner brief → docs/atlas/decision-pack.md.

## Evidence
- E6 Canonical advanced mid-run: gov 856c6f6 → 6b8c971 (merged #49 24-repo reconcile,
  #51 org-state regen, #41). Owner resolved C1/C3; C2 narrowed to sentinel-firetest2.
  Observed cut (15:48 UTC) predates these; projection meta pins both timestamps honestly.
- E7 Canonical advanced again ~18:19 local: gov 6b8c971 → 5f53273 (#45 Platform Fabrics v0.1).
  Topology/deps untouched (144/316/187/2 unchanged); projection regenerated + re-pinned, 9/9 + PASS.
- E8 Unknown-author enhancement (found in worktree, fully reviewed ll.85-143 of derive.js):
  aliasMap extended with slug normalization + C1-pair + C4-shadow linking, 3 new tests.
  Design sound, contract-consistent, 19/19 + DOM PASS → ACCEPTED. Author unidentified
  (not QA child per transcript, cron loop not yet fired); watch for further ghost writes.
- E9 Wakeup: pushed feat/atlas to origin (bd9593b). Shipped tree search + cut-freshness
  chip (27/27 vitest, DOM PASS incl. new checks). Next: CI wiring per qa/BASELINE.md.
- E1 Live org list (25): `gh repo list Aftergraph` 2026-09-08 (see OBSERVED cut files).
- E2 Rename proof: `gh api repos/Aftergraph/work-intelligence-v2` returns `name: wi-backend` (redirect).
- E3 Canonical 21: `platform-topology/1.0.json` cut 2026-09-07 (workspace clone).
- E4 Spike 14: `aftergraph-site/data.json` (14 entries, governance 7 PRs / site 3 PRs — stale).
- E5 Brand tokens v1.0.0 provisional-not-trademark-cleared (`.tmp-brand/tokens.json` mirror; canonical `Aftergraph/brand`).
- Exact cuts: OBSERVED raw cut `2026-09-08T15:48:21Z` generating in `workspace/.tmp-atlas-ledger/obs_*.json`.

## Verification status
- V1 Truth refresh: COMPLETE (25/25 repos at cut 2026-09-08T15:48:21Z in `workspace/.tmp-atlas-ledger/`).
- V2 Schema frozen: `docs/atlas/PROJECTION-SCHEMA.md` v0.2 (entities + assertions; supersedes v0.1).
- V3 Architecture frozen: `docs/atlas/ARCHITECTURE.md` (vite build, read-plane, Ask V0 boundary).
- V4 TDD: generator 9/9 + gate PASS; app vitest 10/10; proxy tests 12/12 (all green, this branch).
- V5 Worker: build PASS with /atlas routes; v2 gate PASS (atlas segments scoped out, documented).
  verify-site FAILs are PRE-EXISTING (stale 21-totals, proven via stash); studio gate needs
  STUDIO_SHA env (CI-only, unrelated).
- V6 Screenshots: browser backend 2×420s timeout (infra); local headless Chromium installing.
- RISK: worker.js is 2.5MB (1.7MB atlas bundle inlined) — Cloudflare script-size limits
  unverified; code-split or Static Assets if deploy rejects.

## Exact heads (cut 2026-09-08T15:48:21Z; full 40-hex SHAs in `workspace/.tmp-atlas-ledger/obs_*.json`)

| repo | head | branch | open PRs |
|---|---|---|---|
| .github | e9662a4 | main | 0 |
| afm | 248fa56 | main | 0 |
| after-graph-governance | 856c6f6 | main | 7 |
| aftergraph-cron-fabric | cd8652f | main | 0 |
| aftergraph.org | ec54979 | main | 3 |
| aie | 88c1889 | main | 0 |
| autonomous-venture-company | e08d337 | main | 20 |
| brand | f0171b5 | main | 1 |
| context-continuity | 63ab0c9 | main | 0 |
| continuum | befbdab | main | 0 |
| docs | 10a8f39 | main | 0 |
| intelligence-systems-research | d3da7f2 | main | 0 |
| llm-research-development | c6adf46 | main | 1 |
| model-registry | b610e77 | main | 1 |
| runtime | cd9c885 | main | 2 |
| sentinel-firetest | 79cc374 | main | 0 |
| sentinel-firetest2 | e59ce25 | main | 0 |
| sentinel | c09eb71 | main | 2 |
| skills-vault | 8a480b9 | main | 0 |
| studio | d332fe0 | main | 1 |
| trust-gateway | 5ec9dc4 | main | 2 |
| veranza | 1f98773 | main | 0 |
| wi-backend | f2c7843 | main | 0 |
| wi-frontend | 5ed2761 | main | 0 |
| works-execution | 1267f03 | main | 1 |

Base pins: aftergraph.org main `ec549794ec80b0f96c9764af04d15c88fd330c09` (local == origin).
Governance remote advanced past local checkouts on 2026-09-08 — generator re-pins at runtime.
