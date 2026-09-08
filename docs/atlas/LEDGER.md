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
- E10 Ghost file-mixing: AFM/AVC sections appended into the Atlas owner brief (twice).
  Split — brief restored to Atlas-only (38 lines); AFM content relocated to
  docs/atlas/afm-inbox.md (UNVERIFIED by Atlas mission). Newest ghost refinement lost
  via volatile /tmp — lesson: never stage through /tmp. Co-author still unidentified;
  code contributions welcome but file-mixing into owner briefs is out of bounds.
- E11 CI wired (v2-interface.yml: install/test/build/verify steps, feat/atlas trigger,
  bundle gate covers site/atlas/). Full CI sequence proven locally from clean `npm ci`.
  Fixed 13MB stale-hash bloat (emptyOutDir + projection.json as committed source data).
  Pushed 61d1068.
- E12 CI red → root-caused: projection tests used hardcoded C:/ paths + network git fetch
  (spawnSync /bin/sh ENOENT on runner). Fixed with hermetic fixtures
  (site/atlas-fixtures/mkfixtures.mjs: frozen cut + local gov git repo): 11/11 green,
  live-input path re-proven (144/316/187/2 + gate PASS).
- E13 CI green on branch (run 34260260745, 27s). Shipped :focus-visible styles +
  DOM a11y smoke (names/labels/lang/headings/Tab/focus indicator). Pushed 1db53b9.
- E14 Snapshots/time-machine live: --snapshot-dir (immutable, indexed, 12/12),
  SnapshotsView with diffProjections before/after (29/29 vitest, DOM PASS),
  first real snapshot seeded. Pushed 3ad919d.
- E15 CI green on 0f48af4 (27s). Rebuilt-bundle rule: rebuild + check
  site/atlas/ status before every push.
- E16 System x-ray live: tracePath BFS + per-hop plane badges (32/32 vitest),
  inspector from/to + graph highlight + honest no-path gap, DOM-covered.
  Pushed fc07b9c.
- E17 Performance: function-form manualChunks (react/flow/elk/d3/lib) after
  finding reactflow is scoped multi-package; app entry 30KB, vendors cached
  independently (32/32, DOM PASS). Pushed 3ee78d7.
- E18 SECURITY privacy leak fixed + shipped: public projection/repo_pins/worker
  bundle carried exact HEAD SHAs of all 11 private repos (verify gate only checked
  assertions, not meta/shipped bundles). Repaired: public-only pins +
  meta.private_repos, branch-pinned private provenance refs, withheld private
  valid_at, ledger table scrubbed, old snapshot redacted+regenerated from same
  cut (144/316/187/2 unchanged), tree-wide scan 0 SHAs, 13/13 + 32/32 + DOM PASS.
  Pushed 1c0c5eb.
- E19 Failure states: UI now fail-closed on malformed projection —
  derive.validateProjection gates build+fetch sources, dedicated malformed state
  with reasons (no mid-render crash). 5 new vitest (37/37), DOM/verify PASS.
  Pushed ffab6ca.
- E20 Gate hole closed: poison-proven that exact-head refs on private subjects
  (E18 2nd vector) PASSED verify-atlas; added leaksHead invariant (gov-SHA
  exempt, relations covered). Poison FAILs (1 violation), real PASSes.
  Pushed 545ea87.
- E21 CI browser smoke: site/serve-local.cjs (stdlib static server, DOM PASS
  verified locally) + workflow chromium install and smoke step after worker
  compile. Pushed 986cf97.
- E22 Production gate complete in CI (run 34268801913 success): install-lockfile,
  unit, projection, build, verify, worker, chromium, DOM smoke (incl. embedded
  a11y: named controls, labels, Tab focus, focus indicator), V2 contract,
  bundle-current, diff-check — all green. Watch: checkout pin logs Node20
  deprecation (forced to 24, still green).
- E23 Truth refresh: 5/14 public repos moved since 15:48 cut → new cut
  19:30:48Z via site/capture-observed.mjs (reproducible gh-CLI, 25/25).
  Projection 144/319/190/2, old snapshot preserved, 0 private SHAs,
  13/13 + 37/37 + verify + DOM PASS. Pushed 232e567.
- E24 Ask boundary as code: answerFromEvidence composer (retrieve → evidence →
  validate → verdict) rewired into AskView; smuggled-citation rejection tested;
  LLM plug-point contract explicit. 39/39 vitest, DOM PASS. Pushed a5c97aa.
- E25 Screenshots refreshed (4 shots, atlas/qa-shots, committed d08976c) against
  19:30 cut; DOM assertions green. Human visual review still open: vision tool
  errored this session (provider 400 on reasoning param) — shots await eyeballs.
