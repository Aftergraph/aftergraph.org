const fs = require('fs');
const path = require('path');

const SITE = __dirname;

function read(f) { return fs.readFileSync(path.join(SITE, f), 'utf8'); }

// --- sources ---
let landing = read('index.html');
let launch = read('launch.html');
const nf = read('404.html');
const monogram = read('monogram.svg');
const llms = read('llms.txt');
const sec = read('security.txt');

const FAVICON = `<link rel="icon" type="image/svg+xml" href="/favicon.ico">`;
const OG = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Aftergraph — Verifiable Intelligent Systems">
<meta property="og:description" content="Infrastructure and open research for verifiable intelligent systems: missions, authority, durable execution, evidence, verification and agentic institutions.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Aftergraph">
<meta name="twitter:description" content="Infrastructure and open research for verifiable intelligent systems.">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Aftergraph',
  url: 'https://aftergraph.org',
  description: 'Infrastructure and open research for verifiable intelligent systems: missions, authority, durable execution, evidence, verification and agentic institutions.',
  sameAs: ['https://github.com/Aftergraph']
})}</script>`;

const OG_LAUNCH = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Launcher — Aftergraph">
<meta property="og:description" content="System launcher and command palette for all Aftergraph destinations.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/launch">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">`;

// inject into <head> once (before </head>)
landing = landing.replace('</head>', FAVICON + OG + '\n</head>');
launch = launch.replace('</head>', FAVICON + OG_LAUNCH + '\n</head>');

// --- runtime ---
const health = JSON.stringify({ status: 'ok', deployed: new Date().toISOString(), route: 'aftergraph-site v1.1.0', sha: process.env.AG_SHA || 'local' });
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
</urlset>
`;
const headers = `const SECURE = {
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};`;
const worker = `${headers}
const LANDING = ${JSON.stringify(landing)};
const LAUNCH = ${JSON.stringify(launch)};
const NOTFOUND = ${JSON.stringify(nf)};
const MONOGRAM = ${JSON.stringify(monogram)};
const LLMS = ${JSON.stringify(llms)};
const SECURITY = ${JSON.stringify(sec)};
const HEALTH = ${JSON.stringify(health)};
const ROBOTS = ${JSON.stringify(robots)};
const SITEMAP = ${JSON.stringify(sitemap)};
addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const p = url.pathname;
  let body, ct = 'text/html;charset=utf-8', cache = 'public, max-age=300', status = 200;
  if (p === '/healthz' || p === '/health') { body = HEALTH; ct = 'application/json'; cache = 'public, max-age=60'; }
  else if (p === '/robots.txt') { body = ROBOTS; ct = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/sitemap.xml') { body = SITEMAP; ct = 'application/xml;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/llms.txt') { body = LLMS; ct = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/.well-known/security.txt') { body = SECURITY; ct = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/favicon.ico' || p === '/og-image.svg') { body = MONOGRAM; ct = 'image/svg+xml;charset=utf-8'; cache = 'public, max-age=86400'; }
  else if (p === '/launch' || p === '/launch/') { body = LAUNCH; }
  else if (p === '/404') { body = NOTFOUND; }
  else if (p === '/') { body = LANDING; }
  else { body = NOTFOUND; status = 404; cache = 'no-store'; }
  e.respondWith(new Response(body, { status, headers: { 'content-type': ct, 'cache-control': cache, ...SECURE } }));
});`;
fs.writeFileSync(path.join(SITE, 'worker.js'), worker);
fs.writeFileSync(path.join(SITE, 'wrangler.toml'), `name = "aftergraph-site"
main = "worker.js"
compatibility_date = "2024-11-01"
`);
console.log('worker.js bytes:', worker.length);
console.log('landing with meta bytes:', landing.length, '| launch:', launch.length);
console.log('favicon injected:', landing.includes('/favicon.ico'), '| JSON-LD:', landing.includes('application/ld+json'));
