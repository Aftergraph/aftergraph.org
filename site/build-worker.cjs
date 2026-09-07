const fs = require('fs');
const landing = fs.readFileSync('C:/Users/empir/ag-site/v3-landing.html', 'utf8');
const launch = fs.readFileSync('C:/Users/empir/ag-site/v2-launch.html', 'utf8');
const health = JSON.stringify({ status: 'ok', deployed: new Date().toISOString(), route: 'aftergraph-site v4 production', sha: process.env.AG_SHA || 'local' });
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
const HEALTH = ${JSON.stringify(health)};
const ROBOTS = ${JSON.stringify(robots)};
const SITEMAP = ${JSON.stringify(sitemap)};
addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  let body, ct = 'text/html;charset=utf-8', cache = 'public, max-age=300';
  const p = url.pathname;
  if (p === '/healthz' || p === '/health') { body = HEALTH; ct = 'application/json'; cache = 'public, max-age=60'; }
  else if (p === '/robots.txt') { body = ROBOTS; ct = 'text/plain;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/sitemap.xml') { body = SITEMAP; ct = 'application/xml;charset=utf-8'; cache = 'public, max-age=3600'; }
  else if (p === '/launch' || p === '/launch/') { body = LAUNCH; }
  else { body = LANDING; }
  e.respondWith(new Response(body, { headers: { 'content-type': ct, 'cache-control': cache, ...SECURE } }));
});`;
fs.writeFileSync('C:/Users/empir/ag-site/worker/worker.js', worker);
fs.writeFileSync('C:/Users/empir/ag-site/worker/wrangler.toml', `name = "aftergraph-site"
main = "worker.js"
compatibility_date = "2024-11-01"
`);
console.log('worker.js bytes:', worker.length);
console.log('landing bytes:', landing.length, 'launch bytes:', launch.length);
