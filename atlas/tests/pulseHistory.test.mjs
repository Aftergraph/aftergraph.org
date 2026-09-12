import { describe, it, expect } from 'vitest';
import { pulseHistoryWindows, pulseHistoryFromIndex } from '../src/lib/sliceC.js';

// Three synthetic snapshots spanning 48h. Repo A moves at t0 and t2; repo B
// only at t0; private repo C is withheld in every cut (must never appear).
const mkSnap = (cut, govSha, repos) => ({
  schema: 'atlas-projection/0.2',
  meta: {
    evidence_cut: cut,
    gov_sha: govSha,
    repo_pins: Object.fromEntries(repos.filter((r) => !r.private).map((r) => [`Aftergraph/${r.name}`, r.head])),
    private_repos: repos.filter((r) => r.private).map((r) => `Aftergraph/${r.name}`),
  },
  entities: repos.map((r) => ({
    id: `repo:Aftergraph/${r.name}`,
    kind: 'repository',
    identity: { full_name: `Aftergraph/${r.name}`, visibility: r.private ? 'private' : 'public' },
  })),
  assertions: repos.flatMap((r) => {
    if (r.private) {
      return [{
        id: `a-${r.name}-withheld-${cut}`,
        subject: `repo:Aftergraph/${r.name}`,
        predicate: 'withheld',
        value: { reason: 'private-source-boundary' },
        truth_plane: 'OBSERVED',
        provenance: { source: 'test', source_type: 'generator', repository: 'Aftergraph/' + r.name, ref: 'branch:main', evidence_level: 'observed' },
        observed_at: cut,
        valid_at: null,
        freshness: 'fresh',
        conflict_id: null,
      }];
    }
    return [
      {
        id: `a-${r.name}-head-${cut}`,
        subject: `repo:Aftergraph/${r.name}`,
        predicate: 'head_sha',
        value: r.head,
        truth_plane: 'OBSERVED',
        provenance: { source: 'test', source_type: 'generator', repository: 'Aftergraph/' + r.name, ref: r.head, evidence_level: 'observed' },
        observed_at: cut,
        valid_at: cut,
        freshness: 'fresh',
        conflict_id: null,
      },
      {
        id: `a-${r.name}-pushed-${cut}`,
        subject: `repo:Aftergraph/${r.name}`,
        predicate: 'pushed_at',
        value: cut,
        truth_plane: 'OBSERVED',
        provenance: { source: 'test', source_type: 'generator', repository: 'Aftergraph/' + r.name, ref: r.head, evidence_level: 'observed' },
        observed_at: cut,
        valid_at: cut,
        freshness: 'fresh',
        conflict_id: null,
      },
    ];
  }),
  relations: [],
  conflicts: [],
});

const t0 = '2026-09-10T00:00:00Z';
const t1 = '2026-09-10T12:00:00Z'; // +12h
const t2 = '2026-09-11T00:00:00Z'; // +24h
const t3 = '2026-09-12T00:00:00Z'; // +48h

const snaps = [
  mkSnap(t0, 'aaaa'.padEnd(40, '0'), [
    { name: 'alpha', head: 'a1'.padEnd(40, '0') },
    { name: 'beta', head: 'b1'.padEnd(40, '0') },
    { name: 'secret', head: 's1'.padEnd(40, '0'), private: true },
  ]),
  mkSnap(t1, 'aaaa'.padEnd(40, '0'), [
    { name: 'alpha', head: 'a1'.padEnd(40, '0') }, // unchanged
    { name: 'beta', head: 'b1'.padEnd(40, '0') },
    { name: 'secret', head: 's1'.padEnd(40, '0'), private: true },
  ]),
  mkSnap(t2, 'aaaa'.padEnd(40, '0'), [
    { name: 'alpha', head: 'a2'.padEnd(40, '0') }, // moved
    { name: 'beta', head: 'b1'.padEnd(40, '0') },
    { name: 'secret', head: 's2'.padEnd(40, '0'), private: true },
  ]),
  mkSnap(t3, 'aaaa'.padEnd(40, '0'), [
    { name: 'alpha', head: 'a2'.padEnd(40, '0') },
    { name: 'beta', head: 'b2'.padEnd(40, '0') }, // moved at 48h
    { name: 'secret', head: 's2'.padEnd(40, '0'), private: true },
  ]),
];

