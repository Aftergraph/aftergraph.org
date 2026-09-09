# Atlas Architecture (frozen 2026-09-08)

Atlas is a read-only evidence-aware digital twin and development observatory for the
Aftergraph polyrepo platform. It aggregates Governance, GitHub, Docs, Skills Vault,
AFM/Model Registry, ISR/Continuum (later Runtime/WORKS/Trust Gateway) and renders them
as one deterministic, provenance-labelled workspace. It owns nothing it displays.

## 1. Host and deployment fit

- Home: `Aftergraph/aftergraph.org`, route `/atlas`.
- Sources: `atlas/` (scoped frontend build: `package.json`, `src/`, `tests/`, `vite.config.ts`).
  It compiles immutable versioned static assets into `site/atlas/` (hashed JS/CSS + `index.html`
  + generated `projection.json`). The existing Cloudflare Worker serves `site/atlas/` as static
  files via a `build-worker.cjs` addition. The rest of aftergraph.org is untouched — it is not
  converted into a JS application.
- Data input: `site/generate-atlas-projection.mjs` (node stdlib only) emits
  `site/atlas-projection.json` (committed source data) BEFORE the vite build, which compiles
  it in; `build-worker.cjs` copies it to `site/atlas/projection.json` for runtime fallback. No live GitHub calls from the
  browser, no runtime CDN dependencies (no esm.sh/unpkg in production): reproducible builds,
  pinned lockfile versions, CSP-compatible, unit-testable, visual-testable, reliable offline CI.
- No local build step for the REST of the site: only `atlas/` is a JS application.
- Build sequence (order matters): `npm --prefix atlas run build` (vite wipes
  `site/atlas/` via emptyOutDir, including the copied projection/snapshots) →
  `node site/build-worker.cjs` (restores `site/atlas/projection.json` +
  `site/atlas/snapshots/` copies, rebuilds `site/worker.js`) → verify
  (`verify-atlas.cjs`, DOM smoke). Never commit a tree where vite ran without
  the build-worker restore.
- Respects aftergraph.org ownership: aggregation + routing only; private repos surface as
  name + plane/role + explicitly public description (private-source boundary).

## 2. Data pipeline (no hand-maintained repo list, no duplicate canonical DB)

```
Governance @ pinned SHA ── topology/1.0, contracts, dependencies.yml ─┐
GitHub API @ evidence cut ── repos, HEADs, PRs, CI ───────────────────┼─▶ generate-atlas-projection.mjs ─▶ site/atlas/projection.json ─▶ vite build ─▶ site/atlas/ ─▶ Worker
Docs / Vault / AFM / Registry / ISR (repo-owned files @ pinned SHAs) ┘
```

- Generator inputs are pinned SHAs recorded in projection meta. Re-run = new cut, never an edit.
- Canonical ownership/contracts are referenced (name/version/SHA), never copied into a rival DB.
- UI fetches only the projection JSON. No live GitHub calls from the browser, no mutations anywhere.

## 3. Truth planes (never silently reconciled)

- CANONICAL: Governance-owned topology/contracts/ownership/terminology.
- OBSERVED: fresh GitHub/runtime/repo state at the exact cut.
- PROPOSED: open PRs + unmerged branches (e.g. gov `feat/topology-add-runtime`).
- Planes live on ASSERTIONS, never on entities (PROJECTION-SCHEMA.md v0.2): one entity routinely
  carries assertions on all three planes at once. Overlays filter assertions by plane;
  the visible graph is derived per active plane set and labels which planes fed it.
- `conflicts[]` records each canonical/observed/proposed disagreement (C1–C6 in LEDGER)
  with both sides cited. Drift mode = conflicts painted on the graph, listed with evidence links.

## 4. Workspace layout (dominant interactive surface)

```
+--------+--------------------------------------------+-----------+
| tree   |  directed topology (React Flow + ELK)      | inspector |
| (nav)  |  overlays: Canonical/Observed/Proposed/    | (select:  |
|        |  Evidence | drift mode | impact highlight | provenance|
+--------+--------------------------------------------+-----------+
| pulse strip (dev activity) | contract explorer | view tabs: capabilities / AFM lineage / research / snapshots / Ask |
```

- Tree + graph + inspector are synchronized: one selection model, URL-addressable
  (`?node=<id>&overlay=<planes>&view=<tab>`), keyboard-navigable (arrows move selection,
  Enter focuses inspector, Esc clears).
