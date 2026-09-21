import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const build=fs.readFileSync(new URL('./build-worker.cjs',import.meta.url),'utf8');
const workflow=fs.readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
const launcher=JSON.parse(fs.readFileSync(new URL('../data/launcher-surfaces.json',import.meta.url),'utf8'));

test('STEWARD stays on canonical aftergraph-site Worker and content-addressed R2',()=>{
  assert.match(build,/\/steward\/assets\/steward-rig-v1\.glb/);
  assert.match(build,/ATLAS_V3_ARTIFACTS/);
  assert.match(build,/r2_key/);
  assert.match(build,/steward\.presence-projection\/1\.0/);
});

test('production deploy round-trips exact R2 objects before Worker deploy',()=>{
  assert.match(workflow,/r2 object put/);
  assert.match(workflow,/r2 object get/);
  assert.match(workflow,/--remote/);
  assert.match(workflow,/STEWARD_R2_VERIFY=PASS/);
  assert.match(workflow,/node site\/steward\/verify-steward\.cjs live \$base/);
});

test('launcher registers STEWARD as public surface without inventing repo topology ownership',()=>{
  const steward=launcher.entities.find(item=>item.id==='steward');
  assert.ok(steward);
  assert.equal(steward.url,'/steward/');
  assert.equal(steward.repo,undefined);
  assert.ok(launcher.featured_entities.includes('steward'));
});
