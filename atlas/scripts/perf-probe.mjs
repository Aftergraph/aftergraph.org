// Atlas growth probe: synthetic projections at N repos, measuring deriveGraph
// + ELK layered-layout time. Answers "does it work if the org grows?" with
// numbers instead of assumptions. Usage: node scripts/perf-probe.mjs [N...].
// Fails closed when layout breaks or exceeds 60s at any size.
import { deriveGraph } from '../src/lib/derive.js';
import ELK from 'elkjs/lib/elk.bundled.js';

const sizes = (process.argv.slice(2).map(Number).filter(Boolean).length
  ? process.argv.slice(2).map(Number)
  : [25, 100, 200]
).filter((n) => n > 0);

const elk = new ELK();
let failed = 0;

for (const n of sizes) {
  // Deterministic synthetic projection: n repos in a chain + cross-links,
  // 3 assertions each (one per plane), matching v0.2 shape.
  const entities = [];
  const assertions = [];
  const relations = [];
  for (let i = 0; i < n; i++) {
    const id = `repo:Aftergraph/synth-${String(i).padStart(3, '0')}`;
    entities.push({ id, kind: 'repository', identity: { full_name: id.slice(5) } });
    const planes = ['CANONICAL', 'OBSERVED', 'PROPOSED'];
    planes.forEach((p, k) => {
      assertions.push({
        id: `as-s${i}p${k}`,
        subject: id,
        predicate: k === 0 ? 'slug' : k === 1 ? 'head_sha' : 'open_pr',
        value: `v-${i}-${k}`,
        truth_plane: p,
        provenance: { source: 'synth', source_type: 'synthetic', repository: id.slice(5), ref: 'main', evidence_level: 'observed' },
        observed_at: '2026-09-08T20:00:00Z',
        valid_at: null,
        freshness: 'fresh',
        conflict_id: null,
      });
    });
    if (i > 0) {
      relations.push({
        id: `rel-s${i}`,
        source: `repo:Aftergraph/synth-${String(i - 1).padStart(3, '0')}`,
        target: id,
        relation: 'depends_on',
        truth_plane: 'CANONICAL',
        provenance: { source: 'synth', source_type: 'synthetic', repository: '-', ref: 'gov', evidence_level: 'canonical' },
        observed_at: '2026-09-08T20:00:00Z',
        freshness: 'fresh',
        conflict_id: null,
      });
    }
    if (i % 7 === 0 && i > 0) {
      relations.push({
        id: `rel-x${i}`,
        source: id,
        target: `repo:Aftergraph/synth-${String(Math.floor(i / 2)).padStart(3, '0')}`,
        relation: 'consumes',
        truth_plane: 'OBSERVED',
        provenance: { source: 'synth', source_type: 'synthetic', repository: '-', ref: 'main', evidence_level: 'observed' },
        observed_at: '2026-09-08T20:00:00Z',
        freshness: 'fresh',
        conflict_id: null,
      });
    }
  }
  const proj = {
    schema: 'atlas-projection/0.2',
    meta: { evidence_cut: '2026-09-08T20:00:00Z', gov_sha: 'a'.repeat(40), repo_pins: {}, private_repos: [] },
    entities,
    assertions,
    relations,
    conflicts: [],
  };

  const t0 = performance.now();
  const graph = deriveGraph(proj, ['CANONICAL', 'OBSERVED', 'PROPOSED']);
  const t1 = performance.now();
  const elkGraph = {
    id: 'root',
    layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': 'DOWN' },
    children: graph.nodes.map((x) => ({ id: x.id, width: 190, height: 54 })),
    edges: graph.edges.map((e, i) => ({ id: `e${i}`, sources: [e.source], targets: [e.target] })),
  };
  const t2 = performance.now();
  const laid = await elk.layout(elkGraph);
  const t3 = performance.now();
  const positioned = laid.children.filter((c) => typeof c.x === 'number' && typeof c.y === 'number').length;
  const deriveMs = Math.round(t1 - t0);
  const elkMs = Math.round(t3 - t2);
  const ok = positioned === graph.nodes.length && t3 - t0 < 60000;
  if (!ok) failed++;
  console.log(
    `N=${n}: nodes=${graph.nodes.length} edges=${graph.edges.length} ` +
      `derive=${deriveMs}ms elk=${elkMs}ms positioned=${positioned}/${graph.nodes.length} ${ok ? 'OK' : 'FAIL'}`
  );
}

if (failed > 0) {
  console.error(`PERF-FAIL: ${failed} size(s) failed`);
  process.exit(1);
}
console.log('PERF-PROBE PASS');
