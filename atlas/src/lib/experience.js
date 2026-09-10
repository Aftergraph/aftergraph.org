import { shortLabel } from './derive.js';

export const EXPERIENCE_SCHEMA = 'aftergraph-experience/0.1';
export const EXPERIENCE_LENSES = ['SYSTEM', 'AUTHORITY', 'EVIDENCE', 'COST', 'SOURCE'];

function publicEntity(entity, privateRepos) {
  if (!entity || typeof entity !== 'object') return false;
  const fullName = entity.identity?.full_name || '';
  if (privateRepos.has(fullName)) return false;
  if (entity.kind === 'repository' && entity.identity?.visibility === 'private') return false;
  return true;
}

function sourceSummary(assertions, privateRepos) {
  const sources = [];
  const seen = new Set();
  for (const assertion of assertions) {
    const provenance = assertion.provenance || {};
    const repository = provenance.repository || null;
    const source = provenance.source || null;
    const privateSource = privateRepos.has(provenance.repository || '') || privateRepos.has(provenance.source || '');
    const ref = privateSource ? null : (provenance.ref || null);
    const key = JSON.stringify([repository, source, ref, provenance.evidence_level || null]);
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      repository,
      source,
      ref,
      evidence_level: provenance.evidence_level || null,
    });
  }
  return sources;
}

export function deriveExperienceView(projection) {
  if (!projection || projection.schema !== 'atlas-projection/0.2') {
    throw new TypeError('experience view requires atlas-projection/0.2');
  }
  const privateRepos = new Set(projection.meta?.private_repos || []);
  const entities = (projection.entities || []).filter((entity) => publicEntity(entity, privateRepos));
  const ids = new Set(entities.map((entity) => entity.id));
  const assertionsBySubject = new Map();
  for (const assertion of projection.assertions || []) {
    if (!ids.has(assertion.subject)) continue;
    if (!assertionsBySubject.has(assertion.subject)) assertionsBySubject.set(assertion.subject, []);
    assertionsBySubject.get(assertion.subject).push(assertion);
  }
  const experienceEntities = entities.map((entity) => {
    const assertions = assertionsBySubject.get(entity.id) || [];
    return {
      id: entity.id,
      kind: entity.kind,
      label: shortLabel(entity),
      visibility: entity.identity?.visibility || 'unknown',
      lenses: ['SYSTEM', 'EVIDENCE', 'SOURCE'],
      assertion_ids: assertions.map((assertion) => assertion.id).sort(),
      sources: sourceSummary(assertions, privateRepos),
    };
  });
  const relations = (projection.relations || [])
    .filter((relation) => ids.has(relation.source) && ids.has(relation.target))
    .map((relation) => ({
      id: relation.id,
      source: relation.source,
      target: relation.target,
      relation: relation.relation,
      truth_plane: relation.truth_plane,
      conflict_id: relation.conflict_id || null,
    }));

  return {
    schema: EXPERIENCE_SCHEMA,
    cut: projection.meta?.evidence_cut || null,
    gov_sha: projection.meta?.gov_sha || null,
    entities: experienceEntities,
    relations,
  };
}

export function parseExperienceState(search = '') {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const rawLens = (params.get('lens') || 'SYSTEM').toUpperCase();
  return {
    entity: params.get('node') || null,
    view: params.get('view') || 'topology',
    lens: EXPERIENCE_LENSES.includes(rawLens) ? rawLens : 'SYSTEM',
    related: params.get('related') || null,
    snapshot: params.get('snapshot') || null,
  };
}

export function atlasLink({ entity = null, view = 'topology', lens = 'SYSTEM', related = null, snapshot = null } = {}) {
  const params = new URLSearchParams();
  if (entity) params.set('node', entity);
  if (view) params.set('view', view);
  const normalizedLens = EXPERIENCE_LENSES.includes(String(lens).toUpperCase()) ? String(lens).toUpperCase() : 'SYSTEM';
  params.set('lens', normalizedLens);
  if (related) params.set('related', related);
  if (snapshot) params.set('snapshot', snapshot);
  return `/atlas/?${params.toString()}`;
}
