import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

await import('./experience-hero.js');
const hero = globalThis.AftergraphExperienceHero;
const home = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

test('buildAtlasHref preserves canonical entity + system lens', () => {
  assert.equal(
    hero.buildAtlasHref('repo:Aftergraph/trust-gateway'),
    '/atlas/?node=repo%3AAftergraph%2Ftrust-gateway&view=topology&lens=SYSTEM',
  );
});

test('hero exposes canonical Atlas entity controls and honest illustrative label', () => {
  for (const id of [
    'repo:Aftergraph/aie',
    'repo:Aftergraph/works-execution',
    'repo:Aftergraph/trust-gateway',
    'repo:Aftergraph/intelligence-systems-research',
  ]) {
    assert.match(home, new RegExp(`data-atlas-entity="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  }
  assert.match(home, /Illustrative system walkthrough/);
  assert.match(home, /Inspect in Atlas/);
});

test('public home does not load Atlas heavy vendors', () => {
  assert.doesNotMatch(home, /vendor-flow-/);
  assert.doesNotMatch(home, /vendor-elk-/);
  assert.doesNotMatch(home, /vendor-d3-/);
  assert.doesNotMatch(home, /reactflow/i);
});

test('worker build injects the lightweight hero controller into landing HTML', () => {
  const builder = fs.readFileSync(new URL('./build-worker.cjs', import.meta.url), 'utf8');
  assert.match(builder, /experience-hero\.js/);
});
