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
