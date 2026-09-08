// Slice C pure helpers (projection v0.2 only). Reads ONLY site/atlas/projection.json.
// No DOM — unit-tested with vitest. Companions: impactSet/askRetrieve in derive.js.
import { shortLabel } from './derive.js';

// BFS rings with depth + direction, for per-hop plane badges in the Impact view.
// Returns [{id, depth, dir}] sorted by (dir, depth, id). dir: 'up' | 'down'.
export function impactRings(projection, nodeId, depth = 2) {
  const out = new Map();
  const into = new Map();
  for (const r of projection.relations) {
    if (r.source === r.target) continue;
    if (!out.has(r.source)) out.set(r.source, new Set());
    if (!into.has(r.target)) into.set(r.target, new Set());
    out.get(r.source).add(r.target);
    into.get(r.target).add(r.source);
  }
  const rings = [];
  const walk = (adj, dir) => {
    const seen = new Set([nodeId]);
    let frontier = [nodeId];
    for (let d = 1; d <= depth && frontier.length; d++) {
      const next = [];
      for (const cur of frontier) {
        for (const id of adj.get(cur) || []) {
          if (!seen.has(id)) {
            seen.add(id);
            next.push(id);
            rings.push({ id, depth: d, dir });
          }
        }
      }
      frontier = next;
    }
  };
  walk(into, 'up');
  walk(out, 'down');
  rings.sort((a, b) => (a.dir < b.dir ? -1 : a.dir > b.dir ? 1 : a.depth - b.depth || (a.id < b.id ? -1 : 1)));
  return rings;
}

// Development pulse: one row per repository entity. Activity = latest valid_at
// across head_sha/pushed_at/open_pr/withheld assertions. Private repos expose
// only the withheld marker — never resolved around.
export function pulseRows(projection) {
  const entityById = new Map(projection.entities.map((e) => [e.id, e]));
  const rows = [];
  for (const e of projection.entities) {
    if (e.kind !== 'repository') continue;
    const asserts = (projection.assertions || []).filter((a) => a.subject === e.id);
    const pick = (pred, plane) => asserts.find((a) => a.predicate === pred && a.truth_plane === plane);
    const headSha = pick('head_sha', 'OBSERVED');
    const pushedAt = pick('pushed_at', 'OBSERVED');
    const openPrs = asserts.filter((a) => a.predicate === 'open_pr' && a.truth_plane === 'PROPOSED');
    const withheld = pick('withheld', 'OBSERVED');
    const stamps = [headSha, pushedAt, ...openPrs].map((a) => a?.valid_at || a?.observed_at).filter(Boolean).sort();
    rows.push({
      id: e.id,
      label: shortLabel(e),
      visibility: e.identity?.visibility || 'unknown',
      headSha: headSha ? String(headSha.value).slice(0, 7) : null,
      pushedAt: pushedAt?.value || null,
      openPrs: openPrs.map((a) => ({ id: a.id, number: a.value?.number, title: a.value?.title, draft: !!a.value?.is_draft })),
      withheld: withheld ? withheld.value?.reason || 'withheld' : null,
      lastActivity: stamps.length ? stamps[stamps.length - 1] : null,
    });
  }
  rows.sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''));
  return rows;
}

// Contract explorer: per contract entity, who owns it and who consumes/provides
// it, plus the governance refs cited by its assertions.
export function contractRows(projection) {
  const entityById = new Map(projection.entities.map((e) => [e.id, e]));
  const label = (id) => shortLabel(entityById.get(id) || { id });
  const rows = [];
  for (const e of projection.entities) {
    if (e.kind !== 'contract') continue;
    const rels = (projection.relations || []).filter((r) => r.source === e.id || r.target === e.id);
    const owners = [...new Set(rels.filter((r) => r.target === e.id && r.relation === 'owns').map((r) => r.source))].sort();
    const providers = [...new Set(rels.filter((r) => r.target === e.id && r.relation === 'provides').map((r) => r.source))].sort();
    // Consumers are the modules that consume THIS contract (edges pointing at it).
    const consumers = [...new Set(rels.filter((r) => r.target === e.id && r.relation === 'consumes').map((r) => r.source))].sort();
    const refs = [...new Set((projection.assertions || []).filter((a) => a.subject === e.id).map((a) => a.provenance?.ref).filter(Boolean))].sort();
    rows.push({ id: e.id, label: label(e.id), owners: owners.map((id) => ({ id, label: label(id) })), providers: providers.map((id) => ({ id, label: label(id) })), consumers: consumers.map((id) => ({ id, label: label(id) })), refs });
  }
  rows.sort((a, b) => (a.id < b.id ? -1 : 1));
  return rows;
}
