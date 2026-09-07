// studio-api-proxy.test.mjs — D1 prefix-strip proof for site/studio-api-proxy.js.
// node:test, no deps. Imports the worker, calls fetch() with fake env
// BACKEND_URL against a stubbed global fetch.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from './studio-api-proxy.js';

const BACKEND = 'https://backend.example';
const T1 = { BACKEND_URL: BACKEND, STUDIO_API_TIER: 'tier1' };
const T2 = { BACKEND_URL: BACKEND, STUDIO_API_TIER: 'tier2' };

const realFetch = globalThis.fetch;
let calls;

function stubOk(payload = { ok: true }, status = 200) {
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
}

function stubThrow() {
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    throw new Error('down');
  };
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const req = (path, init = {}) =>
  new Request(`https://aftergraph.org${path}`, init);

describe('D1 /studio mount prefix-strip', () => {
  it('Tier-1 GET /studio/api/v1/state hits allowlist, forwards stripped path', async () => {
    stubOk({ state: 'live' });
    const res = await worker.fetch(req('/studio/api/v1/state'), T1);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-studio-api-tier'), 'tier1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${BACKEND}/api/v1/state`);
    assert.deepEqual(await res.json(), { state: 'live' });
  });

  it('Tier-1 bare /api/v1/state still works (strip is conditional)', async () => {
    stubOk();
    const res = await worker.fetch(req('/api/v1/state'), T1);
    assert.equal(res.status, 200);
    assert.equal(calls[0].url, `${BACKEND}/api/v1/state`);
  });

  it('Tier-1 /studio/healthz strips to /healthz', async () => {
    stubOk({ status: 'ok' });
    const res = await worker.fetch(req('/studio/healthz'), T1);
    assert.equal(res.status, 200);
    assert.equal(calls[0].url, `${BACKEND}/healthz`);
  });

  it('Tier-1 preserves query string through the strip', async () => {
    stubOk();
    const res = await worker.fetch(req('/studio/api/v1/state?cursor=abc&limit=2'), T1);
    assert.equal(res.status, 200);
    assert.equal(calls[0].url, `${BACKEND}/api/v1/state?cursor=abc&limit=2`);
  });

  it('Tier-1 POST /studio/api/v1/state -> 405, never reaches backend', async () => {
    stubOk();
    const res = await worker.fetch(
      req('/studio/api/v1/state', { method: 'POST', body: '{}' }),
      T1,
    );
    assert.equal(res.status, 405);
    assert.deepEqual(await res.json(), { error: 'tier1_read_only' });
    assert.equal(calls.length, 0);
  });

  it('Tier-1 off-list /studio/api/v1/events (SSE) -> 403, never reaches backend', async () => {
    stubOk();
    const res = await worker.fetch(req('/studio/api/v1/events'), T1);
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'tier1_not_allowlisted' });
    assert.equal(calls.length, 0);
  });

  it('Tier-1 /studioapi/v1/state does NOT strip (no false prefix)', async () => {
    stubOk();
    const res = await worker.fetch(req('/studioapi/v1/state'), T1);
    assert.equal(res.status, 403);
    assert.equal(calls.length, 0);
  });

  it('no BACKEND_URL -> 503', async () => {
    stubOk();
    const res = await worker.fetch(req('/studio/api/v1/state'), { STUDIO_API_TIER: 'tier1' });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'backend_not_configured' });
    assert.equal(calls.length, 0);
  });

  it('Tier-2 POST /studio/api/v1/missions passthrough incl. idempotency-key + query', async () => {
    stubOk({ created: true });
    const res = await worker.fetch(
      req('/studio/api/v1/missions?dry=1', {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json',
          accept: 'application/json',
          'idempotency-key': 'key-123',
          'x-evil': 'drop-me',
        },
        body: JSON.stringify({ name: 'm' }),
      }),
      T2,
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-studio-api-tier'), 'tier2');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${BACKEND}/api/v1/missions?dry=1`);
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.authorization, 'Bearer secret-token');
    assert.equal(calls[0].init.headers['content-type'], 'application/json');
    assert.equal(calls[0].init.headers['idempotency-key'], 'key-123');
    assert.ok(!('x-evil' in calls[0].init.headers));
    assert.deepEqual(await res.json(), { created: true });
  });

  it('Tier-2 /studio/healthz strips to /healthz', async () => {
    stubOk({ status: 'ok' });
    const res = await worker.fetch(req('/studio/healthz'), T2);
    assert.equal(res.status, 200);
    assert.equal(calls[0].url, `${BACKEND}/healthz`);
  });

  it('Tier-2 off-prefix -> 404', async () => {
    stubOk();
    const res = await worker.fetch(req('/studio/elsewhere'), T2);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'not_found' });
    assert.equal(calls.length, 0);
  });

  it('backend failure never logs secrets (no auth/query/body in logs)', async () => {
    stubThrow();
    const seen = [];
    const origErr = console.error;
    console.error = (...a) => seen.push(a.map(String).join(' '));
    try {
      const res = await worker.fetch(
        req('/studio/api/v1/state?token=abc123', {
          headers: { authorization: 'Bearer super-secret', accept: 'application/json' },
        }),
        T1,
      );
      assert.equal(res.status, 502);
    } finally {
      console.error = origErr;
    }
    const blob = seen.join('\n');
    assert.ok(!blob.includes('super-secret'), 'auth value leaked to logs');
    assert.ok(!blob.includes('token=abc123'), 'query string leaked to logs');
  });
});
