import { describe, expect, it } from 'vitest';
import {
  atlasLink,
  deriveExperienceView,
  parseExperienceState,
} from '../src/lib/experience.js';

const fixture = {
  schema: 'atlas-projection/0.2',
  meta: {
    evidence_cut: '2026-09-10T05:00:00Z',
    gov_sha: 'a'.repeat(40),
    private_repos: ['Aftergraph/private-runtime'],
  },
  entities: [
    {
      id: 'repo:Aftergraph/aie',
      kind: 'repository',
      identity: { full_name: 'Aftergraph/aie', visibility: 'public', aliases: [] },
    },
    {
      id: 'repo:Aftergraph/private-runtime',
      kind: 'repository',
      identity: { full_name: 'Aftergraph/private-runtime', visibility: 'private', aliases: [] },
    },
    {
      id: 'contract:AuthorityLease',
      kind: 'contract',
      identity: { full_name: 'contract:AuthorityLease', visibility: 'unknown', aliases: [] },
    },
  ],
  assertions: [
    {
      id: 'as-public', subject: 'repo:Aftergraph/aie', predicate: 'role', value: 'normative-authority',
      truth_plane: 'CANONICAL', observed_at: '2026-09-10T05:00:00Z', freshness: 'fresh', conflict_id: null,
      provenance: { repository: 'Aftergraph/after-graph-governance', ref: 'b'.repeat(40), evidence_level: 'canonical' },
    },
    {
      id: 'as-private', subject: 'repo:Aftergraph/private-runtime', predicate: 'role', value: 'runtime',
      truth_plane: 'CANONICAL', observed_at: '2026-09-10T05:00:00Z', freshness: 'fresh', conflict_id: null,
      provenance: { repository: 'Aftergraph/after-graph-governance', ref: 'b'.repeat(40), evidence_level: 'canonical' },
    },
  ],
  relations: [
    {
      id: 'rel-1', source: 'repo:Aftergraph/aie', target: 'contract:AuthorityLease', relation: 'provides',
      truth_plane: 'CANONICAL', observed_at: '2026-09-10T05:00:00Z', freshness: 'fresh', conflict_id: null,
      provenance: { repository: 'Aftergraph/after-graph-governance', ref: 'b'.repeat(40), evidence_level: 'canonical' },
    },
  ],
  conflicts: [],
};

describe('deriveExperienceView', () => {
  it('derives a versioned public view without private repository entities', () => {
    const view = deriveExperienceView(fixture);
    expect(view.schema).toBe('aftergraph-experience/0.1');
    expect(view.cut).toBe(fixture.meta.evidence_cut);
    expect(view.entities.map((e) => e.id)).toContain('repo:Aftergraph/aie');
    expect(view.entities.map((e) => e.id)).not.toContain('repo:Aftergraph/private-runtime');
  });

  it('keeps only relationships whose endpoints are publishable', () => {
    const view = deriveExperienceView(fixture);
    expect(view.relations).toEqual([
      expect.objectContaining({ id: 'rel-1', source: 'repo:Aftergraph/aie', target: 'contract:AuthorityLease' }),
    ]);
  });

  it('exposes system/evidence/source lenses without inventing authority or cost measurements', () => {
    const entity = deriveExperienceView(fixture).entities.find((e) => e.id === 'repo:Aftergraph/aie');
    expect(entity.lenses).toEqual(['SYSTEM', 'EVIDENCE', 'SOURCE']);
    expect(entity.lenses).not.toContain('AUTHORITY');
    expect(entity.lenses).not.toContain('COST');
  });
});

describe('experience URL state', () => {
  it('builds stable encoded Atlas links', () => {
    expect(atlasLink({ entity: 'repo:Aftergraph/aie', view: 'topology', lens: 'SOURCE' }))
      .toBe('/atlas/?node=repo%3AAftergraph%2Faie&view=topology&lens=SOURCE');
  });

  it('restores supported lens and optional relationship/snapshot state', () => {
    const state = parseExperienceState('?node=repo%3AAftergraph%2Faie&view=topology&lens=EVIDENCE&related=contract%3AAuthorityLease&snapshot=cut-1');
    expect(state).toEqual({
      entity: 'repo:Aftergraph/aie', view: 'topology', lens: 'EVIDENCE',
      related: 'contract:AuthorityLease', snapshot: 'cut-1',
    });
  });

  it('fails closed to SYSTEM for an unknown lens', () => {
    expect(parseExperienceState('?lens=LASERS').lens).toBe('SYSTEM');
  });
});


describe('publication boundary', () => {
  it('withholds exact refs from private provenance even on a public subject', () => {
    const privateRef = 'c'.repeat(40);
    const withPrivateSource = structuredClone(fixture);
    withPrivateSource.assertions.push({
      id: 'as-private-source', subject: 'contract:AuthorityLease', predicate: 'implemented_by', value: 'adapter',
      truth_plane: 'OBSERVED', observed_at: '2026-09-10T05:00:00Z', freshness: 'fresh', conflict_id: null,
      provenance: { repository: 'Aftergraph/private-runtime', ref: privateRef, evidence_level: 'observed' },
    });
    const entity = deriveExperienceView(withPrivateSource).entities.find((e) => e.id === 'contract:AuthorityLease');
    expect(entity.sources).toContainEqual(expect.objectContaining({ repository: 'Aftergraph/private-runtime', ref: null }));
    expect(JSON.stringify(entity)).not.toContain(privateRef);
  });
});
