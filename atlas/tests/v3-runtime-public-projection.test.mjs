import { describe, it, expect } from 'vitest';
import { RuntimeWorldStatePublicAdapter } from '../src/v3/adapters/RuntimeWorldStatePublicAdapter.ts';

const base = {
  schema: 'world-assertion/0.1',
  assertion_id: 'ast_public_001',
  subject: 'host:public-edge-1',
  predicate: 'health',
  value_or_ref: 'healthy',
  epistemic: 'observed',
  currentness: 'current',
  source_refs: ['source:runtime-host:edge-1'],
  evidence_refs: ['evidence:host-snapshot:001'],
  observed_at: '2026-09-16T18:00:00Z',
  evidence_observed_at: '2026-09-16T18:00:00Z',
  asserted_at: '2026-09-16T18:00:00Z',
  valid_until: '2026-09-16T18:05:00Z',
  tenant_id: 'ten_private_internal_identifier',
  domain: 'runtime-host',
  classification: 'public',
  consent_record: 'consent:public-observability',
  consent_version: '1',
  purpose: 'public-observability',
  evidence_requirement: 'current_observed',
};
const policy = {
  allowed_classifications: ['public'],
  allowed_purposes: ['public-observability'],
  allowed_consent_records: ['consent:public-observability'],
  allowed_subject_prefixes: ['host:public-'],
  allowed_predicates: ['health'],
};

describe('OER-226 Runtime World State public projection', () => {
  it('withholds internal assertions by default without echoing sensitive payload', () => {
    const adapter = new RuntimeWorldStatePublicAdapter(policy);
    const result = adapter.project([{ ...base, assertion_id: 'ast_internal', classification: 'internal' }]);
    expect(result.published).toHaveLength(0);
    expect(result.withheld).toEqual([{ assertion_id: 'ast_internal', reason: 'classification_not_publishable' }]);
    expect(JSON.stringify(result.withheld)).not.toContain('ten_private_internal_identifier');
    expect(JSON.stringify(result.withheld)).not.toContain('runtime-host:edge-1');
  });

  it('requires subject and predicate allowlists even for public-classified assertions', () => {
    const adapter = new RuntimeWorldStatePublicAdapter(policy);
    const subjectDenied = adapter.project([{ ...base, subject: 'host:jonas-lenovo' }]);
    const predicateDenied = adapter.project([{ ...base, predicate: 'argv_identity', value_or_ref: 'secret-shape' }]);
    expect(subjectDenied.withheld[0].reason).toBe('subject_not_publishable');
    expect(predicateDenied.withheld[0].reason).toBe('predicate_not_publishable');
  });
  it('publishes only policy-approved assertions and exposes provenance as digests', () => {
    const adapter = new RuntimeWorldStatePublicAdapter(policy);
    const result = adapter.project([base]);
    expect(result.withheld).toHaveLength(0);
    expect(result.published).toHaveLength(1);
    const record = result.published[0];
    expect(record.envelope).toMatchObject({
      epistemic: 'observed',
      currentness: 'current',
      source_class: 'projection',
      verification: 'unverified',
    });
    expect(record.claim).toMatchObject({
      subject: 'host:public-edge-1',
      predicate: 'health',
      object: 'healthy',
    });
    expect(record.provenance.source_ref_digests[0]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(record.provenance.evidence_ref_digests[0]).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(record)).not.toContain('ten_private_internal_identifier');
    expect(JSON.stringify(record)).not.toContain('source:runtime-host:edge-1');
  });
  it('preserves epistemic/currentness and never upgrades verification', () => {
    const adapter = new RuntimeWorldStatePublicAdapter(policy);
    const result = adapter.project([{ ...base, epistemic: 'predicted', currentness: 'stale' }]);
    expect(result.published[0].envelope).toMatchObject({
      epistemic: 'predicted',
      currentness: 'stale',
      verification: 'unverified',
    });
  });

  it('requires explicit consent and purpose matches', () => {
    const adapter = new RuntimeWorldStatePublicAdapter(policy);
    expect(adapter.project([{ ...base, consent_record: 'consent:runtime-operations' }]).withheld[0].reason)
      .toBe('consent_not_publishable');
    expect(adapter.project([{ ...base, purpose: 'operational-reality' }]).withheld[0].reason)
      .toBe('purpose_not_publishable');
  });
});
