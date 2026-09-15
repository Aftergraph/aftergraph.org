# Aftergraph Atlas V3 — Agent Handoff

Status date: 2026-09-15
Repository: `Aftergraph/aftergraph.org`

## Executive status

The Platform V4 public front door is already merged and live. The new Atlas V3 product architecture is approved, but its D1/R2 evidence-store, ingestion, reconciliation engine, API, and replacement workspaces are not implemented yet.

At handoff creation:

- `origin/main`: `eb06aa63f1508109e509cd2902fb0a401dc98be5`
- current public Atlas route: `/atlas/`
- current projection cut: `2026-09-08T23:23:16Z`
- current projection: 156 entities, 316 assertions, 212 relations, 1 conflict
- current Worker config has only `AG_STATS` KV; Atlas has no D1/R2 bindings yet

Do not claim Atlas V3 is implemented until the production data path and workspaces described below exist and are verified.

## Product category and mission

Category: **Verifiable System Intelligence**

Atlas mission: **Continuous Verifiable System State**

Atlas should continuously answer:

1. What is actually true about the system?
2. What changed, and when?
3. Why should we believe a claim?
4. How fresh is the supporting evidence?
5. Where do sources disagree?
6. What was authorized, what executed, and what was independently verified?

Atlas is not a generic observability dashboard, CMDB, developer portal, knowledge-graph viewer, or agent-tracing product. It is an evidence-backed temporal model of a software and agent system.

## Hard product constraints

- No demo or MVP behavior in production paths.
- No fake live state, fake health, fake mission progress, or invented metrics.
- Do not infer system truth from filenames, repo names, or visual presence.
- Cross-system data enters only through explicitly registered source adapters/contracts.
- Atlas is a derived evidence-aware projection, not a source of truth.
- UI motion and dynamic behavior must follow real state transitions.
- Preserve contradictory claims instead of collapsing them into one mutable status.
- Freshness must be source/predicate-policy driven, not a global age rule.
- Public/private visibility boundaries must be explicit and tested.
- Existing production Atlas stays functional until its replacement is verified and deployable.

## Canonical responsibility boundaries

- **Atlas:** What is the state of the system?
- **Governance:** What should be true / allowed / required?
- **Trust Gateway:** May this actor perform this action?
- **Runtime / WORKS:** What actually executes?
- **Sentinel:** Does the evidence satisfy a verification policy?
- **Experience / Studio:** Human-facing goal/progress/needs-you/verified-outcome experience.

Do not let Atlas silently absorb another plane's authority.

## Platform V4 context

Seven permanent planes:

1. Intelligence
2. Authority
3. Trust
4. Runtime
5. Execution
6. Verification
7. Experience

Lifecycle:

`Intent / Experience -> Intelligence -> Authority -> Trust -> Runtime -> Execution -> Evidence -> Verification -> Verified Outcome`

Evidence and Verified Outcome are lifecycle outputs, not permanent planes.

## Current Atlas reality baseline

Current package: `atlas/`

Current top-level views in `atlas/src/App.jsx`:

- home
- topology
- pulse
- contracts
- capabilities
- models
- research
- snapshots
- ask

Topology is the strongest current workspace. Capabilities and Models contain preview-style behavior and must not be promoted as production truth without real backing sources. Ask Atlas is extractive/evidence-oriented rather than an autonomous authority.

Current projection shape in `site/atlas-projection.json`:

- `schema`
- `meta`
- `entities`
- `assertions`
- `relations`
- `conflicts`

Useful existing concepts to preserve where correct:

- provenance
- `observed_at`
- `valid_at`
- truth planes
- deep-link URL state
- inspectors
- snapshots/diffs
- graph lenses
- private-source boundaries
- deterministic projection generation

## Target primary workspaces

The application should converge on four primary engineering workspaces:

### Explore
Answer: “What is this, and how is it connected?”

