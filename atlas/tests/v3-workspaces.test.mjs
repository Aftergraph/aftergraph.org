import { describe, it, expect } from 'vitest';
import {
  ExploreWorkspace,
  EvidenceWorkspace,
  ChangesWorkspace,
  TraceWorkspace,
} from '../src/v3/workspaces.ts';

// Test fixtures — minimal valid data matching types.ts contracts
const envelopes = [
  {
    id: 'env-1',
    source_adapter_id: 'github-adapter',
    valid_time: '2026-09-15T10:00:00Z',
    observed_time: '2026-09-15T10:05:00Z',
    payload_hash: 'sha256:aaa',
    payload_ref: 'r2://blob/1',
    truth_plane: 'OBSERVED',
  },
  {
    id: 'env-2',
    source_adapter_id: 'sentinel-adapter',
    valid_time: '2026-09-15T11:00:00Z',
    observed_time: '2026-09-15T11:05:00Z',
    payload_hash: 'sha256:bbb',
    payload_ref: 'r2://blob/2',
    truth_plane: 'VERIFIED',
  },
];

const claims = [
  {
    id: 'c1',
    envelope_id: 'env-1',
    subject: 'repo:atlas',
    predicate: 'ci_status',
    object: 'green',
    confidence: 0.95,
    contradicting_claim_ids: [],
  },
  {
    id: 'c2',
    envelope_id: 'env-2',
    subject: 'repo:atlas',
    predicate: 'deploy_status',
    object: 'live',
    confidence: 0.8,
    contradicting_claim_ids: ['c3'],
  },
  {
    id: 'c3',
    envelope_id: 'env-1',
    subject: 'repo:atlas',
    predicate: 'deploy_status',
    object: 'failed',
    confidence: 0.6,
    contradicting_claim_ids: ['c2'],
  },
];

const manifests = [
  {
    cut_id: 'cut-1',
    timestamp: '2026-09-15T10:00:00Z',
    entity_count: 10,
    assertion_count: 20,
    relation_count: 5,
    conflict_count: 0,
    d1_index_ref: 'd1://idx/1',
    r2_artifact_ref: 'r2://cuts/1',
  },
  {
    cut_id: 'cut-2',
    timestamp: '2026-09-15T12:00:00Z',
    entity_count: 12,
    assertion_count: 25,
    relation_count: 7,
    conflict_count: 1,
    d1_index_ref: 'd1://idx/2',
    r2_artifact_ref: 'r2://cuts/2',
  },
];

const deltas = [
  {
    from_cut_id: 'cut-1',
    to_cut_id: 'cut-2',
    added: ['c2', 'c3'],
    removed: [],
    changed: ['c1'],
    contradictions: ['c2', 'c3'],
  },
];

// ─── ExploreWorkspace ────────────────────────────────────────────────
describe('ExploreWorkspace', () => {
  const ws = new ExploreWorkspace(claims, envelopes);

  it('returns all claims with no filters', () => {
    expect(ws.query()).toHaveLength(3);
  });

  it('filters by subject', () => {
    expect(ws.query({ subject: 'repo:atlas' })).toHaveLength(3);
    expect(ws.query({ subject: 'nonexistent' })).toHaveLength(0);
  });

  it('filters by predicate', () => {
    expect(ws.query({ predicate: 'ci_status' })).toHaveLength(1);
  });

  it('filters by min_confidence', () => {
    expect(ws.query({ min_confidence: 0.9 })).toHaveLength(1);
    expect(ws.query({ min_confidence: 0.5 })).toHaveLength(3);
  });

  it('filters by truth_plane via envelope join', () => {
    expect(ws.query({ truth_plane: 'OBSERVED' })).toHaveLength(2);
    expect(ws.query({ truth_plane: 'VERIFIED' })).toHaveLength(1);
  });

  it('respects limit', () => {
    expect(ws.query({ limit: 2 })).toHaveLength(2);
  });

  it('render returns json format with metadata', () => {
    const result = ws.render();
    expect(result.format).toBe('json');
    expect(result.metadata.count).toBe(3);
    expect(result.metadata.workspace).toBe('explore');
    expect(JSON.parse(result.content)).toHaveLength(3);
  });

  it('export json returns claims array', () => {
    const exp = ws.export('json');
    expect(exp.format).toBe('json');
    expect(Array.isArray(exp.data)).toBe(true);
    expect(exp.generated_at).toBeTruthy();
  });

  it('export csv returns header + rows', () => {
    const exp = ws.export('csv');
    expect(exp.format).toBe('csv');
    const lines = String(exp.data).split('\n');
    expect(lines[0]).toContain('id,envelope_id,subject,predicate,object,confidence');
    expect(lines.length).toBe(4); // header + 3 claims
  });

  it('does not mutate source claims array', () => {
    const original = [...claims];
    ws.query({ subject: 'repo:atlas' });
    expect(claims).toEqual(original);
  });
});

