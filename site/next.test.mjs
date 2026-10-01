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

test('M2: product pages, view transitions, palette, a11y', () => {
  const pages = JSON.parse(fs.readFileSync(new URL('./next-products.json', import.meta.url), 'utf8'));
  const keys = Object.keys(pages);
  assert.equal(keys.length, 7);
  assert.match(html, /@view-transition\{navigation:auto\}/);
  assert.match(html, /type="speculationrules"/);
  assert.match(html, /<a class="skip" href="#main">/);
  assert.match(html, /<main id="main">/);
  const palItems = (html.match(/<dialog class="pal"[\s\S]*?<\/dialog>/) || [''])[0].match(/<li>/g) || [];
  assert.ok(palItems.length >= 32 + 8, 'palette lists every system and page');
  for (const k of keys) {
    const p = pages[k];
    const slug = k.split('/').pop();
    assert.match(html, new RegExp(`href="/next/products/${slug}"`));
    assert.match(html, new RegExp(`view-transition-name:t-${slug}`));
    assert.match(p, new RegExp(`<h1 style="view-transition-name:t-${slug}">`));
    assert.match(p, /<meta name="robots" content="noindex, nofollow">/);
    assert.match(p, /<dialog class="pal"/);
    assert.doesNotMatch(p, /waitlist|pricing|\$\d/i);
  }
});

test('worker template keeps /next/products route syntactically valid', () => {
  assert.doesNotMatch(worker, /NEXT_PRODUCTS\[p\.replace\(\/\\\/\$\//);
  assert.match(worker, /NEXT_PRODUCTS\[p\.endsWith\('\/'\) \? p\.slice\(0, -1\) : p\]/);
});

test('mobile header keeps Talk to us on one line', () => {
  assert.match(html, /\.hdr-r \.btn\{white-space:nowrap\}/);
  assert.match(html, /<span class="kl">Search<\/span>/);
});

test('truth layer: run aggregation is exact and never optimistic', async () => {
  const { aggregateRuns } = await import('./next-src/build-ecosystem-state.mjs');
  assert.equal(aggregateRuns([]).status, 'unknown');
  assert.equal(aggregateRuns([{ workflow_id: 1, name: 'ci', status: 'completed', conclusion: 'success', created_at: '1' }]).status, 'passing');
  assert.equal(aggregateRuns([{ workflow_id: 1, name: 'ci', status: 'in_progress', conclusion: null, created_at: '1' }]).status, 'pending');
  const r = aggregateRuns([
    { workflow_id: 1, name: 'ci', status: 'completed', conclusion: 'failure', created_at: '1' },
    { workflow_id: 1, name: 'ci', status: 'completed', conclusion: 'success', created_at: '2' },
    { workflow_id: 2, name: 'deploy', status: 'completed', conclusion: 'failure', created_at: '1' },
  ]);
  assert.equal(r.status, 'failing');
  assert.deepEqual(r.failing, ['deploy']);
});

test('truth layer: private repos publish nothing, read errors become unknown', async () => {
  const { buildState } = await import('./next-src/build-ecosystem-state.mjs');
  const catalog = { repositories: [{ name: 'secret', visibility: 'private' }, { name: 'open', visibility: 'public' }] };
  const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
  const s = await buildState({ catalog, token: '', fetchImpl, now: () => new Date('2026-10-02T00:00:00Z') });
  assert.deepEqual(s.repos[0], { name: 'secret', visibility: 'private', status: 'private' });
  assert.equal(s.repos[1].status, 'unknown');
  assert.equal(s.repos[1].head, null);
  assert.ok(s.repos[1].errors.length > 0);
  assert.equal(s.generatedAt, '2026-10-02T00:00:00.000Z');
  assert.equal(s.counts.unknown, 1);
  assert.equal(s.counts.private, 1);
});

test('truth layer: /next and product pages render live state from the same-origin JSON', () => {
  assert.match(html, /id="live"/);
  assert.match(html, /id="livegrid"/);
  assert.match(html, /fetch\('\/next\/ecosystem-state\.json'\)/);
  assert.match(html, /Nothing is shown rather than a guess/);
  const products = JSON.parse(fs.readFileSync(new URL('./next-products.json', import.meta.url), 'utf8'));
  for (const [route, page] of Object.entries(products)) {
    assert.match(page, /data-live-repo="[^"]+"/, route);
    assert.match(page, /ecosystem-state\.json/, route);
  }
  assert.match(worker, /p === '\/next\/ecosystem-state\.json'/);
});
