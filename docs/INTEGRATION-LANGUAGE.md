# Integration Language — Studio × aftergraph.org

Date: 2026-09-07 · Owner: LANGUAGE team · Status: proposal (no renames applied)
Scope: `workspace/studio` (src, packages, UI strings), `workspace/aftergraph.org/site`
(landing/launcher/status/llms), `site/studio-api-proxy.js`,
`aftergraph.org/docs/STUDIO-LIVE-SPEC.md`, `studio/docs/STUDIO-EDGE-BACKEND-SPEC.md`.

## Glossary (canonical per concept)

| Concept | Canonical | Non-canonical (stop using) | Note |
|---|---|---|---|
| Public fixture deployment | Tier-0 demo | demo alone, prototype (for this), static-only | Title-case + hyphen, always with tier number in cross-repo docs |
| Read-only live API | Tier-1 | tier1, read-only live status (as a name) | Proxy `GET`-only allowlist |
| Full backend proxy | Tier-2 | tier2 | Auth passthrough on `/healthz`, `/api/v1/*` |
| Fixture flag | `?demo=1` demo mode | prototype, pilot | Only meaning of "demo" in Studio runtime |
| Repo maturity label | prototype | demo (for repos) | Launcher/llms badge for unfinished repos, not the live deployment |
| Server side | backend | store (when meaning server), state (when meaning server) | Node server today; Worker+DO+D1 edge target |
| In-memory object | state | backend, store | `createInitialState()` shape |
| Persistence | store / storage | backend, state | `WorkspaceStateStore`, storage adapter, localStorage envelope |
| Human gate request | approval | decision (as noun for the object) | Object with `state:'pending'` |
| Human verdict | decision | approval (as verb value) | Values `approved`/`rejected` locally; `approve`/`deny` on Trust Gateway wire |
| User-facing queue | Needs you (`needsYou`) | attention (in UI copy) | Sidebar, dock, Now section |
| Internal signal | attention | needs-you (in code metrics/layout) | `attentionCount`, `data-attention`, `attention-gravity`, runtime `attention:{type}` |
| Durable output | artifact | evidence (for the file itself) | `state.artifacts[]` |
| Proof reference | evidence | artifact (for the proof) | IDs on approvals, `evidenceCount`, EvidenceGraph refs |
| Public route | `/studio/` | studio-app, `/studio` (no slash, as canonical) | Trailing-slash canonical; bare path redirects |
| Edge worker | `aftergraph-studio` | studio-app | Never introduce `studio-app` (zero hits today — keep it that way) |
| Package | `@aftergraph/studio` | studio-app | |
| Product (short) | Studio | — | |
| Product (long, pick ONE — see Decision D1) | Studio operator console [provisional] | Operator UX / operating environment variants | LIVE-SPEC intent line is the provisional canonical |
| Offline fixture boundary | local-only fixture data, no backend | local mode, offline-capable, static only (as synonyms in copy) | One boundary sentence everywhere (see D2) |

## Conflict list (with file:line evidence)

### C1 — demo vs prototype vs Tier-0
- `aftergraph.org/docs/STUDIO-LIVE-SPEC.md:1` — "Tier-0 demo"; `:9` — "Tier-0: static only, fixture data, no backend".
- `studio/docs/STUDIO-EDGE-BACKEND-SPEC.md:17` — "(Tier-0/1/2, proxy)"; `:68` — "from Tier-0 stub"; `:96` — "returns to Tier-0"; `:93` — "Demo shell".
- `aftergraph.org/site/studio-build.cjs:2` — "Tier-0 static demo"; `site/studio-static.mjs:1` — "Tier-0 static entry"; `site/studio-wrangler.toml:1` — "Tier-0 demo worker"; `site/verify-studio.cjs:2` — "Tier-0 demo".
- `aftergraph.org/site/studio-build.cjs:154` — `mode: 'demo'` in `version.json` (4th name for the same tier).
- `studio/src/app/bootstrap.mjs:44` — `DEMO_STORAGE_KEY`; `:46-48` — "`?demo=1` forces fixture data … never renders the `runtime-empty` shell"; `:53` — `isDemoMode`; `:861` — `toast('Demo reset')`.
- `studio/src/state.mjs:13` — `demo-user`; `:88-89` — `source: 'demo-fixture'` vs `'runtime-empty'`; `:95-99` — empty shell.
- `studio/src/api-client.mjs:80-106` — `actor='demo-user'` defaults on ~10 methods (identity, not deployment tier).
- `aftergraph.org/site/launch.html:74` — Studio repo badge `prototype` vs `:75` — "Studio — Live demo" badge `demo` (same product, two adjacent rows, two maturities).
- `aftergraph.org/site/index.html:71` — landing link text "Live demo" → `/studio/`.
- `aftergraph.org/site/status.html:25` — Status column "Demo" + boundary "interactive demo, local-only fixture data, no backend".
- `aftergraph.org/site/llms.txt:17` — "Studio demo … (maturity: demo)" vs `:16` — "Sentinel … (maturity: prototype)".

