// studio-api-proxy.js — Studio backend API proxy worker (Tier-1 / Tier-2).
//
// Tier-1 (read-only live status): GET only, restricted to the allowlist below
//   (health/state and other safe read endpoints). Anything else -> 4xx,
//   the request never reaches the backend.
// Tier-2 (full backend proxy): any method on /healthz or /api/v1/*, with
//   auth header passthrough (Authorization) plus content-type / accept /
//   idempotency-key. All other paths -> 404.
//
// Env:
//   BACKEND_URL      (required) e.g. https://studio-backend.internal
//   STUDIO_API_TIER  "tier1" (default, fail-closed) or "tier2"
//
// Secrecy: this worker NEVER logs secrets — no Authorization values, tokens,
// request bodies, or query strings are logged. Logs carry only the tier,
// method, pathname, and upstream status.
//
// Deploy (separate worker; the existing aftergraph-site worker is untouched):
//   BACKEND_URL is a plain var; no backend credentials live in this worker.

'use strict';

const TIER_1_ALLOWLIST = new Set([
  '/healthz',
  '/api/v1/state',
  '/api/v1/system',
  '/api/v1/missions',
  '/api/v1/needs',
  '/api/v1/agents',
  '/api/v1/artifacts',
  '/api/v1/connections',
  '/api/v1/spaces',
  '/api/v1/upstreams',
  '/api/v1/context',
  '/api/v1/sync/events',
]);

// Tier-1 forwards only Accept (no auth needed for public read status).
const TIER_1_HEADERS = ['accept'];
// Tier-2 passes the caller auth through; nothing else (fail-closed header set).
const TIER_2_HEADERS = ['authorization', 'content-type', 'accept', 'idempotency-key'];

function tierOf(env) {
  return String((env && env.STUDIO_API_TIER) || 'tier1').toLowerCase() === 'tier2'
    ? 'tier2'
    : 'tier1';
}

function backendBase(env) {
  const raw = String((env && env.BACKEND_URL) || '').trim().replace(/\/+$/, '');
  return raw || null;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type,accept,idempotency-key',
    'access-control-max-age': '86400',
  };
}

function json(status, obj, tier) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'cache-control': 'no-store',
      'x-studio-api-tier': tier,
      ...corsHeaders(),
    },
  });
}

// Never logs headers, bodies, tokens, or query strings.
async function forward(backend, request, pathname, search, allowedHeaders, tier) {
  const headers = {};
  for (const name of allowedHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  const init = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }
  let upstream;
  try {
    upstream = await fetch(backend + pathname + search, init);
  } catch {
    console.error('studio-api-proxy backend_unreachable', { tier, method: request.method, pathname });
    return json(502, { error: 'backend_unreachable' }, tier);
  }
  const outHeaders = { 'x-studio-api-tier': tier, ...corsHeaders() };
  const contentType = upstream.headers.get('content-type');
  if (contentType) outHeaders['content-type'] = contentType;
  return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
}

export default {
  async fetch(request, env = {}) {
    const tier = tierOf(env);
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const backend = backendBase(env);
    if (!backend) return json(503, { error: 'backend_not_configured' }, tier);
    if (tier === 'tier1') {
      if (request.method !== 'GET') return json(405, { error: 'tier1_read_only' }, tier);
      // /api/v1/events (SSE stream) is deliberately excluded: Tier-1 is
      // snapshot status only, no long-lived streams.
      if (!TIER_1_ALLOWLIST.has(pathname)) return json(403, { error: 'tier1_not_allowlisted' }, tier);
      return forward(backend, request, pathname, url.search, TIER_1_HEADERS, tier);
    }
    if (pathname !== '/healthz' && !pathname.startsWith('/api/v1/')) {
      return json(404, { error: 'not_found' }, tier);
    }
    return forward(backend, request, pathname, url.search, TIER_2_HEADERS, tier);
  },
};

export { TIER_1_ALLOWLIST };
