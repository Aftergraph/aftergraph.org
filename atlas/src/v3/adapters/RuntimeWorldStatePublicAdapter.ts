import { createHash } from 'node:crypto';
import type {
  Claim,
  CurrentnessState,
  EpistemicState,
  EvidenceEnvelope,
} from '../types.ts';

export interface RuntimeWorldAssertion {
  schema: 'world-assertion/0.1';
  assertion_id: string;
  subject: string;
  predicate: string;
  value_or_ref: string;
  epistemic: EpistemicState;
  currentness: CurrentnessState;
  source_refs: readonly string[];
  evidence_refs: readonly string[];
  observed_at: string;
  evidence_observed_at: string;
  asserted_at: string;
  valid_until: string;
  tenant_id: string;
  domain: string;
  classification: string;
  consent_record: string;
  consent_version: string;
  purpose: string;
  confidence?: number;
  evidence_requirement: 'none' | 'current_observed';
}
export interface RuntimeWorldStatePublicationPolicy {
  allowed_classifications: readonly string[];
  allowed_purposes: readonly string[];
  allowed_consent_records: readonly string[];
  allowed_subject_prefixes: readonly string[];
  allowed_predicates: readonly string[];
}

export type WithheldWorldAssertion = Readonly<{
  assertion_id: string;
  reason:
    | 'classification_not_publishable'
    | 'purpose_not_publishable'
    | 'consent_not_publishable'
    | 'subject_not_publishable'
    | 'predicate_not_publishable'
    | 'invalid_world_assertion';
}>;

export type PublicProjectionRecord = Readonly<{
  envelope: EvidenceEnvelope;
  claim: Claim;
  provenance: Readonly<{
    source_ref_digests: readonly string[];
    evidence_ref_digests: readonly string[];
  }>;
}>;
const digest = (value: string): string =>
  `sha256:${createHash('sha256').update(value).digest('hex')}`;

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);

const isValidAssertion = (value: RuntimeWorldAssertion): boolean =>
  value?.schema === 'world-assertion/0.1' &&
  typeof value.assertion_id === 'string' && value.assertion_id.length > 0 &&
  typeof value.subject === 'string' && value.subject.length > 0 &&
  typeof value.predicate === 'string' && value.predicate.length > 0 &&
  typeof value.value_or_ref === 'string' &&
  typeof value.classification === 'string' && value.classification.length > 0 &&
  typeof value.purpose === 'string' && value.purpose.length > 0 &&
  typeof value.consent_record === 'string' && value.consent_record.length > 0 &&
  isStringArray(value.source_refs) &&
  isStringArray(value.evidence_refs);

const includes = (values: readonly string[], candidate: string): boolean =>
  values.includes(candidate);

const subjectAllowed = (prefixes: readonly string[], subject: string): boolean =>
  prefixes.some((prefix) => prefix.length > 0 && subject.startsWith(prefix));
export class RuntimeWorldStatePublicAdapter {
  readonly adapter_id = 'runtime-world-state-public-adapter';

  constructor(private readonly policy: RuntimeWorldStatePublicationPolicy) {}

  project(assertions: readonly RuntimeWorldAssertion[]): Readonly<{
    published: PublicProjectionRecord[];
    withheld: WithheldWorldAssertion[];
  }> {
    const published: PublicProjectionRecord[] = [];
    const withheld: WithheldWorldAssertion[] = [];

    for (const assertion of assertions) {
      const reason = this.withholdReason(assertion);
      if (reason) {
        withheld.push({ assertion_id: assertion?.assertion_id ?? 'unknown', reason });
        continue;
      }
      published.push(this.toPublicRecord(assertion));
    }
    return { published, withheld };
  }
  private withholdReason(assertion: RuntimeWorldAssertion): WithheldWorldAssertion['reason'] | null {
    if (!isValidAssertion(assertion)) return 'invalid_world_assertion';
    if (!includes(this.policy.allowed_classifications, assertion.classification)) {
      return 'classification_not_publishable';
    }
    if (!includes(this.policy.allowed_purposes, assertion.purpose)) {
      return 'purpose_not_publishable';
    }
    if (!includes(this.policy.allowed_consent_records, assertion.consent_record)) {
      return 'consent_not_publishable';
    }
    if (!subjectAllowed(this.policy.allowed_subject_prefixes, assertion.subject)) {
      return 'subject_not_publishable';
    }
    if (!includes(this.policy.allowed_predicates, assertion.predicate)) {
      return 'predicate_not_publishable';
    }
    return null;
  }
  private toPublicRecord(assertion: RuntimeWorldAssertion): PublicProjectionRecord {
    const publicPayload = {
      assertion_id: assertion.assertion_id,
      subject: assertion.subject,
      predicate: assertion.predicate,
      value_or_ref: assertion.value_or_ref,
      epistemic: assertion.epistemic,
      currentness: assertion.currentness,
      observed_at: assertion.observed_at,
      valid_until: assertion.valid_until,
      domain: assertion.domain,
    };
    const envelope: EvidenceEnvelope = {
      id: `env-runtime-world-${assertion.assertion_id}`,
      source_adapter_id: this.adapter_id,
      valid_time: assertion.observed_at,
      observed_time: assertion.asserted_at,
      payload_hash: digest(JSON.stringify(publicPayload)),
      payload_ref: `inline:public-world-assertion:${assertion.assertion_id}`,
      epistemic: assertion.epistemic,
      currentness: assertion.currentness,
      source_class: 'projection',
      verification: 'unverified',
    };
    const claim: Claim = {
      id: `claim-runtime-world-${assertion.assertion_id}`,
      envelope_id: envelope.id,
      subject: assertion.subject,
      predicate: assertion.predicate,
      object: assertion.value_or_ref,
      ...(assertion.confidence === undefined ? {} : { confidence: assertion.confidence }),
      contradicting_claim_ids: [],
    };
    return {
      envelope,
      claim,
      provenance: {
        source_ref_digests: [...assertion.source_refs].sort().map(digest),
        evidence_ref_digests: [...assertion.evidence_refs].sort().map(digest),
      },
    };
  }
}
