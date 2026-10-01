import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8475/index.html';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base, { waitUntil: 'networkidle' });

  const nodes = page.locator('.event-node[data-event-title]');
  assert.equal(await nodes.count(), 7, 'expected seven interaction boundary nodes');

  const first = nodes.nth(0);
  assert.equal(await first.getAttribute('aria-pressed'), 'true');

  const approval = page.getByRole('button', { name: /APPROVAL/i });
  await approval.click();
  assert.equal(await approval.getAttribute('aria-pressed'), 'true');
  assert.equal((await page.locator('[data-event-heading]').textContent())?.trim(), 'Human approval boundary');
  assert.match((await page.locator('[data-event-rule]').textContent()) || '', /Approval changes allowed action scope/);

  const verdict = page.getByRole('button', { name: /VERDICT/i });
  await verdict.click();
  assert.equal((await page.locator('[data-event-heading]').textContent())?.trim(), 'Independent verification');
  assert.match((await page.locator('[data-event-rule]').textContent()) || '', /Verified outcome is a verdict bound to evidence/);

  const note = (await page.locator('.protocol-note').textContent()) || '';
  assert.match(note, /Design direction/);
  assert.match(note, /not presented as an implemented AG-UI compatibility claim/);

  console.log('Aftergraph interaction boundary browser contract: PASS');
} finally {
  await browser.close();
}
