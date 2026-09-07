# ARCHITECTURE

```text
aftergraph.org (Astro static build -> Cloudflare Workers Static Assets)
├── src/pages/          marketing, product, research, developers, trust, launch
├── src/content/        typed collections (products, research, repos, changelog)
├── src/components/     design-system components (tokens from Aftergraph/brand)
├── src/layouts/        base layout (SEO, OG, JSON-LD, a11y primitives)
├── scripts/            build-time GitHub sync (cached, rate-limit safe)
└── public/             favicon, OG image, robots.txt, assets
```

## Data flow

```text
canonical sources (brand tokens, governance contracts, docs, GitHub API)
  -> scripts/sync-* (build time, file cache in .cache/)
  -> src/content/ (validated by zod schemas, maturity field required)
  -> astro build (deterministic, no network at request time)
  -> dist/ -> Workers Static Assets
```

## Routes (target IA, derived from repo audit)

```text
/                 homepage (thesis, proof, products, research, launcher CTA)
/products/*       one page per real product (WI, WORKS, AIE, TG, studio)
/developers       API, schemas, quickstarts, repos, releases
/research         papers, benchmarks, reproductions, maturity labels
/trust            evidence model, verification, security, auditability
/launch           system launcher (command palette + destination index)
/changelog        release notes aggregated from GitHub releases
/status           public status + CI rollup (build-time snapshot, timestamped)
/company          about, contact, contribution, community
/404
```

## Quality gates (CI)

lint, typecheck, astro build, link-check, a11y smoke, maturity-label check,
secret scan. Lighthouse CI on preview deployments.
