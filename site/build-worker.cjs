const fs = require('fs');
const path = require('path');

const SITE = __dirname;
const read = (file) => fs.readFileSync(path.join(SITE, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`BUILD-FAIL: ${message}`);
    process.exit(1);
  }
};

// Source files are canonical. worker.js is generated deployment output.
let landing = read('index.html');
let launch = read('launch.html');
const launcherApp = read('launcher-app.js');
const launcherRegistryRaw = read('launcher-registry.json');
let launcherRegistry;
try { launcherRegistry = JSON.parse(launcherRegistryRaw); } catch { assert(false, 'launcher-registry.json is not valid JSON'); }
assert(launcherRegistry.schema === 'aftergraph-launcher-registry/1.0', 'launcher registry schema must be aftergraph-launcher-registry/1.0');
const notFound = read('404.html');
const statusPage = read('status.html');
let sentinel = read('sentinel.html');
let community = read('community.html');
// Canonical Brand OS bytes (run node scripts/sync-brand.mjs first; .brand/ is gitignored build input).
const assertBrand = (f) => { assert(fs.existsSync(path.join(SITE, '.brand', f)), `brand sync missing: run node scripts/sync-brand.mjs (.brand/${f})`); };
assertBrand('favicon.svg');
assertBrand('og-image.svg');
const favicon = read('.brand/favicon.svg');
const ogImage = read('.brand/og-image.svg');
const MANIFEST = read('manifest.webmanifest');
const SWJS = read('sw.js');
const ICON_FILES = {};
for (const f of ['icon-180.png', 'icon-192.png', 'icon-512.png']) {
  const p = path.join(SITE, 'icons', f);
  assert(fs.existsSync(p), 'pwa icon missing: site/icons/' + f);
  ICON_FILES[`/icons/${f}`] = fs.readFileSync(p).toString('base64');
}
const llms = read('llms.txt');
const security = read('security.txt');
const experienceHero = read('experience-hero.js');

