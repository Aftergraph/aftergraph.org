import { describe, it, expect } from 'vitest';
import {
  deriveGraph,
  indexAssertions,
  neighborhood,
  moveSelection,
  serializeState,
  parseState,
  elkOptions,
  PLANES,
} from '../src/lib/derive.js';

// Minimal v0.2-shaped fixture: one entity with assertions on two planes each.
const fixture = {
  schema: 'atlas-projection/0.2',
  meta: {},
  entities: [
    { id: 'repo:Aftergraph/aie', kind: 'repository', identity: { full_name: 'Aftergraph/aie' } },
    { id: 'repo:Aftergraph/gov', kind: 'repository', identity: { full_name: 'Aftergraph/gov' } },
    { id: 'repo:Aftergraph/old', kind: 'repository', identity: { full_name: 'Aftergraph/old' } },
  ],
  assertions: [
    { id: 'as-1', subject: 'repo:Aftergraph/aie', predicate: 'role', value: 'x', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    { id: 'as-2', subject: 'repo:Aftergraph/aie', predicate: 'head_sha', value: 'y', truth_plane: 'OBSERVED', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    { id: 'as-3', subject: 'repo:Aftergraph/gov', predicate: 'role', value: 'x', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    { id: 'as-4', subject: 'repo:Aftergraph/old', predicate: 'open_pr', value: {}, truth_plane: 'PROPOSED', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: 'C9' },
  ],
  relations: [
    { id: 'rel-1', source: 'repo:Aftergraph/aie', target: 'repo:Aftergraph/gov', relation: 'consumes', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    { id: 'rel-2', source: 'repo:Aftergraph/aie', target: 'repo:Aftergraph/old', relation: 'proposes', truth_plane: 'PROPOSED', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
  ],
  conflicts: [{ id: 'C9', kind: 'rename', status: 'open', pairs: [{ a: 'as-4', b: 'as-2' }] }],
};

describe('deriveGraph', () => {
  it('shows only entities with assertions on active planes', () => {
    const g = deriveGraph(fixture, ['CANONICAL']);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['repo:Aftergraph/aie', 'repo:Aftergraph/gov']);
    expect(g.edges.map((e) => e.id)).toEqual(['rel-1']);
    expect(g.planesUsed).toEqual(['CANONICAL']);
  });

  it('each node records which planes fed it', () => {
    const g = deriveGraph(fixture, ['CANONICAL', 'OBSERVED']);
    const aie = g.nodes.find((n) => n.id === 'repo:Aftergraph/aie');
    expect(aie.planes).toEqual(['CANONICAL', 'OBSERVED']);
  });

  it('flags conflict subjects from pairs', () => {
    const g = deriveGraph(fixture, ['OBSERVED', 'PROPOSED']);
    const flagged = new Set(g.nodes.filter((n) => n.inConflict).map((n) => n.id));
    expect(flagged.has('repo:Aftergraph/old')).toBe(true);
    expect(flagged.has('repo:Aftergraph/aie')).toBe(true);
  });

  it('drops edges whose endpoints are filtered out', () => {
    const g = deriveGraph(fixture, ['PROPOSED']);
    expect(g.nodes.map((n) => n.id)).toEqual(['repo:Aftergraph/old']);
    expect(g.edges).toEqual([]);
  });
});

describe('neighborhood', () => {
  it('returns 1-hop subgraph', () => {
    const n = neighborhood(fixture, 'repo:Aftergraph/aie', 1);
    expect(n.nodes).toEqual(['repo:Aftergraph/aie', 'repo:Aftergraph/gov', 'repo:Aftergraph/old']);
    expect(n.edges).toEqual(['rel-1', 'rel-2']);
  });
});

describe('selection + URL', () => {
  it('moves and wraps', () => {
    expect(moveSelection(['a', 'b', 'c'], 'b', 1)).toBe('c');
    expect(moveSelection(['a', 'b', 'c'], 'c', 1)).toBe('a');
    expect(moveSelection(['a', 'b', 'c'], null, -1)).toBe('c');
    expect(moveSelection([], null, 1)).toBe(null);
  });

  it('round-trips state', () => {
    const s = { node: 'repo:Aftergraph/aie', overlay: ['OBSERVED', 'CANONICAL'], view: 'drift' };
    const back = parseState(serializeState(s));
    expect(back.node).toBe(s.node);
    expect(back.overlay).toEqual(['CANONICAL', 'OBSERVED']);
    expect(back.view).toBe('drift');
  });

  it('rejects unknown planes, defaults to all', () => {
    expect(parseState('?overlay=NOPE').overlay).toEqual(PLANES);
  });
});

describe('elkOptions', () => {
  it('is layered DOWN and stable across calls', () => {
    const a = elkOptions();
    expect(a['elk.algorithm']).toBe('layered');
    expect(a['elk.direction']).toBe('DOWN');
    expect(JSON.stringify(a)).toBe(JSON.stringify(elkOptions()));
  });
});

describe('indexAssertions', () => {
  it('groups by subject, sorted by predicate', () => {
    const idx = indexAssertions(fixture);
    expect(idx.get('repo:Aftergraph/aie').map((a) => a.predicate)).toEqual(['head_sha', 'role']);
  });
});
