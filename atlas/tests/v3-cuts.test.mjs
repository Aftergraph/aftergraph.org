import { describe, it, expect } from 'vitest';
import { createCut, publishCut, validateCutIntegrity } from '../src/v3/cuts.ts';

function makeEnvelope(id, adapter = 'test-adapter') {
  return {
    id,
    source_adapter_id: adapter,
    valid_time: '2026-09-15T10:00:00Z',
    observed_time: '2026-09-15T10:05:00Z',
    payload_hash: `sha256:${id}`,
    payload_ref: `r2://test/${id}.json`,
    epistemic: 'observed',
    currentness: 'current',
    source_class: 'observation',
    verification: 'unverified',
  };
}

function makeClaim(id, envelopeId, contradictions = []) {
  return {
    id,
    envelope_id: envelopeId,
    subject: 'test-subject',
    predicate: 'has_status',
    object: 'active',
    contradicting_claim_ids: contradictions,
  };
}

describe('createCut', () => {
  it('produces manifest with correct counts', () => {
    const envelopes = [makeEnvelope('e1'), makeEnvelope('e2', 'other-adapter')];
    const claims = [makeClaim('c1', 'e1'), makeClaim('c2', 'e2')];
    const { manifest } = createCut({ envelopes, claims });

    expect(manifest.entity_count).toBe(2);
    expect(manifest.assertion_count).toBe(2);
    expect(manifest.relation_count).toBe(2);
    expect(manifest.conflict_count).toBe(0);
    expect(manifest.cut_id).toBeTruthy();
    expect(manifest.timestamp).toBeTruthy();
  });

  it('counts conflicts from contradicting_claim_ids', () => {
    const envelopes = [makeEnvelope('e1')];
    const claims = [
      makeClaim('c1', 'e1'),
      makeClaim('c2', 'e1', ['c1']),
    ];
    const { manifest } = createCut({ envelopes, claims });
    expect(manifest.conflict_count).toBe(1);
  });

  it('sets delta.from_cut_id to genesis when no previous cut', () => {
    const { delta } = createCut({ envelopes: [], claims: [] });
    expect(delta.from_cut_id).toBe('genesis');
  });

  it('uses provided previous_cut_id in delta', () => {
    const { delta } = createCut({ envelopes: [], claims: [], previous_cut_id: 'cut-prev' });
    expect(delta.from_cut_id).toBe('cut-prev');
  });
});

describe('publishCut', () => {
  it('binds d1 and r2 refs atomically', () => {
    const input = { envelopes: [makeEnvelope('e1')], claims: [makeClaim('c1', 'e1')] };
    const published = publishCut(input, 'd1:snap:abc', 'r2://cuts/xyz');

    expect(published.manifest.d1_index_ref).toBe('d1:snap:abc');
    expect(published.manifest.r2_artifact_ref).toBe('r2://cuts/xyz');
  });

  it('throws on empty d1IndexRef', () => {
    const input = { envelopes: [], claims: [] };
    expect(() => publishCut(input, '', 'r2://ok')).toThrow('d1IndexRef');
  });

  it('throws on empty r2ArtifactRef', () => {
    const input = { envelopes: [], claims: [] };
    expect(() => publishCut(input, 'd1:ok', '  ')).toThrow('r2ArtifactRef');
  });

  it('returns valid delta matching manifest cut_id', () => {
    const input = { envelopes: [makeEnvelope('e1')], claims: [makeClaim('c1', 'e1')] };
    const { manifest, delta } = publishCut(input, 'd1:ref', 'r2://ref');
    expect(delta.to_cut_id).toBe(manifest.cut_id);
  });
});

describe('validateCutIntegrity', () => {
  it('passes for a consistent cut', () => {
    const envelopes = [makeEnvelope('e1')];
    const claims = [makeClaim('c1', 'e1')];
    const { manifest, delta } = publishCut({ envelopes, claims }, 'd1:x', 'r2://y');
    const result = validateCutIntegrity(manifest, delta, envelopes, claims);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects assertion_count mismatch', () => {
    const envelopes = [makeEnvelope('e1')];
    const claims = [makeClaim('c1', 'e1')];
    const { manifest, delta } = publishCut({ envelopes, claims }, 'd1:x', 'r2://y');
    const badManifest = { ...manifest, assertion_count: 99 };
    const result = validateCutIntegrity(badManifest, delta, envelopes, claims);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('assertion_count'))).toBe(true);
  });

  it('detects missing storage refs', () => {
    const envelopes = [];
    const claims = [];
    const { manifest, delta } = createCut({ envelopes, claims });
    // Unpublished manifest has empty refs
    const result = validateCutIntegrity(manifest, delta, envelopes, claims);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('d1_index_ref'))).toBe(true);
  });
});
