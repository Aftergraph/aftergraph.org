#!/usr/bin/env node
// AtlasProjection v0.2 contract tests (hermetic). Run: node --test site/atlas-projection.test.mjs
// Builds fixtures (ledger cut + gov git repo) in a temp dir, generates a projection,
// then enforces the schema contract. No network, no absolute paths, CI-safe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(SITE, 'generate-atlas-projection.mjs');
const MKFIX = path.join(SITE, 'atlas-fixtures', 'mkfixtures.mjs');

// Fixture design (see mkfixtures.mjs): canonical {alpha, beta, work-intelligence-v2},
// observed {alpha public+1 PR, beta private, wi-backend public}.
// Expected: C1 (legacy->wi-backend rename pair), C3 (beta visibility), no C2, no C4.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-test-'));
const FIX = path.join(tmp, 'fix');
execFileSync('node', [MKFIX, FIX], { stdio: 'pipe' });
const LEDGER = path.join(FIX, 'ledger');
const GOV = path.join(FIX, 'gov');

function build(out, extra = []) {
  execFileSync(
    'node',
    [GEN, '--ledger', LEDGER, '--gov', GOV, '--out', out, '--now', '2026-09-08T16:00:00Z', ...extra],
    { stdio: 'pipe' }
  );
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

const proj = build(path.join(tmp, 'p1.json'));
const proj2 = build(path.join(tmp, 'p2.json'));

const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
const entities = byId(proj.entities);
const assertions = byId(proj.assertions);

const PROV_KEYS = ['source', 'source_type', 'repository', 'ref', 'evidence_level'];

test('schema id is atlas-projection/0.2 with pinned meta', () => {
  assert.equal(proj.schema, 'atlas-projection/0.2');
  assert.equal(proj.meta.evidence_cut, '2026-09-08T15:48:21Z');
  assert.match(proj.meta.gov_sha, /^[0-9a-f]{40}$/);
  assert.deepEqual(Object.keys(proj.meta.repo_pins).sort(), [
    'Aftergraph/alpha',
    'Aftergraph/wi-backend',
  ]);
  assert.deepEqual(proj.meta.private_repos, ['Aftergraph/beta']);
  for (const sha of Object.values(proj.meta.repo_pins)) assert.match(sha, /^[0-9a-f]{40}$/);
});

test('no private exact head ships anywhere in the serialized artifact', () => {
  const text = fs.readFileSync(path.join(tmp, 'p1.json'), 'utf8');
  const betaSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  assert.ok(!text.includes(betaSha), 'private beta HEAD leaked into public artifact');
});

test('entities carry no truth_plane; every assertion/relation carries full provenance', () => {
  for (const e of proj.entities) {
    assert.ok(!('truth_plane' in e), `entity ${e.id} must not carry truth_plane`);
  }
  assert.deepEqual(
    [...entities.values()].filter((e) => e.kind === 'repository').map((e) => e.id).sort(),
    [
      'repo:Aftergraph/alpha',
      'repo:Aftergraph/beta',
      'repo:Aftergraph/wi-backend',
      'repo:Aftergraph/work-intelligence-v2',
    ]
  );
  const checkProv = (x, what) => {
    for (const k of PROV_KEYS) assert.ok(x.provenance?.[k], `${what} ${x.id} missing provenance.${k}`);
    assert.ok(x.observed_at, `${what} ${x.id} missing observed_at`);
    assert.ok(['CANONICAL', 'OBSERVED', 'PROPOSED'].includes(x.truth_plane), `${what} ${x.id} bad plane`);
    assert.ok('conflict_id' in x, `${what} ${x.id} missing conflict_id`);
  };
  for (const a of proj.assertions) checkProv(a, 'assertion');
  for (const r of proj.relations) {
    checkProv(r, 'relation');
    assert.ok(entities.has(r.source), `relation ${r.id} unknown source ${r.source}`);
    assert.ok(entities.has(r.target), `relation ${r.id} unknown target ${r.target}`);
  }
});

test('C1 rename pair cites both slug assertions', () => {
  const c1 = proj.conflicts.find((c) => c.id === 'C1');
  assert.ok(c1, 'C1 must exist in fixture (legacy canonical + wi-backend observed)');
  assert.equal(c1.pairs.length, 1);
  assert.ok(assertions.has(c1.pairs[0].a) && assertions.has(c1.pairs[0].b));
});

test('conflicts link proposed-resolution candidates, never claimed resolutions', () => {
  const proposed = new Map(
    proj.assertions.filter((a) => a.predicate === 'open_pr' && a.truth_plane === 'PROPOSED').map((a) => [a.id, a])
  );
  for (const c of proj.conflicts) {
    assert.ok(Array.isArray(c.proposed), `${c.id} must carry a proposed array (possibly empty)`);
    for (const pr of c.proposed) {
      assert.ok(proposed.has(pr.assertion), `${c.id} candidate ${pr.assertion} must resolve to a PROPOSED open_pr assertion`);
    }
  }
  const c1 = proj.conflicts.find((c) => c.id === 'C1');
  assert.equal(c1.proposed.length, 1, 'C1 must surface the wi-backend PR as a candidate');
  assert.equal(c1.proposed[0].number, 8);
  assert.equal(proposed.get(c1.proposed[0].assertion).subject, 'repo:Aftergraph/wi-backend');
});

test('C2 absent when everything observed is registered or rename-covered', () => {
  assert.ok(!proj.conflicts.find((c) => c.id === 'C2'), 'no unregistered repos in fixture');
});

test('C3 visibility conflict on beta (canonical public vs observed private)', () => {
  const c3 = proj.conflicts.find((c) => c.id === 'C3');
  assert.ok(c3, 'C3 must exist in fixture');
  assert.equal(c3.pairs.length, 1);
});

test('C4 absent when legacy slug is still canonical (no shadow)', () => {
  assert.ok(!proj.conflicts.find((c) => c.id === 'C4'), 'legacy is canonical here, not a shadow');
});

test('canonical relations keep dependencies.yml targets verbatim', () => {
  const hit = proj.relations.find(
    (r) => r.truth_plane === 'CANONICAL' && r.target === 'repo:Aftergraph/work-intelligence-v2'
  );
  assert.ok(hit, 'verbatim edge to legacy slug must be kept, not rewritten');
});

test('private-source boundary: beta withheld, no heads/PRs', () => {
  const betaHeads = proj.assertions.filter(
    (a) => a.subject === 'repo:Aftergraph/beta' && ['head_sha', 'head_msg', 'pushed_at', 'open_pr'].includes(a.predicate)
  );
  assert.equal(betaHeads.length, 0);
  const withheld = proj.assertions.filter(
    (a) => a.subject === 'repo:Aftergraph/beta' && a.predicate === 'withheld'
  );
  assert.equal(withheld.length, 1);
});

test('presence assertions report both/canonical-only/observed-only honestly', () => {
  const presence = (id) => proj.assertions.find((a) => a.subject === id && a.predicate === 'presence').value;
  assert.deepEqual(presence('repo:Aftergraph/alpha'), { in_canonical: true, in_observed: true });
  assert.deepEqual(presence('repo:Aftergraph/work-intelligence-v2'), { in_canonical: true, in_observed: false });
  assert.deepEqual(presence('repo:Aftergraph/wi-backend'), { in_canonical: false, in_observed: true });
});

test('head_sha values match repo_pins', () => {
  for (const a of proj.assertions.filter((a) => a.predicate === 'head_sha')) {
    const full = a.subject.replace(/^repo:/, '');
    assert.equal(proj.meta.repo_pins[full], a.value);
  }
});

test('generator is deterministic: two runs are byte-identical', () => {
  const b1 = fs.readFileSync(path.join(tmp, 'p1.json'));
  const b2 = fs.readFileSync(path.join(tmp, 'p2.json'));
  assert.equal(b1.toString(), b2.toString());
});

test('snapshots are versioned, indexed, idempotent, and immutable', () => {
  const snapDir = path.join(tmp, 'snaps');
  build(path.join(tmp, 's1.json'), ['--snapshot-dir', snapDir]);
  const snapFile = 'projection-2026-09-08T15-48-21Z.json';
  assert.ok(fs.existsSync(path.join(snapDir, snapFile)), 'snapshot file written');
  const index = JSON.parse(fs.readFileSync(path.join(snapDir, 'index.json'), 'utf8'));
  assert.equal(index.length, 1);
  assert.equal(index[0].file, snapFile);
  assert.equal(index[0].evidence_cut, '2026-09-08T15:48:21Z');
  assert.match(index[0].gov_sha, /^[0-9a-f]{40}$/);
  // Rerun: idempotent, no duplicate index entry.
  build(path.join(tmp, 's2.json'), ['--snapshot-dir', snapDir]);
  assert.equal(JSON.parse(fs.readFileSync(path.join(snapDir, 'index.json'), 'utf8')).length, 1);
  // Tampered history fails closed.
  fs.writeFileSync(path.join(snapDir, snapFile), '{"tampered":true}');
  assert.throws(() => build(path.join(tmp, 's3.json'), ['--snapshot-dir', snapDir]), /immutable/);
});
