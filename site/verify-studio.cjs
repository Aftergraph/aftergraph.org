'use strict';
// Verify gates for the Studio Tier-0 demo.
// Spec: workspace/aftergraph.org/docs/STUDIO-LIVE-SPEC.md ("Verify gates").
//
//   node site/verify-studio.cjs build            # build-time asserts (default)
//   node site/verify-studio.cjs live [base]      # live smoke (+ build checks first)
//   node site/verify-studio.cjs live-api [base]  # proxy checks (direct, no network)
// Base resolution for live: argv[3] > STUDIO_BASE env > https://aftergraph.org.
// Base resolution for live-api: argv[3] > STUDIO_API_PROXY_BASE env; empty
// means direct proxy-file checks only, live URLs are printed for the operator.

const fs = require('fs');
const path = require('path');

const SITE = __dirname;
const DIST = path.join(SITE, 'studio-dist');
const BASE = '/studio';
const BUDGET_BYTES = 5 * 1024 * 1024;

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`STUDIO-VERIFY-FAIL: ${message}`);
};
const pass = (message) => console.log(`STUDIO-VERIFY-PASS: ${message}`);

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

function buildChecks() {
  if (!fs.existsSync(DIST)) {
    fail(`studio-dist missing (run studio-build.cjs first): ${DIST}`);
    return;
  }
  const files = walk(DIST);
  const rel = (f) => path.relative(DIST, f).split(path.sep).join('/');

  // Allowlist present.
  for (const required of ['index.html', 'manifest.webmanifest', 'sw.js',
    'styles/', 'src/', 'version.json', '_headers',
    'packages/ui/', 'packages/icons/', 'packages/tokens/', 'packages/brand/',
    'packages/motion/', 'packages/runtime-ui/', 'packages/spatial/',
    'packages/presence/', 'packages/interaction/', 'packages/visualization/',
    'packages/composer/']) {
    if (!fs.existsSync(path.join(DIST, required))) fail(`allowlist missing: ${required}`);
  }

  // Denylist absent.
  const denySegments = new Set(['server', 'scripts', 'tests', 'docs']);
  for (const file of files) {
    const r = rel(file);
    if (r.endsWith('.test.mjs')) fail(`denylist: ${r}`);
    if (r.endsWith('.png')) fail(`denylist: ${r}`);
    for (const segment of r.split('/')) {
      if (denySegments.has(segment)) fail(`denylist segment in: ${r}`);
    }
  }
  if (files.some((f) => rel(f).startsWith('packages/client/'))) {
    fail('denylist: packages/client/ shipped');
  }

  // No absolute-path leftovers.
  const textExt = new Set(['.html', '.mjs', '.js', '.css', '.json', '.webmanifest', '.svg', '.map']);
  for (const file of files) {
    if (!textExt.has(path.extname(file)) || path.basename(file) === '_headers') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/(href|src)="\/(?!studio\/|\/)/.test(text)) fail(`absolute-path leftover in: ${rel(file)}`);
  }

  // SW SHELL rewritten + CACHE stamped.
  const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
  const shell = sw.match(/const SHELL = \[[\s\S]*?\];/);
  if (!shell) fail('sw.js SHELL list missing');
  else {
    const entries = [...shell[0].matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
    if (!entries.length) fail('sw.js SHELL list empty');
    for (const entry of entries) {
      if (entry !== `${BASE}/` && !entry.startsWith(`${BASE}/`)) fail(`sw SHELL not under ${BASE}/: ${entry}`);
    }
  }
  const cache = sw.match(/const CACHE = '([^']*)';/);
  if (!cache) fail('sw.js CACHE name missing');
  else if (/agentic-1/.test(cache[1])) fail(`sw.js CACHE not stamped: ${cache[1]}`);
  else pass(`sw CACHE stamped: ${cache[1]}`);
  if (!sw.includes(`caches.match('${BASE}/index.html')`) && !(sw.includes('caches.match(`${base}index.html`)') && sw.includes('function scopeRoot()'))) {
    fail('sw.js offline fallback not under /studio/ (neither rewritten literal nor scope-aware form)');
  }

  // Manifest scope/start_url under /studio/.
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.webmanifest'), 'utf8'));
  if (!(manifest.scope === BASE || manifest.scope === `${BASE}/`)) {
    fail(`manifest scope not under ${BASE}/: ${manifest.scope}`);
  }
  if (!(manifest.start_url === BASE || manifest.start_url === `${BASE}/`
    || String(manifest.start_url).startsWith(`${BASE}/`))) {
    fail(`manifest start_url not under ${BASE}/: ${manifest.start_url}`);
  }

  // version.json SHA equals STUDIO_SHA.
  const STUDIO_SHA = process.env.STUDIO_SHA || '';
  if (!STUDIO_SHA) fail('STUDIO_SHA env required to check version.json');
  else {
    const version = JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8'));
    if (version.studio_sha !== STUDIO_SHA) {
      fail(`version.json sha ${version.studio_sha} != STUDIO_SHA ${STUDIO_SHA}`);
    } else pass(`version.json sha == STUDIO_SHA (${STUDIO_SHA.slice(0, 12)})`);
    if (version.mode !== 'demo') fail(`version.json mode != demo: ${version.mode}`);
  }

  // Size budget.
  let total = 0;
  for (const file of files) total += fs.statSync(file).size;
  if (total >= BUDGET_BYTES) fail(`budget: ${total} bytes >= 5 MB`);
  else pass(`budget: ${total} bytes < 5 MB across ${files.length} files`);

  // CSP file present: style-src 'self' 'unsafe-inline' covers the 12 style attrs.
  const headers = fs.readFileSync(path.join(DIST, '_headers'), 'utf8');
  if (!/style-src 'self' 'unsafe-inline'/.test(headers)) {
    fail('_headers CSP missing style-src self + unsafe-inline');
  } else pass('CSP file present (style-src self + unsafe-inline)');
  for (const directive of ["script-src 'self'", "img-src 'self' data:",
    "connect-src 'self'", "frame-ancestors 'self'"]) {
    if (!headers.includes(directive)) fail(`_headers CSP missing: ${directive}`);
  }
}

