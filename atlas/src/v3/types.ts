// Atlas V3 Core Domain Types
// Evidence dimensions are orthogonal: epistemic state, currentness,
// provenance/source class, and verification outcome.

export const EPISTEMIC_STATES = [
  'observed', 'inferred', 'predicted', 'unknown',
] as const;
export type EpistemicState = (typeof EPISTEMIC_STATES)[number];

export const CURRENTNESS_STATES = [
  'current', 'stale', 'disputed', 'superseded',
] as const;
export type CurrentnessState = (typeof CURRENTNESS_STATES)[number];

export const SOURCE_CLASSES = [
  'canonical_source', 'observation', 'execution', 'verification', 'proposal', 'projection',
] as const;
export type SourceClass = (typeof SOURCE_CLASSES)[number];

export const VERIFICATION_STATES = [
  'unverified', 'verified', 'rejected', 'indeterminate',
] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export interface EvidenceEnvelope {
  id: string;
  source_adapter_id: string;
  valid_time: string;
  observed_time: string;
  payload_hash: string;
  payload_ref: string;
  signature?: string;
  epistemic: EpistemicState;
  currentness: CurrentnessState;
  source_class: SourceClass;
  verification: VerificationState;
}

export interface Claim {
  id: string;
  envelope_id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;
  contradicting_claim_ids: string[];
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
  timestamp: string;
  entity_count: number;
  assertion_count: number;
  relation_count: number;
  conflict_count: number;
  d1_index_ref: string;
  r2_artifact_ref: string;
}

export interface CutDelta {
  from_cut_id: string;
  to_cut_id: string;
  added: string[];
  removed: string[];
  changed: string[];
  contradictions: string[];
}
