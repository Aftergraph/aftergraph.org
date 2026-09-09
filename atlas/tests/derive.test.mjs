import { describe, it, expect } from 'vitest';
import {
  deriveGraph,
  focusGraph,
  indexAssertions,
  neighborhood,
  aliasMap,
  moveSelection,
  serializeState,
  parseState,
  elkOptions,
  PLANES,
  impactSet,
  askRetrieve,
  validateAnswer,
  answerFromEvidence,
  filterEntities,
  cutAge,
  tracePath,
  validateProjection,
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

  it('expands through identity.aliases (rename-aware)', () => {
    const aliased = {
      ...fixture,
      entities: [
        ...fixture.entities,
        { id: 'repo:Aftergraph/new', kind: 'repository', identity: { full_name: 'Aftergraph/new', aliases: ['old'] } },
      ],
    };
    const n = neighborhood(aliased, 'repo:Aftergraph/new', 1);
    expect(n.nodes).toContain('repo:Aftergraph/new');
    expect(n.nodes).toContain('repo:Aftergraph/old');
    expect(n.nodes).toContain('repo:Aftergraph/aie');
  });

  it('links C1 rename pair subjects without identity.aliases', () => {
    // Fixture conflict C9 (kind rename, as-4 subject old / as-2 subject aie) is
    // the only link source here — no entity carries aliases.
    const m = aliasMap(fixture);
    expect([...(m.get('repo:Aftergraph/old') || [])]).toContain('repo:Aftergraph/aie');
    expect([...(m.get('repo:Aftergraph/aie') || [])]).toContain('repo:Aftergraph/old');
  });

  it('expands through C1 legacy/current slugs when aliases are absent', () => {
    const mk = (id, subject, predicate, plane) => ({
      id, subject, predicate, value: 'x', truth_plane: plane,
      provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null,
    });
    const proj = {
      ...fixture,
      entities: [
        ...fixture.entities,
        { id: 'repo:Aftergraph/new', kind: 'repository', identity: { full_name: 'Aftergraph/new' } },
      ],
      assertions: [
        ...fixture.assertions,
        mk('as-old-slug', 'repo:Aftergraph/old', 'slug', 'CANONICAL'),
        mk('as-new-slug', 'repo:Aftergraph/new', 'slug', 'OBSERVED'),
      ],
      conflicts: [
        ...fixture.conflicts,
        {
          id: 'C1', kind: 'rename', status: 'open',
          pairs: [{ a: 'as-old-slug', b: 'as-new-slug', legacy: 'old', current: 'new' }],
        },
      ],
    };
    const n = neighborhood(proj, 'repo:Aftergraph/new', 1);
    expect(n.nodes).toContain('repo:Aftergraph/new');
    expect(n.nodes).toContain('repo:Aftergraph/old');
    expect(n.nodes).toContain('repo:Aftergraph/aie');
  });

  it('C4 links each shadow to its claimant without merging legacies', () => {
    const proj = {
      schema: 'atlas-projection/0.2',
      meta: {},
      entities: [
        { id: 'repo:Aftergraph/wi-backend', kind: 'repository', identity: { full_name: 'Aftergraph/wi-backend', aliases: ['work-intelligence-v2'] } },
        { id: 'repo:Aftergraph/wi-frontend', kind: 'repository', identity: { full_name: 'Aftergraph/wi-frontend', aliases: ['work-intelligence-web'] } },
        { id: 'repo:Aftergraph/work-intelligence-v2', kind: 'repository', identity: { full_name: 'Aftergraph/work-intelligence-v2', aliases: [] } },
        { id: 'repo:Aftergraph/work-intelligence-web', kind: 'repository', identity: { full_name: 'Aftergraph/work-intelligence-web', aliases: [] } },
      ],
      assertions: [],
      relations: [],
      conflicts: [{
        id: 'C4', kind: 'intra-canonical', status: 'open',
        subjects: ['repo:Aftergraph/work-intelligence-v2', 'repo:Aftergraph/work-intelligence-web'],
      }],
    };
    const m = aliasMap(proj);
    expect([...(m.get('repo:Aftergraph/work-intelligence-v2') || [])].sort())
      .toEqual(['repo:Aftergraph/wi-backend']);
    expect([...(m.get('repo:Aftergraph/work-intelligence-web') || [])].sort())
      .toEqual(['repo:Aftergraph/wi-frontend']);
  });
});

