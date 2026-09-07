'use strict';
// Build transform: Studio checkout -> site/studio-dist (Tier-0 static demo).
// Spec: workspace/aftergraph.org/docs/STUDIO-LIVE-SPEC.md ("Build transform").
// Studio source is never modified; this script only reads it (fail closed).
//
//   STUDIO_SHA=<pinned-sha> STUDIO_DIR=<studio-checkout> node site/studio-build.cjs
//
// Emits: studio-dist/{index.html,manifest.webmanifest,sw.js,styles/,src/,
// packages/{ui,icons,tokens,brand,motion,runtime-ui,spatial,presence,
// interaction,visualization,composer}/,version.json,_headers}.

const fs = require('fs');
const path = require('path');

const SITE = __dirname;
const DIST = path.join(SITE, 'studio-dist');
const STUDIO_SHA = process.env.STUDIO_SHA || '';
const STUDIO_DIR = process.env.STUDIO_DIR
  || path.resolve(SITE, '..', '..', 'studio');
const BASE = '/studio';
const BUDGET_BYTES = 5 * 1024 * 1024;

const fail = (message) => {
  console.error(`STUDIO-BUILD-FAIL: ${message}`);
  process.exit(1);
};

if (!STUDIO_SHA) fail('STUDIO_SHA env is required (pinned Studio commit)');
if (!fs.existsSync(STUDIO_DIR)) fail(`STUDIO_DIR missing: ${STUDIO_DIR}`);
if (!fs.existsSync(path.join(STUDIO_DIR, 'index.html'))) {
  fail(`STUDIO_DIR is not a Studio checkout (no index.html): ${STUDIO_DIR}`);
}
// Warn-only when the checkout HEAD differs from the pinned SHA: the build
// records whatever STUDIO_SHA it is told (verify asserts version.json ==
// STUDIO_SHA); a mismatch usually means a stale checkout, not a bad pin.
try {
  const head = require('child_process')
    .execSync('git rev-parse HEAD', { cwd: STUDIO_DIR })
    .toString().trim();
  if (/^[0-9a-f]{40}$/.test(STUDIO_SHA) && /^[0-9a-f]{40}$/.test(head) && head !== STUDIO_SHA) {
    console.error(`STUDIO-BUILD-WARN: checkout HEAD ${head} != STUDIO_SHA ${STUDIO_SHA}`);
  }
} catch { /* non-git export: pin recorded as-is */ }

const ALLOW_FILES = ['index.html', 'manifest.webmanifest', 'sw.js'];
const ALLOW_DIRS = ['styles', 'src'];
const ALLOW_PKGS = ['ui', 'icons', 'tokens', 'brand', 'motion', 'runtime-ui',
  'spatial', 'presence', 'interaction', 'visualization', 'composer'];

const copyFile = (src, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};
const copyTree = (srcDir, destDir) => {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else if (entry.isFile()) copyFile(s, d);
  }
};

// 1. Allowlist copy.
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const file of ALLOW_FILES) {
  const src = path.join(STUDIO_DIR, file);
  if (!fs.existsSync(src)) fail(`allowlisted Studio file missing: ${file}`);
  copyFile(src, path.join(DIST, file));
}
for (const dir of ALLOW_DIRS) {
  const src = path.join(STUDIO_DIR, dir);
  if (!fs.existsSync(src)) fail(`allowlisted Studio dir missing: ${dir}/`);
  copyTree(src, path.join(DIST, dir));
}
for (const pkg of ALLOW_PKGS) {
  const src = path.join(STUDIO_DIR, 'packages', pkg);
  if (!fs.existsSync(src)) fail(`allowlisted Studio package missing: packages/${pkg}/`);
  copyTree(src, path.join(DIST, 'packages', pkg));
}