### C2 — backend vs state vs store
- `studio/src/state.mjs:11` — `createInitialState()` (in-memory state factory).
- `studio/src/server-store.mjs:7` — `WorkspaceStateStore` (file-backed `.runtime/*.json` store).
- `studio/src/storage-adapter.mjs:5` — `createStorageAdapter` (localStorage envelope `{version, savedAt, state}`).
- `studio/src/app/bootstrap.mjs:106` — `backendConnected`; `:211` — `data-backend-state … 'connected':'local'`; `:218` — warn "degraded to local mode"; `:550` — `'connected':'local'`; `:613` — "'Server-backed':'Local reference'".
- `studio/src/api-client.mjs:38,49` — error code `backend_unavailable`.
- `aftergraph.org/docs/STUDIO-LIVE-SPEC.md:9-10` — "no backend. Backend proxy (Tier-1/2) is an explicit non-goal"; `:102` — "stays in local mode with demo badge".
- `studio/docs/STUDIO-EDGE-BACKEND-SPEC.md:29-31` — "File state (`.runtime/*.json`) → per-user DO; LRU + disk reseed → D1"; `:41-45` — "DO holds live workspace state; D1 holds versioned snapshots".
- `aftergraph.org/site/studio-api-proxy.js:11` — `BACKEND_URL`; `:90` — `backend_unreachable` (3rd backend-* token alongside `backend_unavailable`, `backend_not_configured` at `:108`).

### C3 — approval vs decision
- `studio/src/state.mjs:112` — `decideApproval(state, id, decision, actor)`; `:116` — checks `['approved','rejected']`; `:117` — `approval.state = decision`.
- `studio/src/api-routes.mjs:27` — `/api/v1/approvals/:id/decision`; `src/api-client.mjs:81` — `decideApproval(id, decision, …)`.
- `studio/src/app/controller.mjs:17-19` — `decideApproval` → `remote('approval.decide', …)`.
- `studio/src/integrations/trust-gateway.mjs:3-6` — `approvalVerb`: `approve|approved→approve`, `deny|denied|reject|rejected→deny`; `:19` — posts `…/approve|deny`.
- `studio/src/views/control-view.mjs:25` — heading "Needs your decision" (local) vs `:26` — "Enforcement decisions" (Trust Gateway) with buttons `data-upstream-decision="approve|deny"` (`:14`); `:14` fallback title `'Decision'`; `:30` contract badge `approval.decide`.
- `studio/src/app/bootstrap.mjs:263` — `['approval','decision']` both open the approval dialog; `:639` — "Approve N pending decisions?"; `:646` — `decisionError`; `:814` — "No approval needs attention"; `:921` — maps button `approve→approved`, `deny→rejected`.
- `studio/src/federation/core-integrations.mjs:13` — capability `approve|deny` vs write `approval.decide` on one line.

### C4 — needs-you vs attention
- `studio/src/state.mjs:25` — field `needsYou[]` (types `approval|budget|credential`).
- `studio/src/app/bootstrap.mjs:308` — sidebar "Needs you" + `attentionCount(state)`; `:325` — aria "Review attention items"; `:409` — dock "Needs you"; `:598` — `section#needs-you` aria "Needs your attention", heading "Needs your attention", meta "`N` need you" (three casings in one template); `:679` — `attention:'needs-you'|'normal'`; `:692` — `data-attention`; `:713` — animation `'attention.focus'`; `:561,568` — CSS `attention-gravity`.
- `studio/src/ui-helpers.mjs:12` — `attentionCount` sums `needsYou.length + pendingUnlinked`.
- `studio/src/needs-triage.mjs:2` — "Needs-you triage … for the attention queue".
- `studio/src/app/render-scheduler.mjs:8` — `runtimes[*].attention.type`; `:13` — scope `'approvals/needsYou'`; `:43` — `runtimeAttention`.
- `studio/src/live-runtime.mjs:8,17` — `attention:{type:'approval'}`; `src/compose-engine.mjs:42` — surface `kind:'needs-you'`; `:45` — default surface `'attention-feed'`.
- `studio/src/integrations/trust-gateway.mjs:16` — `needsYou()` → `GET /v2/need-you/now` (camel field, kebab path, hyphen label).
- `studio/src/state.mjs:76` — connector state `'needs_attention'` (snake_case third spelling).
- `aftergraph.org/site/status-data.json:49` — "needs-you flows".

