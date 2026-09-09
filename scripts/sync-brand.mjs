#!/usr/bin/env node
// Sync canonical Brand OS bytes into the site build (fail-closed).
//
// Source: Aftergraph/brand release tarball (pinned version + SHA-256).
// Writes gitignored build inputs under site/.brand/ and verifies the
// committed src/styles/tokens.css primitives against the canonical set.
// Run: node scripts/sync-brand.mjs [--check]
//   --check  verify only, write nothing (CI drift guard).
// Env BRAND_TARBALL overrides the download with a local .tgz (offline builds).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BRAND_VERSION = '1.1.0';
const TARBALL_URL = `https://github.com/Aftergraph/brand/releases/download/v${BRAND_VERSION}/aftergraph-brand-${BRAND_VERSION}.tgz`;
const TARBALL_SHA256 = '3d881b90d99a5af04a922fad0381c562d5b7dff766732b64350605db97bd6f8f';
const WANT = {
  'package/tokens.css': null,
  'package/svg/favicon.svg': 'site/.brand/favicon.svg',
  'package/svg/aftergraph-social-banner.svg': 'site/.brand/og-image.svg',
};
const CHECK_ONLY = process.argv.includes('--check');
const root = path.resolve(import.meta.dirname, '..');
const fail = (m) => { console.error(`SYNC-FAIL: ${m}`); process.exit(1); };

const vars = (css) => new Map([...css.matchAll(/(--ag-brand-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().toLowerCase()]));

let tgz;
if (process.env.BRAND_TARBALL) {
  tgz = process.env.BRAND_TARBALL;
  if (!fs.existsSync(tgz)) fail(`BRAND_TARBALL missing: ${tgz}`);
} else {
  tgz = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'brand-')), 'brand.tgz');
  try {
    execFileSync('curl', ['-sSL', '--max-time', '120', '-o', tgz, TARBALL_URL], { stdio: 'inherit' });
  } catch { fail(`download failed: ${TARBALL_URL}`); }
}
const sum = createHash('sha256').update(fs.readFileSync(tgz)).digest('hex');
if (sum !== TARBALL_SHA256) fail(`tarball SHA mismatch: got ${sum}`);
console.log(`brand tarball OK: v${BRAND_VERSION} sha256:${sum.slice(0, 12)}…`);

const get = (name) => {
  try {
    return execFileSync('tar', ['-xOzf', tgz, name], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8');
  } catch { fail(`member missing in tarball: ${name}`); }
};

// 1. Token drift guard: every committed :root --ag-brand-* must equal canonical.
const siteCss = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const siteRoot = siteCss.split('html[data-theme')[0];
const sVars = vars(siteRoot);
const cVars = vars(get('package/tokens.css'));
for (const [k, v] of sVars) {
  if (!cVars.has(k)) fail(`site token removed upstream: ${k}`);
  if (cVars.get(k) !== v) fail(`token drift ${k}: site=${v} canonical=${cVars.get(k)}`);
}
console.log(`tokens OK: ${sVars.size} committed primitives match canonical v${BRAND_VERSION} (${cVars.size} total)`);

// 2. Extract build inputs (skipped under --check).
if (!CHECK_ONLY) {
  for (const [member, dest] of Object.entries(WANT)) {
    if (!dest) continue;
    const out = path.join(root, dest);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, get(member));
    console.log(`wrote ${dest} (${fs.statSync(out).size}B from ${member})`);
  }
}
console.log('brand sync PASS');