describe('pulseHistoryWindows', () => {
  it('counts distinct head changes within 24h/7d/30d windows per repo', () => {
    const rows = pulseHistoryWindows(snaps, t3);
    const alpha = rows.find((r) => r.id === 'repo:Aftergraph/alpha');
    const beta = rows.find((r) => r.id === 'repo:Aftergraph/beta');
    expect(alpha).toBeDefined();
    expect(beta).toBeDefined();
    // alpha: head changed at t2 (24h ago from t3) — inside 24h window boundary?
    // Window is (now - 24h, now]. t2 == now-24h exactly → excluded (strict >).
    // So alpha has 0 changes in 24h, 1 in 7d, 1 in 30d.
    expect(alpha.changes24h).toBe(0);
    expect(alpha.changes7d).toBe(1);
    expect(alpha.changes30d).toBe(1);
    // beta: head changed at t3 (now) → 1 in 24h, 1 in 7d, 1 in 30d.
    expect(beta.changes24h).toBe(1);
    expect(beta.changes7d).toBe(1);
    expect(beta.changes30d).toBe(1);
  });

  it('never includes private repos even when they have head movement', () => {
    const rows = pulseHistoryWindows(snaps, t3);
    expect(rows.find((r) => r.id === 'repo:Aftergraph/secret')).toBeUndefined();
    expect(rows.every((r) => !r.id.includes('secret'))).toBe(true);
  });

  it('returns empty array for empty snapshot list', () => {
    expect(pulseHistoryWindows([], t3)).toEqual([]);
  });

  it('handles single snapshot (no diffs possible)', () => {
    const rows = pulseHistoryWindows([snaps[0]], t0);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.changes24h).toBe(0);
      expect(r.changes7d).toBe(0);
      expect(r.changes30d).toBe(0);
    }
  });

  it('sorts rows by most recent activity first', () => {
    const rows = pulseHistoryWindows(snaps, t3);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].lastActivity >= rows[i].lastActivity).toBe(true);
    }
  });
});

describe('pulseHistoryFromIndex', () => {
  // What rebuild-snapshot-index/generator emit: per-entry public pulse summary.
  const index = [
    {
      file: 's0', evidence_cut: t0, gov_sha: 'a'.repeat(40), entities: 3,
      pulse: { repos: ['repo:Aftergraph/alpha', 'repo:Aftergraph/beta'], activity: [] },
    },
    {
      file: 's1', evidence_cut: t2, gov_sha: 'a'.repeat(40), entities: 3,
      pulse: { repos: ['repo:Aftergraph/alpha', 'repo:Aftergraph/beta'], activity: [{ subject: 'repo:Aftergraph/alpha', cuts: [t2] }] },
    },
    {
      file: 's2', evidence_cut: t3, gov_sha: 'a'.repeat(40), entities: 3,
      pulse: { repos: ['repo:Aftergraph/alpha', 'repo:Aftergraph/beta'], activity: [{ subject: 'repo:Aftergraph/beta', cuts: [t3] }] },
    },
  ];

  it('matches pulseHistoryWindows on the same history', () => {
    const rows = pulseHistoryFromIndex(index, t3);
    const alpha = rows.find((r) => r.id === 'repo:Aftergraph/alpha');
    const beta = rows.find((r) => r.id === 'repo:Aftergraph/beta');
    expect(alpha).toEqual({ id: 'repo:Aftergraph/alpha', changes24h: 0, changes7d: 1, changes30d: 1, lastActivity: t2 });
    expect(beta).toEqual({ id: 'repo:Aftergraph/beta', changes24h: 1, changes7d: 1, changes30d: 1, lastActivity: t3 });
  });

  it('includes quiet repos with zero counts, sorted by activity then id', () => {
    const rows = pulseHistoryFromIndex(index, t3);
    expect(rows.map((r) => r.id)).toEqual(['repo:Aftergraph/beta', 'repo:Aftergraph/alpha']);
    expect(rows[1].changes30d).toBe(1);
    const quiet = pulseHistoryFromIndex([index[0]], t3);
    expect(quiet.map((r) => r.id)).toEqual(['repo:Aftergraph/alpha', 'repo:Aftergraph/beta']);
    for (const r of quiet) {
      expect(r.changes24h).toBe(0);
      expect(r.changes7d).toBe(0);
      expect(r.changes30d).toBe(0);
      expect(r.lastActivity).toBe(null);
    }
  });

  it('tolerates legacy index entries without a pulse field', () => {
    const rows = pulseHistoryFromIndex([{ file: 'old', evidence_cut: t0 }], t3);
    expect(rows).toEqual([]);
  });

  it('returns empty array for empty index', () => {
    expect(pulseHistoryFromIndex([], t3)).toEqual([]);
  });
});