### C5 — artifact vs evidence
- `studio/src/state.mjs:64-69` — `artifacts[]`; `art_release` has `kind:'Evidence'`, title `release-evidence.json` (an artifact typed as Evidence); `:31-32` — `approval.evidence=[ids]`; `:35-51` — `mission.evidenceCount`, `agent.evidence`; `:87` — `telemetry.evidence:64`.
- `studio/src/domain.mjs:9` — output = "Artifacts, evidence, history and replay"; `:33` — both map to `output`.
- `studio/src/app/bootstrap.mjs:262` — `['artifact','evidence']` both open the artifact surface; `:372` — "Artifact, evidence and decision trail"; `:451` — zoom `evidence` resolves to an artifact id; `:488` — dock tabs Artifact/Agent/Evidence/Replay; `:508` — `kind:'evidence'` → surface "Mission evidence"; `:561` — "Verification evidence"; `:622` — "Durable artifacts, evidence and history".
- `studio/src/federation/evidence-graph.mjs:4` — `registerEvidence` requires `{id, owner, class, method}`, conflicts throw.
- `studio/src/verify-status.mjs:18-19` — badge "for an artifact card"; `:58` — payload joins artifact+mission.
- `studio/src/integrations/governance.mjs:40`, `src/state.mjs:140` — VERIFIED requires evidence (invariant both places — good, shared wording).
- `aftergraph.org/site/index.html:71` — "evidence plane" (site) vs Studio "Verification evidence" (app) for adjacent ideas.

### C6 — /studio vs studio-app
- `aftergraph.org/docs/STUDIO-LIVE-SPEC.md:7-8` — route `/studio/`; `:22` — `aftergraph.org/studio/* → aftergraph-studio`; `:33` — scope under `/studio/`; `:95` — attach route "dashboard or API token, one manual step".
- `studio/src/router.mjs:3-5` — `<base>` mount point, rewritten to `/studio/`; `:58-61` — `buildDeepLink` + `withBase`.
- `studio/index.html:4` — `<base href="/">`; `studio/manifest.webmanifest:5-6` — `start_url:"/chat"`, `scope:"/"` (both rewritten at build time per LIVE-SPEC `:31-37`).
- `aftergraph.org/site/studio-static.mjs:7-9` — strips `/studio` prefix; `site/studio-wrangler.toml:11` — worker `aftergraph-studio`; `studio/package.json:2` — `@aftergraph/studio`.
- `studio-app`: **zero hits** across `workspace/studio` + `workspace/aftergraph.org` (literal search). The rival name exists only in the integration brief, not the code — keep it that way.

### C7 — tiers naming (case/shape drift)
- Title-case hyphen in specs/build: `Tier-0` (LIVE-SPEC `:1,:9`; EDGE `:17,:68,:96`; `studio-build.cjs:2`; `studio-static.mjs:1`; `studio-wrangler.toml:1`; `verify-studio.cjs:2`), `Tier-1`/`Tier-2` (`studio-api-proxy.js:1,3,6`; EDGE `:68` "Tier-0 stub … edge backend" implies Tier-2 without naming it).
- Lowercase in proxy runtime: `STUDIO_API_TIER="tier1"|"tier2"` (`:12`), `tierOf()` (`:44-46`), header `x-studio-api-tier` (`:69,93`), errors `tier1_read_only` (`:110`), `tier1_not_allowlisted` (`:113`).
- `mode:'demo'` (`studio-build.cjs:154`), badge `demo` (`launch.html:75`), table cell `Demo` (`status.html:25`), `maturity: demo` (`llms.txt:17`) — four casings for Tier-0 in user-visible surfaces.

### C8 — product name (five variants)
- `STUDIO-LIVE-SPEC.md:7` — "Studio operator console".
- `site/launch.html:74` — "Operator UX — mission status, evidence, approvals".
- `site/status-data.json:49` — "Operator and product experience …".
- `site/status.html:39` — "General-purpose human operating environment".
- `studio/index.html:8` — "Sovereign Operating Environment … (Workspace v5)"; `:9` — title "Governed Operating Environment"; `manifest.webmanifest:4` — "Agentic Operating Environment"; `package.json:6` — "V6 Unified Intelligence Operating Environment".

### C9 — offline boundary sentence (four variants)
- "no backend" (`status.html:25`; `launch.html:75`; `llms.txt:17`; LIVE-SPEC `:9`).
- "local mode" (`bootstrap.mjs:218`; LIVE-SPEC `:102`).
- "local-only fixture data" (`status.html:25`; `launch.html:75`; `llms.txt:17`).
- "static only" (LIVE-SPEC `:9`); "offline-capable" (LIVE-SPEC `:101` acceptance); "local" `data-backend-state` (`bootstrap.mjs:211,692`).

## PROPOSED renames (not applied — ranked by confusion risk)

