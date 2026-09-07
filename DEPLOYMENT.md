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
export AG_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export AG_SHA="$(git rev-parse HEAD)"
node site/build-worker.cjs
node site/verify-v2.cjs
cd site
npx wrangler@4.129.0 deploy --config wrangler.toml --name aftergraph-site
```

Routes: `aftergraph.org/*` + `www.aftergraph.org/*` → `aftergraph-site`.
Production is verified through `/healthz` plus HTTP 200 smoke checks for `/`,
`/launch`, `/status`, `/robots.txt` and `/sitemap.xml`.

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
