# Aftergraph System Map

> **Evidence cut:** 2026-09-07  
> **Scope:** 19 repositories currently installed for the `Aftergraph` organization  
> **Authority:** This file is a public-site rendering/input snapshot. It is **not** the canonical source of repository topology or exact Git state.

Canonical ownership/topology lives in `Aftergraph/after-graph-governance`:

- `docs/platform-topology/1.0.json` — slow-changing repository scope, plane and role;
- `latest-org-state.json` — generated exact-head snapshot from the GitHub API;
- `docs/cross-repo-contracts.md` — normative contract ownership/consumption;
- repository-owned READMEs/contracts — implementation truth for each module.

The website must not silently reinterpret those sources into stronger maturity or evidence claims.

## Platform model

```text
Public / Knowledge
  aftergraph.org · docs · .github · brand
          ↓
Experience
  studio · work-intelligence-web · autonomous-venture-company
          ↓
Intent / Work / Continuity
  work-intelligence-v2 · context-continuity
          ↓
Institution / Enforcement / Execution
  aie → trust-gateway → works-execution
          ↓
Capabilities / Models
  skills-vault · llm-research-development · afm · model-registry
          ↓
Assurance / Verification
  intelligence-systems-research · continuum
          ↓
Verified outcomes
```

The arrows describe platform composition, not claim inheritance. A downstream surface does not inherit a stronger evidence class merely because it consumes an upstream service.

## Repository classification

| Plane | Repository | Canonical responsibility | Visibility | Current evidence-safe characterization |
|---|---|---|---|---|
| Governance | `after-graph-governance` | topology, cross-repo contracts, boundaries, exact-head generation | public | active governance implementation |
| Institution | `aie` | authority, delegation, lifecycle, budget/revocation semantics | public | experimental standards/reference implementation; Draft track |
| Enforcement | `trust-gateway` | runtime admission, approvals, policy, secrets and action audit | public | active runtime implementation with documented limits |
| Execution | `works-execution` | durable work, scheduling, workers, recovery, evidence/quittance | public | active durable execution implementation |
| Experience | `studio` | general-purpose Chat / Work / Space operating environment | public | full-stack reference build; external integrations remain separately gated |
| Work Intelligence | `work-intelligence-v2` | source-neutral observations → canonical WorkItems | public | production-integration backend implementation |
| Experience | `work-intelligence-web` | specialist Work Intelligence UI and least-privilege BFF | private | deployed specialist web experience; backend remains canonical |
| Continuity | `context-continuity` | portable actionable state transfer / handoff contract | private | research prototype, ACC Draft 0.1 |
| Assurance | `continuum` | continuity/containment mission-bench and fault injection | private | verification harness under active development |
| Research/Assurance | `intelligence-systems-research` | SPEC-001, MISSION-Bench, empirical studies, scientific claims | public | audited research program; live claims remain evidence-gated |
| Capabilities | `skills-vault` | skill trust, lifecycle, provenance, discovery and distribution | private | governed capability supply-chain implementation |
| Models | `llm-research-development` | reusable model R&D/eval/promotion methodology | private | foundation/model-engineering methodology |
| Models | `afm` | AFM-specific training, data, experiments and evals | private | active research/model program |
| Models | `model-registry` | immutable promoted model metadata/lifecycle | private | registry foundation |
| Products | `autonomous-venture-company` | venture OS, Hermes integration, Product Cells | private | substantial product/reference consumer; production authority separately gated |
| Knowledge | `docs` | provenance-pinned developer/research Knowledge Plane | public | live at `docs.aftergraph.org` |
| Public | `aftergraph.org` | public website, org front door and launcher | public | deployed public surface |
| Foundation | `brand` | visual identity, tokens and master assets | public | provisional Brand OS; trademark clearance not implied |
| Foundation | `.github` | organization profile, contribution/security/support defaults | public | active organization/community infrastructure |

**Count:** 19 repositories: 11 public, 8 private at this evidence cut.

## Core ownership rules

### Mission and verified outcome

