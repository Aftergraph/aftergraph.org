# INTEGRATION-FILES — Studio × aftergraph.org file structure + connection map

Date: 2026-09-07 · Owner: FILES team · Status: draft · Read-only rule: this doc is the
only FILES-team write; everything below is observed, not modified.

Two git roots, one system. `workspace/` itself is NOT a repo.
- `workspace/studio/` → git root `studio` (app source of truth, `@aftergraph/studio@6.0.0`).
- `workspace/aftergraph.org/` → git root `aftergraph.org` (public site + pinned Studio demo).

## 1. Target tree (what lives where)

```
workspace/
  studio/                          # repo: studio
    index.html manifest.webmanifest sw.js server.mjs
    src/                           # app: main.mjs router.mjs state.mjs api-client.mjs
      app/ auth/ brain/ composer/ distributed/ economy/ federation/
      goal/ institution/ integrations/ intent/ now/ research/
      runtime/ search/ society/ temporal/ user/ venture/ views/
      workspace/ + ~30 top-level *.mjs
    packages/                      # 12 pkgs: brand client composer icons interaction
      brand/                         motion presence runtime-ui spatial tokens ui
      client/{index.mjs,src/{client,routes,storage,outbox,triage,verify-status}.mjs}
      ui/{agents,conversation,primitives,system,trust,work,index.mjs}
      … (composer/icons/interaction/motion/presence/runtime-ui/spatial/tokens/visualization = index.mjs shims)
    server/                        # backend: app-server.mjs api-router.mjs *-routes.mjs
    contracts/v6/                  # core-object-types, object-envelope, relation-vocab, invariants
    scripts/{verify.mjs,platform_verify.mjs,v6_*.*,verify-upstreams.mjs,…}
    tests/                         # 126 *.test.mjs (client-sdk, fullstack-*, polyrepo-*, auth-*)
    upstreams/{README,UPSTREAM-MANIFEST,SOURCE-MATERIALIZATION.json,contracts/,source-seams/}
    upstreams.env.example          # TEMPLATE ONLY (see §4)
    docs/{PRODUCTION,ROADMAP,STUDIO-EDGE-BACKEND-SPEC,V8.1-*,archive/,superpowers/}
    platforms/ qa/ styles/ visual-*/ node_modules/@aftergraph/client
  aftergraph.org/                  # repo: aftergraph.org
    ARCHITECTURE.md BRAND-USAGE.md DECISIONS.md DEPLOYMENT.md SYSTEM-MAP.md
    docs/{STUDIO-LIVE-SPEC.md, superpowers/, INTEGRATION-FILES.md (this file)}
    src/styles/                    # site-owned styles only
    site/                          # SOURCES vs GENERATED vs STUDIO-* (see §2)
```

`site/` split (the distinction that matters):

| Group | Files | Role |
|---|---|---|
| Sources (hand-edit) | `index.html launch.html sentinel.html status.html status-data.json llms.txt monogram.svg security.txt 404.html` | Public surfaces; topology totals pinned (20 / 12 public / 8 private) |
| Generated (never hand-edit) | `worker.js` | Built by `build-worker.cjs` from sources; inline LANDING/LAUNCH/… consts + health/robots/sitemap |
| Studio-* (demo lane) | `studio-build.cjs studio-dist/ studio-static.mjs studio-wrangler.toml studio-api-proxy.js` | Tier-0 static demo pipeline (see §3) |
| Verifiers | `verify-site.cjs verify-v2.cjs verify-studio.cjs` | Topology, V2-contract, and demo-lane gates |

## 2. What builds what (build graph)

```
studio checkout ──STUDIO_DIR──▶ site/studio-build.cjs ◀──STUDIO_SHA── env
        │                              │ allowlist copy only:
        │                              │ index.html manifest.webmanifest sw.js
        │                              │ styles/ src/ packages/{ui,icons,tokens,brand,
        │                              │ motion,runtime-ui,spatial,presence,interaction,
        │                              │ visualization,composer}/  (NO client/ server/ scripts/ tests/ docs/)
        │                              │ + rewrite href="/→/studio/, src="/→/studio/
        │                              │ + stamp sw.js CACHE + emit version.json + _headers
        │                              ▼
        │                        site/studio-dist/  (GENERATED — never commit, never edit)
        │                              ▼
        │                        site/verify-studio.cjs build  (allow/deny lists, no
        │                              leftover absolute refs, manifest scope, version.json
        │                              SHA==STUDIO_SHA, ≤5 MB, CSP present; `live` adds
        │                              GET /studio/, /studio/now, /studio/version.json)
site sources ──▶ site/build-worker.cjs ──▶ site/worker.js (GENERATED — never hand-edit)
        │              asserts topology totals + no private-repo links before emit
        ▼
  site/verify-site.cjs + verify-v2.cjs  (topology + V2 hero/launcher/aria contract)
```

Deploys: `wrangler.toml` (`aftergraph-site`, `node build-worker.cjs`) vs
`studio-wrangler.toml` (`aftergraph-studio`, assets `./studio-dist`,
`node studio-build.cjs && node verify-studio.cjs build`). One manual step remains:
attach route `aftergraph.org/studio/*` → `aftergraph-studio` (dashboard/API).

