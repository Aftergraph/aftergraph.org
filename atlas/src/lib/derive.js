// Pure derivation logic for Atlas: projection (v0.2) + active plane set -> visible graph.
// Entities carry no plane; every visible fact records which planes fed it.
// No DOM, no React — unit-tested with vitest (node environment).

export const PLANES = ['CANONICAL', 'OBSERVED', 'PROPOSED'];

// Index assertions by subject for O(1) inspector reads.
export function indexAssertions(projection) {
  const bySubject = new Map();
  for (const a of projection.assertions) {
    if (!bySubject.has(a.subject)) bySubject.set(a.subject, []);
    bySubject.get(a.subject).push(a);
  }
  for (const list of bySubject.values()) {
    list.sort((x, y) => (x.predicate < y.predicate ? -1 : x.predicate > y.predicate ? 1 : x.truth_plane < y.truth_plane ? -1 : 1));
  }
  return bySubject;
}

// An entity is visible when it has ≥1 assertion on an active plane (or is an edge endpoint).
// A relation is visible when its own plane is active AND both endpoints are visible.
export function deriveGraph(projection, activePlanes) {
  const active = new Set(activePlanes);
  const assertionPlanes = new Map(); // entityId -> Set<plane>
  for (const a of projection.assertions) {
    if (!active.has(a.truth_plane)) continue;
    if (!assertionPlanes.has(a.subject)) assertionPlanes.set(a.subject, new Set());
    assertionPlanes.get(a.subject).add(a.truth_plane);
  }
  const visibleRelations = projection.relations.filter(
    (r) => active.has(r.truth_plane) && assertionPlanes.has(r.source) && assertionPlanes.has(r.target)
  );
  const endpointIds = new Set();
  for (const r of visibleRelations) {
    endpointIds.add(r.source);
    endpointIds.add(r.target);
  }
  const conflictSubjects = new Set();
  for (const c of projection.conflicts || []) {
    for (const s of c.subjects || []) conflictSubjects.add(s);
    for (const p of c.pairs || []) {
      const [sa, sb] = [subjOf(projection, p.a), subjOf(projection, p.b)];
      if (sa) conflictSubjects.add(sa);
      if (sb) conflictSubjects.add(sb);
    }
  }
  const entityById = new Map(projection.entities.map((e) => [e.id, e]));
  const nodes = [];
  for (const [id, planes] of assertionPlanes) {
    const e = entityById.get(id);
    if (!e) continue;
    nodes.push({
      id,
      label: shortLabel(e),
      kind: e.kind,
      planes: [...planes].sort(),
      inConflict: conflictSubjects.has(id),
    });
  }
  nodes.sort((a, b) => (a.id < b.id ? -1 : 1));
  const edges = visibleRelations.map((r) => ({
    id: r.id,
    source: r.source,
    target: r.target,
    relation: r.relation,
    plane: r.truth_plane,
    conflict: r.conflict_id,
  }));
  return { nodes, edges, planesUsed: [...active].sort() };
}

function subjOf(projection, assertionId) {
  const a = projection.assertions.find((x) => x.id === assertionId);
  return a ? a.subject : null;
}

export function shortLabel(entity) {
  const full = entity.identity?.full_name || entity.id;
  return full.includes('/') ? full.split('/').slice(-1)[0] : full;
}

// 1-hop (or depth-N) neighborhood for mobile focus mode.
export function neighborhood(projection, nodeId, depth = 1) {
  const adj = new Map();
  const add = (a, b, rel) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push({ id: b, rel });
  };
  for (const r of projection.relations) {
    add(r.source, r.target, r.relation);
    add(r.target, r.source, r.relation);
  }
  const seen = new Set([nodeId]);
  const edgeIds = new Set();
  let frontier = [nodeId];
  for (let d = 0; d < depth && frontier.length; d++) {
    const next = [];
    for (const cur of frontier) {
      for (const { id } of adj.get(cur) || []) {
        if (!seen.has(id)) {
          seen.add(id);
          next.push(id);
        }
      }
    }
    frontier = next;
  }
  const edges = projection.relations.filter(
    (r) => seen.has(r.source) && seen.has(r.target) && (edgeIds.add(r.id), true)
  );
  return { nodes: [...seen].sort(), edges: edges.map((r) => r.id) };
}

// Linear keyboard selection over a sorted id list.
export function moveSelection(sortedIds, currentId, dir) {
  if (!sortedIds.length) return null;
  const i = sortedIds.indexOf(currentId);
  if (i === -1) return dir > 0 ? sortedIds[0] : sortedIds[sortedIds.length - 1];
  const n = (i + dir + sortedIds.length) % sortedIds.length;
  return sortedIds[n];
}

// URL state: ?node=<id>&overlay=CANONICAL,OBSERVED&view=topology
export function serializeState({ node, overlay, view }) {
  const p = new URLSearchParams();
  if (node) p.set('node', node);
  if (overlay && overlay.length) p.set('overlay', [...overlay].sort().join(','));
  if (view) p.set('view', view);
  return `?${p.toString()}`;
}

export function parseState(search) {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const overlay = (p.get('overlay') || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => PLANES.includes(s));
  return {
    node: p.get('node') || null,
    overlay: overlay.length ? overlay : [...PLANES],
    view: p.get('view') || 'topology',
  };
}

// Fixed deterministic ELK options. Same graph + same options => same layout.
export function elkOptions() {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '48',
    'elk.spacing.nodeNode': '32',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.deterministic': 'true',
  };
}
