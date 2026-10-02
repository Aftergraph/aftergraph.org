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

test('freshness: HEAD age decides active/quiet/dormant, never guessed', async () => {
  const { freshness } = await import('./next-src/build-ecosystem-state.mjs');
  const now = new Date('2026-10-02T00:00:00Z');
  assert.equal(freshness('2026-09-25T00:00:00Z', now), 'active');
  assert.equal(freshness('2026-08-20T00:00:00Z', now), 'quiet');
  assert.equal(freshness('2026-06-01T00:00:00Z', now), 'dormant');
  assert.equal(freshness(null, now), 'unknown');
  assert.equal(freshness('not a date', now), 'unknown');
});

test('freshness: release drift is read from compare, never assumed', async () => {
  const { readRepo } = await import('./next-src/build-ecosystem-state.mjs');
  const fake = async (url) => {
    const ok = (d) => ({ ok: true, status: 200, json: async () => d });
    if (url.endsWith('/repos/Aftergraph/x')) return ok({ default_branch: 'main' });
    if (url.includes('/commits/main')) return ok({ sha: 'a'.repeat(40), commit: { committer: { date: '2026-10-01T00:00:00Z' } } });
    if (url.includes('/releases/latest')) return ok({ tag_name: 'v1', published_at: '2026-09-01T00:00:00Z', html_url: 'u' });
    if (url.includes('/compare/v1...main')) return ok({ ahead_by: 42 });
    if (url.includes('/pulls')) return ok([]);
    if (url.includes('/actions/runs')) return ok({ workflow_runs: [] });
    return { ok: false, status: 404 };
  };
  const r = await readRepo('x', { fetchImpl: fake, now: () => new Date('2026-10-02T00:00:00Z') });
  assert.equal(r.release.aheadBy, 42);
  assert.equal(r.freshness, 'active');
});

test('hand-written product copy is re-verified at least every 45 days', () => {
  const src = fs.readFileSync(new URL('./next-src/generate-next.py', import.meta.url), 'utf8');
  const m = src.match(/COPY_VERIFIED=\{n:'(\d{4}-\d{2}-\d{2})' for n in COPY\}/);
  assert.ok(m, 'COPY_VERIFIED must record when product copy was last checked against the source');
  const age = (Date.now() - Date.parse(m[1] + 'T00:00:00Z')) / 864e5;
  assert.ok(age <= 45, `product copy last verified ${m[1]} (${Math.round(age)} d ago): re-check it against platform-catalog.json "owns" and each README, then bump the date`);
  const live = fs.readFileSync(new URL('./next-src/live.js', import.meta.url), 'utf8');
  assert.match(live, /fchip/); assert.match(live, /main is \$\{esc\(a\)\} commit/);
});

test('/next/ecosystem is server-rendered from the truth layer and never indexed', async () => {
  assert.match(worker, /p === '\/next\/ecosystem'[^\n]*x-robots-tag': 'noindex, nofollow'/);
  assert.match(worker, /const ECOSYSTEM_PAGE = /);
  assert.match(html, /href="\/next\/ecosystem"/);
  const { createRequire } = await import('node:module');
  const { renderEcosystemPage } = createRequire(import.meta.url)('./next-src/ecosystem-page.cjs');
  const empty = renderEcosystemPage(JSON.stringify({ generatedAt: null, repos: [], counts: {} }));
  assert.match(empty, /Not generated in this build/);
  const statePath = new URL('./ecosystem-state.json', import.meta.url);
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { generatedAt: '2026-10-02T00:00:00Z', source: 'fixture', counts: { total: 2 }, repos: [
    { name: 'sentinel', visibility: 'public', status: 'failing', head: 'b05c32f52c5f', headAt: '2026-10-02T00:00:00Z', freshness: 'active', release: { tag: 'v1.0.0', aheadBy: 3 }, openPRs: 1, checks: { failing: ['deploy'] } },
    { name: 'runtime', visibility: 'private', status: 'private' }] };
  const page = renderEcosystemPage(JSON.stringify(state));
  assert.match(page, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(page, /<script/);
  const esc = (n) => n.replace(/\./g, '\\.');
  for (const r of state.repos) assert.match(page, new RegExp(`data-repo="${esc(r.name)}" data-status="${r.status}"`));
  for (const r of state.repos.filter((x) => x.visibility === 'private')) assert.doesNotMatch(page, new RegExp(`github\\.com/Aftergraph/${esc(r.name)}"`));
  const order = state.repos.map((r) => r.name);
  const firstFailing = state.repos.find((r) => r.status === 'failing');
  if (firstFailing) assert.ok(page.indexOf(`data-repo="${firstFailing.name}"`) < page.indexOf('data-status="passing"') || !page.includes('data-status="passing"'), 'failing sorts first');
  assert.ok(order.length >= 1);
});
