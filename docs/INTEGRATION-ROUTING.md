# Integration routing — aftergraph.org + Studio (one surface)

Date: 2026-09-07 · Owner: ROUTING team · Status: proposal (see Decision-needed)
Scope: `aftergraph.org` apex + `www`. Workers: `aftergraph-site` (`site/worker.js`),
`aftergraph-studio` (`site/studio-static.mjs` + `studio-dist/` Static Assets),
`studio-api-proxy` (`site/studio-api-proxy.js`, UNDEPLOYED).

Cloudflare rule that governs everything below: **most-specific route pattern wins,
independent of creation order.** `aftergraph.org/studio/api/*` > `aftergraph.org/studio/*`
> `aftergraph.org/*`. Specificity is by match length, not by worker.

## 1. Route table (authoritative intent)

| Path pattern | Owner worker | Behavior incl. fallback / error |
|---|---|---|
| `/` | aftergraph-site | 200 landing HTML, `Cache-Control: max-age=300` + site CSP |
| `/launch`, `/launch/` | aftergraph-site | 200 launcher HTML (same headers) |
| `/status`, `/status/` | aftergraph-site | 200 build-time status HTML |
| `/sentinel`, `/sentinel/` | aftergraph-site | 200 Sentinel product HTML |
| `/healthz`, `/health` | aftergraph-site | 200 JSON `{"status":"ok","route":"aftergraph-site …"}`; `max-age=60`. **The** site health signal |
| `/robots.txt` | aftergraph-site | 200 text, `max-age=3600` |
| `/sitemap.xml` | aftergraph-site | 200 XML incl. `/studio/` entry, `max-age=3600` |
| `/llms.txt` | aftergraph-site | 200 text incl. Studio demo entry |
| `/.well-known/security.txt` | aftergraph-site | 200 text |
| `/favicon.ico` | aftergraph-site | 200 canonical Brand OS `svg/favicon.svg` (`image/svg+xml`, `max-age=86400`) |
| `/og-image.svg` | aftergraph-site | 200 canonical Brand OS `svg/aftergraph-social-banner.svg` (`image/svg+xml`, `max-age=86400`) |
| `/404` | aftergraph-site | 200 the 404 page body (explicit path) |
| any other root path (`/api/*`, `/studio` without route, unknown) | aftergraph-site | **404** NOTFOUND HTML, `no-store` + site CSP. Today this includes `/api/*` and bare `/studio*` if the studio route is absent |
| `/studio`, `/studio/` | aftergraph-studio | Prefix stripped to `/`; 200 Studio shell (`index.html`), studio `_headers` CSP (`script-src 'self'`, `connect-src 'self'`, `frame-ancestors 'self'`) |
| `/studio/<asset>` (ext: `.mjs/.css/.webmanifest/.json/.svg`) | aftergraph-studio | Prefix stripped; 200 static asset. Immutable `max-age=31536000` for `/styles/*`, `/src/*`, `/packages/*`; `no-cache` for `/sw.js`, `/version.json`, `/index.html` |
| `/studio/now`, `/studio/chat`, `/studio/<domain>`, `/studio/space` | aftergraph-studio | No asset → SPA fallback: 200 shell (`/`). SPA router resolves domain/mode client-side |
| `/studio/d/<DOMAIN>/o/<type>/<id>` | aftergraph-studio | SPA fallback → 200 shell; `parseDeepLink` resolves object incl. `namespaceMismatch` |
| `/studio/version.json` | aftergraph-studio | 200 `{studio_sha, built_at, mode:"demo"}`, `no-cache` |
| `/studio/manifest.webmanifest` | aftergraph-studio | 200 manifest (`scope: /studio/`, `start_url: /studio/chat`) |
| `/studio/sw.js` | aftergraph-studio | 200 SW, `no-cache`. Scope `/studio/` |
| `/studio/healthz` | aftergraph-studio (today) / proxy (after decision) | Today: stripped to `/healthz`, no asset, `isApi` → **no SPA fallback** → asset 404. Must never 200 the shell |
| `/studio/api/*` | **CONTESTED — see §2** | Today: studio-static strips to `/api/*`, asset 404, `isApi` → no fallback → 404 (shell never served). Proxy claims it but is undeployed and has no route |
| `/studio/login` (future, recommended) | aftergraph-studio | SPA fallback → 200 shell; login is an SPA view, not a worker page (see §4) |

Required Cloudflare route attachments (dashboard/API, one manual step each):

- `aftergraph.org/*`, `www.aftergraph.org/*` → aftergraph-site (exists)
- `aftergraph.org/studio/*`, `www.aftergraph.org/studio/*` → aftergraph-studio (per DEPLOYMENT.md)
- `aftergraph.org/studio/api/*`, `www…/studio/api/*` → proxy worker (**only if §2a chosen**)

## 2. `/studio/api/*` ownership decision

Facts: studio-static matches it today (prefix-strip → `/api/…` → asset 404, no fallback —
correct fail-closed, wrong owner). The proxy **as written cannot serve it**: it compares
`url.pathname` against root-relative `/healthz` and `/api/v1/*`, so a proxied
`/studio/api/v1/state` pathname matches neither branch → tier1 `403 tier1_not_allowlisted`,
tier2 `404 not_found`. Deploying a route alone ships a dead API. The SPA client also never
calls `/studio/api/*` today: `api-routes.mjs` emits root-relative `/api/v1/*` + `/healthz`
with `baseUrl=''`, so Tier-0 `detect()` hits the **site** `/healthz` (see §3).

