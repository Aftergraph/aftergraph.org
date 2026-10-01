import test from 'node:test';
import assert from 'node:assert/strict';

const workerModule = await import('./worker.js');
const worker = workerModule.default;

function mutationEnv() {
  const calls = { r2Put: 0, dbRun: 0 };
  const db = {
    prepare() {
      return {
        bind() { return this; },
        async run() { calls.dbRun += 1; return { success: true }; },
        async all() { return { results: [] }; },
      };
    },
  };
  const r2 = {
    async put() { calls.r2Put += 1; },
  };
  return { env: { ATLAS_V3_DB: db, ATLAS_V3_ARTIFACTS: r2 }, calls };
}

async function dispatch(path, { method = 'GET', body, headers = {} } = {}, env) {
  const init = { method, headers };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
  const request = new Request(`https://aftergraph.org${path}`, init);
  const response = await worker.fetch(request, env);
  const json = await response.json();
  return { response, json };
}

test('OER-006: public artifact upload is fail-closed before R2 mutation', async () => {
  const { env, calls } = mutationEnv();
  const { response, json } = await dispatch('/api/v3/artifacts', {
    method: 'POST',
    body: 'untrusted-bytes',
    headers: { 'content-type': 'application/octet-stream' },
  }, env);
  assert.equal(response.status, 403);
  assert.equal(json.error, 'ATLAS_PUBLIC_MUTATION_DISABLED');
  assert.match(json.required, /internal publisher/i);
  assert.deepEqual(calls, { r2Put: 0, dbRun: 0 });
});

test('OER-006: public publish is fail-closed before D1 or R2 mutation', async () => {
  const { env, calls } = mutationEnv();
  const { response, json } = await dispatch('/api/v3/publish', {
    method: 'POST',
    body: { envelopes: [], claims: [], label: 'untrusted' },
    headers: { 'content-type': 'application/json' },
  }, env);
  assert.equal(response.status, 403);
  assert.equal(json.error, 'ATLAS_PUBLIC_MUTATION_DISABLED');
  assert.match(json.required, /internal publisher/i);
  assert.deepEqual(calls, { r2Put: 0, dbRun: 0 });
});

test('OER-007: Atlas health labels D1/R2 as rebuildable projection cache, never canonical truth', async () => {
  const { env } = mutationEnv();
  const { response, json } = await dispatch('/api/v3/health', {}, env);
  assert.equal(response.status, 200);
  assert.equal(json.d1, true);
  assert.equal(json.r2, true);
  assert.equal(json.storage_role, 'REBUILDABLE_PROJECTION_CACHE');
  assert.equal(json.canonical_truth, false);
  assert.equal(json.public_mutation, 'DISABLED');
  assert.equal(json.write_path, 'CANONICAL_INTERNAL_PUBLISHER_REQUIRED');
});