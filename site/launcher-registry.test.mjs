import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const registryPath = new URL('./launcher-registry.json', import.meta.url);
const sourcePath = new URL('../data/launcher-surfaces.json', import.meta.url);
const generatorPath = new URL('../scripts/generate-launcher-registry.mjs', import.meta.url);

const read = (url) => JSON.parse(fs.readFileSync(url, 'utf8'));

test('launcher registry is deterministic and governance-backed', () => {
  const before = fs.readFileSync(registryPath, 'utf8');
  const run = spawnSync(process.execPath, [generatorPath.pathname], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(fs.readFileSync(registryPath, 'utf8'), before, 'generator must be byte deterministic');

  const source = read(sourcePath);
  const registry = read(registryPath);
  assert.equal(registry.schema, 'aftergraph-launcher-registry/1.0');
  assert.equal(registry.entities.length, source.entities.length);
  assert.equal(registry.actions.length, source.actions.length);
  assert.equal(new Set(registry.entities.map((item) => item.id)).size, registry.entities.length);
});
test('private source boundaries cannot leak through launcher URLs', () => {
  const registry = read(registryPath);
  const runtime = registry.entities.find((item) => item.id === 'runtime');
  assert.ok(runtime);
  assert.equal(runtime.source_visibility, 'private');
  assert.equal(runtime.repo, 'runtime');
  assert.match(runtime.url, /^https:\/\/docs\.aftergraph\.org\//);

  for (const entity of registry.entities.filter((item) => item.source_visibility === 'private')) {
    assert.doesNotMatch(entity.url, /^https:\/\/github\.com\/Aftergraph\//i);
  }
  assert.ok(registry.entities.every((item) => item.evidence_url?.startsWith('/atlas')));
});

test('launcher actions are navigational or evidence-only', () => {
  const registry = read(registryPath);
  const allowed = new Set(['navigate', 'evidence']);
  assert.ok(registry.actions.every((item) => allowed.has(item.kind)));
  assert.ok(registry.actions.some((item) => item.id === 'verify-sentinel' && item.kind === 'navigate'));
  assert.ok(registry.actions.some((item) => item.id === 'open-status' && item.kind === 'evidence'));
});
