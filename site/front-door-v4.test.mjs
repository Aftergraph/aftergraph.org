import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const planeBlock = html.match(/<div class="platform-chain"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
const intentBlock = html.match(/<div class="intent-grid">([\s\S]*?)<\/section>/)?.[1] ?? '';

const planes = [
  ['Experience', 'Studio'], ['Intelligence', 'Wie'], ['Authority', 'AIE'],
  ['Trust', 'Trust Gateway'], ['Runtime', 'Runtime'], ['Execution', 'WORKS'],
  ['Verification', 'Sentinel'],
];

test('homepage exposes exactly the seven V4 permanent planes with canonical public owners', () => {
  for (const [plane, owner] of planes) {
    assert.match(planeBlock, new RegExp(`>${plane}<span class="chain-owner">${owner}`));
  }
  assert.equal((planeBlock.match(/class="chain-node"/g) ?? []).length, 7);
  assert.doesNotMatch(planeBlock, />Evidence<span class="chain-owner">/);
  assert.doesNotMatch(planeBlock, />Verified Outcome<span class="chain-owner">/);
});

test('homepage exposes the five approved user intents', () => {
  for (const intent of ['Build', 'Govern', 'Execute', 'Verify', 'Research']) {
    assert.match(intentBlock, new RegExp(`<h3>${intent}<\\/h3>`));
  }
  assert.equal((intentBlock.match(/class="intent-card/g) ?? []).length, 5);
});

test('Studio presents outcome language without claiming verification ownership', () => {
  assert.match(html, /<b>Goal<\/b>\s*&rarr;\s*Progress\s*&rarr;\s*Needs You\s*&rarr;\s*<b>Verified Outcome<\/b>/);
});

test('strong platform sections expose public source or evidence affordances', () => {
  assert.match(html, /class="source-link"[^>]*>Architecture source/);
  assert.match(html, /class="source-link"[^>]*>Inspect evidence/);
});

test('homepage exposes proof-first developer entry paths', () => {
  assert.match(html, /href="#platform">Explore the platform<\/a>/);
  assert.match(html, /href="\/atlas">Open Atlas<\/a>/);
  assert.match(html, /href="https:\/\/github\.com\/Aftergraph"[^>]*>View source<\/a>/);
  assert.match(html, /Infrastructure \+ open research · verifiable intelligent systems/);
  assert.match(html, /Inspect it before you trust it\./);
});

test('homepage product surfaces mirror launcher maturity truth', () => {
  assert.match(html, /<article class="product-card featured" id="studio">[\s\S]*?<span class="tag demo">demo<\/span>/);
  assert.match(html, /<article class="product-card" id="wie">[\s\S]*?<span class="tag">prototype<\/span>/);
  assert.match(html, /<article class="product-card" id="sentinel">[\s\S]*?<span class="tag">prototype<\/span>/);
  assert.match(html, /<article class="product-card featured" id="atlas">[\s\S]*?<span class="tag production">production<\/span>/);
  assert.match(html, /Four public entry surfaces\. Honest maturity\./);
});

test('homepage exposes fail-closed live proof surface', () => {
  assert.match(html, /id="proof"/);
  assert.match(html, /data-live-proof/);
  assert.match(html, /<script data-live-proof-script>/);
  assert.match(html, /getJson\('\/healthz'\)/);
  assert.match(html, /getJson\('\/provenance\.json'\)/);
  assert.match(html, /aftergraph-deploy-provenance\/1\.0/);
  assert.match(html, /h\.sha===p\.sha&&h\.route===p\.route&&h\.deployed===p\.deployed/);
  assert.match(html, /data-proof-state/);
  assert.match(html, /data-proof-sha/);
  assert.match(html, /data-proof-commit/);
  assert.match(html, /href="\/status"/);
  assert.match(html, /href="\/healthz"/);
  assert.match(html, /href="\/provenance\.json"/);
  assert.match(html, /href="\/atlas"/);
  assert.match(html, /Do not trust the claim\. Inspect the system\./);
});

test('homepage exposes governed interaction boundary without overclaiming compatibility', () => {
  assert.match(html, /id="interaction"/);
  assert.match(html, /data-agent-boundary-script/);
  assert.match(html, /Stream the interaction\. Govern the action\./);
  assert.match(html, /Design direction/);
  assert.match(html, /not presented as an implemented AG-UI compatibility claim/);
  assert.match(html, /href="\/agent-ui-boundary\.json">Read machine contract<\/a>/);
  assert.match(html, />RUN<small>start \/ finish \/ error<\/small>/);
  assert.match(html, />TOOL<small>intent \/ args \/ result<\/small>/);
  assert.match(html, />APPROVAL<small>pause \/ inspect \/ authorize<\/small>/);
  assert.match(html, />EVIDENCE<small>artifacts \/ provenance<\/small>/);
  assert.match(html, />VERDICT<small>criteria \/ subject \/ result<\/small>/);
  assert.match(html, /aria-label="Interaction observability signals"/);
  assert.match(html, /<b>ACTIVITY<\/b>/);
  assert.match(html, /<b>SUBAGENT<\/b>/);
  assert.match(html, /<b>INTERRUPT<\/b>/);
  assert.match(html, /progress ≠ completion evidence/);
  assert.match(html, /provenance ≠ ownership/);
});

test('homepage reflects Governance topology 2.0 portfolio truth', () => {
  assert.match(html, /34 canonical repositories/);
  assert.match(html, /16 public/);
  assert.match(html, /18 private/);
  assert.match(html, /30 active/);
  assert.match(html, /32 permanent/);
  assert.doesNotMatch(html, /21 canonical repositories/);
  assert.match(html, /id="portfolio"/);
  for (const name of ['FIHIM', 'RenOS', 'War Room', 'CORE \/ ToolFabric', 'Skill ABI', 'Cron Fabric']) {
    assert.match(html, new RegExp(`<h3>${name}<\\/h3>`));
  }
  assert.match(html, /canonical != public != production/);
  assert.match(html, /href="\/platform\/catalog\.json">Open platform catalog<\/a>/);
});

test('hero proof stats match the platform catalog and public product surfaces', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('./platform-catalog.json', import.meta.url), 'utf8'));
  const proofRow = html.match(/<section class="proof shell"[\s\S]*?<\/section>/)?.[0] ?? '';
  const stat = (key) => proofRow.match(new RegExp(`data-catalog-count="${key}"><span class="proof-num">(\\d+)<`))?.[1];
  assert.equal(Number(stat('canonical')), catalog.counts.canonical);
  assert.equal(Number(stat('public')), catalog.counts.public);
  assert.equal(Number(proofRow.match(/<span data-catalog-count="private">(\d+)<\/span>/)?.[1]), catalog.counts.private);
  const surfaces = (html.match(/<article class="product-card[^"]*" id="(studio|wie|sentinel|atlas)">/g) ?? []).length;
  assert.equal(Number(proofRow.match(/data-entry-surfaces><span class="proof-num">(\d+)</)?.[1]), surfaces);
  assert.doesNotMatch(proofRow, />21<\/span><span class="proof-label">canonical/);
});

test('hero names the audience and leads with a single proof-first primary action', () => {
  assert.match(html, /For teams that let AI agents write code, change production or act on real systems\./);
  assert.equal((html.match(/<header class="hero shell">[\s\S]*?<\/header>/)?.[0].match(/class="button primary"/g) ?? []).length, 1);
  assert.match(html, /class="button primary" href="#verify-live" data-cta="hero-verify-live">Verify this site live<\/a>/);
});

test('homepage names concrete use cases and a real contact route', () => {
  const block = html.match(/<section class="section shell" id="use-cases">[\s\S]*?<\/section>/)?.[0] ?? '';
  for (const id of ['agent-prs', 'governed-actions', 'durable-work', 'talk']) {
    assert.match(block, new RegExp(`data-use-case="${id}"`));
  }
  assert.match(html, /data-cta="hero-talk">Talk to us<\/a>/);
  assert.match(html, /href="https:\/\/github\.com\/orgs\/Aftergraph\/discussions"/);
});

test('history timeline is newest first', () => {
  const dates = [...(html.match(/<div class="timeline">[\s\S]*?<\/div>\n<\/section>/)?.[0] ?? '').matchAll(/<span class="t-date">(\d{4}-\d{2}-\d{2})<\/span>/g)].map((m) => m[1]);
  assert.ok(dates.length >= 2);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test('reveal animation never hides tall mobile sections', () => {
  assert.doesNotMatch(html, /threshold:\.12/);
  assert.match(html, /threshold:0,rootMargin:/);
  assert.match(html, /\/\* ==== Mobile polish ==== \*\//);
});

test('company map lists every permanent catalog system exactly once', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('./platform-catalog.json', import.meta.url), 'utf8'));
  const permanent = catalog.repositories.filter((r) => r.lifecycle !== 'temporary').map((r) => r.name).sort();
  const block = html.match(/<section class="section shell" id="company-map">[\s\S]*?<\/section>/)?.[0] ?? '';
  const listed = [...block.matchAll(/data-repo="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, permanent);
  for (const r of catalog.repositories.filter((x) => x.lifecycle !== 'temporary' && x.visibility === 'public')) {
    assert.ok(block.includes(`href="${r.source_url}"`), `${r.name} links to source`);
  }
});
