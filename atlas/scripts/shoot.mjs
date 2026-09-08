// Atlas visual QA: deterministic screenshots (desktop + drift + inspector + mobile).
// Usage: node scripts/shoot.mjs [baseUrl] [outDir]
// Requires: npx playwright install chromium. Fails closed (nonzero exit) on any error.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.argv[2] || 'http://localhost:8471/atlas/';
const outDir =
  process.argv[3] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'qa-shots');
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  { name: 'atlas-topology-1440.png', url: base, viewport: { width: 1440, height: 900 } },
  { name: 'atlas-drift-1440.png', url: `${base}?view=drift`, viewport: { width: 1440, height: 900 } },
  {
    name: 'atlas-inspector-1440.png',
    url: `${base}?node=${encodeURIComponent('repo:Aftergraph/aftergraph.org')}`,
    viewport: { width: 1440, height: 900 },
  },
  {
    name: 'atlas-neighborhood-390.png',
    url: `${base}?node=${encodeURIComponent('repo:Aftergraph/wi-backend')}`,
    viewport: { width: 390, height: 844 },
  },
];

const browser = await chromium.launch();
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: shot.viewport, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });
    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(outDir, shot.name) });
    console.log(`${shot.name}: ${errors.length ? `JS-ERRORS: ${errors.join(' | ')}` : 'clean'}`);
    if (errors.length) process.exitCode = 1;
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`shots -> ${outDir}`);
