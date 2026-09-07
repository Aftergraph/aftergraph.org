# Aftergraph System Map

> **Generated**: 2026-09-07 | **Branch**: worker/audit-map | **Source**: GitHub API audit of 18 repos
> **Purpose**: Canonical reference for aftergraph.org site generation. This map is a *source of truth* for site structure, not a copy of repo READMEs.

## Repository Classification & Maturity

| Category | Repository | Purpose (one-liner) | Maturity | Evidence Warnings |
|----------|-----------|---------------------|----------|-------------------|
| **Organization** | `.github` | Org profile, community health files, PR templates, brand/execution scripts | production | No README; content in subdirs only |
| **Organization** | `after-graph-governance` | Cross-repo contracts, architecture, terminology, evidence boundaries | prototype | README exists but minimal; governance docs present |
| **Products** | `autonomous-venture-company` | AI-native venture OS: governed agents, orchestration, product cells | prototype | Private repo; large codebase (50MB); no public releases |
| **Products** | `studio` | Operator UX: mission status, evidence, approvals, needs-you flows | prototype | v0.1.0 tagged; CI active; no deployment URL found |
| **Products** | `work-intelligence-web` | Adaptive UI runtime for Work Intelligence | prototype | Substantial README; frontend-ci.yml; no homepage/deploy URL |
| **Products** | `work-intelligence-v2` | Source-neutral observations → structured WorkItems | prototype | v0.1.0 tagged; auto-merge CI; no OpenAPI spec found |
| **Infrastructure** | `trust-gateway` | Fail-closed runtime control: approvals, policy, budgets, audit | prototype | v0.1.0 tagged; brand-assets CI; no deploy URL or OpenAPI |
| **Infrastructure** | `works-execution` | Durable execution: missions, WorkGraph scheduling, leases, recovery | prototype | v0.3.6 (most mature release); Go codebase; no OpenAPI |
| **Infrastructure** | `context-continuity` | Portable state-transfer capsules for heterogeneous systems (Draft 0.1) | research | Validate CI only; explicitly marked Draft 0.1 |
| **Research** | `intelligence-systems-research` | Verifiable intelligent systems: SPEC-001, MISSION-Bench, assurance | research | Extensive docs (14+ numbered specs); no releases; no CI |
| **Research** | `llm-research-development` | Methodology, skills, evals, experiment contracts, AFM integration | research | Private repo; minimal tree; no releases |
| **Research** | `afm` | Aftergraph Foundation Model: training, datasets, adapters, evals | research | Private repo; experiments/manifests dirs; no releases |
| **Protocols** | `aie` | Agentic Institution Engineering: authority, delegation, revocation, budgets | prototype | v0.1.0 tagged; self-hosted CI; Python; no OpenAPI |
| **Developer Ecosystem** | `skills-vault` | Curated Hermes skill library (44 skills: superpowers, addyosmani, anthropic, own) | prototype | Release + validate CI; Python; no versioned releases |
| **Developer Ecosystem** | `docs` | Knowledge Plane: public developer & research portal compiler | prototype | JavaScript; ci.yml + verifier.yml; no homepage |
| **Public Services** | `aftergraph.org` | Canonical public platform: marketing site, org front door, system launcher | prototype | Astro + Cloudflare Workers; codeql + release-drafter CI; no live URL yet |
| **Documentation** | `brand` | Brand OS & design system: identity, tokens, assets, communication contracts | prototype | DESIGN-SYSTEM.md, tokens.css/json, SVG assets; no releases |
| **Repositories** | `model-registry` | Model families, versions, artifacts, evals, provenance, lifecycle state | research | Private repo; schemas/policies/models dirs; no releases |

## Canonical Sources for Site Generation

The aftergraph.org site MUST generate content from these authoritative sources (not copy README text):

### 1. Organization & Governance
- **Org identity**: `Aftergraph/.github` → `profile/`, `brand/`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- **Cross-repo contracts**: `Aftergraph/after-graph-governance` → `GOVERNANCE.md`, `BRAND.md`, `dependencies.yml`, `latest-org-state.json`
- **Brand system**: `Aftergraph/brand` → `tokens.json`, `tokens.css`, `manifest.json`, `DESIGN-SYSTEM.md`, `USAGE-RULES.md`

