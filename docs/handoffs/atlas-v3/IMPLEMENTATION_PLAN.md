# Atlas V3 Implementation Plan

**Status:** DRAFT — Generated 2026-09-15
**Source:** `docs/handoffs/atlas-v3/AGENT_START_HERE.md` + `2026-09-15-agent-handoff.md`
**Branch:** `atlas/v3-foundation` @ `7a89abbf`
**Worktree:** `/root/workspace/atlas-v3`

---

## Phase 0: Foundation & Environment ✅ COMPLETE

- [x] Create worktree from `origin/main` @ `7a89abbf`
- [x] Verify existing `/atlas/` route serves correctly (LIVE at `https://aftergraph.org/atlas/`)
- [x] Confirm no D1/R2 bindings yet (approved-not-configured)
- [ ] Configure D1 database binding in `wrangler.toml`
- [ ] Configure R2 bucket binding in `wrangler.toml`
- [ ] Run migration to create initial schema (`evidence_envelopes`, `claims`, `cuts`, `adapters`)

**Gate:** `wrangler deploy --dry-run` succeeds with D1+R2 bindings resolved.

---

## Phase 1: Core Domain Models (TDD)

**Objective:** Implement the irreducible evidence primitives with bitemporal semantics.

### 1.1 EvidenceEnvelope
- [ ] Define TypeScript interface: `{ id, source_adapter_id, valid_time, observed_time, payload_hash, payload_ref, signature?, truth_plane }`
- [ ] TDD: Envelope creation preserves `valid_time ≠ observed_time`
- [ ] TDD: Payload hash is SHA-256 of canonical JSON serialization
- [ ] TDD: Rejected if `truth_plane` not in `{CANONICAL, OBSERVED, INFERRED, PROPOSED, VERIFIED, EXECUTED}`

### 1.2 Claim
- [ ] Define interface: `{ id, envelope_id, subject, predicate, object, confidence?, contradicting_claim_ids[] }`
- [ ] TDD: Contradictions are preserved, never collapsed
- [ ] TDD: Multiple claims per envelope supported
- [ ] TDD: Subject/predicate/object are typed strings, not free text

### 1.3 SourceAdapter Contract
- [ ] Define abstract interface: `{ adapter_id, source_type, fetch(), transform(), freshness_policy }`
- [ ] TDD: Adapter rejects untyped sources
- [ ] TDD: Freshness policy is per-adapter, not global

### 1.4 FreshnessPolicy
- [ ] Define: `{ max_age_seconds, staleness_action: 'warn' | 'hide' | 'flag', source_specific_overrides }`
- [ ] TDD: Policy evaluated against `observed_time`, not wall clock
- [ ] TDD: Staleness action produces observable UI state, not silent drop

### 1.5 CutManifest & CutDelta
- [ ] CutManifest: `{ cut_id, timestamp, entity_count, assertion_count, relation_count, conflict_count, d1_index_ref, r2_artifact_ref }`
- [ ] CutDelta: `{ from_cut_id, to_cut_id, added[], removed[], changed[], contradictions[] }`
- [ ] TDD: Delta computation is deterministic given two manifests
- [ ] TDD: Immutable — cuts never mutate after publication

**Gate:** All Phase 1 tests pass via `bash ci/local-runner/run-local-ci.sh`. No fixtures or mocked time.

---

## Phase 2: Immutable Cuts with D1+R2

**Objective:** Atomic publication of evidence snapshots.

- [ ] Implement D1 index writer: claims/envelopes indexed by `(subject, predicate, valid_time)`
- [ ] Implement R2 artifact uploader: full payload blobs keyed by `payload_hash`
- [ ] Implement atomic cut publication: D1 write + R2 upload succeed together or both roll back
- [ ] Implement cut retriever: reconstruct full projection from D1 index + R2 refs
- [ ] TDD: Partial failure leaves no orphaned artifacts
- [ ] TDD: Two concurrent cuts produce distinct, non-overlapping indices

**Gate:** Publish a cut with ≥10 envelopes, retrieve it, verify byte-for-byte payload integrity.

---

## Phase 3: Real Adapters

**Objective:** Replace inferred state with typed ingestion.

