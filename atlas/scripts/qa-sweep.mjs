// QA sweep: tablet viewport (768x1024) across every Atlas view.
// Fail-closed: any view rendering the error state or missing its needle fails.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8471/atlas/';
const fail = (m) => { console.error(`QA-SWEEP FAIL: ${m}`); process.exitCode = 1; };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
const checks = [
  ['topology', null, '.rf-node', 1],
  ['pulse', 'Pulse', '.panel tbody tr', 1],
  ['contracts', 'Contracts', '.panel tbody tr', 1],
  ['capabilities', null, '.panel', 1],
  ['models', 'AFM lineage', '.panel', 1],
  ['research', 'Proposal constellation', '.panel', 1],
  ['snapshots', 'Snapshots', '.panel', 1],
  ['ask', 'Ask Atlas', '.panel', 1],
  ['drift', null, '.drift-list', 1],
];
for (const [view, needle, sel, min] of checks) {
  await page.goto(`${BASE}?view=${view}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const errors = await page.evaluate(() => document.querySelectorAll('.empty h1').length);
  if (errors > 0) fail(`${view}: renders error state`);
  const body = await page.locator('body').innerText();
  if (needle && !body.includes(needle)) fail(`${view}: missing '${needle}'`);
  const n = await page.locator(sel).count();
  if (n < min) fail(`${view}: selector '${sel}' count ${n} < ${min}`);
  await page.screenshot({ path: `atlas/qa-shots-after/qa-tablet-${view}-768.png` });
}
await browser.close();
if (!process.exitCode) console.log('ATLAS-QA-SWEEP PASS (tablet 768x1024, 9 views)');
