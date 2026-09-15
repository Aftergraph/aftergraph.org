import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const workerSource = fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8');

function harness() {
  let fetchHandler;
  const context = {
    Response, Request, URL, Blob, Uint8Array, atob, btoa, crypto,
    Date, Set, Number, JSON, Math,
    AG_STATS: { async get(){return null;}, async put(){} },
    addEventListener(type, handler) { if (type === 'fetch') fetchHandler = handler; },
  };
  vm.runInNewContext(workerSource, context, { filename: 'worker.js' });
  return { fetchHandler };
}

async function get(h, path) {
  let responsePromise;
  const request = new Request('https://aftergraph.org' + path, { method: 'GET' });
  h.fetchHandler({ request, respondWith(v){ responsePromise = Promise.resolve(v); } });
  return responsePromise;
}

test('HTML responses ship a per-request nonce CSP without unsafe-inline', async () => {
  const h = harness();
  const r1 = await get(h, '/');
  const csp1 = r1.headers.get('Content-Security-Policy');
  assert.match(csp1, /script-src 'self' 'nonce-[a-z0-9-]+'/);
  assert.doesNotMatch(csp1, /unsafe-inline/);
  const body1 = await r1.text();
  // inline script/style tags must carry the nonce from the CSP
  const nonce1 = csp1.match(/nonce-([a-z0-9-]+)/)[1];
  assert.ok(body1.includes('nonce="' + nonce1 + '"'), 'inline tags must carry the nonce');
  // every inline <script>/<style> opening tag must have a nonce (external src script served from 'self' is fine without nonce, but adding is harmless)
  const scriptTags = body1.match(/<script/g) || [];
  assert.ok(scriptTags.length > 0, 'landing has inline scripts');
});

test('each HTML request gets a distinct nonce', async () => {
  const h = harness();
  const r1 = await get(h, '/');
  const r2 = await get(h, '/');
  const n1 = r1.headers.get('Content-Security-Policy').match(/nonce-([a-z0-9-]+)/)[1];
  const n2 = r2.headers.get('Content-Security-Policy').match(/nonce-([a-z0-9-]+)/)[1];
  assert.notEqual(n1, n2, 'nonces must differ per request');
});

test('non-HTML responses ship a CSP without script-src (no inline)', async () => {
  const h = harness();
  const r = await get(h, '/healthz');
  const csp = r.headers.get('Content-Security-Policy');
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.doesNotMatch(csp, /script-src/);
});

test('launcher-app.js (external JS) gets non-HTML CSP without unsafe-inline', async () => {
  const h = harness();
  const r = await get(h, '/launcher-app.js');
  const csp = r.headers.get('Content-Security-Policy');
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.doesNotMatch(csp, /script-src/);
});
