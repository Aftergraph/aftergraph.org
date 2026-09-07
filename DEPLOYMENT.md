# Site deployment — aftergraph.org (v2.0.0)

Serves the canonical public platform: landing (`/`), system launcher (`/launch`),
health (`/healthz`), operational status (`/status`), `robots.txt` and `sitemap.xml` from the `aftergraph-site`
Cloudflare Worker.

## Build

The checked-in worker is reproducible. Without deployment metadata the health
payload uses `deployed: "unpublished"` and `sha: "local"`:

```sh
node site/build-worker.cjs
node site/verify-v2.cjs
git diff --exit-code -- site/worker.js site/wrangler.toml
```

`build-worker.cjs` embeds `index.html`, `launch.html`, security headers (CSP,
HSTS, frame/content-type/referrer/permissions policies), robots/sitemap and
machine surfaces into `site/worker.js`.

## Deploy

For a real production build, inject the deployment timestamp and exact source
commit before compiling. Example for a POSIX shell:

```sh
export AG_DEPLOYED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export AG_SHA="$(git rev-parse HEAD)"
node site/build-worker.cjs
node site/verify-v2.cjs
cd site
npx wrangler@4.129.0 deploy --config wrangler.toml --name aftergraph-site
```

Routes: `aftergraph.org/*` + `www.aftergraph.org/*` → `aftergraph-site`.
Production is verified through `/healthz` plus HTTP 200 smoke checks for `/`,
`/launch`, `/status`, `/robots.txt` and `/sitemap.xml`.

## Studio demo (aftergraph-studio, Tier-0)

The interactive Studio demo at `https://aftergraph.org/studio/` is a separate
Cloudflare Worker (`aftergraph-studio`, static assets only, no worker code).
The existing `aftergraph-site` worker is untouched; route
`aftergraph.org/studio/*` (and `www`) → `aftergraph-studio`.

Build (pinned Studio source, fail-closed allowlist/denylist, `/studio/` asset
rewrite, version-stamped SW cache, `version.json` `{studio_sha, built_at,
mode: "demo"}`):

```sh
export AG_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)" STUDIO_SHA="<sha>"
node site/studio-build.cjs && node site/verify-studio.cjs
```

Deploy:

```sh
cd site && npx wrangler@4.129.0 deploy --config studio-wrangler.toml --name aftergraph-studio
```

Rollback: `wrangler rollback --name aftergraph-studio`. Only manual step, once:
attach the `aftergraph.org/studio/*` route (dashboard or API token).

## Design lineage

- Landing: V2 Systems Interface. The public mental model is mission → authority
  → execution → evidence → verified outcome.
- Platform: three connected layers (Intelligence & Institution, Control &
  Execution, Evidence & Knowledge) with WORKS dominant because it is the most
  mature public runtime surface.
- Launcher: intent groups Build / Operate / Verify / Research, tokenized search,
  ↑↓/Enter/Escape keyboard control, accessible selection semantics and mobile
  touch layouts.
- Evidence rule: visibility never upgrades evidence. Research, specifications,
  runtime implementations and independently checkable production behavior stay
  explicitly distinct.

## Studio live tiers (Tier-1 / Tier-2 API proxy)

Tier-0 (current): static demo only, no backend. Tiers 1–2 are served by the
separate `site/studio-api-proxy.js` worker (`BACKEND_URL`,
`STUDIO_API_TIER=tier1|tier2`); the `aftergraph-site` worker is untouched.

- Tier-1 read-only live status: GET only, allowlisted to `/healthz`,
  `/api/v1/state`, `/api/v1/system`, `/api/v1/missions`, `/api/v1/needs`,
  `/api/v1/agents`, `/api/v1/artifacts`, `/api/v1/connections`,
  `/api/v1/spaces`, `/api/v1/upstreams`, `/api/v1/context`,
  `/api/v1/sync/events` (SSE `/api/v1/events` excluded). Non-GET → 405,
  off-allowlist → 403, never reaches the backend.
- Tier-2 full backend proxy: any method on `/healthz` or `/api/v1/*` with
  `Authorization` (+ content-type/accept/idempotency-key) passthrough.
- The proxy never logs secrets: no headers, bodies, tokens, or query strings.

## Studio API proxy deploy (studio-api-proxy, Tier-1/2)

Config: `site/studio-api-wrangler.toml` (worker `studio-api-proxy`, no assets,
fail-closed `BACKEND_URL=""` → 503, `STUDIO_API_TIER="tier1"`). Real
`BACKEND_URL` (and tier for Tier-2) is set via the dashboard (Worker →
Settings → Variables) — never in files. The `aftergraph-site` and
`aftergraph-studio` workers are untouched.

Pre-deploy gate (direct proxy checks, no network):

```sh
node site/verify-studio.cjs live-api
```

Deploy:

```sh
cd site && npx wrangler@4.129.0 deploy --config studio-api-wrangler.toml --name studio-api-proxy
```

Route attach (manual, once): `aftergraph.org/studio/api/*` + `www` (and
`aftergraph.org/studio/healthz` + `www`) → `studio-api-proxy` (dashboard or
API token). These more-specific routes win over the Tier-0
`aftergraph.org/studio/*` → `aftergraph-studio` route.

Smoke (Tier-1 honest: state is 200 backend JSON or 401 auth-required
JSON when the backend runs REQUIRE_AUTH — both prove the proxy path;
405 and 403 prove the tier cage; every API answer must be JSON, never shell):

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://aftergraph.org/studio/api/v1/state
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://aftergraph.org/studio/api/v1/state
curl -s -o /dev/null -w '%{http_code}\n' https://aftergraph.org/studio/api/v1/events
node site/verify-studio.cjs live-api https://aftergraph.org
```

Rollback: `wrangler rollback --name studio-api-proxy`.
