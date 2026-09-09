// One-off proof: (1) keyboard focus ring on the filter input, (2) drift-mode
// conflict highlight (node border/shadow + orange conflict edge strokes).
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8471/atlas/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

// 1) Tab until the filter input has keyboard focus (real key presses => :focus-visible)
let label = '';
for (let i = 0; i < 25; i++) {
  label = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName);
  if (label === 'Filter entities') break;
  await page.keyboard.press('Tab');
}
const inputFocus = await page.evaluate(() => {
  const el = document.activeElement;
  const st = getComputedStyle(el);
  return {
    el: el.getAttribute('aria-label') || el.tagName,
    outlineWidth: st.outlineWidth,
    outlineStyle: st.outlineStyle,
    outlineColor: st.outlineColor,
    boxShadow: st.boxShadow !== 'none',
  };
});
console.log('input focus:', JSON.stringify(inputFocus));
await page.screenshot({ path: 'atlas/qa-shots-after/atlas-input-focus-proof.png' });

// 2) Drift toggle => conflict nodes + orange conflict edges
await page.getByRole('button', { name: 'Drift', exact: true }).click();
await page.waitForTimeout(2000);
const conflictStats = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('.rf-node.conflict')];
  const st = nodes[0] ? getComputedStyle(nodes[0]) : null;
  const orangeEdges = [...document.querySelectorAll('.react-flow__edge')].filter((e) => {
    const p = e.querySelector('.react-flow__edge-path');
    return p && getComputedStyle(p).stroke === 'rgb(240, 166, 74)';
  }).length;
  return {
    conflictNodes: nodes.length,
    nodeBorderColor: st?.borderColor,
    nodeBoxShadow: (st?.boxShadow || '').slice(0, 140),
    orangeEdges,
  };
});
console.log('drift conflict:', JSON.stringify(conflictStats));
await page.screenshot({ path: 'atlas/qa-shots-after/atlas-drift-highlight-1440.png' });
await browser.close();