// ─── EvidenceWorkspace ───────────────────────────────────────────────
describe('EvidenceWorkspace', () => {
  const ws = new EvidenceWorkspace(claims, envelopes);

  it('joins claims to envelopes', () => {
    const pairs = ws.query();
    expect(pairs).toHaveLength(3);
    expect(pairs[0].claim.id).toBeTruthy();
    expect(pairs[0].envelope.id).toBeTruthy();
  });

  it('filters by source_adapter_id', () => {
    expect(ws.query({ source_adapter_id: 'github-adapter' })).toHaveLength(2);
    expect(ws.query({ source_adapter_id: 'sentinel-adapter' })).toHaveLength(1);
  });

  it('filters by truth_plane', () => {
    expect(ws.query({ truth_plane: 'VERIFIED' })).toHaveLength(1);
  });

  it('render produces text lines with provenance info', () => {
    const result = ws.render();
    expect(result.format).toBe('text');
    expect(result.content).toContain('OBSERVED');
    expect(result.content).toContain('github-adapter');
    expect(result.metadata.workspace).toBe('evidence');
  });

  it('export returns claim-envelope pairs', () => {
    const exp = ws.export();
    expect(exp.format).toBe('json');
    expect(Array.isArray(exp.data)).toBe(true);
    expect(exp.data[0]).toHaveProperty('claim');
    expect(exp.data[0]).toHaveProperty('envelope');
  });
});

// ─── ChangesWorkspace ────────────────────────────────────────────────
describe('ChangesWorkspace', () => {
  const ws = new ChangesWorkspace(claims, deltas, manifests);

  it('resolves delta claim IDs to full claims', () => {
    const results = ws.query();
    expect(results).toHaveLength(1);
    expect(results[0].resolved_claims.added).toHaveLength(2);
    expect(results[0].resolved_claims.changed).toHaveLength(1);
  });

  it('filters by change_type', () => {
    const added = ws.query({ change_type: 'added' });
    expect(added[0].resolved_claims.added).toHaveLength(2);
    expect(added[0].resolved_claims.changed).toBeUndefined();
  });

  it('filters by from/to cut_id', () => {
    expect(ws.query({ from_cut_id: 'cut-1' })).toHaveLength(1);
    expect(ws.query({ from_cut_id: 'nonexistent' })).toHaveLength(0);
  });

  it('render shows delta summary with claim details', () => {
    const result = ws.render();
    expect(result.format).toBe('text');
    expect(result.content).toContain('cut-1');
    expect(result.content).toContain('cut-2');
    expect(result.metadata.workspace).toBe('changes');
  });

  it('export returns resolved changes', () => {
    const exp = ws.export();
    expect(exp.format).toBe('json');
    expect(exp.data[0]).toHaveProperty('delta');
    expect(exp.data[0]).toHaveProperty('resolved_claims');
  });
});

// ─── TraceWorkspace ──────────────────────────────────────────────────
describe('TraceWorkspace', () => {
  const ws = new TraceWorkspace(claims, envelopes);

  it('traces claim to envelope and resolves contradictions', () => {
    const traces = ws.query({ claim_id: 'c2' });
    expect(traces).toHaveLength(1);
    expect(traces[0].claim.id).toBe('c2');
    expect(traces[0].envelope.id).toBe('env-2');
    expect(traces[0].contradicting).toHaveLength(1);
    expect(traces[0].contradicting[0].id).toBe('c3');
  });

  it('filters by subject', () => {
    expect(ws.query({ subject: 'repo:atlas' })).toHaveLength(3);
  });

  it('render includes full lineage detail', () => {
    const result = ws.render();
    expect(result.format).toBe('text');
    expect(result.content).toContain('TRACE c1');
    expect(result.content).toContain('payload_hash');
    expect(result.content).toContain('contradictions');
    expect(result.metadata.workspace).toBe('trace');
  });

  it('export returns trace objects', () => {
    const exp = ws.export();
    expect(exp.format).toBe('json');
    expect(exp.data[0]).toHaveProperty('claim');
    expect(exp.data[0]).toHaveProperty('envelope');
    expect(exp.data[0]).toHaveProperty('contradicting');
  });

  it('handles missing envelope gracefully', () => {
    const orphanClaim = [{ ...claims[0], id: 'orphan', envelope_id: 'nonexistent' }];
    const traceWs = new TraceWorkspace(orphanClaim, envelopes);
    const traces = traceWs.query();
    expect(traces).toHaveLength(0);
  });
});