async function liveSmoke(base) {
  const origin = base.replace(/\/$/, '');
  const get = async (p) => {
    const res = await fetch(`${origin}${p}`);
    return { status: res.status, text: await res.text(), headers: res.headers };
  };
  const shell = await get(`${BASE}/`);
  if (shell.status !== 200) fail(`GET ${BASE}/ -> ${shell.status}`);
  else pass(`GET ${BASE}/ -> 200 (${shell.text.length} bytes)`);
  const deep = await get(`${BASE}/now`);
  if (deep.status !== 200) fail(`GET ${BASE}/now -> ${deep.status}`);
  else if (!deep.text.includes('id="app"')) fail(`GET ${BASE}/now did not serve the shell`);
  else pass(`GET ${BASE}/now -> 200 (shell, SPA fallback)`);
  const versionRes = await get(`${BASE}/version.json`);
  if (versionRes.status !== 200) fail(`GET ${BASE}/version.json -> ${versionRes.status}`);
  else {
    const remote = JSON.parse(versionRes.text);
    const STUDIO_SHA = process.env.STUDIO_SHA || '';
    if (STUDIO_SHA && remote.studio_sha !== STUDIO_SHA) {
      fail(`live version.json sha ${remote.studio_sha} != STUDIO_SHA`);
    } else pass(`GET ${BASE}/version.json sha ${remote.studio_sha}`);
  }
  const asset = await get(`${BASE}/styles/tokens.css`);
  const cacheControl = asset.headers.get('cache-control') || '';
  if (asset.status !== 200) fail(`GET ${BASE}/styles/tokens.css -> ${asset.status}`);
  else if (!/immutable/.test(cacheControl)) {
    fail(`asset missing immutable caching: ${cacheControl}`);
  } else pass(`asset 200 with immutable caching (${cacheControl})`);
}

