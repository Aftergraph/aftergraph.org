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

```sh
npm ci
npm run dev
```

## Deployment

Push to `main` deploys to production via Cloudflare Workers Static Assets
(see `DEPLOYMENT.md`). Preview deployments run on every PR.
