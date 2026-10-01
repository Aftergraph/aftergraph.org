import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pages = ['community', 'launch', 'sentinel', 'status', '404'];

for (const page of pages) {
  test(`${page}: shared mobile polish and viewport`, () => {
    const html = fs.readFileSync(new URL(`./${page}.html`, import.meta.url), 'utf8');
    assert.match(html, /name="viewport"/);
    assert.match(html, /Shared mobile polish \(all pages\)/);
    assert.match(html, /overflow-x:clip/);
  });
}

test('community keeps navigation reachable on phones', () => {
  const html = fs.readFileSync(new URL('./community.html', import.meta.url), 'utf8');
  assert.match(html, /\.navlinks a:not\(\[aria-current=page\]\)\{display:inline-flex\}/);
});

test('every subpage ships og:image and a twitter card', () => {
  const worker = fs.readFileSync(new URL('./build-worker.cjs', import.meta.url), 'utf8');
  for (const key of ['OG_ATLAS', 'OG_SENTINEL', 'OG_COMMUNITY', 'OG_LAUNCH']) {
    const block = worker.match(new RegExp(`const ${key} = \`([\\s\\S]*?)\`;`))?.[1] ?? '';
    assert.match(block, /og:image/, key);
    assert.match(block, /twitter:card/, key);
  }
});

test('homepage reveal never hides content', () => {
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /\.reveal\{opacity:0/);
});
