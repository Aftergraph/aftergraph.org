import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const workerSource = fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8');

function harness() {
  let fetchHandler;
  const store = new Map();
  const context = {
    Response, Request, URL, Blob, Uint8Array, atob, btoa,
    Date, Set, Number, JSON,
    AG_STATS: {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, value); },
    },
    addEventListener(type, handler) {
      if (type === 'fetch') fetchHandler = handler;
    },
  };
  vm.runInNewContext(workerSource, context, { filename: 'worker.js' });
  assert.equal(typeof fetchHandler, 'function');
  return { fetchHandler, store };
}
async function dispatch(h, payload, headers = {}) {
  let responsePromise;
  const request = new Request('https://aftergraph.org/api/launcher/telemetry', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://aftergraph.org', ...headers },
    body: JSON.stringify(payload),
  });
  h.fetchHandler({ request, respondWith(value) { responsePromise = Promise.resolve(value); } });
  return responsePromise;
}

test('telemetry worker accepts bounded aggregate dimensions', async () => {
  const h = harness();
  const response = await dispatch(h, { event: 'item_open', item_id: 'studio', item_kind: 'entity', intent: 'find' });
  assert.equal(response.status, 202);
  assert.equal(h.store.size, 1);
  const [key, value] = [...h.store.entries()][0];
  assert.match(key, /^launcher:v1:\d{4}-\d{2}-\d{2}:item_open:studio:entity:find:/);
  assert.equal(value, '1');
});
test('telemetry worker rejects raw-query fields and unknown IDs', async () => {
  const h = harness();
  const raw = await dispatch(h, { event: 'zero_result', intent: 'find', result_bucket: '0', query: 'secret customer text' });
  assert.equal(raw.status, 400);
  const unknown = await dispatch(h, { event: 'item_open', item_id: 'private-thing', item_kind: 'entity', intent: 'find' });
  assert.equal(unknown.status, 400);
  assert.equal(h.store.size, 0);
});

test('telemetry worker enforces same-origin browser submissions', async () => {
  const h = harness();
  const response = await dispatch(h, { event: 'registry_loaded', result_bucket: '6-20' }, { origin: 'https://example.com' });
  assert.equal(response.status, 403);
  assert.equal(h.store.size, 0);
});