describe('focusGraph', () => {
  const ALL = ['CANONICAL', 'OBSERVED', 'PROPOSED'];
  // Mirrors the live wi-backend shape: the renamed entity holds no direct
  // relations; the legacy shadow does — including one to a contract that
  // carries zero assertions and therefore cannot render.
  const contractProj = {
    ...fixture,
    entities: [
      ...fixture.entities,
      { id: 'repo:Aftergraph/new', kind: 'repository', identity: { full_name: 'Aftergraph/new', aliases: ['old'] } },
      { id: 'contract:c1', kind: 'contract', identity: { full_name: 'contract:c1', aliases: [] } },
    ],
    relations: [
      ...fixture.relations,
      { id: 'rel-3', source: 'repo:Aftergraph/old', target: 'contract:c1', relation: 'provides', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    ],
    assertions: [
      ...fixture.assertions,
      // Live wi-backend carries its own assertions; the renamed entity renders.
      { id: 'as-new', subject: 'repo:Aftergraph/new', predicate: 'slug', value: 'new', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
    ],
  };

  it('keeps alias-inherited neighbors, drops assertion-less contracts', () => {
    const f = focusGraph(contractProj, ALL, 'repo:Aftergraph/new', 1);
    const ids = f.nodes.map((n) => n.id);
    expect(ids).toContain('repo:Aftergraph/new');
    expect(ids).toContain('repo:Aftergraph/old');
    expect(ids).toContain('repo:Aftergraph/aie');
    expect(ids).not.toContain('contract:c1');
  });

  it('never returns dangling edges', () => {
    const f = focusGraph(contractProj, ALL, 'repo:Aftergraph/new', 1);
    const ids = new Set(f.nodes.map((n) => n.id));
    expect(f.edges.map((e) => e.id)).not.toContain('rel-3');
    for (const e of f.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  it('returns the full plane-filtered graph when no node is selected', () => {
    expect(focusGraph(contractProj, ALL, null, 1)).toEqual(deriveGraph(contractProj, ALL));
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

describe('impactSet', () => {
  it('splits upstream (dependents) from downstream (dependencies)', () => {
    const imp = impactSet(fixture, 'repo:Aftergraph/gov', 2);
    expect(imp.downstream).toEqual([]);
    expect(imp.upstream).toEqual(['repo:Aftergraph/aie']);
  });

  it('caps depth', () => {
    const imp1 = impactSet(fixture, 'repo:Aftergraph/aie', 1);
    expect(imp1.downstream).toEqual(['repo:Aftergraph/gov', 'repo:Aftergraph/old']);
  });
});

describe('askRetrieve + validateAnswer', () => {
  it('retrieves by slug and predicate keywords', () => {
    const hits = askRetrieve(fixture, 'aie head sha');
    expect(hits[0].id).toBe('as-2');
    expect(hits.every((h) => typeof h.score === 'number')).toBe(true);
  });

  it('returns empty for unanswerable queries', () => {
    expect(askRetrieve(fixture, 'quantum teapot revenue')).toEqual([]);
  });

  it('validator rejects smuggled citations that exist but were not retrieved', () => {
    const hits = askRetrieve(fixture, 'aie role');
    const ids = new Set(hits.map((h) => h.id));
    // as-4 exists in the fixture but was not retrieved for this query.
    const smuggled = fixture.assertions.map((a) => a.id).find((id) => !ids.has(id));
    expect(smuggled).toBeDefined();
    const bad = validateAnswer(fixture, ids, [hits[0].id, smuggled]);
    expect(bad.ok).toBe(false);
    expect(bad.missing).toEqual([smuggled]);
    const ghost = validateAnswer(fixture, ids, ['as-nonexistent']);
    expect(ghost.ok).toBe(false);
    expect(ghost.missing).toEqual(['as-nonexistent']);
  });
});

describe('answerFromEvidence', () => {
  it('returns answered with validated hits for answerable queries', () => {
    const r = answerFromEvidence(fixture, 'aie head sha');
    expect(r.status).toBe('answered');
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.valid).toBe(true);
  });

  it('returns unanswerable with empty evidence for out-of-scope queries', () => {
    const r = answerFromEvidence(fixture, 'quantum teapot revenue');
    expect(r.status).toBe('unanswerable');
    expect(r.hits).toEqual([]);
  });
});

describe('filterEntities + cutAge', () => {
  it('matches label substrings case-insensitively', () => {
    expect(filterEntities(fixture, 'AIE')).toEqual(['repo:Aftergraph/aie']);
    expect(filterEntities(fixture, 'gov')).toEqual(['repo:Aftergraph/gov']);
    expect(filterEntities(fixture, '')).toEqual([
      'repo:Aftergraph/aie',
      'repo:Aftergraph/gov',
      'repo:Aftergraph/old',
    ]);
    expect(filterEntities(fixture, 'zzz')).toEqual([]);
  });

  it('labels cut age and flags stale cuts', () => {
    const fresh = cutAge('2026-09-08T15:48:21Z', '2026-09-08T16:00:00Z');
    expect(fresh.stale).toBe(false);
    expect(fresh.label).toMatch(/12m/);
    const old = cutAge('2026-09-08T15:48:21Z', '2026-09-10T16:00:00Z');
    expect(old.stale).toBe(true);
    expect(old.label).toMatch(/48h/);
    expect(cutAge('not-a-date', '2026-09-10T16:00:00Z').stale).toBe(true);
  });
});

describe('tracePath', () => {
  it('finds the shortest directed path with relation labels', () => {
    const t = tracePath(fixture, 'repo:Aftergraph/aie', 'repo:Aftergraph/gov');
    expect(t.path).toEqual(['repo:Aftergraph/aie', 'repo:Aftergraph/gov']);
    expect(t.hops).toEqual([{ from: 'repo:Aftergraph/aie', relation: 'consumes', to: 'repo:Aftergraph/gov', plane: 'CANONICAL' }]);
  });

  it('returns null when no directed path exists', () => {
    expect(tracePath(fixture, 'repo:Aftergraph/gov', 'repo:Aftergraph/old')).toBe(null);
    expect(tracePath(fixture, 'repo:Aftergraph/nope', 'repo:Aftergraph/aie')).toBe(null);
  });

  it('prefers fewer hops deterministically', () => {
    const multi = {
      ...fixture,
      relations: [
        ...fixture.relations,
        { id: 'rel-3', source: 'repo:Aftergraph/old', target: 'repo:Aftergraph/gov', relation: 'owns', truth_plane: 'CANONICAL', provenance: {}, observed_at: 't', freshness: 'fresh', conflict_id: null },
      ],
    };
    // Direct rel-1 wins over the 2-hop aie -> old -> gov detour.
    const t = tracePath(multi, 'repo:Aftergraph/aie', 'repo:Aftergraph/gov');
    expect(t.path).toEqual(['repo:Aftergraph/aie', 'repo:Aftergraph/gov']);
  });
});

describe('validateProjection', () => {
  const valid = {
    schema: 'atlas-projection/0.2',
    meta: { evidence_cut: '2026-09-08T15:48:21Z', gov_sha: 'a'.repeat(40), repo_pins: {} },
    entities: [],
    assertions: [],
    relations: [],
    conflicts: [],
  };

  it('accepts a well-formed projection', () => {
    expect(validateProjection(valid)).toEqual({ ok: true, errors: [] });
  });

  it('rejects non-objects without crashing', () => {
    for (const bad of [null, undefined, 42, 'x', []]) {
      const r = validateProjection(bad);
      expect(r.ok).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects wrong schema versions', () => {
    const r = validateProjection({ ...valid, schema: 'atlas-projection/0.1' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/schema/);
  });

  it('lists every missing structural piece', () => {
    const r = validateProjection({ schema: 'atlas-projection/0.2' });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('missing meta');
    for (const k of ['entities', 'assertions', 'relations', 'conflicts']) {
      expect(r.errors).toContain(`missing ${k} array`);
    }
  });

  it('rejects a malformed gov_sha', () => {
    const r = validateProjection({ ...valid, meta: { ...valid.meta, gov_sha: 'abc' } });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/gov_sha/);
  });
});