async function liveApiChecks(proxyBase) {
  // Part 1 — direct checks against the proxy file (no network, no backend).
  // Tier-1: GET allowlist returns backend JSON, POST -> 405, off-list -> 403,
  // missing BACKEND_URL -> 503. Backend fetch is stubbed; the stub records
  // calls so "never reaches the backend" is asserted, not assumed.
  const { pathToFileURL } = require('url');
  const proxyUrl = pathToFileURL(path.join(SITE, 'studio-api-proxy.js')).href;
  const worker = (await import(proxyUrl)).default;
  const BACKEND = 'https://backend.invalid';
  const T1 = { BACKEND_URL: BACKEND, STUDIO_API_TIER: 'tier1' };
  const realFetch = globalThis.fetch;
  let calls = [];
  const stubBackend = (payload = { state: 'live' }) => {
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
  };
  const req = (p, init) => new Request(`https://aftergraph.org${p}`, init);
  try {
    calls = [];
    stubBackend({ state: 'live' });
    let res = await worker.fetch(req('/studio/api/v1/state'), T1);
    let body = await res.json();
    if (res.status !== 200 || body.state !== 'live') {
      fail(`live-api direct: GET /studio/api/v1/state -> ${res.status} (want 200 backend JSON)`);
    } else if (calls.length !== 1 || calls[0].url !== `${BACKEND}/api/v1/state`) {
      fail(`live-api direct: GET forwarded to ${calls.map((c) => c.url)} (want ${BACKEND}/api/v1/state)`);
    } else pass('live-api direct: Tier-1 GET allowlist returns backend JSON');

    calls = [];
    stubBackend();
    res = await worker.fetch(req('/studio/api/v1/state', { method: 'POST', body: '{}' }), T1);
    if (res.status !== 405) fail(`live-api direct: POST -> ${res.status} (want 405)`);
    else if (calls.length !== 0) fail('live-api direct: POST reached the backend (want 405, never forwarded)');
    else pass('live-api direct: Tier-1 POST -> 405, never reaches backend');

    calls = [];
    stubBackend();
    res = await worker.fetch(req('/studio/api/v1/events'), T1);
    if (res.status !== 403) fail(`live-api direct: off-list -> ${res.status} (want 403)`);
    else if (calls.length !== 0) fail('live-api direct: off-list reached the backend (want 403, never forwarded)');
    else pass('live-api direct: Tier-1 off-list -> 403, never reaches backend');

    calls = [];
    stubBackend();
    res = await worker.fetch(req('/studio/api/v1/state'), { STUDIO_API_TIER: 'tier1' });
    if (res.status !== 503) fail(`live-api direct: no BACKEND_URL -> ${res.status} (want 503)`);
    else if (calls.length !== 0) fail('live-api direct: unconfigured request reached the backend (want 503, never forwarded)');
    else pass('live-api direct: no BACKEND_URL -> 503');
  } finally {
    globalThis.fetch = realFetch;
  }

  // Part 2 — documented live URLs (operator smoke after deploy + route-attach).
  const live = [
    ['GET', '/studio/api/v1/state', 200, 'backend JSON'],
    ['POST', '/studio/api/v1/state', 405, 'tier1_read_only'],
    ['GET', '/studio/api/v1/events', 403, 'tier1_not_allowlisted'],
  ];
  if (!proxyBase) {
    console.log('STUDIO-VERIFY-INFO: live-api live URLs (pass a base after deploy to smoke them):');
    for (const [method, p, want, note] of live) {
      console.log(`STUDIO-VERIFY-INFO:   ${method} <base>${p} -> ${want} (${note})`);
    }
    console.log('STUDIO-VERIFY-INFO: usage: node site/verify-studio.cjs live-api https://aftergraph.org');
    return;
  }
  const origin = proxyBase.replace(/\/$/, '');
  for (const [method, p, want] of live) {
    const res = await fetch(`${origin}${p}`, { method });
    await res.text();
    if (res.status !== want) fail(`live-api live: ${method} ${p} -> ${res.status} (want ${want})`);
    else pass(`live-api live: ${method} ${p} -> ${want}`);
  }
}

(async () => {
  const mode = process.argv[2] || 'build';
  if (mode === 'live-api') {
    const base = process.argv[3] || process.env.STUDIO_API_PROXY_BASE || '';
    await liveApiChecks(base);
  } else {
    buildChecks();
    if (mode === 'live') {
      const base = process.argv[3] || process.env.STUDIO_BASE || 'https://aftergraph.org';
      await liveSmoke(base);
    } else if (mode !== 'build') {
      fail(`unknown mode (want build|live|live-api): ${mode}`);
    }
  }
  if (failures) {
    console.error(`STUDIO-VERIFY-FAIL: ${failures} gate(s) failed`);
    process.exit(1);
  }
  console.log(`STUDIO-VERIFY-OK (${mode})`);
})().catch((error) => {
  console.error(`STUDIO-VERIFY-FAIL: ${error.message}`);
  process.exit(1);
});
