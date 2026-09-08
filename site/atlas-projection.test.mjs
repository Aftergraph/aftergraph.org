#!/usr/bin/env node
// AtlasProjection v0.2 contract tests (TDD). Run: node --test site/atlas-projection.test.mjs
// Builds a projection from real evidence inputs into a temp file, then enforces the schema contract.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LEGACY = { 'work-intelligence-v2': 'wi-backend', 'work-intelligence-web': 'wi-frontend' };

const SITE = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(SITE, 'generate-atlas-projection.mjs');
const LEDGER = 'C:/Users/empir/workspace/.tmp-atlas-ledger';
const GOV = 'C:/Users/empir/workspace/after-graph-governance';

function build(out) {
  execFileSync(
    'node',
    [GEN, '--ledger', LEDGER, '--gov', GOV, '--out', out, '--now', '2026-09-08T16:00:00Z'],
    { stdio: 'pipe' }
  );
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-test-'));
const proj = build(path.join(tmp, 'p1.json'));
const proj2 = build(path.join(tmp, 'p2.json'));

const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
const entities = byId(proj.entities);
const assertions = byId(proj.assertions);
const relations = byId(proj.relations);

function govTopologyNames(govSha) {
  const out = execFileSync('git', ['-C', GOV, 'show', `${govSha}:docs/platform-topology/1.0.json`]);
  return new Set(JSON.parse(out.toString()).repositories.map((r) => r.name));
}
// Expected C2 set derived from live inputs: observed slugs that are neither canonical
// nor rename targets already covered by C1.
function expectedUnregistered() {
  const canon = govTopologyNames(proj.meta.gov_sha);
  const coveredByRename = new Set(
    Object.entries(LEGACY)
      .filter(([legacy]) => canon.has(legacy))
      .map(([, current]) => current)
  );
  return new Set(
    [...entities.values()]
      .filter((e) => e.kind === 'repository')
      .map((e) => e.identity.full_name)
      .filter((full) => {
        const short = full.split('/')[1];
        const isObserved = proj.assertions.some(
          (a) => a.subject === `repo:${full}` && a.predicate === 'slug' && a.truth_plane === 'OBSERVED'
        );
        return isObserved && !canon.has(short) && !coveredByRename.has(short);
      })
  );
}

const PROV_KEYS = ['source', 'source_type', 'repository', 'ref', 'evidence_level'];

test('schema id is atlas-projection/0.2 with pinned meta', () => {
  assert.equal(proj.schema, 'atlas-projection/0.2');
  assert.match(proj.meta.evidence_cut, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(proj.meta.gov_sha, /^[0-9a-f]{40}$/);
  assert.equal(Object.keys(proj.meta.repo_pins).length, 25);
  for (const sha of Object.values(proj.meta.repo_pins)) assert.match(sha, /^[0-9a-f]{40}$/);
});

test('entities carry no truth_plane; every assertion/relation carries full provenance', () => {
  for (const e of proj.entities) {
    assert.ok(!('truth_plane' in e), `entity ${e.id} must not carry truth_plane`);
    assert.ok(['repository', 'contract', 'capability', 'model', 'study'].includes(e.kind));
  }
  assert.ok(proj.entities.length >= 27, `expected >=27 entities, got ${proj.entities.length}`);
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

test('WI rename state tracks live canonical truth (C1 iff legacy slugs still canonical)', () => {
  const canonNames = govTopologyNames(proj.meta.gov_sha);
  const legacyStillCanonical = Object.keys(LEGACY).filter((l) => canonNames.has(l));
  const c1 = proj.conflicts.find((c) => c.id === 'C1');
  if (legacyStillCanonical.length === 0) {
    assert.ok(!c1, 'topology no longer lists legacy slugs, so C1 must be absent (resolved by owner)');
    // Legacy slugs may persist only as dependency-shadow entities with no CANONICAL slug claim.
    for (const legacy of Object.keys(LEGACY)) {
      const slug = proj.assertions.find(
        (a) => a.subject === `repo:Aftergraph/${legacy}` && a.predicate === 'slug' && a.truth_plane === 'CANONICAL'
      );
      assert.ok(!slug, `no CANONICAL slug claim may exist for dependency-shadow ${legacy}`);
    }
  } else {
    assert.ok(c1, 'legacy slugs still canonical: C1 must exist');
    assert.equal(c1.pairs.length, legacyStillCanonical.length);
    for (const p of c1.pairs) {
      assert.ok(assertions.has(p.a), `C1 pair references unknown assertion ${p.a}`);
      assert.ok(assertions.has(p.b), `C1 pair references unknown assertion ${p.b}`);
    }
  }
});

test('C2 unregistered set tracks live inputs (observed minus canonical minus rename cover)', () => {
  const c2 = proj.conflicts.find((c) => c.id === 'C2');
  const expected = expectedUnregistered();
  if (expected.size === 0) {
    assert.ok(!c2, 'nothing unregistered: C2 must be absent');
    return;
  }
  assert.ok(c2, 'unregistered repos exist: C2 must exist');
  assert.equal(c2.status, 'open');
  const got = new Set((c2.subjects ?? []).map((id) => entities.get(id)?.identity?.full_name));
  assert.deepEqual(got, expected);
});

test('canonical relations keep dependencies.yml targets verbatim (no silent rewrite)', () => {
  const deps = execFileSync('git', ['-C', GOV, 'show', `${proj.meta.gov_sha}:dependencies.yml`]).toString();
  const literalLegacy = deps.includes('work-intelligence-v2');
  const hit = proj.relations.find(
    (r) => r.truth_plane === 'CANONICAL' && r.target === 'repo:Aftergraph/work-intelligence-v2'
  );
  if (literalLegacy) {
    assert.ok(hit, 'dependencies.yml still names work-intelligence-v2: edge must keep it verbatim');
  } else {
    assert.ok(!hit, 'dependencies.yml renamed the target: no stale verbatim edge may remain');
    const renamed = proj.relations.find(
      (r) => r.truth_plane === 'CANONICAL' && r.target === 'repo:Aftergraph/wi-backend'
    );
    assert.ok(renamed, 'expected a CANONICAL edge to wi-backend after owner rename');
  }
});

test('C4 intra-canonical drift tracks dependencies-vs-topology shadow targets', () => {
  const deps = execFileSync('git', ['-C', GOV, 'show', `${proj.meta.gov_sha}:dependencies.yml`]).toString();
  const canon = govTopologyNames(proj.meta.gov_sha);
  const expected = Object.keys(LEGACY).filter((l) => deps.includes(l) && !canon.has(l));
  const c4 = proj.conflicts.find((c) => c.id === 'C4');
  if (!expected.length) {
    assert.ok(!c4, 'no shadow targets: C4 must be absent');
    return;
  }
  assert.ok(c4, 'shadow targets exist: C4 must exist');
  const got = new Set((c4.subjects ?? []).map((id) => entities.get(id)?.identity?.full_name));
  assert.deepEqual(got, new Set(expected.map((l) => `Aftergraph/${l}`)));
});

test('private-source boundary: no heads/PRs for private repos, withheld marker present', () => {
  const privHeads = proj.assertions.filter(
    (a) => ['head_sha', 'head_msg', 'pushed_at', 'open_pr'].includes(a.predicate)
      && entities.get(a.subject)?.identity?.visibility === 'private'
  );
  assert.equal(privHeads.length, 0, `private repo internals leaked: ${privHeads.map((a) => a.id).join(',')}`);
  const withheld = proj.assertions.filter((a) => a.predicate === 'withheld');
  assert.ok(withheld.length >= 11, `expected >=11 withheld markers, got ${withheld.length}`);
});

test('all head_sha values are full 40-hex and match repo_pins', () => {
  for (const a of proj.assertions.filter((a) => a.predicate === 'head_sha')) {
    assert.match(a.value, /^[0-9a-f]{40}$/, `abbreviated SHA in ${a.id}`);
    const full = 'Aftergraph/' + a.subject.split('Aftergraph/')[1];
    assert.equal(proj.meta.repo_pins[full] ?? proj.meta.repo_pins[a.subject], a.value);
  }
});

test('generator is deterministic: two runs are byte-identical', () => {
  const b1 = fs.readFileSync(path.join(tmp, 'p1.json'));
  const b2 = fs.readFileSync(path.join(tmp, 'p2.json'));
  assert.equal(b1.toString(), b2.toString(), 'generator output is not deterministic');
});