- Deterministic layered ELK layout (`elk.layered`, direction DOWN, stable entity/assertion ids,
  fixed layout options) computed from the plane-filtered derived graph. Same projection +
  same plane set ⇒ same laid-out graph. Layout snapshot test pins it. ELK ships as a bundled
  vite dependency (elkjs, lockfile-pinned), not a runtime CDN fetch.
- D3 is used ONLY for the research-constellation exploratory view (force layout, clearly
  labelled non-canonical arrangement).
- Reduced motion: `prefers-reduced-motion` disables animation/transitions; ELK still lays out statically.
- Mobile (<760px): neighborhood focus — selected node + 1-hop subgraph + inspector sheet.
  The full graph is never shrunk to fit.

## 5. Views (all read from the same projection)

- Impact analysis: BFS upstream/downstream over `depends/consumes/provides` edges from selection.
- Development pulse: commit/PR/CI activity strip per repo from OBSERVED plane.
- Contract explorer: governance contract register with owner/consumer repos and version pins.
- Capability/tool/MCP graph: skills-vault manifest nodes (quarantined skills flagged, never hidden).
- AFM lineage: model/program → registry entries → evaluation evidence (AFM + model-registry READMEs).
- Research constellation: ISR/Continuum studies mapped to repos they evaluate (D3 force, exploratory label).
- Snapshots: versioned projection files (`projection-<cut>.json`); diff view = entity/assertion/conflict deltas.
- Ask Atlas V0: extractive Q&A over projection assertions with per-answer citations
  (assertion ids). V0 is NOT the ceiling: the retrieval boundary is shaped for a later grounded
  reasoning layer — question → retrieve projection assertions → assemble evidence set →
  generate explanation → validate every claim against the evidence set → return
  provenance-linked answer. A language model may then synthesize explanations; it may never
  manufacture or upgrade evidence, and the validator rejects any claim with no supporting
  assertion id. Until that layer exists, unanswerable-from-projection questions say so.

## 6. Evidence rule (UI is never authoritative)

Every consequential displayed claim (ownership, maturity, head SHA, contract version, study
result, drift badge) opens a provenance popover: source, source_type, repository, ref/SHA,
observed_at, evidence_level, truth_plane, freshness, conflict status. Missing provenance =
rendered as "unverified", never as a stronger claim. No fake maturity upgrades: maturity
labels come only from repo-owned truth (e.g. aftergraph.org evidence classes), defaulting
to "unknown" with the gap shown.

## 6b. Strict read-plane

/atlas aggregates, projects, searches and explains authoritative sources. It never owns
Governance, Runtime, WORKS, Trust Gateway, model lifecycle, skills or research truth and
never performs operational actions: no approvals, dispatches, merges, deployments, secret
or policy writes. Any future action affordance deep-links to the owning product/runtime
surface, which enforces its own authority. The projection contains no action endpoints.

## 7. Brand OS

Tokens + assets from canonical `Aftergraph/brand` (build-time reference; current mirror
`tokens.css`/`tokens.json` derived from brand v1.0.0, `--ag-*` prefix). Dark-first, light
override via `data-theme`. Typography: Inter / JetBrains Mono / Source Serif 4.

## 8. Known limitations (verified, not aspirational)

- Temporal axis is cuts + snapshots. Pulse shows the latest cut; snapshot diff
  compares two cuts. 24h/7d/30d windows do not exist — no history is captured
  yet, and none is faked.
- Capabilities / AFM lineage views are labeled PREVIEW fixtures
  (`docs/atlas/enrich/fixtures.json`), not generated assertions. Generator v0.3
  activates them. Flagged fixture content renders withheld + reason (E26).
- Ask Atlas is V0 extractive. No LLM synthesis layer exists; the plug-point
  contract (`answerFromEvidence` + `validateAnswer`) is defined and tested (E24).
- No live Runtime/WORKS/mission feed is wired. No mission observatory view
  exists; nothing invents operational state.
- Graph scale: ELK layered layout measures ~1.1s one-time at 500 nodes (E31
  probe); desktop renders the full graph without virtualization. Mobile uses
  neighborhood focus, never the shrunken full graph.
- Data is frozen at the evidence cut (header shows age + STALE past 24h).
  Between cuts Atlas is honestly out of date, never silently live.
- Private sources ship as names/roles only; exact HEADs, messages, push dates
  and PRs are withheld by policy and gated in CI (E18/E20).
- Screenshots are machine-gated (DOM: overlap, contrast, viewports); human
  aesthetic review of `atlas/qa-shots/` remains open.