Real entity search, graph/list/tree exploration, relation expansion, source/authority lenses, deep links, and a persistent inspector.

### Evidence
Answer: “Why should I believe this claim?”

Expose claim, subject, predicate/value, truth plane, source, revision/ref, observed time, valid time, freshness, evidence chain, verification refs, and contradictions.

### Changes
Answer: “What changed and when?”

Derived from real immutable cuts/deltas: assertions/relations added or removed, claim value changes, conflicts introduced/resolved, source freshness changes, adapter failures/recovery, and before/after comparison.

### Trace
Answer: “How did a real governed action move through the system?”

Only show traces backed by contracts/evidence. Bind steps to the canonical lifecycle and show owner, contract, input/output, failure/refusal path, exact subject, evidence, and verification state.

Existing Contracts, Research, Snapshots, Models, Pulse, Ask, and Capabilities become secondary tools/lenses where they have real data.

## Approved storage architecture

Use **Cloudflare D1 + R2**.

### R2
Immutable artifact store. Target layout:

```text
atlas/cuts/<cut_id>/
  manifest.json
  ledger.json
  projection.json
  delta.json
```

Do not persist private raw evidence in a public-serving bucket.

### D1
Temporal/index/query layer, not a second source of truth and not a redundant full graph database.

Initial conceptual tables:

```text
atlas_cuts
atlas_sources
atlas_adapter_runs
atlas_changes
```

`atlas_cuts` should track the current/previous relationship, artifact keys, hashes, collection/publication timestamps, schema version, and completeness.

## Evidence-driven Continuous Reconciliation

Transport can combine webhooks/events and scheduled reconciliation, but an event is only an observation.

Core architecture:

`Adapters -> Evidence -> Claims -> Temporal reconciliation -> Immutable cuts -> Verification -> Governed action -> New evidence`

A GitHub “deployment completed” event is not equivalent to “production is running exact HEAD”. A direct production observation and/or Sentinel verification is separate evidence.

## Claims are first-class primitives

Do not reduce system state to a mutable `status` field.

Target semantic shape:

```json
{
  "claim_id": "clm_...",
  "subject": "repo:Aftergraph/runtime",
  "predicate": "deployment.current_sha",
  "object": "abc123",
  "valid_time": "...",
  "observed_time": "...",
  "source": "production-health",
  "evidence": ["ev_..."],
  "confidence": "direct",
  "authority": "observed"
}
```

The model must be able to retain:

- source A says X,
- source B says Y,
- governance requires Z,
- Sentinel verified Y.

## Bitemporal model

Important claims distinguish:

- `valid_time`: when the fact was true in the system/world
- `observed_time`: when Aftergraph learned or recorded it

Required semantics include both:

- “What did Atlas believe at time T?”
- “What do we now know was true at time T?”

## Target truth planes

Formalize these without implicit promotion:

- `CANONICAL`
- `OBSERVED`
- `INFERRED`
- `PROPOSED`
- `VERIFIED`
- `EXECUTED`

## Immutable cuts

A cut is a reproducible statement of what Aftergraph had sufficient evidence to believe at a point in time.

Target cut metadata includes:

- `cut_id`
- `previous_cut_id`
- collection interval
- source completeness
- adapter versions
- source revisions
- claim counts
- additions/removals/changes
- contradictions introduced/resolved
- stale/withheld/unavailable sources
- artifact hashes
- verification state

Atomic publication invariant: a cut cannot become current until evidence is normalized, schemas validate, privacy/publication gates pass, immutable artifacts are stored, projection/delta are generated, hashes verify, and the D1 metadata transaction commits.

Partial cuts are allowed only when incompleteness is explicit. Rollback changes the current pointer; historical immutable cuts remain intact.

## Freshness model

Replace generic frontend “older than N hours = stale” logic with contract-driven freshness.

Examples:

```yaml
deployment.current_sha:
  maximum_age: 60s
  verification: exact

repo.default_branch:
  maximum_age: 1h
  verification: direct

governance.authority:
  maximum_age: 24h
  verification: canonical
```

