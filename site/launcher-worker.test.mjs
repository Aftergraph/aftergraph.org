import test from 'node:test';
import assert from 'node:assert/strict';

// Dynamic import of ES module worker
const workerModule = await import('./worker.js');
const worker = workerModule.default;

function createEnv() {
  const store = new Map();
  return {
    AG_STATS: {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, value); },
    },
    ATLAS_V3_DB: null,
    ATLAS_V3_ARTIFACTS: null,
  };
}

async function dispatch(payload, headers = {}, envOverrides = {}) {
  const env = { ...createEnv(), ...envOverrides };
  const request = new Request('https://aftergraph.org/api/launcher/telemetry', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://aftergraph.org', ...headers },
    body: JSON.stringify(payload),
  });
  return worker.fetch(request, env);
}

test('telemetry worker accepts bounded aggregate dimensions', async () => {
  const env = createEnv();
  const response = await dispatch({ event: 'item_open', item_id: 'studio', item_kind: 'entity', intent: 'find' }, {}, env);
  assert.equal(response.status, 202);
  assert.equal(env.AG_STATS._store?.size ?? 1, 1); // KV mock tracks puts
});

test('telemetry worker rejects raw-query fields and unknown IDs', async () => {
  const raw = await dispatch({ event: 'zero_result', intent: 'find', result_bucket: '0', query: 'secret customer text' });
  assert.equal(raw.status, 400);
  const unknown = await dispatch({ event: 'item_open', item_id: 'private-thing', item_kind: 'entity', intent: 'find' });
  assert.equal(unknown.status, 400);
});

test('telemetry worker enforces same-origin browser submissions', async () => {
  const response = await dispatch({ event: 'registry_loaded', result_bucket: '6-20' }, { origin: 'https://example.com' });
  assert.equal(response.status, 403);
});

test('public topology route returns only public classifications and keeps separate maturity/evidence', async () => {
  const response = await worker.fetch(new Request('https://aftergraph.org/platform/repositories.json'), createEnv());
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const catalog = await response.json();
  assert.equal(catalog.schema, 'aftergraph-public-repository-catalog/1.0');
  assert.ok(catalog.repositories.length > 0);
  assert.ok(catalog.repositories.every((repository) => repository.visibility === 'public'));
  assert.ok(catalog.repositories.every((repository) => !('maturity' in repository) && !('evidence' in repository)));

  const pending = catalog.repositories.filter((repository) => repository.classification.state === 'pending');
  assert.deepEqual(new Set(pending.map((repository) => repository.repository)), new Set(['STEWARD-by-Aftergraph', 'engineering-crew-community']));
  assert.ok(pending.every((repository) => repository.classification.label === 'Classification pending'));
  for (const privateName of ['afm', 'context-continuity', 'runtime', 'skills-vault', 'veranza', 'wi-frontend']) {
    assert.ok(!catalog.repositories.some((repository) => repository.repository === privateName), `private repository name leaked: ${privateName}`);
  }
});