### 3.1 GovernanceTopologyAdapter
- [ ] Ingests: `docs/AUTHORITY.md`, `docs/ARCHITECTURE.md`, boundary definitions
- [ ] Produces: Claims about system boundaries, ownership, authority delegation
- [ ] TDD: Output matches handoff's 7-plane model exactly

### 3.2 GovernanceDependenciesAdapter
- [ ] Ingests: `package.json`, `wrangler.toml`, import graphs
- [ ] Produces: Dependency claims with version-pinned subjects

### 3.3 GitHubRepositoryAdapter
- [ ] Ingests: GitHub API (commits, PRs, CI status) via token
- [ ] Produces: Execution claims bound to exact SHAs
- [ ] TDD: Never infers repo health from filename alone

### 3.4 SentinelVerificationAdapter
- [ ] Ingests: Sentinel verification policies + results
- [ ] Produces: VERIFIED-plane claims linked to source evidence

**Gate:** Each adapter produces ≥5 real claims from live data. Zero hardcoded entities.

---

## Phase 4: Reconciliation Engine

**Objective:** Detect, preserve, and surface contradictions.

- [ ] Implement claim deduplication by `(subject, predicate, object, valid_time)`
- [ ] Implement contradiction detection: same subject+predicate, conflicting objects, overlapping valid_time
- [ ] Implement reconciliation strategies: `KEEP_BOTH`, `SUPERSEDE`, `FLAG_FOR_REVIEW`
- [ ] TDD: Contradictory claims coexist in same cut
- [ ] TDD: Reconciliation decision is itself a claim on VERIFIED plane

**Gate:** Ingest two adapters with known disagreement → both claims visible in Explore workspace.

---

## Phase 5: API

**Objective:** Typed, versioned read/write surface for Atlas state.

- [ ] `GET /api/v3/cuts/latest` → CutManifest
- [ ] `GET /api/v3/cuts/:id` → Full projection
- [ ] `GET /api/v3/claims?subject=&predicate=` → Filtered claims
- [ ] `POST /api/v3/adapters/:id/ingest` → Trigger adapter run
- [ ] `GET /api/v3/freshness` → Per-source freshness status
- [ ] TDD: API returns only persisted state, never computed-on-the-fly
- [ ] TDD: All responses include `X-Cut-ID` header

**Gate:** OpenAPI spec validates against implementation. No endpoint returns synthetic data.

---

## Phase 6: Workspaces (Explore / Evidence / Changes / Trace)

**Objective:** Human-facing surfaces that reflect real state transitions.

> ⚠️ **HARD CONSTRAINT:** Do NOT begin Phase 6 until Phases 1–5 pass all gates.

- [ ] **Explore:** Graph visualization of current cut's entities/relations
- [ ] **Evidence:** Drill-down into individual envelopes + payloads
- [ ] **Changes:** Timeline of CutDeltas between consecutive cuts
- [ ] **Trace:** Provenance chain from claim → envelope → adapter → source
- [ ] TDD: Every UI element maps to a real API response field
- [ ] TDD: Loading states reflect actual async operations, not fake spinners

**Gate:** Production verification — existing `/atlas/` replaced only after new workspaces pass exact-head CI + manual review.

---

## Hard Constraints (Apply to ALL Phases)

| Constraint | Verification Method |
|-----------|-------------------|
| No demo/fake state | Code review + test audit |
| No inferred truth from filenames | Adapter unit tests require typed source contracts |
| Contradictions preserved | Reconciliation tests assert dual-claim existence |
| Freshness is contract-driven | FreshnessPolicy tests reject global age rules |
| Bitemporal model enforced | All envelope tests validate `valid_time ≠ observed_time` |
| Existing `/atlas/` stays live | Route check in every CI run until cutover approved |
| Exact-head CI required | `avc/ci-local` must be green on PR head before merge |

---

## Definition of Done (Atlas V3)

Atlas V3 is "implemented" when:

1. All 6 phases pass their gates
2. D1+R2 contain ≥1 production cut with real adapter data
3. All 4 workspaces render from API, not fixtures
4. Existing `/atlas/` is deprecated via redirect to new route
5. This document is updated with final SHAs and cut IDs
6. Post-deployment verification confirms zero synthetic state in production