**P0 — user-visible tier confusion (fix first, site-only, no Studio code change)**
1. Launcher `launch.html:74-75`: keep `Studio`/`prototype` (repo) + `Studio — Live demo`/`demo` (deployment), but append tier to the demo description: "…no backend · Tier-0". Same for `status.html:25`, `llms.txt:17`, landing `index.html:71` link title.
2. `status.html:25` cell `Demo` → `Tier-0 demo` (matches spec + worker comment, kills Demo/demo/maturity drift in C7).
3. `studio-build.cjs:154` `mode:'demo'` → `mode:'tier-0'` (keep accepting `'demo'` on read for one release).

**P1 — approval/decision verb collision (blocks correct audit copy)**
4. Reserve `decision` for the verdict value only. Rename UI string `control-view.mjs:25` "Needs your decision" → "Needs your approval" (local section), keep `:26` "Enforcement decisions" for Trust Gateway (remote verbs are approve/deny, not approved/rejected).
5. Rename `bootstrap.mjs:639` "pending decisions" → "pending approvals"; keep `decisionError` prop name (code-only, no user impact).
6. Document once (this file is that place): local `approved|rejected` vs upstream `approve|deny` + `approvalVerb` map (`trust-gateway.mjs:3-6`). No code change — the map is correct, only the copy around it is mixed.

**P2 — artifact/evidence blur (integrity-adjacent)**
7. `state.mjs:68` fixture `kind:'Evidence'` → `kind:'Document'` (title `release-evidence.json` stays; kind is the type system, and `Evidence` as a kind breaks the artifact≠evidence rule). Fixture-only change.
8. Dock/zoom copy `bootstrap.mjs:488,451,508`: label the tab `Evidence` → `Verification` (surface shows the verify graph, not a file). Keeps `artifact` vs `evidence` disjoint in the only place both open the same panel (`:262`).

**P3 — needs-you/attention split (code + copy convention, no behavior change)**
9. UI copy uses "Needs you" / "Needs your attention" only (`bootstrap.mjs:308,409,598` — already mostly there); `data-attention`, `attention-gravity`, `attentionCount`, `attention-feed` stay code-internal. Rename `:325` aria "Review attention items" → "Review needs-you items".
10. Normalize spellings to `needsYou` (code), `needs-you` (DOM/CSS), "Needs you" (prose). Migrate `needs_attention` (`state.mjs:76`) and `/v2/need-you/now` path is fine as-is (frozen wire contract — document, don't rename).

**P4 — backend/state/store (docs + identifiers, lowest user risk)**
11. Convention: `backend` = server/edge; `state` = `createInitialState` shape; `store` = `WorkspaceStateStore` / storage adapter / DO+D1. Rename nothing in hot paths; fix prose: LIVE-SPEC `:9` "no backend" stays, EDGE `:29-31` mapping table becomes the canonical backend/state/store split and both specs link here.
12. Unify the three backend-* error tokens in docs (`backend_unavailable`, `backend_unreachable`, `backend_not_configured`) into one table; do not rename codes (wire-visible).

**P5 — route/worker/package (guardrail, no change)**
13. Canonical: route `/studio/`, worker `aftergraph-studio`, package `@aftergraph/studio`. Add a one-line guardrail to `verify-studio.cjs`: fail on the string `studio-app` anywhere in `studio-dist`. It does not exist today — this keeps it that way.

**Explicitly NOT proposed:** renaming `tier1`/`tier2` env values or error codes (deployed wire contract); renaming `/v2/need-you/now`; touching `<base>`/manifest rewrite logic; any Studio `src/` behavior change.

## Decision-needed

- **D1 — Long product name.** Five variants in C8. Proposal: "Studio operator console" everywhere public (matches LIVE-SPEC intent). Confirm or pick one; loser list goes to a brand follow-up, not this integration.
- **D2 — Boundary sentence.** Proposal: "Tier-0 demo — interactive, local-only fixture data, no backend." applied verbatim to landing card, launcher row, status boundary, `llms.txt`, and the in-app demo badge tooltip. Confirm wording.
- **D3 — `mode:'demo'` → `mode:'tier-0'`.** Read-compat window (accept both for one release) acceptable? Affects `version.json` consumers incl. `verify-studio.cjs:107-108,148-150`.
- **D4 — Enforcement copy.** Is "Enforcement decisions" (Trust Gateway) vs "Needs your approval" (local) the right split, or should both say "approval"? Trust Gateway team to confirm authority semantics.
- **D5 — Evidence tab → "Verification".** Research/evidence-plane owners to confirm the dock label does not collide with the site "evidence plane" concept (C5).
- **D6 — Owner of this glossary.** Proposal: LANGUAGE team owns this file; both specs link here as canonical; any new Tier-N or maturity term requires a glossary row first.
