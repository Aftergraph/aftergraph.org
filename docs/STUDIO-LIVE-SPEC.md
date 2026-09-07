# Spec: Studio live under aftergraph.org/studio/ (Tier-0 demo)

Date: 2026-09-07 · Status: draft for review · Decision: subpath, separate worker

## Intent

Ship the Studio operator console as a public, interactive demo at
`https://aftergraph.org/studio/` without touching the existing site worker.
Launch is Tier-0: static only, fixture data, no backend. Backend proxy
(Tier-1/2) is an explicit non-goal of this spec.

## Baselines read

- `workspace/aftergraph.org/DEPLOYMENT.md` (worker build/deploy discipline)
- `workspace/aftergraph.org/site/build-worker.cjs`, `wrangler.toml`, `worker.js`
- `workspace/studio/src/state.mjs` (fixtures vs `runtime-empty`)
- `workspace/studio/src/router.mjs`, `index.html`, `manifest.webmanifest`, `sw.js`

## Architecture

- New Cloudflare Worker `aftergraph-studio`, Static Assets only, no worker code.
- Route `aftergraph.org/studio/*` (and `www`) → `aftergraph-studio`.
  The existing `aftergraph-site` worker is untouched.
- Studio source stays in the studio repo. The aftergraph.org build consumes it
  at a pinned `STUDIO_SHA` and records `{studio_sha, built_at}` in
  `version.json`. No cross-repo imports, no submodules.

## Studio changes (4 small, each unit-tested)

1. Router reads `<base>`: strip the base prefix in `routeFromLocation`,
   prepend it in `buildDeepLink`/pushState targets.
2. `?demo=1`: forces fixtures and a separate storage key
   (`aftergraph-workspace-demo`), so the live site never renders the
   `runtime-empty` shell and never collides with local operator state.
3. `manifest.webmanifest`: `scope`/`start_url` under `/studio/`.
4. `sw.js`: scope-safe (served from `/studio/sw.js`); SHELL list stays
   root-relative — the build rewrites it (see below).
5. Nothing else. No backend URLs, no secrets, no auth changes.

## Build transform (owned by aftergraph.org, Studio source untouched)

New `site/studio-build.cjs` (`STUDIO_SHA`, `STUDIO_DIR` env):

1. Copy allowlist from the pinned Studio tree: `index.html`,
   `manifest.webmanifest`, `sw.js`, `styles/`, `src/`, `packages/{ui,icons,
   tokens,brand,motion,runtime-ui,spatial,presence,interaction,
   visualization,composer}/`.
2. Denylist assert: no `*.test.mjs`, no `*.png`, no `server/`, `scripts/`,
   `tests/`, `docs/`; total budget < 5 MB.
3. Rewrite absolute asset refs (`href="/…`, `src="/…`) to `/studio/…` in
   `index.html`, `manifest.webmanifest`, and the SW SHELL list.
4. Stamp `CACHE` name in `sw.js` with the build version (cache-bust per release).
5. Emit `version.json` `{studio_sha, built_at, mode:"demo"}`.
6. Fail closed on any violation.

## Hosting config

- `site/studio-wrangler.toml`: `name = "aftergraph-studio"`,
  `[assets] directory = "./studio-dist"`,
  `not_found_handling = "single-page-application"` (deep links like
  `/studio/now` serve the Studio shell).
- `_headers`-equivalent via wrangler headers: `script-src 'self'`;
  `style-src 'self' 'unsafe-inline'` (covers the 12 existing style
  attributes; refactor follow-up filed, not blocking);
  `img-src 'self' data:`; `connect-src 'self'`; `frame-ancestors 'self'`.
- CSP must not break the 12 `style="…"` attributes — verified by the
  smoke step opening an approval dialog.

## Site surface updates

- Landing Studio card: add "Live demo →" (`/studio/`, badge `demo`).
- Launcher `ITEMS`: Studio live entry (badge `demo`; add the CSS class).
- Status page: Studio row — boundary text "interactive demo, local-only
  fixture data, no backend".
- `llms.txt` key pages + Studio demo entry; `sitemap.xml` + `/studio/`.
- `DEPLOYMENT.md`: studio build/deploy/rollback section.

## Verify gates

New `site/verify-studio.cjs` (build-time): allowlist/denylist, no
`href="/` or `src="/` leftovers, manifest scope, `version.json` SHA equals
`STUDIO_SHA`, size budget, CSP file present.
Live smoke: `GET /studio/` 200, `GET /studio/now` 200 serving the shell,
`GET /studio/version.json` SHA match, one asset 200 with immutable caching.

## Release & rollback

```
export AG_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" STUDIO_SHA="<sha>"
node site/studio-build.cjs && node site/verify-studio.cjs
cd site && npx wrangler@4.129.0 deploy --config studio-wrangler.toml --name aftergraph-studio
```

Rollback: `wrangler rollback --name aftergraph-studio`. Only manual step,
once: attach the `aftergraph.org/studio/*` route (dashboard or API token).

## Acceptance

- [ ] `/studio/` renders the full demo shell with fixture missions/approvals.
- [ ] `/studio/now` deep link serves the shell (SPA fallback).
- [ ] Cmd-K, approvals, evidence, batch queue all work offline-capable locally.
- [ ] No request to `/api/*` succeeds; app stays in local mode with demo badge.
- [ ] SW installs under `/studio/` scope; reload works offline after first visit.
- [ ] `version.json` SHA equals the pinned Studio commit.
- [ ] Site worker diff empty; landing/launcher/status/llms carry the demo entry.

## Non-goals

Backend proxy, auth, PWA install prompts, i18n, ag-site changes, embedding
Studio into the existing worker, touching the site worker routes.

## Risks

- Base-tag vs absolute URLs: covered by build rewrite + leftover assert.
- SW cache staleness across releases: covered by version-stamped CACHE name.
- localStorage drift demo vs local: covered by separate demo key.
- `/studio` prefix collision with future site paths: reserve the prefix;
  the site worker 404s it today.
- The earlier unexplained clean-up of dirty `site/index.html`/`site/worker.js`
  (observed dirty, now clean, untouched by us): flag, not blocking.