// ---- Atlas (/atlas): vite-built observatory, inlined as static routes ----
// Built by `npm --prefix ../atlas run build` into site/atlas/ BEFORE this script
// (vite wipes stale hashed bundles; projection.json is source data, copied in here).
// Fails closed when the build is absent or references non-existent hashed assets.
fs.copyFileSync(path.join(SITE, 'atlas-projection.json'), path.join(SITE, 'atlas', 'projection.json'));
const ATLAS_DIR = path.join(SITE, 'atlas');
const ATLAS_ASSETS_DIR = path.join(ATLAS_DIR, 'assets');
assert(fs.existsSync(path.join(ATLAS_DIR, 'index.html')), 'atlas build missing: run `npm --prefix ../atlas run build` first');
let atlasHtml = fs.readFileSync(path.join(ATLAS_DIR, 'index.html'), 'utf8');
const ATLAS_FILES = {};
for (const f of fs.readdirSync(ATLAS_ASSETS_DIR).sort()) {
  const buf = fs.readFileSync(path.join(ATLAS_ASSETS_DIR, f));
  const ext = path.extname(f).toLowerCase();
  const ct =
    ext === '.js' ? 'text/javascript;charset=utf-8' :
    ext === '.css' ? 'text/css;charset=utf-8' :
    ext === '.svg' ? 'image/svg+xml;charset=utf-8' :
    'application/octet-stream';
  ATLAS_FILES[`/atlas/assets/${f}`] = { body: buf.toString('utf8'), ct };
}
// Versioned snapshot history: committed source lives in site/atlas-snapshots/,
// copied into the served tree (vite wipes site/atlas/ on every build).
const ATLAS_SNAPS_SRC = path.join(SITE, 'atlas-snapshots');
const ATLAS_SNAPS_DIR = path.join(ATLAS_DIR, 'snapshots');
fs.mkdirSync(ATLAS_SNAPS_DIR, { recursive: true });
if (fs.existsSync(ATLAS_SNAPS_SRC)) {
  for (const f of fs.readdirSync(ATLAS_SNAPS_SRC).sort()) {
    if (!f.endsWith('.json')) continue;
    fs.copyFileSync(path.join(ATLAS_SNAPS_SRC, f), path.join(ATLAS_SNAPS_DIR, f));
    ATLAS_FILES[`/atlas/snapshots/${f}`] = {
      body: fs.readFileSync(path.join(ATLAS_SNAPS_DIR, f), 'utf8'),
      ct: 'application/json;charset=utf-8',
    };
  }
}
const ATLAS_PROJECTION_RAW = fs.readFileSync(path.join(ATLAS_DIR, 'projection.json'), 'utf8');
const ATLAS_EXPERIENCE_RAW = read('atlas-experience.json');
let atlasProjectionParsed;
let atlasExperienceParsed;
try {
  atlasProjectionParsed = JSON.parse(ATLAS_PROJECTION_RAW);
} catch {
  assert(false, 'site/atlas/projection.json is not valid JSON');
}
assert(atlasProjectionParsed.schema === 'atlas-projection/0.2', 'atlas projection must be atlas-projection/0.2');
try {
  atlasExperienceParsed = JSON.parse(ATLAS_EXPERIENCE_RAW);
} catch {
  assert(false, 'site/atlas-experience.json is not valid JSON');
}
assert(atlasExperienceParsed.schema === 'aftergraph-experience/0.1', 'atlas experience must be aftergraph-experience/0.1');
assert(atlasExperienceParsed.cut === atlasProjectionParsed.meta.evidence_cut, 'atlas experience cut must match atlas projection cut');
for (const ref of [...atlasHtml.matchAll(/(?:src|href)="(\/atlas\/assets\/[^"]+)"/g)].map((m) => m[1])) {
  assert(ATLAS_FILES[ref], `atlas index.html references missing bundled asset ${ref}`);
}
assert(!/src="https?:\/\//.test(atlasHtml), 'atlas must not load runtime CDN scripts (bundled deps only)');
assert(!/href="https?:\/\/[^"]*\.(js|css)"/.test(atlasHtml), 'atlas must not load runtime CDN styles/scripts');
const OG_ATLAS = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Atlas — Development Observatory">
<meta property="og:description" content="Read-only evidence-aware digital twin of Aftergraph development. Every claim carries provenance.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/atlas">`;
atlasHtml = atlasHtml.replace('</head>', `<link rel="icon" type="image/svg+xml" href="/favicon.ico">${OG_ATLAS}\n</head>`);

// Public topology is a Governance projection. These gates fail closed when a
// source surface drifts from the current canonical/public boundary.
assert(landing.includes('21 canonical repositories'), 'landing must declare the canonical 21-repository topology');
assert(landing.includes('12 public') && landing.includes('9 private'), 'landing visibility totals must be reconciled');
assert(statusPage.includes('21 canonical') && statusPage.includes('12 public') && statusPage.includes('9 private'), 'status topology totals must be reconciled');
assert(llms.includes('Canonical platform topology: 21 repositories'), 'llms.txt must carry canonical topology total');
assert(llms.includes('Public repositories: 12') && llms.includes('Private repositories: 9'), 'llms.txt visibility totals must be reconciled');
const llmsPublic = llms.split('### Public')[1]?.split('### Private')[0] || '';
assert(llmsPublic.includes('- `wi-backend`'), 'public repository list must use canonical wi-backend slug');
assert(llmsPublic.includes('- `sentinel`'), 'public repository list must include Sentinel');
assert(!llmsPublic.includes('- `runtime`'), 'private Runtime repository must not appear in the public-repository list');
assert(!llms.includes('work-intelligence-v2'), 'legacy Work Intelligence repository slug must not appear in llms.txt');
assert(!llms.includes('13 canonical cross-repo contracts'), 'volatile contract counts must not be hardcoded in llms.txt');
assert(!llms.includes('- `context-continuity`') && !llms.includes('- `skills-vault`'), 'private repositories must not appear in the public-repository list');
assert(!landing.includes('https://github.com/Aftergraph/context-continuity'), 'public landing must not link directly to private Continuity source');
assert(!landing.includes('https://github.com/Aftergraph/runtime'), 'public landing must not link directly to private Runtime source');
assert(statusPage.includes('Not publicly routed'), 'status must label the Wie web surface honestly (no public route yet)');
assert(!statusPage.includes('work-intelligence-v2'), 'status must not use legacy Work Intelligence repository slug');
assert(statusPage.includes('__AG_SHA__') && statusPage.includes('__AG_DEPLOYED__'), 'status must carry build-provenance placeholders');

const FAVICON = '<link rel="icon" type="image/svg+xml" href="/favicon.ico">';
const OG = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Aftergraph — Verifiable Intelligent Systems">
<meta property="og:description" content="Governed, durable and verifiable intelligent work: missions, authority, runtime enforcement, execution, evidence and independent verification.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Aftergraph">
<meta name="twitter:description" content="Governed, durable and verifiable intelligent work.">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Aftergraph',
  url: 'https://aftergraph.org',
  description: 'Infrastructure and open research for governed, durable and verifiable intelligent work.',
  sameAs: ['https://github.com/Aftergraph']
})}</script>`;

const OG_SENTINEL = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Sentinel — Verified Code Review">
<meta property="og:description" content="PRs into merge-ready verdicts on the exact commit.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/sentinel">`;

const OG_COMMUNITY = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Community — Aftergraph">
<meta property="og:description" content="Public deliberation, research reproduction, roadmap input and RFC intake for Aftergraph.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/community">`;

const OG_LAUNCH = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Launcher — Aftergraph">
<meta property="og:description" content="System launcher for public Aftergraph destinations.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/launch">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">`;

landing = landing.replace('</head>', `${FAVICON}${OG}\n</head>`);
landing = landing.replace('</body>', `<script>${experienceHero}</script>\n</body>`);
launch = launch.replace('</head>', `${FAVICON}${OG_LAUNCH}\n</head>`);
sentinel = sentinel.replace('</head>', `${FAVICON}${OG_SENTINEL}\n</head>`);
community = community.replace('</head>', `${FAVICON}${OG_COMMUNITY}\n</head>`);

let statusBuilt = statusPage.replaceAll('__AG_SHA__', process.env.AG_SHA || 'local').replaceAll('__AG_DEPLOYED__', process.env.AG_DEPLOYED || 'build-time');

const launcherTelemetryIds = [...launcherRegistry.entities, ...launcherRegistry.actions].map((item) => item.id);

const health = JSON.stringify({
  status: 'ok',
  // Deterministic per tree: wall-clock output here would make every rebuild
  // differ, defeating the generated-bundle-current gate.
  deployed: process.env.AG_DEPLOYED || 'build-time',
  route: 'aftergraph-site v1.2.0',
  sha: process.env.AG_SHA || 'local'
});

const robots = `User-agent: *
Allow: /
Disallow: /healthz

# Aftergraph allows responsible AI training crawlers that honor robots.txt.
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: https://aftergraph.org/sitemap.xml
`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://aftergraph.org/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://aftergraph.org/launch</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://aftergraph.org/status</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
  <url><loc>https://aftergraph.org/community</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://aftergraph.org/sentinel</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://aftergraph.org/atlas</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
  <url><loc>https://aftergraph.org/studio/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
</urlset>
`;

const secureHeaders = `const SECURE = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};`;

const worker = `${secureHeaders}
const LANDING = ${JSON.stringify(landing)};
const LAUNCH = ${JSON.stringify(launch)};
const LAUNCH_APP = ${JSON.stringify(launcherApp)};
const LAUNCHER_REGISTRY = ${JSON.stringify(launcherRegistryRaw)};
const LAUNCHER_ALLOWED_IDS = new Set(${JSON.stringify(launcherTelemetryIds)});
const NOTFOUND = ${JSON.stringify(notFound)};
const FAVICON = ${JSON.stringify(favicon)};
const OGIMAGE = ${JSON.stringify(ogImage)};
const LLMS = ${JSON.stringify(llms)};
const SECURITY = ${JSON.stringify(security)};
const STATUS = ${JSON.stringify(statusBuilt)};
const SENTINEL = ${JSON.stringify(sentinel)};
const COMMUNITY = ${JSON.stringify(community)};
const ATLAS_HTML = ${JSON.stringify(atlasHtml)};
const ATLAS_PROJECTION = ${JSON.stringify(ATLAS_PROJECTION_RAW)};
const ATLAS_EXPERIENCE = ${JSON.stringify(ATLAS_EXPERIENCE_RAW)};
const ATLAS_FILES = ${JSON.stringify(ATLAS_FILES)};
const MANIFEST = ${JSON.stringify(MANIFEST)};
const SWJS = ${JSON.stringify(SWJS)};
const ICON_FILES = ${JSON.stringify(ICON_FILES)};
const HEALTH = ${JSON.stringify(health)};
const ROBOTS = ${JSON.stringify(robots)};
const SITEMAP = ${JSON.stringify(sitemap)};
const TELEMETRY_EVENTS = new Set(['registry_loaded','registry_failure','zero_result','item_open','destination_probe']);
const TELEMETRY_FIELDS = new Set(['event','item_id','item_kind','intent','status','latency_bucket','result_bucket']);
const TELEMETRY_KINDS = new Set(['entity','navigate','evidence','utility']);
const TELEMETRY_INTENTS = new Set(['find','action','evidence','verify']);
const TELEMETRY_STATUS = new Set(['ok','fail']);
const TELEMETRY_LATENCY = new Set(['lt100','100-299','300-999','gte1000']);
const TELEMETRY_RESULTS = new Set(['0','1-5','6-20','gt20']);
async function handleLauncherTelemetry(request, env) {
  if (request.method !== 'POST') return new Response('', { status: 405, headers: { 'cache-control': 'no-store', ...SECURE } });
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin && origin !== requestUrl.origin) return new Response('', { status: 403, headers: { 'cache-control': 'no-store', ...SECURE } });
  const text = await request.text();
  if (!text || text.length > 1024) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  let payload;
  try { payload = JSON.parse(text); } catch { return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } }); }
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (Object.keys(payload).some((key) => !TELEMETRY_FIELDS.has(key))) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (!TELEMETRY_EVENTS.has(payload.event)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (payload.item_id != null && !LAUNCHER_ALLOWED_IDS.has(payload.item_id)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (payload.item_kind != null && !TELEMETRY_KINDS.has(payload.item_kind)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (payload.intent != null && !TELEMETRY_INTENTS.has(payload.intent)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (payload.status != null && !TELEMETRY_STATUS.has(payload.status)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (payload.latency_bucket != null && !TELEMETRY_LATENCY.has(payload.latency_bucket)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (payload.result_bucket != null && !TELEMETRY_RESULTS.has(payload.result_bucket)) return new Response('', { status: 400, headers: { 'cache-control': 'no-store', ...SECURE } });
  if (!env.AG_STATS) return new Response('', { status: 503, headers: { 'cache-control': 'no-store', ...SECURE } });
  const day = new Date().toISOString().slice(0, 10);
  const dimensions = [payload.event,payload.item_id||'-',payload.item_kind||'-',payload.intent||'-',payload.status||'-',payload.latency_bucket||'-',payload.result_bucket||'-'].join(':');
  const key = 'launcher:v1:' + day + ':' + dimensions;
  try {
    const current = Number(await env.AG_STATS.get(key) || '0');
    await env.AG_STATS.put(key, String(Number.isFinite(current) ? current + 1 : 1), { expirationTtl: 7776000 });
    return new Response('', { status: 202, headers: { 'cache-control': 'no-store', ...SECURE } });
  } catch {
    return new Response('', { status: 503, headers: { 'cache-control': 'no-store', ...SECURE } });
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === '/api/launcher/telemetry') { return handleLauncherTelemetry(request, env); }
    // --- Atlas V3 API (D1 + R2 backed) ---
    if (p.startsWith('/api/v3/')) {
      const db = env.ATLAS_V3_DB || null;
      const r2 = env.ATLAS_V3_ARTIFACTS || null;
      const method = request.method;
      const headers = { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' };
      try {
        if (p === '/api/v3/cuts' && method === 'GET') {
          if (!db) return new Response(JSON.stringify({ error: 'D1 not bound' }), { status: 503, headers });
          const rows = await db.prepare('SELECT id, label, published_at, integrity_hash FROM cuts ORDER BY published_at DESC LIMIT 50').all();
          return new Response(JSON.stringify({ cuts: rows.results || [] }), { status: 200, headers });
        }
        if (p === '/api/v3/envelopes' && method === 'GET') {
          if (!db) return new Response(JSON.stringify({ error: 'D1 not bound' }), { status: 503, headers });
          const cutId = url.searchParams.get('cut_id');
          if (!cutId) return new Response(JSON.stringify({ error: 'cut_id required' }), { status: 400, headers });
          const rows = await db.prepare('SELECT id, claim_key, truth_plane, observed_at, freshness FROM envelopes WHERE cut_id = ? ORDER BY observed_at DESC').bind(cutId).all();
          return new Response(JSON.stringify({ envelopes: rows.results || [] }), { status: 200, headers });
        }
        if (p === '/api/v3/conflicts' && method === 'GET') {
          if (!db) return new Response(JSON.stringify({ error: 'D1 not bound' }), { status: 503, headers });
          const rows = await db.prepare("SELECT id, claim_key, planes, first_seen FROM conflicts WHERE status = 'open' ORDER BY first_seen DESC").all();
          return new Response(JSON.stringify({ conflicts: rows.results || [] }), { status: 200, headers });
        }
        if (p === '/api/v3/artifacts' && method === 'POST') {
          if (!r2) return new Response(JSON.stringify({ error: 'R2 not bound' }), { status: 503, headers });
          const body = await request.arrayBuffer();
          const key = 'atlas-v3/' + Date.now() + '-' + crypto.randomUUID();
          await r2.put(key, body, { httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' } });
          return new Response(JSON.stringify({ key, size: body.byteLength }), { status: 201, headers });
        }
        if (p === '/api/v3/health' && method === 'GET') {
          return new Response(JSON.stringify({ d1: !!db, r2: !!r2, ts: new Date().toISOString() }), { status: 200, headers });
        }
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message || 'internal error' }), { status: 500, headers });
      }
    }
    let body;
    let contentType = 'text/html;charset=utf-8';
    let cache = 'public, max-age=300';
    let responseStatus = 200;
    if (p === '/healthz' || p === '/health') { body = HEALTH; contentType = 'application/json'; cache = 'public, max-age=60'; }
    else if (p === '/robots.txt') { body = ROBOTS; contentType = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
    else if (p === '/sitemap.xml') { body = SITEMAP; contentType = 'application/xml;charset=utf-8'; cache = 'public, max-age=3600'; }
    else if (p === '/llms.txt') { body = LLMS; contentType = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
    else if (p === '/.well-known/security.txt') { body = SECURITY; contentType = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
    else if (p === '/favicon.ico') { body = FAVICON; contentType = 'image/svg+xml;charset=utf-8'; cache = 'public, max-age=86400'; }
    else if (p === '/og-image.svg') { body = OGIMAGE; contentType = 'image/svg+xml;charset=utf-8'; cache = 'public, max-age=86400'; }
    else if (p === '/manifest.webmanifest') { body = MANIFEST; contentType = 'application/manifest+json'; cache = 'public, max-age=3600'; }
    else if (p === '/sw.js') { body = SWJS; contentType = 'text/javascript;charset=utf-8'; cache = 'no-store'; }
    else if (ICON_FILES[p]) { body = Uint8Array.from(atob(ICON_FILES[p]), c => c.charCodeAt(0)); contentType = 'image/png'; cache = 'public, max-age=86400'; }
    else if (p === '/launcher-app.js') { body = LAUNCH_APP; contentType = 'text/javascript;charset=utf-8'; cache = 'public, max-age=300'; }
    else if (p === '/launcher-registry.json') { body = LAUNCHER_REGISTRY; contentType = 'application/json;charset=utf-8'; cache = 'public, max-age=300'; }
    else if (p === '/launch' || p === '/launch/') { body = LAUNCH; }
    else if (p === '/status' || p === '/status/') { body = STATUS; }
    else if (p === '/sentinel' || p === '/sentinel/') { body = SENTINEL; }
    else if (p === '/community' || p === '/community/') { body = COMMUNITY; }
    else if (p === '/atlas' || p === '/atlas/') { body = ATLAS_HTML; cache = 'public, max-age=300'; }
    else if (p === '/atlas/projection.json') { body = ATLAS_PROJECTION; contentType = 'application/json;charset=utf-8'; cache = 'public, max-age=300'; }
    else if (p === '/atlas/experience.json') { body = ATLAS_EXPERIENCE; contentType = 'application/json;charset=utf-8'; cache = 'public, max-age=300'; }
    else if (ATLAS_FILES[p]) { body = ATLAS_FILES[p].body; contentType = ATLAS_FILES[p].ct; cache = 'public, max-age=31536000, immutable'; }
    else if (p === '/404') { body = NOTFOUND; }
    else if (p === '/') { body = LANDING; }
    else { body = NOTFOUND; responseStatus = 404; cache = 'no-store'; }
    return new Response(request.method === 'HEAD' ? null : body, {
      status: responseStatus,
      headers: { 'content-type': contentType, 'cache-control': cache, ...SECURE }
    });
  }
};`;

fs.writeFileSync(path.join(SITE, 'worker.js'), worker);
// Wrangler executes this build command from the site/ directory before every
// deployment. That makes source HTML/text canonical and prevents a stale
// tracked worker from being uploaded.
fs.writeFileSync(path.join(SITE, 'wrangler.toml'), `name = "aftergraph-site"
main = "worker.js"
compatibility_date = "2024-11-01"
account_id = "1cd2e6c70a2918567a3edcf8eadd7458"

[[kv_namespaces]]
binding = "AG_STATS"
id = "7b0696a1cd1b4656b9325589a3b6199c"

[[d1_databases]]
binding = "ATLAS_V3_DB"
database_name = "atlas-v3-db"
database_id = "cf0fb58e-2501-4d17-9471-6c3b0180dca6"

[[r2_buckets]]
binding = "ATLAS_V3_ARTIFACTS"
bucket_name = "atlas-v3-artifacts"

[build]
command = "node build-worker.cjs"
`);

console.log('worker.js bytes:', worker.length);
console.log('atlas: html', atlasHtml.length, '| projection', ATLAS_PROJECTION_RAW.length, '| experience', ATLAS_EXPERIENCE_RAW.length, '| assets', Object.keys(ATLAS_FILES).join(','));
console.log('landing with meta bytes:', landing.length, '| launch:', launch.length);
console.log('topology gates: PASS');
console.log('favicon injected:', landing.includes('/favicon.ico'), '| JSON-LD:', landing.includes('application/ld+json'));
