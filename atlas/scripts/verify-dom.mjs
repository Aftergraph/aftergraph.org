// Atlas structural QA: DOM-level assertions (no eyeballs needed).
// Usage: node scripts/verify-dom.mjs [baseUrl]. Fails closed with VERIFY-FAIL lines.
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:8471/atlas/';
let failures = 0;
const fail = (m) => {
  console.error(`VERIFY-FAIL: ${m}`);
  failures += 1;
};

const browser = await chromium.launch();
try {
  // Desktop topology
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const nodes = await page.locator('.rf-node').count();
    if (nodes < 20) fail(`topology shows ${nodes} nodes, expected >= 20 repository nodes`);
    const header = await page.locator('.atlas-head').innerText();
    for (const needle of ['Aftergraph Atlas', 'CANONICAL', 'OBSERVED', 'PROPOSED', 'Drift', 'gov']) {
      if (!header.includes(needle)) fail(`header missing ${needle}`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) fail(`desktop horizontal overflow: ${overflow}px`);
    // Inspector via URL state
    await page.goto(`${base}?node=${encodeURIComponent('repo:Aftergraph/aie')}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const insp = await page.locator('.inspector').innerText();
    for (const needle of ['repo:Aftergraph/aie', 'CANONICAL', 'OBSERVED', 'source:', 'ref:', 'observed:']) {
      if (!insp.includes(needle)) fail(`inspector missing ${needle}`);
    }
    await page.close();
  }
  // Drift view
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}?view=drift`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const drift = await page.locator('.drift-list').innerText();
    for (const needle of ['C2', 'C4', 'sentinel-firetest2']) {
      if (!drift.includes(needle)) fail(`drift list missing ${needle}`);
    }
    await page.close();
  }
  // Slice C views render through the tab strip
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}?view=ask`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const ask = await page.locator('.panel').innerText();
    if (!ask.includes('Ask Atlas')) fail('ask view missing');
    await page.goto(`${base}?view=contracts`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const contracts = await page.locator('.panel').innerText();
    if (!contracts.includes('Contracts')) fail('contracts view missing');
    await page.goto(`${base}?view=snapshots`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const snaps = await page.locator('.panel').innerText();
    if (!snaps.includes('Snapshots')) fail('snapshots view missing');
    // Fixture previews must honor their own publication boundary
    await page.goto(`${base}?view=capabilities`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const caps = await page.locator('.panel').innerText();
    if (!caps.includes('PREVIEW')) fail('capabilities preview label missing');
    if (!caps.includes('withheld')) fail('capabilities preview does not withhold flagged fixture content');
    if (caps.includes('aftergraph-observer')) fail('capabilities preview publishes clearance-flagged skill name');
    await page.close();
  }
  // System x-ray traces a directed path from live relations
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.getByLabel('Trace from').selectOption('repo:Aftergraph/studio');
    await page.getByLabel('Trace to').selectOption('repo:Aftergraph/works-execution');
    await page.getByRole('button', { name: 'Trace' }).click();
    await page.waitForTimeout(500);
    const xray = await page.locator('.inspector').innerText();
    if (!xray.includes('consumes') && !xray.includes('No directed path')) fail('x-ray produced neither path nor honest gap');
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const lang = await page.evaluate(() => document.documentElement.lang);
    if (!lang) fail('html lang missing');
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => !(b.innerText || '').trim() && !b.getAttribute('aria-label')).length
    );
    if (unnamed > 0) fail(`${unnamed} buttons without accessible names`);
    const unlabeled = await page.evaluate(() =>
      [...document.querySelectorAll('input')].filter((i) => !i.getAttribute('aria-label') && !i.getAttribute('placeholder') && !(i.labels || []).length).length
    );
    if (unlabeled > 0) fail(`${unlabeled} inputs without labels`);
    const h1 = await page.locator('h1').count();
    if (h1 < 1) fail('no h1 heading');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    if (!focused || focused === 'BODY') fail('keyboard Tab does not move focus');
    const outline = await page.evaluate(() => {
      const el = document.activeElement;
      const st = getComputedStyle(el);
      return st.outlineWidth !== '0px' || st.boxShadow !== 'none';
    });
    if (!outline) fail('focused element has no visible focus indicator');
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.getByLabel('Filter entities').fill('wi-backend');
    await page.waitForTimeout(500);
    const buttons = await page.locator('.tree button').count();
    if (buttons !== 1) fail(`search 'wi-backend' shows ${buttons} tree buttons, expected 1`);
    const head = await page.locator('.atlas-head').innerText();
    if (!head.includes('old')) fail('header cut chip missing age');
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${base}?node=${encodeURIComponent('repo:Aftergraph/wi-backend')}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const nodes = await page.locator('.rf-node').count();
    if (nodes >= 20) fail(`mobile shows ${nodes} nodes, expected neighborhood subset (< 20)`);
    if (nodes < 2) fail(`mobile shows ${nodes} nodes, expected a real neighborhood (>= 2)`);
    const insp = await page.locator('.inspector').innerText();
    if (!insp.includes('repo:Aftergraph/wi-backend')) fail('mobile inspector missing selection');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) fail(`mobile horizontal overflow: ${overflow}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (failures === 0) console.log('ATLAS-DOM-VERIFY PASS');
else {
  console.error(`ATLAS-DOM-VERIFY FAIL: ${failures} violation(s)`);
  process.exitCode = 1;
}
