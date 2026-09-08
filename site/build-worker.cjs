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
const notFound = read('404.html');
const statusPage = read('status.html');
let sentinel = read('sentinel.html');
const monogram = read('monogram.svg');
const llms = read('llms.txt');
const security = read('security.txt');

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
assert(statusPage.includes('wie.aftergraph.org/api/healthz'), 'status must use canonical Wie production health endpoint');
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

const OG_LAUNCH = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Launcher — Aftergraph">
<meta property="og:description" content="System launcher for public Aftergraph destinations.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/launch">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">`;

landing = landing.replace('</head>', `${FAVICON}${OG}\n</head>`);
launch = launch.replace('</head>', `${FAVICON}${OG_LAUNCH}\n</head>`);
sentinel = sentinel.replace('</head>', `${FAVICON}${OG_SENTINEL}\n</head>`);

let statusBuilt = statusPage.replaceAll('__AG_SHA__', process.env.AG_SHA || 'local').replaceAll('__AG_DEPLOYED__', process.env.AG_DEPLOYED || 'build-time');

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
  <url><loc>https://aftergraph.org/sentinel</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
</urlset>
`;

const secureHeaders = `const SECURE = {
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};`;

const worker = `${secureHeaders}
const LANDING = ${JSON.stringify(landing)};
const LAUNCH = ${JSON.stringify(launch)};
const NOTFOUND = ${JSON.stringify(notFound)};
const MONOGRAM = ${JSON.stringify(monogram)};
const LLMS = ${JSON.stringify(llms)};
const SECURITY = ${JSON.stringify(security)};
const STATUS = ${JSON.stringify(statusBuilt)};
const SENTINEL = ${JSON.stringify(sentinel)};
const HEALTH = ${JSON.stringify(health)};
const ROBOTS = ${JSON.stringify(robots)};
const SITEMAP = ${JSON.stringify(sitemap)};
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const p = url.pathname;
  let body;
  let contentType = 'text/html;charset=utf-8';
  let cache = 'public, max-age=300';
  let responseStatus = 200;
  if (p === '/healthz' || p === '/health') { body = HEALTH; contentType = 'application/json'; cache = 'public, max-age=60'; }
  else if (p === '/robots.txt') { body = ROBOTS; contentType = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/sitemap.xml') { body = SITEMAP; contentType = 'application/xml;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/llms.txt') { body = LLMS; contentType = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/.well-known/security.txt') { body = SECURITY; contentType = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/favicon.ico' || p === '/og-image.svg') { body = MONOGRAM; contentType = 'image/svg+xml;charset=utf-8'; cache = 'public, max-age=86400'; }
  else if (p === '/launch' || p === '/launch/') { body = LAUNCH; }
  else if (p === '/status' || p === '/status/') { body = STATUS; }
  else if (p === '/sentinel' || p === '/sentinel/') { body = SENTINEL; }
  else if (p === '/404') { body = NOTFOUND; }
  else if (p === '/') { body = LANDING; }
  else { body = NOTFOUND; responseStatus = 404; cache = 'no-store'; }
  event.respondWith(new Response(body, {
    status: responseStatus,
    headers: { 'content-type': contentType, 'cache-control': cache, ...SECURE }
  }));
});`;

fs.writeFileSync(path.join(SITE, 'worker.js'), worker);
// Wrangler executes this build command from the site/ directory before every
// deployment. That makes source HTML/text canonical and prevents a stale
// tracked worker from being uploaded.
fs.writeFileSync(path.join(SITE, 'wrangler.toml'), `name = "aftergraph-site"
main = "worker.js"
compatibility_date = "2024-11-01"

[build]
command = "node build-worker.cjs"
`);

console.log('worker.js bytes:', worker.length);
console.log('landing with meta bytes:', landing.length, '| launch:', launch.length);
console.log('topology gates: PASS');
console.log('favicon injected:', landing.includes('/favicon.ico'), '| JSON-LD:', landing.includes('application/ld+json'));
