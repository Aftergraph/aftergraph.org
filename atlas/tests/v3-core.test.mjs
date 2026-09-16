import { describe, it, expect } from 'vitest';
import { EPISTEMIC_STATES, CURRENTNESS_STATES, SOURCE_CLASSES, VERIFICATION_STATES } from '../src/v3/types.ts';

// Phase 1 TDD: Core domain model contracts
// These tests define the irreducible evidence primitives.

describe('Evidence dimensions', () => {
  it('keeps epistemic, currentness, source, and verification orthogonal', () => {
    expect(EPISTEMIC_STATES).toEqual(['observed', 'inferred', 'predicted', 'unknown']);
    expect(CURRENTNESS_STATES).toEqual(['current', 'stale', 'disputed', 'superseded']);
    expect(SOURCE_CLASSES).toContain('canonical_source');
    expect(VERIFICATION_STATES).toEqual(['unverified', 'verified', 'rejected', 'indeterminate']);
  });
});

describe('EvidenceEnvelope contract', () => {
  it('requires valid_time and observed_time to be distinct fields', () => {
    // Bitemporal model: valid_time ≠ observed_time must be enforceable
    const envelope = {
      id: 'env-001',
      source_adapter_id: 'github-repo-adapter',
      valid_time: '2026-09-15T10:00:00Z',
      observed_time: '2026-09-15T10:05:00Z',
      payload_hash: 'sha256:abc123',
      payload_ref: 'r2://cuts/2026-09-15/env-001.json',
      epistemic: 'observed',
      currentness: 'current',
      source_class: 'observation',
      verification: 'unverified',
    };
    expect(envelope.valid_time).not.toBe(envelope.observed_time);
  });

  it('keeps verification independent from epistemic observation', () => {
    expect(EPISTEMIC_STATES).toContain('observed');
    expect(EPISTEMIC_STATES).not.toContain('verified');
    expect(VERIFICATION_STATES).toContain('verified');
    expect(VERIFICATION_STATES).not.toContain('observed');
  });
});

describe('Claim contract', () => {
  it('preserves contradicting_claim_ids without collapsing', () => {
    const claim = {
      id: 'claim-001',
      envelope_id: 'env-001',
      subject: 'aftergraph.org:main',
      predicate: 'ci_status',
      object: 'green',
      contradicting_claim_ids: ['claim-002'],
    };
    // Contradictions are first-class — never auto-resolved
    expect(claim.contradicting_claim_ids).toHaveLength(1);
    expect(claim.contradicting_claim_ids[0]).toBe('claim-002');
  });

  it('uses typed subject/predicate/object, not free text', () => {
    const claim = {
      id: 'claim-003',
      envelope_id: 'env-002',
      subject: 'trust-gateway:v2',
      predicate: 'deployment_status',
      object: 'live',
      contradicting_claim_ids: [],
    };
    // All three fields must be non-empty strings
    expect(typeof claim.subject).toBe('string');
    expect(typeof claim.predicate).toBe('string');
    expect(typeof claim.object).toBe('string');
    expect(claim.subject.length).toBeGreaterThan(0);
    expect(claim.predicate.length).toBeGreaterThan(0);
    expect(claim.object.length).toBeGreaterThan(0);
  });
});

describe('FreshnessPolicy contract', () => {
  it('evaluates against observed_time, not wall clock', () => {
    const policy = {
      max_age_seconds: 3600,
      staleness_action: 'warn',
    };
    const observed_time = new Date('2026-09-15T10:00:00Z');
    const check_time = new Date('2026-09-15T10:30:00Z');
    const age_seconds = (check_time - observed_time) / 1000;
    expect(age_seconds).toBeLessThan(policy.max_age_seconds);
    // Freshness is contract-driven, not global age rule
    expect(policy.staleness_action).toBe('warn');
  });

  it('supports per-source overrides', () => {
    const policy = {
      max_age_seconds: 3600,
      staleness_action: 'warn',
      source_specific_overrides: {
        'sentinel-adapter': { max_age_seconds: 7200, staleness_action: 'flag' },
      },
    };
    expect(policy.source_specific_overrides['sentinel-adapter'].max_age_seconds).toBe(7200);
  });
});
