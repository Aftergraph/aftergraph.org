import { describe, it, expect } from 'vitest';
import { reconcileClaims } from '../src/v3/reconciliation.ts';

function makeClaim(id, subject, predicate, object, contradicting = []) {
  return {
    id,
    envelope_id: `env-${id}`,
    subject,
    predicate,
    object,
    contradicting_claim_ids: contradicting,
  };
}

describe('reconcileClaims', () => {
  it('returns empty arrays for empty input', () => {
    const result = reconcileClaims([]);
    expect(result.resolved).toHaveLength(0);
    expect(result.unresolved).toHaveLength(0);
    expect(result.conflicting).toHaveLength(0);
    expect(result.groups.size).toBe(0);
  });

  it('classifies single claim as unresolved', () => {
    const claims = [makeClaim('c1', 'alice', 'works_at', 'acme')];
    const result = reconcileClaims(claims);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].claim.id).toBe('c1');
    expect(result.unresolved[0].status).toBe('unresolved');
    expect(result.resolved).toHaveLength(0);
    expect(result.conflicting).toHaveLength(0);
  });

  it('classifies multiple non-contradicting claims in same group as resolved', () => {
    const claims = [
      makeClaim('c1', 'alice', 'works_at', 'acme'),
      makeClaim('c2', 'alice', 'works_at', 'globex'),
    ];
    const result = reconcileClaims(claims);
    expect(result.resolved).toHaveLength(2);
    expect(result.conflicting).toHaveLength(0);
    expect(result.unresolved).toHaveLength(0);
  });

  it('detects contradictions when claim A references claim B', () => {
    const claims = [
      makeClaim('c1', 'alice', 'works_at', 'acme', ['c2']),
      makeClaim('c2', 'alice', 'works_at', 'globex'),
    ];
    const result = reconcileClaims(claims);
    // c1 explicitly contradicts c2 → both should be conflicting
    expect(result.conflicting).toHaveLength(2);
    const ids = result.conflicting.map((r) => r.claim.id).sort();
    expect(ids).toEqual(['c1', 'c2']);
    expect(result.resolved).toHaveLength(0);
  });

  it('detects bidirectional contradictions', () => {
    const claims = [
      makeClaim('c1', 'alice', 'works_at', 'acme', ['c2']),
      makeClaim('c2', 'alice', 'works_at', 'globex', ['c1']),
    ];
    const result = reconcileClaims(claims);
    expect(result.conflicting).toHaveLength(2);
  });

  it('preserves all contradicting_claim_ids without collapsing', () => {
    const claims = [
      makeClaim('c1', 'alice', 'role', 'engineer', ['c2', 'c3']),
      makeClaim('c2', 'alice', 'role', 'manager'),
      makeClaim('c3', 'alice', 'role', 'designer'),
    ];
    const result = reconcileClaims(claims);
    // c1 references c2 and c3 → all three are conflicting
    expect(result.conflicting).toHaveLength(3);
    // Verify original contradicting_claim_ids are preserved
    const c1 = result.conflicting.find((r) => r.claim.id === 'c1');
    expect(c1.claim.contradicting_claim_ids).toEqual(['c2', 'c3']);
  });

  it('does not flag contradictions across different groups', () => {
    const claims = [
      makeClaim('c1', 'alice', 'works_at', 'acme', ['c2']),
      makeClaim('c2', 'bob', 'works_at', 'globex'), // different subject
    ];
    const result = reconcileClaims(claims);
    // c2 is in a different group (bob||works_at), so c1's contradiction ref doesn't match
    // c1 is alone in its group → unresolved
    // c2 is alone in its group → unresolved
    expect(result.unresolved).toHaveLength(2);
    expect(result.conflicting).toHaveLength(0);
  });

  it('handles mixed groups correctly', () => {
    const claims = [
      // Group alice||role: c1 and c2 conflict, c3 is clean
      makeClaim('c1', 'alice', 'role', 'engineer', ['c2']),
      makeClaim('c2', 'alice', 'role', 'manager'),
      makeClaim('c3', 'alice', 'role', 'designer'),
      // Group bob||role: single claim → unresolved
      makeClaim('c4', 'bob', 'role', 'analyst'),
    ];
    const result = reconcileClaims(claims);

    const conflictingIds = result.conflicting.map((r) => r.claim.id).sort();
    expect(conflictingIds).toEqual(['c1', 'c2']);

    // c3 is in same group but has no contradiction links → resolved
    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].claim.id).toBe('c3');

    // c4 alone → unresolved
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0].claim.id).toBe('c4');
  });

  it('groups map contains correct entries', () => {
    const claims = [
      makeClaim('c1', 'alice', 'works_at', 'acme'),
      makeClaim('c2', 'alice', 'works_at', 'globex'),
      makeClaim('c3', 'bob', 'works_at', 'initech'),
    ];
    const result = reconcileClaims(claims);
    expect(result.groups.size).toBe(2);
    expect(result.groups.get('alice||works_at')).toHaveLength(2);
    expect(result.groups.get('bob||works_at')).toHaveLength(1);
  });
});