**Decision: the proxy worker owns `/studio/api/*` (all subpaths incl. `/studio/healthz`
→ backend `/healthz`), served under its own more-specific route, with a mandatory
prefix-strip fix before deploy.** Justification:

1. Specificity makes coexistence exact: `/studio/api/*` (proxy) preempts `/studio/*`
   (static) with no regex, no ordering dependence, no site-worker change.
2. Static worker must never own API paths: a 200 shell on an API URL parses as valid
   state in the client (the comment in studio-static.mjs is load-bearing). Its `isApi`
   guard is the backstop, not the contract.
3. Site worker stays frozen (STUDIO-LIVE-SPEC non-goal, verified by empty site diff).
4. One secret boundary: `BACKEND_URL` / tiers live in exactly one worker.

Deploy precondition (code, not config): strip the mount prefix at the top of the proxy
`fetch` (`/studio` → `''`, then match `/healthz` | `/api/v1/*` as today), preserve query
string, and return `404 {error:'not_found'}` for anything else. Alternative rejected:
rewriting the SPA to call root `/api/*` would collide with the site worker's 404 surface
and leak backend semantics into the marketing worker. Alternative rejected: folding the
proxy into studio-static (mixes cacheable-asset CSP/caching with secret-adjacent
forwarding; breaks the Tier-0 "static only" audit story).

Tier behavior is unchanged after the strip: tier1 GET-only + 12-entry allowlist
(`403` off-list, `405` non-GET, no `/api/v1/events` SSE); tier2 `/healthz` + `/api/v1/*`
any-method with `Authorization` passthrough; `503 backend_not_configured` without
`BACKEND_URL`; `502 backend_unreachable`; never logs secrets; `OPTIONS` → 204 CORS.

## 3. `/healthz` collisions (three distinct signals — do not merge)

- `GET /healthz` → **site** health (`aftergraph-site`). SPA `detect()` (`GET /healthz`,
  `status==='ok'`) hits this today and gets a false-positive in Tier-0; harmless (first
  `/api/v1/*` fails → local mode) but noisy and misleading.
- `GET /studio/healthz` → asset 404 today; post-decision → proxy → backend `/healthz`.
  This is the future backend-liveness signal.
- `GET /healthz` inside `studio-dist` source (SW bypass `pathname==='/healthz'`,
  `apiHealthz()`) is root-relative by construction; it only becomes correct when the
  client gets a `/studio`-aware base (precondition for Tier-1).

Rule: health checks pin the full path. Site monitor → `/healthz`; backend monitor →
`/studio/healthz` (or `/studio/api/v1/state` for depth). The SPA must stop probing root
`/healthz` no later than Tier-1 (pass `baseUrl:'/studio/api'` or equivalent into
`createApiClient`, and scope the SW bypass to the same prefix).

## 4. Login-portal placement recommendation

No login UI ships in Tier-0 (`auth/magic-link.mjs` is server-side `node:crypto`, correctly
excluded from `studio-dist` by the denylist). When it lands:

- **Portal view: `/studio/login` SPA route** under aftergraph-studio (fallback shell,
  `connect-src 'self'`, SW scope unchanged). Never a site-worker page: a second login
  surface would split CSP, caching, and audit trails.
- **Token endpoints: `/studio/api/v1/auth/magic-link`, `/studio/api/v1/auth/me`** owned
  by the proxy (tier2; tier1 allowlist deliberately excludes them — issuance is a write).
- Magic-link tokens ride `Authorization: Bearer`, verified backend-side
  (`verifyMagicToken`); the static worker never sees them.

## 5. Fallback / error contract

- Site worker: exact-match table else 404 HTML (`no-store`). Never redirects, never
  proxies, never serves the Studio shell.
- Studio static: asset hit → serve with `_headers` caching; asset miss + API path
  (`/healthz` or `/api/…` post-strip) → **404, no fallback**; asset miss + dotless
  non-API → SPA fallback 200 shell. Dotted misses (fonts, maps) → 404, no fallback.
- Proxy (post-fix): `OPTIONS` 204; no `BACKEND_URL` → `503 backend_not_configured`;
  tier1 non-GET → `405 tier1_read_only`, off-allowlist → `403 tier1_not_allowlisted`;
  tier2 off-prefix → `404 not_found`; upstream down → `502 backend_unreachable`. All
  JSON `{error}` + `x-studio-api-tier`, `no-store`, CORS headers.
- SPA: any API failure (`backend_unavailable`, `http_4xx/5xx`) → local fixture mode +
  demo badge; approval decisions queue in the mutation outbox with idempotency keys.
- SW: GET-only, same-origin, in-scope (`/studio/`) requests; bypass API/health paths;
  network-first then cache; navigate misses → cached `${base}index.html`. Known gap:
  the bypass checks root-relative `/api/`/`/healthz` — update to the `/studio/api`
  prefix together with the Tier-1 client change.

## 6. Decision-needed

1. Approve §2 (proxy owns `/studio/api/*` + prefix-strip fix) or direct the rejected
   alternative (SPA calls root `/api/*`, site worker grows a proxy) with owner + date.
2. Approve `/studio/login` SPA-route placement (§4) or name the separate portal surface.
3. Authorize the Tier-1 client change (`baseUrl` + SW bypass prefix) as part of proxy
   deploy, or accept the root-`/healthz` false-positive `detect()` indefinitely.
4. Confirm route-attachment operator + date for `…/studio/*` (and `…/studio/api/*` if §2).
5. Confirm backend health SLO source: `/studio/healthz` passthrough vs synthetic
   `/studio/api/v1/state` probe.