Possible UI states include CURRENT, STALE, SUPERSEDED, UNKNOWN, WITHHELD, and UNAVAILABLE.

Only use “LIVE” if a real polling/feed contract exists, latest successful ingestion is inside its freshness window, and source revision/cursor is known.

## First production adapters

Start with explicit typed adapters:

1. `GovernanceTopologyAdapter`
2. `GovernanceDependenciesAdapter`
3. `GitHubRepositoryAdapter`
4. `SentinelVerificationAdapter` only after a stable source contract is verified

GitHub observation may describe directly observable repository/ref metadata. It must not infer health, authority, maturity, or deployment truth.

Runtime, WORKS, Trust Gateway, or other sources should be connected only after an explicit source contract exists.

## Initial runtime API

Keep the first API small and artifact-oriented:

```text
GET /api/atlas/state
GET /api/atlas/cuts/:cutId/projection
GET /api/atlas/cuts/:cutId/delta
GET /api/atlas/changes?from=<cut>&to=<cut>&subject=<id>
```

`/api/atlas/state` should be cheap, cache-aware, and ETag-able. Do not build a heavyweight graph-query backend before usage requires it.

## Dynamic UI rules

Dynamic does not mean decorative animation.

Expected real interactions include:

- entity selection updates URL, workspace, inspector, and evidence context without full reload;
- graph neighborhoods expand/collapse from real relations;
- lens changes alter the same workspace statefully;
- cut refresh detects a newer system state rather than faking streaming;
- added/removed claims and relations visibly transition when comparing real cuts;
- selected entities remain selected after a cut update when still present;
- removed entities explain the cut where they disappeared when evidence supports that conclusion.

## Immediate implementation sequence

1. Create a fresh isolated worktree from current `origin/main`.
2. Write the detailed Atlas V3 design spec and implementation plan.
3. TDD contract primitives first:
   - EvidenceEnvelope
   - Claim
   - SourceAdapter
   - FreshnessPolicy
   - CutManifest
   - CutDelta
4. Define deterministic IDs/hashes and schema validation.
5. Define the compatibility/migration boundary from current `atlas-projection/0.2`.
6. Add D1 migrations and R2 bindings after local contracts are executable/tested.
7. Implement storage interfaces with test doubles plus Cloudflare adapters.
8. Implement atomic cut writer/publisher and rollback/current-pointer semantics.
9. Implement the first real source adapters.
10. Implement reconciliation, contradiction tracking, bitemporal ordering, freshness, cut derivation, and delta generation.
11. Implement the Atlas state/projection/delta/changes API.
12. Refactor UI into Explore/Evidence/Changes/Trace over real data.
13. Remove or demote preview/fixture surfaces that violate the “real only” rule.
14. Add unit, integration, browser, mobile, accessibility, privacy, failure-mode, migration, and rollback tests.
15. Open PR, pass exact-head gates, deploy, and independently verify production before declaring complete.

## Definition of done

Atlas V3 is not done because it looks good.

Done requires:

- D1/R2 provisioned and documented;
- no fixture/demo data on production truth paths;
- all external sources enter through typed adapters;
- claims preserve provenance and bitemporal semantics;
- contradictions are retained;
- freshness is contract driven;
- immutable cuts are hash-verifiable;
- current publication is atomic;
- Changes is based on real cut history;
- Sentinel verification stays distinct from Atlas observation;
- public/private boundaries are tested;
- Explore/Evidence/Changes/Trace operate on real production data;
- dynamic UI follows real state changes;
- failure and rollback paths are exercised;
- exact merged SHA is deployed and production-smoked.

## First instruction to the next agent

Do not begin by redesigning the UI or generating concepts.

Start at the truth/data boundary. Preserve the current production Atlas until the replacement is demonstrably more truthful, usable, and operationally complete.
