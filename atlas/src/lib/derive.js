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

// Alias expansion: entities linked via identity.aliases (e.g. wi-backend aliases
// work-intelligence-v2) share a neighborhood, so renamed entities inherit the
// dependency context that canonical sources still attach to legacy slugs.
// C1 (rename) and C4 (intra-canonical drift) conflicts carry the same mapping at
// the assertion level, so they seed the same expansion when identity.aliases is
// absent or stale.
export function aliasMap(projection) {
  const bySlug = new Map();
  for (const e of projection.entities) {
    const short = e.identity?.full_name?.split('/').slice(-1)[0];
    if (!short) continue;
    if (!bySlug.has(short)) bySlug.set(short, new Set());
    bySlug.get(short).add(e.id);
  }
  const map = new Map();
  const link = (a, b) => {
    if (!a || !b || a === b) return;
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a).add(b);
    map.get(b).add(a);
  };
  const slugKey = (s) => (s.includes('/') ? s.split('/').slice(-1)[0] : s);
  for (const e of projection.entities) {
    for (const a of e.identity?.aliases || []) {
      for (const id of bySlug.get(slugKey(a)) || []) link(e.id, id);
    }
  }
  const assertionById = new Map((projection.assertions || []).map((a) => [a.id, a]));
  for (const c of projection.conflicts || []) {
    // C1: rename pairs cite both sides by assertion id and (when emitted by the
    // generator) by legacy/current slug. Either form links the two entities.
    if (c.kind === 'rename' || c.id === 'C1') {
      for (const p of c.pairs || []) {
        const sa = p.a ? assertionById.get(p.a)?.subject : null;
        const sb = p.b ? assertionById.get(p.b)?.subject : null;
        if (sa && sb) link(sa, sb);
        if (p.legacy && p.current) {
          const L = bySlug.get(slugKey(p.legacy)) || [];
          const C = bySlug.get(slugKey(p.current)) || [];
          for (const l of L) for (const cc of C) link(l, cc);
        }
      }
    }
    // C4: intra-canonical drift subjects are legacy shadows whose edges are kept
    // verbatim. Link each shadow to the current entity that claims its slug.
    if (c.kind === 'intra-canonical' || c.id === 'C4') {
      const aliasOwners = new Map(); // slug -> [entityId]
      for (const e of projection.entities) {
        for (const a of e.identity?.aliases || []) {
          const k = slugKey(a);
          if (!aliasOwners.has(k)) aliasOwners.set(k, []);
          aliasOwners.get(k).push(e.id);
        }
      }
      for (const subj of c.subjects || []) {
        for (const owner of aliasOwners.get(slugKey(subj)) || []) link(subj, owner);
      }
    }
  }
  return map;
}

// 1-hop (or depth-N) neighborhood for mobile focus mode.
export function neighborhood(projection, nodeId, depth = 1) {
  const aliases = aliasMap(projection);
  const seeds = new Set([nodeId, ...(aliases.get(nodeId) || [])]);
  const adj = new Map();
  const add = (a, b, rel) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push({ id: b, rel });
  };
  for (const r of projection.relations) {
    add(r.source, r.target, r.relation);
    add(r.target, r.source, r.relation);
  }
  const seen = new Set(seeds);
  const edgeIds = new Set();
  let frontier = [...seeds];
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

// Mobile focus view: plane-filtered graph intersected with the alias-aware
// neighborhood. Nodes without assertions on active planes (e.g. contracts,
// which carry none) drop out, and edges survive only when BOTH endpoints
// remain — never dangling edges into filtered-out nodes.
export function focusGraph(projection, activePlanes, nodeId, depth = 1) {
  const g = deriveGraph(projection, activePlanes);
  if (!nodeId) return g;
  const hood = neighborhood(projection, nodeId, depth);
  const keep = new Set(hood.nodes);
  const nodes = g.nodes.filter((n) => keep.has(n.id));
  const ids = new Set(nodes.map((n) => n.id));
  const edgeKeep = new Set(hood.edges);
  const edges = g.edges.filter((e) => edgeKeep.has(e.id) && ids.has(e.source) && ids.has(e.target));
  return { nodes, edges, planesUsed: g.planesUsed };
}

// Impact analysis: upstream = dependents (edges pointing INTO the node side),
// downstream = dependencies (edges pointing OUT). Depth-capped BFS, sorted output.
export function impactSet(projection, nodeId, depth = 2) {
  const out = new Map();
  const into = new Map();
  for (const r of projection.relations) {
    if (r.source === r.target) continue; // self-scoped proposes loops carry no impact
    if (!out.has(r.source)) out.set(r.source, new Set());
    if (!into.has(r.target)) into.set(r.target, new Set());
    out.get(r.source).add(r.target);
    into.get(r.target).add(r.source);
  }
  const bfs = (adj, start) => {
    const seen = new Set();
    let frontier = [start];
    for (let d = 0; d < depth && frontier.length; d++) {
      const next = [];
      for (const cur of frontier) {
        for (const id of adj.get(cur) || []) {
          if (id !== start && !seen.has(id)) {
            seen.add(id);
            next.push(id);
          }
        }
      }
      frontier = next;
    }
    return [...seen].sort();
  };
  return { upstream: bfs(into, nodeId), downstream: bfs(out, nodeId) };
}

const ASK_STOP = new Set(['the', 'a', 'an', 'of', 'for', 'and', 'or', 'is', 'are', 'what', 'which', 'show', 'list', 'in', 'on', 'to']);

// Extractive retrieval over assertions. Returns [{id, score}] sorted by score.
// Empty array = unanswerable from this projection (UI must say so).
export function askRetrieve(projection, query, limit = 8) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !ASK_STOP.has(t));
  if (!tokens.length) return [];
  const scored = [];
  for (const a of projection.assertions) {
    const subj = a.subject.toLowerCase();
    const pred = a.predicate.toLowerCase().replace(/_/g, ' ');
    const val = JSON.stringify(a.value).toLowerCase();
    const src = `${a.provenance.source} ${a.truth_plane}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (subj.split(/[^a-z0-9]+/).some((w) => w === t || (w.length > 3 && w.startsWith(t)))) score += 3;
      if (pred.includes(t)) score += 2;
      if (val.includes(t)) score += 2;
      if (src.includes(t)) score += 1;
    }
    if (score > 0) scored.push({ id: a.id, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return scored.slice(0, limit);
}

// Grounded-layer stub: every cited claim must resolve to the retrieved evidence set
// AND exist in the projection. Returns {ok, missing[]}.
export function validateAnswer(projection, evidenceIds, citations) {
  const all = new Set(projection.assertions.map((a) => a.id));
  const missing = citations.filter((c) => !evidenceIds.has(c) || !all.has(c));
  return { ok: missing.length === 0, missing };
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
