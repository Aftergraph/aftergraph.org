import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./next.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('./build-worker.cjs', import.meta.url), 'utf8');
const catalog = JSON.parse(fs.readFileSync(new URL('./platform-catalog.json', import.meta.url), 'utf8'));

test('/next preview is never indexed', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(worker, /p === '\/next'[^\n]*x-robots-tag': 'noindex, nofollow'/);
  assert.doesNotMatch(worker, /<loc>https:\/\/aftergraph\.org\/next/);
});

test('live mission verifies against real provenance and healthz', () => {
  for (const step of ['intent', 'authority', 'execute', 'evidence', 'verify']) assert.match(html, new RegExp(`data-step="${step}"`));
  assert.match(html, /get\('\/provenance\.json'\)/);
  assert.match(html, /get\('\/healthz'\)/);
  assert.match(html, /health\.sha===prov\.sha/);
  assert.match(html, /NOT VERIFIED/);
});

test('simulated parts are labelled as such', () => {
  assert.match(html, /Authority <em class="demo-tag">EXAMPLE<\/em>/);
  assert.match(html, /Try to break it <span class="demo-tag">SIMULATION<\/span>/);
});

test('products match the catalog products group plus Sentinel', () => {
  const expected = [...catalog.groups.products.map((p) => p.name), 'sentinel'].sort();
  const listed = [...html.matchAll(/data-product="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, expected);
});

test('company stats match the catalog', () => {
  const perm = catalog.repositories.filter((r) => r.lifecycle !== 'temporary');
  assert.match(html, new RegExp(`<b>${perm.length}</b><span>permanent systems`));
  assert.match(html, new RegExp(`<b>${perm.filter((r) => r.visibility === 'public').length}</b><span>open source`));
});

test('all content visible without JavaScript', () => {
  assert.match(html, /\.js \.step\{opacity:\.42\}/);
  assert.doesNotMatch(html, /\.step\{[^}]*opacity:0/);
});