// 2. Absolute-path rewrite: href="/…" / src="/…" -> /studio/… .
// Only attribute refs are rewritten, so in-code "/api/" strings stay local.
const rewriteAttrRefs = (text) => text
  .replace(/(href=")\/(?!\/)/g, `$1${BASE}/`)
  .replace(/(src=")\/(?!\/)/g, `$1${BASE}/`);

const TEXT_EXT = new Set(['.html', '.mjs', '.js', '.css', '.json', '.webmanifest', '.svg', '.map']);
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};
for (const file of walk(DIST)) {
  if (!TEXT_EXT.has(path.extname(file))) continue;
  if (path.basename(file) === 'sw.js') continue; // handled below (SHELL-scoped)
  const before = fs.readFileSync(file, 'utf8');
  const after = rewriteAttrRefs(before);
  if (after !== before) fs.writeFileSync(file, after);
}

// Manifest scope/start_url under /studio/ (covers values the attr rewrite misses).
{
  const manifestPath = path.join(DIST, 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const underBase = (p) => (typeof p === 'string' && p.startsWith('/') && p !== BASE && !p.startsWith(`${BASE}/`))
    ? (p === '/' ? `${BASE}/` : `${BASE}${p}`) : p;
  manifest.scope = underBase(manifest.scope);
  manifest.start_url = underBase(manifest.start_url);
  if (Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      if (typeof icon.src === 'string') icon.src = underBase(icon.src);
    }
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

// 3. Service worker: rewrite the SHELL list + navigate fallback to /studio/…,
// then stamp the CACHE name with the build version (cache-bust per release).
{
  const swPath = path.join(DIST, 'sw.js');
  let sw = fs.readFileSync(swPath, 'utf8');
  const shellMatch = sw.match(/const SHELL = \[[\s\S]*?\];/);
  if (!shellMatch) fail('sw.js has no SHELL list to rewrite');
  const rewrittenShell = shellMatch[0].replace(/'(\/[^']*)'/g, (m, p) => {
    if (p === '/') return `'${BASE}/'`;
    if (p.startsWith(`${BASE}/`)) return m;
    return `'${BASE}${p}'`;
  });
  sw = sw.replace(shellMatch[0], rewrittenShell);
  if (sw.includes("caches.match('/index.html')")) {
    sw = sw.replaceAll("caches.match('/index.html')", `caches.match('${BASE}/index.html')`);
  } else if (sw.includes('caches.match(`${base}index.html`)') && sw.includes('function scopeRoot()')) {
    // Scope-aware service worker: derives its base from registration scope at
    // runtime, so the navigate fallback needs no build-time rewrite.
  } else {
    fail('sw.js offline navigate fallback not found (expected caches.match(\'/index.html\') or scope-aware scopeRoot form)');
  }
  const short = /^[0-9a-f]{40}$/.test(STUDIO_SHA) ? STUDIO_SHA.slice(0, 12) : String(STUDIO_SHA).replace(/[^A-Za-z0-9.-]+/g, '-').slice(0, 32);
  const stamped = `aftergraph-studio-${short || 'unstamped'}`;
  if (!/const CACHE = '[^']*';/.test(sw)) fail('sw.js has no CACHE name to stamp');
  sw = sw.replace(/const CACHE = '[^']*';/, `const CACHE = '${stamped}';`);
  fs.writeFileSync(swPath, sw);
  console.log(`sw CACHE stamped: ${stamped}`);
}

// 4. version.json + _headers (CSP + caching; the _headers file is the
// "_headers-equivalent via wrangler headers": Workers Static Assets serve it).
const builtAt = process.env.AG_DEPLOYED_AT || new Date().toISOString();
fs.writeFileSync(path.join(DIST, 'version.json'), JSON.stringify(
  { studio_sha: STUDIO_SHA, built_at: builtAt, mode: 'demo' }, null, 2,
));
const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
  + "img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; "
  + "base-uri 'self'; form-action 'none'";
fs.writeFileSync(path.join(DIST, '_headers'), [
  '/*',
  `  Content-Security-Policy: ${CSP}`,
  '  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort()',
  '/sw.js',
  '  Cache-Control: no-cache',
  '/version.json',
  '  Cache-Control: no-cache',
  '/index.html',
  '  Cache-Control: no-cache',
  '/styles/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/src/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/packages/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
].join('\n'));

// 5. Denylist + budget + leftover asserts (fail closed).
const DENY_SEGMENTS = new Set(['server', 'scripts', 'tests', 'docs']);
const files = walk(DIST);
const rel = (f) => path.relative(DIST, f).split(path.sep).join('/');
for (const file of files) {
  const r = rel(file);
  if (r.endsWith('.test.mjs')) fail(`denylist: test file in output: ${r}`);
  if (r.endsWith('.png')) fail(`denylist: png in output: ${r}`);
  for (const segment of r.split('/')) {
    if (DENY_SEGMENTS.has(segment)) fail(`denylist: banned segment in output: ${r}`);
  }
}
if (files.some((f) => rel(f).startsWith('packages/client/'))) {
  fail('denylist: packages/client/ must not ship (not in allowlist)');
}
let total = 0;
for (const file of files) total += fs.statSync(file).size;
if (total >= BUDGET_BYTES) fail(`budget: ${total} bytes >= 5 MB`);
const leftovers = [];
for (const file of files) {
  if (!TEXT_EXT.has(path.extname(file)) || path.basename(file) === '_headers') continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/(href|src)="\/(?!studio\/|\/)/.test(text)) leftovers.push(rel(file));
}
if (leftovers.length) fail(`absolute-path leftovers in: ${leftovers.join(', ')}`);

console.log(`studio-dist files: ${files.length}, bytes: ${total} (budget ${BUDGET_BYTES})`);
console.log(`version.json studio_sha: ${STUDIO_SHA}`);
console.log('STUDIO-BUILD-PASS');
