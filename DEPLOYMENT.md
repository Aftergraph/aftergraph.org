# Site deployment — aftergraph.org (v1.0.0)

Serves the canonical public platform: landing (/), system launcher (/launch),
health (/healthz), robots.txt and sitemap.xml. Runs on Cloudflare Workers
Static Assets (same account, zone e23b26f46a48d143f488ef85874b1948).

## Build

```sh
node site/build-worker.cjs   # regenerates site/worker/worker.js from HTML sources
```

> ⚠️ 2026-09-07: `site/worker.js` is now the canonical ESM module worker
> (Text/Data imports, `export default`). `build-worker.cjs` still generates
> the OLD `addEventListener` style and overwrites `wrangler.toml` without
> the `[[rules]]` blocks — DO NOT run it until it is updated, or it will
> clobber the live worker and its module rules.

`worker.js` embeds `index.html` (landing v3) + `launch.html`
(command palette) + security headers (CSP, HSTS, frame/X-content, permissions)
+ robots/sitemap + the pro asset set (`site/favicon.svg`, `site/og-image.svg`,
PWA icons, `site.webmanifest`) into the worker script.

## Deploy

```sh
cd site && npx wrangler@4.129.0 deploy --config wrangler.toml --name aftergraph-site
```

Routes: aftergraph.org/* + www.aftergraph.org/* -> aftergraph-site.
Zone: aftergraph.org (Cloudflare, Active). Production version is verified via
`/healthz` (returns deployed timestamp) and HTTP 200 on all routes.

## Design lineage

- Landing: Aftergraph brand tokens (Aftergraph/brand) + Linear-style dark
  luminance system; maturity badges on every product; WORKS dominant because
  it is the most mature surface (v0.3.6).
- Launcher: command palette (fuzzy search, ↑↓/enter, maturity badges).
- Evidence rule: visibility never upgrades evidence — badges and copy are
  structural, not decorative.
