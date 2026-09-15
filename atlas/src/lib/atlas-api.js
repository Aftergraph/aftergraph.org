// Atlas V3 API client — fetches live cuts from /api/v3/* endpoints.
// Falls back to static projection.json when API is unavailable.

const API_BASE = '/api/v3';

export async function fetchLatestCut() {
  try {
    const res = await fetch(`${API_BASE}/cuts`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.cuts || data.cuts.length === 0) return null;
    // Latest cut is first (sorted desc by published_at)
    return data.cuts[0];
  } catch {
    return null;
  }
}

export async function fetchEnvelope(cutId) {
  try {
    const res = await fetch(`${API_BASE}/envelopes?cut=${encodeURIComponent(cutId)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.envelope || null;
  } catch {
    return null;
  }
}

export async function fetchConflicts() {
  try {
    const res = await fetch(`${API_BASE}/conflicts`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { conflicts: [] };
  }
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { d1: false, r2: false };
  }
}

// Convert V3 EvidenceEnvelope into legacy projection shape for backward compat
// with existing derive.js / React components. This adapter lets the SPA render
// live API data without rewriting all views immediately.
export function envelopeToProjection(envelope, cut) {
  if (!envelope || !envelope.assertions) return null;
  
  const entities = new Map();
  const assertions = envelope.assertions.map(a => {
    // Extract subject entity if not already present
    if (!entities.has(a.subject)) {
      entities.set(a.subject, {
        id: a.subject,
        kind: inferKind(a.subject),
        identity: { full_name: a.subject },
      });
    }
    return {
      id: a.id || `${a.subject}:${a.predicate}`,
      subject: a.subject,
      predicate: a.predicate,
      value: a.value,
      truth_plane: a.truth_plane || 'OBSERVED',
      observed_at: a.observed_at || cut?.published_at,
      valid_at: a.valid_at,
      freshness: a.freshness || 'current',
      provenance: a.provenance || { source: 'atlas-v3-api', source_type: 'api', ref: cut?.id, evidence_level: 'computed' },
      conflict_id: a.conflict_id,
    };
  });

  const relations = (envelope.relations || []).map(r => ({
    id: r.id || `${r.source}:${r.relation}:${r.target}`,
    source: r.source,
    target: r.target,
    relation: r.relation,
    truth_plane: r.truth_plane || 'OBSERVED',
  }));

  // Ensure relation endpoints exist as entities
  for (const r of relations) {
    if (!entities.has(r.source)) entities.set(r.source, { id: r.source, kind: inferKind(r.source), identity: { full_name: r.source } });
    if (!entities.has(r.target)) entities.set(r.target, { id: r.target, kind: inferKind(r.target), identity: { full_name: r.target } });
  }

  return {
    meta: {
      evidence_cut: cut?.id || envelope.cut_id || 'live',
      gov_sha: cut?.governance_sha || 'unknown',
      generated_at: cut?.published_at || new Date().toISOString(),
    },
    entities: [...entities.values()],
    assertions,
    relations,
    conflicts: envelope.conflicts || [],
  };
}

function inferKind(id) {
  if (id.includes(':')) {
    const prefix = id.split(':')[0];
    if (prefix === 'repo' || prefix === 'repository') return 'repository';
    if (prefix === 'contract') return 'contract';
    if (prefix === 'service') return 'service';
  }
  return 'unknown';
}