Studio-internal: `npm test` (tests/*.test.mjs) + `npm run verify*`
(fullstack/browser/polyrepo/perf/e2e/secrets/a11y); unrelated to site build.

## 3. What commits where (commit boundaries)

- Studio changes → commit in `workspace/studio` only. Site consumes via new `STUDIO_SHA`
  pin + rebuilt `studio-dist/` (local artifact) + redeploy. No submodules, no cross-repo imports.
- Site changes → commit in `workspace/aftergraph.org` only. Studio repo untouched by
  `studio-build.cjs` (fail-closed reads; warn-only on HEAD≠STUDIO_SHA).
- `worker.js` IS committed (deployment main per `wrangler.toml`); always via
  `build-worker.cjs`, never hand-edited.
- MUST NEVER COMMIT: `site/studio-dist/` (generated, git-ignored expectation);
  secrets/tokens (`upstreams.env.example` stays empty-template; `AFTERGRAPH_*_TOKEN`,
  `BACKEND_URL` creds live in Worker env/dashboard only); foreign batch drops
  (screenshots `screenshot-*.png`, `benchmark-*.png`, `SHA256SUMS` churn,
  `visual-current/` captures — Studio-local evidence, not site content);
  `node_modules/`; `*.db-journal`, worktree scratch.

## 4. Version-pinning chain

```
release picks STUDIO_SHA ──▶ studio-build.cjs records version.json
  {studio_sha, built_at, mode:"demo"} (current: {"studio_sha":"803098b",…})
──▶ verify-studio.cjs asserts version.studio_sha == $STUDIO_SHA
──▶ live smoke GETs /studio/version.json and compares again
```

Short SHA (`803098b`) currently recorded; build warns (not fails) on HEAD mismatch.
`AG_SHA`/`AG_DEPLOYED` stamp the site worker health endpoint separately — same pattern,
different artifact.

## 5. Connection map (edges between repos)

- Imports: Studio-internal only. `src/main.mjs` → `app/bootstrap` + `api-routes`;
  `packages/client/src/*` → `./routes|storage|client`; site build copies text, never
  `import`s Studio. No cross-repo import edge exists by design.
- Fetches/API: Studio client targets `/healthz`, `/api/v1/*` (53 routes in
  `packages/client/src/routes.mjs`: state/missions/needs/agents/artifacts/upstreams/
  memory/goals/auth/…). Tier-0 demo serves fixtures; `studio-static.mjs` strips
  `/studio` prefix and REFUSES SPA fallback for `/api/*|/healthz` (no silent 200-shell).
  Tier-1/2 backend is `studio-api-proxy.js` (separate worker, not deployed by this spec):
  tier1 = GET-only allowlist; tier2 = `/healthz|/api/v1/*` + auth passthrough.
- Routes: `aftergraph.org/studio/*` → `aftergraph-studio` worker → static
  `studio-dist` + SPA fallback; existing `aftergraph-site` worker 404s `/studio*` today
  (prefix reserved). Landing/launcher/status/`llms.txt`/sitemap carry `/studio/` demo entries.
- Env vars: build lane `STUDIO_SHA` (required), `STUDIO_DIR` (default `../../studio`);
  proxy lane `BACKEND_URL` (required), `STUDIO_API_TIER=tier1|tier2`;
  Studio server lane `AFTERGRAPH_TG_URL/_TOKEN`, `AFTERGRAPH_WORKS_URL/_TOKEN/_BRAIN_PREFIX`,
  `AFTERGRAPH_AIE_URL/_TENANT`, `AFTERGRAPH_WI_URL/_TOKEN` (see `upstreams.env.example`);
  site worker `AG_SHA`, `AG_DEPLOYED`. Secrets never cross in files — env/dashboard only.

## 6. Orphan / retire list

| Candidate | Verdict | Justification |
|---|---|---|
| `~/ag-site/` staging dir (v2/v3 landings, `landing.b64`, `worker/` scratch) | RETIRE after one diff | Predates `workspace/aftergraph.org/site/` sources; parallel landing copies (`v2-landing.html`…) risk drift. Diff once, port anything missing, delete or archive outside workspace. |
| `workspace/studio/upstreams.env.example` | KEEP as template | Only in-repo record of the 4 upstream env contracts (TG/WORKS/AIE/WI). Keep empty; never add real values. |
| `~/trust-gateway-view/` checkout | KEEP out of both repos | Independent repo with own tests/site; Studio references TG only via `AFTERGRAPH_TG_*` + `server/upstream-routes.mjs`. No vendoring. |
| Parallel root `*.md` (BUILD-STATUS-V5.2, CHANGELOG-v2..v6, QA-REPORT, SOURCE-OF-TRUTH, POLYREPO-INTEGRATION ×2, BENCHMARK-*) | RETIRE to `docs/archive/` | Duplicates of `docs/archive/` + `docs/superpowers/{plans,specs}/`; root copies invite stale reads. Keep `README.md` + latest CHANGELOG at root only. |
| Root `screenshot-*.png` / `design-*.png` / `SHA256SUMS` | RETIRE from git | Build evidence, not source; large binaries churn. Keep in CI artifacts or `qa/`; ignore in git. |
| `packages/client` in `studio-dist` | CONFIRM absent (deny) | Verifier already fails if `packages/client/` ships — SDK (`@aftergraph/client`) is backend-capable and must stay out of the static demo. No action unless gate trips. |
| `site/status-data.json` vs `site/status.html` totals | KEEP paired | Both pin 20/12/8; verifiers check both. Edit together or gates fail — by design. |

## 7. Decision-needed

1. `studio-dist/`: git-ignored (recommended) or committed artifact? Current doc + denylist
   assume ignored; confirm `.gitignore` entry exists in `aftergraph.org`.
2. Short (`803098b`) vs full 40-char `STUDIO_SHA` pin policy — verifiers accept either;
   full SHA preferred for rollback precision?
3. `~/ag-site/` retirement approver + deadline (who diffs, when deleted)?
4. Root-`*.md` consolidation approver (which CHANGELOG stays at root)?
5. `/studio/*` route attach: who performs the one manual dashboard step, and Tier-1 proxy
   scope — separate decision (non-goal of Tier-0)?
