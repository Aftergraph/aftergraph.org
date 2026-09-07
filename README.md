# aftergraph.org

Canonical public platform for [aftergraph.org](https://aftergraph.org):
marketing site, organization front door and system launcher for the
Aftergraph ecosystem.

## Ownership

This repository owns the public web surface at `aftergraph.org` and nothing
else. It does not own specs, protocols, brand tokens or product runtimes:

| Concern | Owner |
|---|---|
| Design tokens, logo, identity | `Aftergraph/brand` (Brand OS) |
| Cross-repo contracts, terminology | `Aftergraph/after-graph-governance` |
| Developer portal content | `Aftergraph/docs` (Knowledge Plane) |
| Product runtimes (WI, studio, TG) | Their own repos |
| This site's code, IA, copy, deployment | This repo |

Content that canonically lives elsewhere is referenced or generated at build
time, never hand-copied. See `ARCHITECTURE.md` and `DECISIONS.md`.

## Evidence rule

Visibility never upgrades evidence. Research claims, experimental results,
prototypes, production capabilities and roadmap items are labelled as such on
every page. No fake stats, customers or testimonials.

## Local development

This repository currently ships a static Cloudflare Worker (no build step, no
npm project). Regenerate the deployed bundle after editing sources:

```sh
cd site
node build-worker.cjs   # reads index.html/launch.html/status.html/llms.txt/... -> worker.js
npx wrangler@4.129.0 deploy --config wrangler.toml --name aftergraph-site
```

See `DEPLOYMENT.md` for the full workflow and provenance.

## Release history

- **v1.2.3** — context packs exposed in llms.txt (P3 of the docs↔site audit)
- **v1.2.2** — Knowledge Plane build manifest on `/status` (P2)
- **v1.2.1** — docs portal links in launcher/footer; llms.txt federates the Knowledge Plane deep index (P0+P1)
- **v1.2.0** — `/status` operational snapshot; `/status` in launcher + sitemap
- **v1.1.0** — `/404`, `/llms.txt`, `/.well-known/security.txt`, OG/JSON-LD, favicon from brand monogram
- **v1.0.0** — landing v3, launcher command palette, security headers, robots/sitemap

Full release notes: https://github.com/Aftergraph/aftergraph.org/releases
