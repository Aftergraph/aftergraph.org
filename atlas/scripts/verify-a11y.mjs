// Accessibility gate: systematic axe-core scan of every public page.
// Usage: node scripts/verify-a11y.mjs <baseUrl> [page1 page2 ...]
// Fails closed on serious/critical violations. Non-public surfaces
// (healthz, robots, sitemap) are intentionally excluded.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const base = process.argv[2] || 'http://localhost:8471';
const pages = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['/', '/launch', '/community', '/sentinel', '/status', '/atlas/'];

let totalViolations = 0;
const browser = await chromium.launch({ headless: true });
try {
  for (const path of pages) {
    for (const cfg of [
      { name: 'desktop', viewport: { width: 1440, height: 900 } },
      { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    ]) {
      const page = await browser.newPage(cfg);
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1500);
      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(() => axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        resultTypes: ['violations'],
      }));
      // Pre-existing Atlas technical debt (tracked separately). Excluding these
      // lets the gate catch NEW serious/critical regressions on any page without
      // blocking on legacy Atlas ARIA/contrast issues that predate the gate.
      const ATLAS_BASELINE = new Set(['aria-allowed-attr', 'color-contrast']);
      const relevant = path.startsWith('/atlas') ? ATLAS_BASELINE : new Set();
      const serious = (results.violations || []).filter(
        (v) => (v.impact === 'serious' || v.impact === 'critical') && !relevant.has(v.id)
      );
      if (serious.length > 0) {
        for (const v of serious) {
          console.error(`A11Y-FAIL: ${cfg.name} ${path} [${v.id}] ${v.impact} — ${v.description} (${v.nodes.length} nodes)`);
        }
        totalViolations += serious.length;
      } else {
        console.log(`A11Y-OK: ${cfg.name} ${path} — no serious/critical violations`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
assert.equal(totalViolations, 0, `${totalViolations} serious/critical axe violations found across public pages`);
console.log('Aftergraph accessibility gate: PASS');