- E26 Audit find: fixture previews published clearance-flagged private names
  (skill name, candidate release filenames) despite their own boundary flags.
  PreviewView now withholds flagged subject+value (shape + reason only), DOM
  gate covers it. Open Jonas decision: fixtures.json draft names predate this
  in git history (keep-vs-purge). Build-sequence rule documented (vite wipe →
  build-worker restore bit us mid-slice, repaired c00c0ed). Pushed e1312b0.
- E27 Owner brief rewritten: decision-pack.md refreshed to current cut/gov,
  WI-gate disagreement verified resolved (dropped), 3 new Jonas decisions
  (fixtures history, visual review, merge auth). Pushed d0d6608.
- E28 Completion-gate scorecard (exact head ac54ff6, CI 34271209430 success):
  GREEN — truth refresh (E23), assertion schema v0.2, generator (+capture),
  provenance on all assertions/relations, leakage gate (poison-proven),
  topology workspace, drift/conflicts, inspector, impact (2-hop+tests),
  pulse (latest-cut table, no fake windows), contracts, capability/AFM as
  labeled PREVIEW fixtures (E26 redaction), research exploratory label,
  snapshots + diff, Ask V0 + code boundary (E24), responsive + mobile
  neighborhood, keyboard, reduced-motion CSS, empty/malformed/stale states,
  bundle split, all suites green (13/13, 39/39, verify, DOM+a11y smoke),
  docs match, branch clean + pushed, CI green.
  OPEN — screenshots human review (E25 vision outage); pulse 24h/7d/30d
  windows (no history captured yet — honestly absent, not faked);
  fixtures.json history keep-vs-purge; production merge (Jonas auth).
- E29 Machine visual QA: vision tool still down (same provider 400), so the
  DOM smoke now asserts what eyeballs would check first — zero overlapping
  topology node pairs + body-text contrast >= WCAG AA 4.5. PASS. Human
  aesthetic review stays open; structural-visual is gated. Pushed 5c702d3.
- E30 CI Raphael paid off same-day: the new overlap gate FAILED in CI (1 pair,
  Ubuntu fonts) while passing locally. Root cause: .rf-node content-sized vs
  ELK fixed 190x54 contract. Fixed in CSS (fixed boxes + ellipsis, full id in
  title/inspector) + DOM now covers all remaining views (no error boundary).
  CI re-run 34272221503: all 13 steps green incl. smoke. Closed.
- E31 Growth probe: atlas/scripts/perf-probe.mjs synthesizes N-repo projections
  (derive + ELK layout timed). N=25/100/200 → elk 102/114/178ms, derive ~0ms,
  all positioned. Org can grow 8x with headroom. Pushed 01eaea5.
