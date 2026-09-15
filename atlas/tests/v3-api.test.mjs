import { describe, it, expect, beforeEach } from 'vitest';
import { AtlasAPI } from '../src/v3/api.ts';

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

function makeCut(cutId, ts = '2026-09-15T00:00:00Z') {
  return {
    cut_id: cutId,
    timestamp: ts,
    entity_count: 10,
    assertion_count: 20,
    relation_count: 5,
    conflict_count: 0,
    d1_index_ref: `d1-${cutId}`,
    r2_artifact_ref: `r2/${cutId}/`,
  };
}

function makeDelta(from, to) {
  return {
    from_cut_id: from,
    to_cut_id: to,
    added: ['c-new'],
    removed: ['c-old'],
    changed: ['c-changed'],
    contradictions: ['c-conflict'],
  };
}

function makeAdapter(id, type = 'api') {
  return {
    adapter_id: id,
    source_type: type,
    freshness_policy: {
      max_age_seconds: 3600,
      staleness_action: 'warn',
    },
  };
}

describe('AtlasAPI', () => {
  let api;

  beforeEach(() => {
    api = new AtlasAPI();
  });

  describe('queryClaims', () => {
    it('returns all claims when no filter applied', () => {
      const claims = [makeClaim('c1', 'alice', 'works_at', 'acme'), makeClaim('c2', 'bob', 'works_at', 'globex')];
      api.seedClaims(claims);
      const res = api.queryClaims();
      expect(res.claims).toHaveLength(2);
      expect(res.total).toBe(2);
    });

    it('filters by subject', () => {
      api.seedClaims([
        makeClaim('c1', 'alice', 'works_at', 'acme'),
        makeClaim('c2', 'bob', 'works_at', 'globex'),
      ]);
      const res = api.queryClaims({ subject: 'alice' });
      expect(res.claims).toHaveLength(1);
      expect(res.claims[0].subject).toBe('alice');
    });

    it('filters by predicate', () => {
      api.seedClaims([
        makeClaim('c1', 'alice', 'works_at', 'acme'),
        makeClaim('c2', 'alice', 'lives_in', 'berlin'),
      ]);
      const res = api.queryClaims({ predicate: 'lives_in' });
      expect(res.claims).toHaveLength(1);
      expect(res.claims[0].predicate).toBe('lives_in');
    });

    it('filters by object', () => {
      api.seedClaims([
        makeClaim('c1', 'alice', 'works_at', 'acme'),
        makeClaim('c2', 'bob', 'works_at', 'acme'),
        makeClaim('c3', 'carol', 'works_at', 'globex'),
      ]);
      const res = api.queryClaims({ object: 'acme' });
      expect(res.claims).toHaveLength(2);
    });

    it('combines multiple filters (AND)', () => {
      api.seedClaims([
        makeClaim('c1', 'alice', 'works_at', 'acme'),
        makeClaim('c2', 'alice', 'lives_in', 'acme'),
        makeClaim('c3', 'bob', 'works_at', 'acme'),
      ]);
      const res = api.queryClaims({ subject: 'alice', predicate: 'works_at' });
      expect(res.claims).toHaveLength(1);
      expect(res.claims[0].id).toBe('c1');
    });

    it('supports pagination with limit and offset', () => {
      api.seedClaims([
        makeClaim('c1', 'a', 'p', 'o1'),
        makeClaim('c2', 'a', 'p', 'o2'),
        makeClaim('c3', 'a', 'p', 'o3'),
      ]);
      const res = api.queryClaims({ limit: 2, offset: 1 });
      expect(res.claims).toHaveLength(2);
      expect(res.claims[0].id).toBe('c2');
      expect(res.total).toBe(3);
    });

    it('returns empty array for no matches', () => {
      api.seedClaims([makeClaim('c1', 'alice', 'works_at', 'acme')]);
      const res = api.queryClaims({ subject: 'nonexistent' });
      expect(res.claims).toHaveLength(0);
      expect(res.total).toBe(0);
    });
  });

  describe('getCut', () => {
    it('returns found=true with manifest for existing cut', () => {
      api.seedCuts([makeCut('cut-001')]);
      const res = api.getCut('cut-001');
      expect(res.found).toBe(true);
      expect(res.manifest.cut_id).toBe('cut-001');
    });

    it('returns found=false for missing cut', () => {
      const res = api.getCut('nonexistent');
      expect(res.found).toBe(false);
      expect(res.manifest).toBeNull();
    });
  });

  describe('getDelta', () => {
    it('returns found=true with delta for existing pair', () => {
      api.seedDeltas([makeDelta('cut-001', 'cut-002')]);
      const res = api.getDelta('cut-001', 'cut-002');
      expect(res.found).toBe(true);
      expect(res.delta.added).toEqual(['c-new']);
    });

    it('returns found=false for missing delta', () => {
      const res = api.getDelta('cut-001', 'cut-999');
      expect(res.found).toBe(false);
      expect(res.delta).toBeNull();
    });
  });

  describe('listAdapters', () => {
    it('returns seeded adapters', () => {
      api.seedAdapters([makeAdapter('github'), makeAdapter('slack', 'webhook')]);
      const res = api.listAdapters();
      expect(res.adapters).toHaveLength(2);
      expect(res.adapters[0].adapter_id).toBe('github');
      expect(res.adapters[1].source_type).toBe('webhook');
    });

    it('returns empty array when no adapters seeded', () => {
      const res = api.listAdapters();
      expect(res.adapters).toHaveLength(0);
    });
  });

  describe('reconcile integration', () => {
    it('runs reconciliation over seeded claims', () => {
      api.seedClaims([
        makeClaim('c1', 'alice', 'role', 'eng', ['c2']),
        makeClaim('c2', 'alice', 'role', 'mgr'),
        makeClaim('c3', 'bob', 'role', 'analyst'),
      ]);
      const result = api.reconcile();
      expect(result.conflicting).toHaveLength(2);
      expect(result.unresolved).toHaveLength(1);
      expect(result.unresolved[0].claim.id).toBe('c3');
    });
  });
});
