# Atlas QA baseline (commander-verified, 2026-09-08 ~19:35 local, branch feat/atlas)

QA-harness worker vanished without delivering; baseline reconstructed from direct runs.
All commands run from repo root unless noted.

## Gate matrix

| gate | command | result |
|---|---|---|
| projection contract | `node --test site/atlas-projection.test.mjs` | 9/9 PASS |
| projection gate | `node site/verify-atlas.cjs` | PASS (144 entities / 316 assertions / 187 relations / 2 conflicts) |
| app unit | `npx vitest run` (in `atlas/`) | 19/19 PASS |
| vite build | `npx vite build` (in `atlas/`) | green ~8s → `site/atlas/` hashed assets |
| worker build | `node site/build-worker.cjs` | PASS (topology gates PASS, /atlas routes inlined) |
| v2 contract | `node site/verify-v2.cjs` | PASS (atlas segments scoped out of public-surface scan) |
| proxy tests | `node --test site/studio-api-proxy.test.mjs` | 12/12 PASS |
| DOM verify | `node atlas/scripts/verify-dom.mjs http://localhost:8471/atlas/` | PASS (topology ≥20 nodes, inspector provenance, drift C2/C4, mobile neighborhood, zero overflow) |
| shots | `node atlas/scripts/shoot.mjs` | 4 captures, zero JS errors → `atlas/qa-shots/` |
| verify-site | `node site/verify-site.cjs` | PRE-EXISTING FAIL (stale hardcoded 21-totals vs reconciled 24-repo canonical; proven via stash — untouched by Atlas) |
| verify-studio | `node site/verify-studio.cjs` | env-only FAIL (`STUDIO_SHA` required, CI-provided; unrelated to Atlas) |

## Worker route trace (for /atlas serving)

`site/build-worker.cjs` inlines page strings into `site/worker.js` with pathname routing.
Atlas addition: `ATLAS_HTML` (`/atlas`, `/atlas/`), `ATLAS_PROJECTION`
(`/atlas/projection.json`, 300s cache), `ATLAS_FILES` map (`/atlas/assets/*`,
immutable 1y cache). Fail-closed gates: build absent, bad JSON, non-v0.2 schema,
dangling asset refs, runtime CDN URLs. Sitemap gains `/atlas` (daily, 0.7).

## CI proposal (not yet applied)

`v2-interface.yml` already runs `node site/build-worker.cjs` on `site/**` changes —
Atlas rides that job automatically (worker build fails closed without the vite output,
so add an `npm --prefix atlas run build` step BEFORE it, plus
`node site/verify-atlas.cjs` and `node --test site/atlas-projection.test.mjs`).
Minimal addition: three `run:` lines in the existing job; no new workflow needed.

## Post-build QA command list (repeat after every rebuild)

1. `node --test site/atlas-projection.test.mjs`
2. `npx vitest run` (in `atlas/`)
3. `npx vite build` (in `atlas/`) then `node site/build-worker.cjs`
4. `node site/verify-atlas.cjs && node site/verify-v2.cjs`
5. Serve `site/` on :8471 → `node atlas/scripts/verify-dom.mjs` + `node atlas/scripts/shoot.mjs`
6. On failure: `git stash` shared files to prove pre-existing vs Atlas-caused (as done for verify-site).

## Viewed screenshots

`atlas/qa-shots/` (topology-1440, drift-1440, inspector-1440, neighborhood-390).
Vision backend unavailable in this environment — human eyeball check still open (Jonas).
