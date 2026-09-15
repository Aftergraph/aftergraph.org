import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const workerSource = fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8');

function harness() {
  let fetchHandler;
  const store = new Map();
  const context = {
    Response, Request, URL, Blob, Uint8Array, atob, btoa, Date, Set, Number, JSON, Math,
    AG_STATS: { async get(key) { return store.get(key) ?? null; }, async put(key, value) { store.set(key, value); } },
    addEventListener(type, handler) { if (type === 'fetch') fetchHandler = handler; },
  };
  vm.runInNewContext(workerSource, context, { filename: 'worker.js' });
  return { fetchHandler, store };
}

async function dispatch(h, headers = {}) {
  let responsePromise;
  const request = new Request('https://aftergraph.org/api/launcher/telemetry', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://aftergraph.org', 'cf-connecting-ip': '198.51.100.1', ...headers },
    body: JSON.stringify({ event: 'item_open', item_id: 'studio', item_kind: 'entity', intent: 'find' }),
  });
  h.fetchHandler({ request, respondWith(value) { responsePromise = Promise.resolve(value); } });
  return responsePromise;
}

test('telemetry rate-limits a single IP to 30 posts per minute', async () => {
  const h = harness();
  let statuses = [];
  for (let i = 0; i < 32; i++) {
    const r = await dispatch(h);
    statuses.push(r.status);
  }
  assert.equal(statuses[29], 202, '30th request accepted');
  assert.equal(statuses[30], 429, '31st request rate-limited');
  assert.equal(statuses[31], 429, '32nd request rate-limited');
});

test('a different IP is not affected by another IP rate limit', async () => {
  const h = harness();
  for (let i = 0; i < 30; i++) { await dispatch(h, { 'cf-connecting-ip': '198.51.100.1' }); }
  const r = await dispatch(h, { 'cf-connecting-ip': '203.0.113.5' });
  assert.equal(r.status, 202, 'second IP not blocked by first IP');
});
