import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./next.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('./build-worker.cjs', import.meta.url), 'utf8');
const catalog = JSON.parse(fs.readFileSync(new URL('./platform-catalog.json', import.meta.url), 'utf8'));
const permanent = catalog.repositories.filter((r) => r.lifecycle !== 'temporary');

test('/next preview is never indexed', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(worker, /p === '\/next'[^\n]*x-robots-tag': 'noindex, nofollow'/);
  assert.doesNotMatch(worker, /<loc>https:\/\/aftergraph\.org\/next/);
});

test('no third-party requests (CSP is self-only)', () => {
  assert.doesNotMatch(html, /<link[^>]+href="https?:\/\//);
  assert.doesNotMatch(html, /<script[^>]+src=/);
});

test('story verifies against real provenance and healthz', () => {
  assert.match(html, /get\('\/provenance\.json'\)/);
  assert.match(html, /get\('\/healthz'\)/);
  assert.match(html, /health\.sha===prov\.sha/);
  assert.match(html, /NOT VERIFIED/);
  for (const s of ['0', '1', '2', '3', '4']) assert.match(html, new RegExp(`data-s="${s}"`));
});

test('simulated parts are labelled', () => {
  assert.equal((html.match(/aie grant[^\n]*<span class="ex">EXAMPLE<\/span>/g) || []).length, 1);
  assert.equal((html.match(/trust-gateway admit[^\n]*<span class="ex">EXAMPLE<\/span>/g) || []).length, 1);
  assert.match(html, /Try to break it <span class="ex">SIMULATION<\/span>/);
  assert.match(html, /\(this site: GitHub Actions\)/);
});

test('graph carries every permanent catalog system', () => {
  const m = html.match(/var NODES=(\[.*?\]);\n/);
  assert.ok(m, 'NODES embedded');
  const nodes = JSON.parse(m[1]);
  assert.deepEqual(nodes.map((n) => n.id).sort(), permanent.map((r) => r.name).sort());
});

test('products match the catalog products group plus Sentinel', () => {
  const expected = [...catalog.groups.products.map((p) => p.name), 'sentinel'].sort();
  const listed = [...html.matchAll(/data-product="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, expected);
});

test('company numbers match the catalog', () => {
  assert.match(html, new RegExp(`<b>${permanent.length}</b><span>permanent systems`));
  assert.match(html, new RegExp(`<b>${permanent.filter((r) => r.visibility === 'public').length}</b><span>open source`));
});

test('content is visible without JavaScript', () => {
  assert.match(html, /<body class="nojs">/);
  assert.match(html, /\.nojs \.reveal,\.nojs \.tl\{opacity:1;transform:none\}/);
});

test('generated page is up to date with its template', () => {
  const tpl = fs.readFileSync(new URL('./next-src/next.tpl.html', import.meta.url), 'utf8');
  assert.ok(tpl.includes('__NODES__') && !html.includes('__NODES__') && !html.includes('__PRODUCTS__'));
});