### 2. Products & Infrastructure
- **Product definitions**: Each product repo's README frontmatter (when available) + `package.json`/`pyproject.toml` metadata
- **API contracts**: Search for `openapi.yaml`/`openapi.json` in each infra/product repo (currently NONE found — site must not claim OpenAPI compliance)
- **Deployment state**: Wrangler/Vercel/Fly/Docker configs (currently NONE found — site must not claim live deployments)
- **Release state**: GitHub Releases API per repo (only `works-execution` has meaningful releases at v0.3.6)

### 3. Research & Protocols
- **Research program**: `Aftergraph/intelligence-systems-research` → numbered spec files (`00-EXECUTIVE-SUMMARY.md` through `14-MARKET-AND-USER-NEEDS.md`)
- **AIE protocol**: `Aftergraph/aie` → README + any `specs/` or `docs/` subdir
- **Context continuity**: `Aftergraph/context-continuity` → README (explicitly Draft 0.1)
- **Model registry**: `Aftergraph/model-registry` → `schemas/`, `policies/`, `models/` (private; site references existence only)

### 4. Developer Ecosystem
- **Skills catalog**: `Aftergraph/skills-vault` → repo root SKILL.md files + `validate.yml` output
- **Documentation portal**: `Aftergraph/docs` → compiled output (not source markdown)

### 5. Evidence Boundaries (CRITICAL)
The site MUST NOT claim:
- ❌ "Production-ready" for any repo (none have production maturity)
- ❌ "Standard" or "specification" without explicit version tag (only `context-continuity` declares Draft 0.1)
- ❌ Live deployment URLs (none configured)
- ❌ OpenAPI/API documentation (no specs found in any repo)
- ❌ Stable releases (only `works-execution` at v0.3.6 approaches stability)

The site MUST attribute:
- ✅ Maturity level per repo (production/prototype/research/experiment)
- ✅ Last commit date as freshness signal
- ✅ Release tag when present
- ✅ Visibility (public/private) — private repos referenced by description only
- ✅ CI state as activity signal (workflows present ≠ passing)

## Overlap & Responsibility Notes

| Concern | Primary Repo | Secondary/Related | Notes |
|---------|-------------|-------------------|-------|
| Brand identity | `brand` | `.github/brand`, `after-graph-governance/BRAND.md` | Three locations; `brand` repo is canonical for tokens/assets |
| Governance contracts | `after-graph-governance` | `.github`, individual repo GOVERNANCE.md | Cross-repo authority lives in governance repo |
| Work Intelligence | `work-intelligence-v2` | `work-intelligence-web` | v2 = backend/runtime; web = UI. Naming suggests v1 deprecated/absorbed |
| Agent governance | `aie` | `trust-gateway`, `autonomous-venture-company` | AIE = semantics; trust-gateway = enforcement; AVC = application |
| Research specs | `intelligence-systems-research` | `llm-research-development`, `afm` | ISR = public program; LLM-RD + AFM = private implementation |
| Model lifecycle | `model-registry` | `afm`, `intelligence-systems-research` | Registry = canonical metadata; AFM = training; ISR = evaluation |
| Skills | `skills-vault` | `autonomous-venture-company/.hermes` | Vault = curated public set; AVC may have private skills |

## Site Generation Directives

1. **Data fetching**: Use GitHub API at build time (Cloudflare Workers can fetch public repos; private repos require token)
2. **Freshness**: Display last-commit and release-tag as "last updated" signals
3. **No static copies**: Site pages reference canonical sources via link + metadata extraction, never inline README content
4. **Maturity badges**: Render maturity level per repo with color coding (green=production, yellow=prototype, blue=research, gray=experiment)
5. **Evidence warnings**: Auto-generate warning banners when claims lack supporting artifacts (no OpenAPI, no deploy URL, no releases)
6. **Private repos**: List by name + description only; no links, no content extraction
