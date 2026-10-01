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

test('deploy provenance endpoint exposes deterministic source identity', async () => {
  const env = createEnv();
  const request = new Request('https://aftergraph.org/provenance.json', { method: 'GET' });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.schema, 'aftergraph-deploy-provenance/1.0');
  assert.equal(body.repository, 'Aftergraph/aftergraph.org');
  assert.equal(body.route, 'aftergraph-site v1.2.0');
  assert.ok(body.sha);
  assert.ok(body.deployed);
});

test('agent UI boundary endpoint exposes draft non-canonical semantics', async () => {
  const env = createEnv();
  const request = new Request('https://aftergraph.org/agent-ui-boundary.json', { method: 'GET' });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  const body = await response.json();
  assert.equal(body.schema, 'aftergraph-agent-ui-boundary/0.1-draft');
  assert.equal(body.status, 'illustrative');
  assert.equal(body.authority, 'non-canonical');
  assert.equal(body.flow.length, 7);
  assert.equal(body.flow.at(-1)?.label, 'VERDICT');
  assert.match(body.inspired_by?.[0]?.relationship || '', /no compatibility claim/);
});
