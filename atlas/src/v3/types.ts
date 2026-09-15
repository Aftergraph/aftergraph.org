// Atlas V3 Core Domain Types
// Phase 1: EvidenceEnvelope, Claim, FreshnessPolicy, CutManifest, CutDelta

export const TRUTH_PLANES = [
  'CANONICAL',
  'OBSERVED',
  'INFERRED',
  'PROPOSED',
  'VERIFIED',
  'EXECUTED',
] as const;

export type TruthPlane = (typeof TRUTH_PLANES)[number];

export interface EvidenceEnvelope {
  id: string;
  source_adapter_id: string;
  valid_time: string;   // ISO 8601 — when the claim is true
  observed_time: string; // ISO 8601 — when we learned it
  payload_hash: string;  // SHA-256 of canonical JSON payload
  payload_ref: string;   // R2 key or inline for small payloads
  signature?: string;    // Optional HMAC or signing key ref
  truth_plane: TruthPlane;
}

export interface Claim {
  id: string;
  envelope_id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;              // 0.0–1.0, optional
  contradicting_claim_ids: string[]; // Never collapsed — contradictions preserved
}

export interface SourceAdapterContract {
  adapter_id: string;
  source_type: string;
  freshness_policy: FreshnessPolicy;
}

export interface FreshnessPolicy {
  max_age_seconds: number;
  staleness_action: 'warn' | 'hide' | 'flag';
  source_specific_overrides?: Record<string, Partial<FreshnessPolicy>>;
}

export interface CutManifest {
  cut_id: string;
  timestamp: string;        // ISO 8601 publication time
  entity_count: number;
  assertion_count: number;
  relation_count: number;
  conflict_count: number;
  d1_index_ref: string;     // D1 query cursor or snapshot ID
  r2_artifact_ref: string;  // R2 prefix for this cut's blobs
}

export interface CutDelta {
  from_cut_id: string;
  to_cut_id: string;
  added: string[];       // Claim IDs
  removed: string[];     // Claim IDs
  changed: string[];     // Claim IDs
  contradictions: string[]; // Claim IDs that are new contradictions
}