```text
intent / observation
→ mission / work definition
→ authority resolution
→ runtime admission
→ durable execution
→ evidence
→ independent verification
→ verified outcome
```

`Declared completion != verified outcome` remains a system invariant. A UI status, agent message or execution success flag is not sufficient evidence by itself.

### Work Intelligence

```text
Signal → Observation → WorkCandidate → WorkItem
       → Review/Approve → Publication → optional WORKS promotion
```

`WorkItem != WORKS Work`. `work-intelligence-web` is a projection/BFF, not canonical WorkItem storage.

### Authority and execution

For consequential execution:

```text
Executable = Intersection(AIE authority/policy, Trust Gateway runtime admission, WORKS durable execution)
```

A model, agent, plugin, skill, UI or repository membership does not grant authority by installation/existence.

### Continuity

`context-continuity` owns transfer of actionable state. A Continuity Capsule may carry authority references/context, but it cannot mint or expand authority. It also does not replace mission verification or execution evidence.

### Models and skills

```text
llm-research-development → AFM → model-registry
skills-vault → governed capability distribution
```

Models and skills are capabilities consumed by the platform. Promotion or installation does not grant runtime authority.

## Evidence boundaries

The public site MUST preserve these separations:

1. runtime evidence does not establish AIE conformance;
2. AIE conformance does not establish scientific validity;
3. scientific evidence does not grant runtime/production authority;
4. exact-head state does not prove functional conformance;
5. public visibility does not upgrade maturity;
6. private repository existence must not cause private content leakage.

When a source says `research`, `prototype`, `reference`, `production integration`, `deployed`, `external interop PASS`, or another bounded state, the site must preserve that wording/context rather than flattening everything into one maturity badge.

## Canonical sources for public generation

### Governance and topology

- `Aftergraph/after-graph-governance/docs/platform-topology/1.0.json`
- `Aftergraph/after-graph-governance/latest-org-state.json` (fresh generated snapshot, not a timeless artifact)
- `Aftergraph/after-graph-governance/docs/cross-repo-contracts.md`
- `Aftergraph/after-graph-governance/docs/evidence-layer-model.md`

### Knowledge and claims

- `Aftergraph/docs` is the Knowledge Plane/compiler layer and pins exact upstream SHAs.
- Scientific claims come from `Aftergraph/intelligence-systems-research` registries/audits.
- AIE maturity/conformance comes from `Aftergraph/aie` evidence, not from platform marketing copy.

### Product/runtime state

- Each runtime/product repo owns its implementation state and limitations.
- Deployment URLs may be displayed only when supported by the owning repo or live deployment evidence.
- API surfaces must come from canonical OpenAPI/contracts where those exist; absence must not be converted into invented documentation.

### Brand

- `Aftergraph/brand` owns design tokens/master assets.
- Provisional trademark/brand status must remain visible where relevant.

## Public generation directives

1. Resolve the 19-repository set from governance topology, not from a hand-maintained site list.
2. Use a fresh generated org-state for exact heads/freshness.
3. Preserve repo-owned descriptions and evidence/maturity qualifiers.
4. Publicly list private repos only using approved name/description metadata; never fetch/render their private source content into a public build.
5. Separate `visibility`, `implementation state`, `deployment state`, `conformance state` and `scientific evidence class` instead of collapsing them into one badge.
6. Fail the build or visibly mark stale data when governance topology and site catalog diverge.
7. Keep public navigation outcome/capability-oriented; repositories are implementation modules, not the user's required mental model.

## Current reconciliation backlog

Canonical execution tasks live in `Aftergraph/after-graph-governance/docs/PLATFORM-RECONCILIATION-V1.md`.

Highest-priority remaining platform work after topology reconciliation:

- canonical Principal/Tenant identity architecture;
- one production E2E path `Studio → AIE → Trust Gateway → WORKS → Evidence → Verifier`;
- benchmark/fault taxonomy reconciliation across ISR, Continuum and ACC;
- AVC/platform executable-overlap audit;
- automatic topology import into `docs` and `aftergraph.org`.
