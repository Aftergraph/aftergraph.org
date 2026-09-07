import landingSource from './index.html';
import launchSource from './launch.html';
import notFoundSource from './404.html';
import statusSource from './status.html';
import faviconSvg from './favicon.svg';
import ogImage from './og-image.svg';
import maskableIcon from './maskable-icon.svg';
import pinnedTab from './safari-pinned-tab.svg';
import manifestJson from './site.webmanifest';
import touchIcon from './apple-touch-icon.png';
import icon192 from './icon-192.png';
import icon512 from './icon-512.png';
import favicon32 from './favicon-32x32.png';
import favicon16 from './favicon-16x16.png';
import llms from './llms.txt';
import security from './security.txt';

const SECURE = {
  'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
};

const FAVICON = `<link rel="icon" type="image/svg+xml" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#42C7E8">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#080C14">`;
const OG = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Aftergraph — Verifiable Intelligent Systems">
<meta property="og:description" content="Governed, durable and verifiable intelligent work: missions, authority, runtime enforcement, execution, evidence and independent verification.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Aftergraph — infrastructure for governed autonomous intelligence">
<meta name="twitter:card" content="summary_large_image">
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

const OG_LAUNCH = `
<meta property="og:site_name" content="Aftergraph">
<meta property="og:title" content="Launcher — Aftergraph">
<meta property="og:description" content="System launcher for public Aftergraph destinations.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://aftergraph.org/launch">
<meta property="og:image" content="https://aftergraph.org/og-image.svg">`;

const LANDING = landingSource.replace('</head>', `${FAVICON}${OG}\n</head>`);
const LAUNCH = launchSource.replace('</head>', `${FAVICON}${OG_LAUNCH}\n</head>`);

const ROBOTS = `User-agent: *
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

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://aftergraph.org/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://aftergraph.org/launch</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://aftergraph.org/status</loc><changefreq>daily</changefreq><priority>0.7</priority></url>
</urlset>
`;

function response(body, contentType, cache = 'public, max-age=300', status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': cache,
      ...SECURE
    }
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/healthz' || pathname === '/health') {
      return response(JSON.stringify({
        status: 'ok',
        route: 'aftergraph-site v1.3.0',
        sha: env?.AG_SHA || 'not-exposed'
      }), 'application/json', 'public, max-age=60');
    }
    if (pathname === '/robots.txt') return response(ROBOTS, 'text/plain;charset=utf-8', 'public, max-age=3600');
    if (pathname === '/sitemap.xml') return response(SITEMAP, 'application/xml;charset=utf-8', 'public, max-age=3600');
    if (pathname === '/llms.txt') return response(llms, 'text/plain;charset=utf-8', 'public, max-age=3600');
    if (pathname === '/.well-known/security.txt') return response(security, 'text/plain;charset=utf-8', 'public, max-age=3600');
    if (pathname === '/favicon.ico' || pathname === '/favicon.svg') return response(faviconSvg, 'image/svg+xml;charset=utf-8', 'public, max-age=86400');
    if (pathname === '/og-image.svg') return response(ogImage, 'image/svg+xml;charset=utf-8', 'public, max-age=86400');
    if (pathname === '/maskable-icon.svg') return response(maskableIcon, 'image/svg+xml;charset=utf-8', 'public, max-age=86400');
    if (pathname === '/safari-pinned-tab.svg') return response(pinnedTab, 'image/svg+xml;charset=utf-8', 'public, max-age=86400');
    if (pathname === '/site.webmanifest') return response(manifestJson, 'application/manifest+json;charset=utf-8', 'public, max-age=3600');
    if (pathname === '/apple-touch-icon.png') return response(touchIcon, 'image/png', 'public, max-age=86400');
    if (pathname === '/icon-192.png') return response(icon192, 'image/png', 'public, max-age=86400');
    if (pathname === '/icon-512.png') return response(icon512, 'image/png', 'public, max-age=86400');
    if (pathname === '/favicon-32x32.png') return response(favicon32, 'image/png', 'public, max-age=86400');
    if (pathname === '/favicon-16x16.png') return response(favicon16, 'image/png', 'public, max-age=86400');
    if (pathname === '/launch' || pathname === '/launch/') return response(LAUNCH, 'text/html;charset=utf-8');
    if (pathname === '/status' || pathname === '/status/') return response(statusSource, 'text/html;charset=utf-8');
    if (pathname === '/404') return response(notFoundSource, 'text/html;charset=utf-8');
    if (pathname === '/') return response(LANDING, 'text/html;charset=utf-8');
    return response(notFoundSource, 'text/html;charset=utf-8', 'no-store', 404);
  }
};
