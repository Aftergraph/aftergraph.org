# aftergraph.org Architecture

`aftergraph.org` is the **public presentation and launcher layer** for the Aftergraph polyrepo platform. It does not own runtime semantics, research claims, design tokens, cross-repo contracts or exact-head truth.

## Current repository/runtime shape

The current production surface is a lightweight static/Worker deployment rather than the earlier target Astro layout:

```text
aftergraph.org
├── site/
│   ├── index.html          public landing/platform page
│   ├── launch.html         system launcher
│   ├── 404.html            public not-found surface
│   ├── llms.txt            machine-readable public orientation
│   ├── security.txt        security contact/routing
│   ├── monogram.svg        public site asset
│   ├── worker.js           Cloudflare Worker/runtime entry
│   ├── build-worker.cjs    deterministic worker build step
│   └── wrangler.toml       Cloudflare deployment configuration
├── src/styles/             shared source styles used by the site toolchain
├── SYSTEM-MAP.md           public rendering/input snapshot, not canonical topology
├── BRAND-USAGE.md          site-specific brand consumption rules
├── DECISIONS.md            public-site decisions
├── DEPLOYMENT.md           deployment contract
└── README.md               repository ownership boundary
```

Future framework migration is allowed, but framework choice must not change ownership or evidence rules.

## Canonical source flow

```text
Aftergraph/after-graph-governance
  ├── platform-topology/1.0      repository scope + role + plane
  ├── org-state/1.0              generated exact-head truth shape
  ├── cross-repo-contracts       normative ownership/consumption
  └── evidence-layer-model       claim/evidence separation
                │
                ├──────────────┐
                ▼              ▼
       repo-owned truth   Aftergraph/docs
       READMEs/contracts  Knowledge Plane
                │              │
                └──────┬───────┘
                       ▼
                Aftergraph/brand
             tokens + master assets
                       │
                       ▼
                aftergraph.org build
                       │
                       ▼
              Cloudflare public surface
```

`aftergraph.org` may aggregate and route. It MUST NOT become a competing source of platform truth.

## Public data contract

Public rendering separates dimensions that are often lazily collapsed into one badge:

- **visibility**: public/private;
- **implementation state**: research, reference, active implementation, production integration, etc.;
- **deployment state**: deployed/not deployed/unknown;
- **conformance state**: local, cross-runtime, external interop, etc.;
- **scientific evidence class**: only from the research evidence owner;
- **freshness**: exact source commit and evidence cut when available.

A repository's existence, recent commit, CI workflow or public visibility never upgrades another dimension.

## Private-source boundary

Private repositories may be represented publicly only through approved metadata such as name, platform role and an explicitly public description. The public build must never copy private source text, configuration, secrets, artifacts or internal evidence.

## Routes

Current shipped routes are centered on the static public surfaces in `site/`. The target information architecture remains outcome-oriented:

```text
/                 platform front door
/launch           system launcher / destination routing

future/expanded IA:
/products/*       product/specialist surfaces
/developers       APIs, contracts, quickstarts, SDK routing
/research         papers, studies, benchmarks and evidence labels
/trust            authority, evidence, verification and security
/status           timestamped platform/service snapshot
/company          contribution, support and organization context
```

Repositories are implementation modules. Visitors should not have to understand the polyrepo graph before understanding what Aftergraph does.

## Platform presentation model

```text
Intent / observations
→ work / mission / continuity
→ authority
→ runtime enforcement
→ durable execution
→ evidence
→ independent verification
→ verified outcome
```

The public site may explain this model, but each stage remains owned by its canonical repository.

## Build and deployment

The repository README/`DEPLOYMENT.md` define deployment authority. Mainline deployment uses the Cloudflare Worker/static-assets path in `site/`. Preview and production deployment must preserve the same evidence and private-source boundaries.

## Reconciliation gates

Before public generation is considered topology-current:

1. `SYSTEM-MAP.md` repository count matches `platform-topology/1.0`.
2. No public content claims canonical topology ownership.
3. Private repo content is not embedded in public output.
4. Maturity/evidence language is source-bounded.
5. Exact Git state, when displayed, comes from a fresh generated org-state rather than hand-written SHAs.
6. Public links and launcher destinations are checked independently from claim correctness.

The canonical platform reconciliation backlog is maintained in `Aftergraph/after-graph-governance/docs/PLATFORM-RECONCILIATION-V1.md`.