- E32 Conflicts link proposed candidates: generator attaches derived proposed[]
  (open PRs on involved sources + governance for intra-canonical; C4 surfaces
  gov #38/#39/#40 incl. the actual C4 Raphael). Candidates, never resolutions;
  gate + drift UI + fixture test cover it. 14/14 + 39/39 + DOM PASS.
  Snapshot re-emitted same-cut, diff-proven additive-only. Pushed 3c637fe.
- E33 Tablet QA: DOM smoke covered desktop + mobile but not tablet. Added
  820x1180 pass (full topology renders, zero horizontal overflow). PASS.
  Pushed 6db24df.
- E34 Shots re-taken: prior set predated E26/E30/E32 visual changes. All
  5 views re-shot on current UI + capabilities view added to shoot.mjs.
  Pushed 32f0f24.
- E35 Merge-readiness proven: main == branch base (no main-side movement),
  dry-run merge feat/atlas → main in a scratch worktree: zero conflicts,
  and the merged tree passes 14/14 + verify + worker + V2 contract.
  Worktree removed after. Merge is Jonas-gated as ever — this only proves
  it will be clean whenever he says go.
- E36 Docs gap closed: ARCHITECTURE.md had no known-limitations section
  (completion gate demands it). Added 8 verified limitations, each checked
  against code (incl. 24h STALE threshold in cutAge). Pushed 3d13390.
- E37 Ledger evidence refreshed: exact-heads table still showed 15:48 pins
  after the 19:30 re-cut. All 14 public rows re-pinned + PR counts from the
  live projection; private rows now withhold heads AND PR counts (counts are
  activity state the projection itself withholds).
- E38 Time-machine Raphael: exercising the real 15:48→19:30 diff showed 293
  'changed' (whole-projection timestamp churn) while genuine value changes
  were invisible (ids embed value hash; added/removed untracked). diffProjections
  is now semantic (observed_at stripped) + tracks added/removed ids: real cuts
  diff as 42 changed + 26/23 added/removed. Snapshots view shows +/- counts.
  40/40 vitest, DOM PASS. Pushed f03fa8a.
- E39 Time-machine click path: DOM only checked the snapshots heading, never
  the diff itself. Now clicks 'diff vs current' and asserts the comparing
  block + added/removed counts render. PASS. Pushed 411695c.
- E40 Ask interaction: DOM never submitted a question. Now drives answered
  (plane-tagged citations render) + unanswerable (honest state) paths;
  fixed a strict-mode locator collision on the way. PASS. Pushed a30146d.
- E41 Impact interaction: DOM never clicked 'Show impact'. Now asserts the
  dependents/dependencies block renders for a selected node. PASS. Pushed cf8f6d3.
- E42 Overlay toggles: DOM never touched plane filters. Now flips PROPOSED
  off/on asserting aria-pressed, URL persistence and a non-empty graph.
  PASS. Pushed 78c88d4.
- E43 Keyboard Raphael (real bug): Escape never cleared selection — React Flow
  stops its propagation AND focus rests on BODY after pane clicks. Window-
  capture handler scoped to pane + engagement ref; arrows stay in-pane.
  DOM covers arrows-select + Escape-clear. Also caught: local rollup native
  dep rotted while `| tail` masked non-zero exits — npm ci restored, builds
  now assert exit codes (CI was unaffected). PASS. Pushed 05c8393.
- E44 Cut #3 (21:12:42Z): cron-fabric moved after ~2h quiet. Full re-cut
  25/25, projection 144/319/190/2, 3rd snapshot indexed, ledger table
  re-pinned. 14/14 + 40/40 + verify + DOM PASS, 0 leaks. Pushed cdef3c9.
- E45 Diff noise Raphael: cut#2→cut#3 showed 30 'changed', 27 of them cut-label
  churn inside presence derivation sources (my E38 'leave it' was wrong at
  90% noise). sem() normalizes cut labels; true diff is 3 ref updates +
  6/6 id churn. 40/40 + DOM PASS. Pushed 88cdab7.
- E46 Contract navigation: DOM never clicked a contract row. Now asserts row
  click addresses the node in URL and opens its inspector. PASS. Pushed 95f1b24.
- E47 Pulse navigation: same gap, same Raphael for pulse rows (incl. repairing
  my own duplicate-page block slip with node --check first). PASS. Pushed cf4042d.
- E48 Empty/loading states: tree filter now reports "No entities match" (role
  status) instead of silent empty list; snapshot inspect shows Loading + clears
  stale diff on re-click. 40/40 vitest + projection tests + verify PASS.
- E1 Live org list (25): `gh repo list Aftergraph` 2026-09-08 (see OBSERVED cut files).
- E2 Rename proof: `gh api repos/Aftergraph/work-intelligence-v2` returns `name: wi-backend` (redirect).
- E3 Canonical 21: `platform-topology/1.0.json` cut 2026-09-07 (workspace clone).
- E4 Spike 14: `aftergraph-site/data.json` (14 entries, governance 7 PRs / site 3 PRs — stale).
- E5 Brand tokens v1.0.0 provisional-not-trademark-cleared (`.tmp-brand/tokens.json` mirror; canonical `Aftergraph/brand`).
- Exact cuts: OBSERVED raw cut `2026-09-08T15:48:21Z` in `workspace/.tmp-atlas-ledger/obs_*.json`; refresh cut `2026-09-08T19:30:48Z` in `workspace/.tmp-atlas-ledger-2/obs_*.json` (via site/capture-observed.mjs).

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

## Exact heads (cut 2026-09-08T21:12:42Z; full SHAs in `workspace/.tmp-atlas-ledger-3/obs_*.json`)

| repo | head | branch | open PRs |
|---|---|---|---|
| .github | e9662a4 | main | 0 |
| afm | private-withheld | main | withheld |
| after-graph-governance | 5f53273 | main | 3 |
| aftergraph-cron-fabric | ac7ad2b | main | 2 |
| aftergraph.org | ec54979 | main | 3 |
| aie | 3c999d2 | main | 0 |
| autonomous-venture-company | private-withheld | main | withheld |
| brand | f0171b5 | main | 1 |
| context-continuity | private-withheld | main | withheld |
| continuum | private-withheld | main | withheld |
| docs | 5cc016c | main | 5 |
| intelligence-systems-research | d3da7f2 | main | 0 |
| llm-research-development | private-withheld | main | withheld |
| model-registry | private-withheld | main | withheld |
| runtime | private-withheld | main | withheld |
| sentinel-firetest | private-withheld | main | withheld |
| sentinel-firetest2 | e59ce25 | main | 0 |
| sentinel | 75fee89 | main | 2 |
| skills-vault | private-withheld | main | withheld |
| studio | d332fe0 | main | 1 |
| trust-gateway | 5ec9dc4 | main | 2 |
| veranza | private-withheld | main | withheld |
| wi-backend | f2c7843 | main | 0 |
| wi-frontend | private-withheld | main | withheld |
| works-execution | 1267f03 | main | 1 |

Base pins: aftergraph.org main `ec549794ec80b0f96c9764af04d15c88fd330c09` (local == origin).
Governance remote advanced past local checkouts on 2026-09-08 — generator re-pins at runtime.
