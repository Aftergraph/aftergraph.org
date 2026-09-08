import { describe, it, expect } from 'vitest';
import { impactRings, pulseRows, contractRows } from '../src/lib/sliceC.js';

const proj = {
  schema: 'atlas-projection/0.2',
  meta: {},
  entities: [
    { id: 'repo:Aftergraph/a', kind: 'repository', identity: { full_name: 'Aftergraph/a', visibility: 'public' } },
    { id: 'repo:Aftergraph/b', kind: 'repository', identity: { full_name: 'Aftergraph/b', visibility: 'private' } },
    { id: 'contract:x/1.0', kind: 'contract', identity: { full_name: 'contract:x/1.0' } },
  ],
  assertions: [
    { id: 'as-1', subject: 'repo:Aftergraph/a', predicate: 'head_sha', value: 'a1', truth_plane: 'OBSERVED', provenance: { ref: 'a1' }, observed_at: 't', valid_at: '2026-09-08T10:00:00Z', freshness: 'fresh', conflict_id: null },
    { id: 'as-2', subject: 'repo:Aftergraph/a', predicate: 'open_pr', value: { number: 1 }, truth_plane: 'PROPOSED', provenance: { ref: 'p1' }, observed_at: 't', valid_at: '2026-09-08T12:00:00Z', freshness: 'fresh', conflict_id: null },
    { id: 'as-3', subject: 'repo:Aftergraph/b', predicate: 'withheld', value: { reason: 'private-source-boundary' }, truth_plane: 'OBSERVED', provenance: { ref: 'b1' }, observed_at: 't', valid_at: null, freshness: 'fresh', conflict_id: null },
  ],
  relations: [
    { id: 'rel-1', source: 'repo:Aftergraph/a', target: 'contract:x/1.0', relation: 'consumes', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    { id: 'rel-2', source: 'repo:Aftergraph/b', target: 'contract:x/1.0', relation: 'owns', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
  ],
  conflicts: [],
};

describe('pulseRows', () => {
  it('ranks by latest activity and never resolves withheld repos', () => {
    const rows = pulseRows(proj);
    expect(rows.map((r) => r.id)).toEqual(['repo:Aftergraph/a', 'repo:Aftergraph/b']);
    const b = rows.find((r) => r.id === 'repo:Aftergraph/b');
    expect(b.headSha).toBe(null);
    expect(b.withheld).toBe('private-source-boundary');
    expect(rows.find((r) => r.id === 'repo:Aftergraph/a').lastActivity).toBe('2026-09-08T12:00:00Z');
  });
});

describe('contractRows', () => {
  it('attributes owners and consumers with direction', () => {
    const rows = contractRows(proj);
    expect(rows).toHaveLength(1);
    expect(rows[0].owners.map((o) => o.id)).toEqual(['repo:Aftergraph/b']);
    expect(rows[0].consumers.map((c) => c.id)).toEqual(['repo:Aftergraph/a']);
  });
});

describe('impactRings', () => {
  it('labels hop depth and direction', () => {
    const rings = impactRings(proj, 'contract:x/1.0', 2);
    expect(rings).toEqual([
      { id: 'repo:Aftergraph/a', depth: 1, dir: 'up' },
      { id: 'repo:Aftergraph/b', depth: 1, dir: 'up' },
    ]);
  });
});
