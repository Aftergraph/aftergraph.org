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
    // Quantitative visual QA (no eyeballs needed): node boxes must not overlap
    const overlaps = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.rf-node')].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      });
      let hits = 0;
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (x > 2 && y > 2) hits++;
        }
      }
      return { nodes: boxes.length, hits };
    });
    if (overlaps.hits > 0) fail(`topology node overlap: ${overlaps.hits} overlapping pairs among ${overlaps.nodes} nodes`);
    // Body-text contrast vs page background (WCAG AA 4.5 for normal text)
    const contrast = await page.evaluate(() => {
      const lum = (rgb) => {
        const m = rgb.match(/[\d.]+/g).map(Number);
        const f = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        const [r, g, b] = m.slice(0, 3).map((v) => f(v / 255));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = getComputedStyle(document.body).color;
      const bg = getComputedStyle(document.body).backgroundColor;
      const l1 = lum(fg), l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    });
    if (!(contrast >= 4.5)) fail(`body text contrast ${contrast.toFixed(2)}:1 below WCAG AA 4.5`);
    // Inspector via URL state
    await page.goto(`${base}?node=${encodeURIComponent('repo:Aftergraph/aie')}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    const insp = await page.locator('.inspector').innerText();
    for (const needle of ['repo:Aftergraph/aie', 'CANONICAL', 'OBSERVED', 'source:', 'ref:', 'observed:']) {
      if (!insp.includes(needle)) fail(`inspector missing ${needle}`);
    }
    // Real impact behavior: blast-radius analysis renders on demand
    await page.getByRole('button', { name: 'Show impact (2-hop)' }).click();
    await page.waitForTimeout(1000);
    const impact = await page.locator('.inspector').innerText();
    if (!impact.includes('dependents (') || !impact.includes('dependencies (')) {
      fail('impact analysis did not render dependents/dependencies');
    }
    await page.close();
  }
  // Truth-plane overlay toggles drive the graph + URL state
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    // Truth-plane overlay toggles: aria-pressed flips and URL state follows
    const prop = page.getByRole('button', { name: 'PROPOSED', exact: true });
    if (await prop.getAttribute('aria-pressed') !== 'true') fail('PROPOSED overlay not pressed by default');
    await prop.click();
    await page.waitForTimeout(1500);
    if (await prop.getAttribute('aria-pressed') !== 'false') fail('PROPOSED toggle did not flip aria-pressed');
    if (!page.url().includes('overlay=')) fail('overlay toggle did not persist to URL state');
    const nodesOff = await page.locator('.rf-node').count();
    if (nodesOff < 1) fail('topology emptied after PROPOSED toggle');
    await prop.click();
    await page.waitForTimeout(1500);
    if (await prop.getAttribute('aria-pressed') !== 'true') fail('PROPOSED toggle did not flip back');
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
    // Real Ask behavior: submit a question, citations must render
    await page.getByLabel('Question').fill('wi-backend head');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await page.waitForTimeout(1500);
    const answered = await page.locator('.panel').innerText();
    if (!answered.includes('wi-backend')) fail('ask produced no wi-backend evidence');
    if (!answered.includes('CANONICAL') && !answered.includes('OBSERVED')) fail('ask citations lack truth-plane tags');
    // Unanswerable path must say so honestly
    await page.getByLabel('Question').fill('quantum teapot revenue synergies');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await page.waitForTimeout(1500);
    const unans = await page.locator('.panel').innerText();
    if (!unans.includes('Unanswerable')) fail('ask hides unanswerable state');
    await page.goto(`${base}?view=contracts`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const contracts = await page.locator('.panel').innerText();
    if (!contracts.includes('Contracts')) fail('contracts view missing');
    // Contract row navigates into the topology inspector
    await page.locator('.panel tbody tr').first().locator('button').click();
    await page.waitForTimeout(1500);
    if (!page.url().includes('node=')) fail('contract selection did not address the node in URL');
    const cins = await page.locator('.inspector').innerText();
    if (!cins.includes('contract:')) fail('contract inspector missing after row navigation');
    await page.goto(`${base}?view=snapshots`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const snaps = await page.locator('.panel').innerText();
    if (!snaps.includes('Snapshots')) fail('snapshots view missing');
    // Exercise the real time-machine path: diff oldest snapshot vs current
    const diffButtons = await page.getByRole('button', { name: 'diff vs current' }).count();
    if (diffButtons < 1) fail('snapshots view has no diff buttons');
    else {
      await page.getByRole('button', { name: 'diff vs current' }).first().click();
      await page.waitForTimeout(1500);
      const dl = await page.locator('.panel').innerText();
      if (!dl.includes('comparing')) fail('snapshot diff never rendered');
      if (!/assertions \+\d+\/−\d+/.test(dl)) fail('snapshot diff missing added/removed assertion counts');
    }
    // Every remaining view must render without crashing (no error boundary:
    // a throw in any view blanks the whole app for that URL).
    for (const [v, needle] of [['pulse', 'Pulse'], ['models', 'AFM lineage'], ['research', 'Proposal constellation']]) {
      await page.goto(`${base}?view=${v}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1500);
      const body = await page.locator('body').innerText();
      if (!body.includes(needle)) fail(`${v} view missing '${needle}' (render crash?)`);
      const errors = await page.evaluate(() => document.querySelectorAll('.empty h1').length);
      if (errors > 0) {
        const t = await page.locator('.empty').innerText();
        fail(`${v} view renders error state: ${t.slice(0, 120)}`);
      }
    }
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
  // Keyboard traversal: arrows move graph selection, Escape clears it
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.locator('.graph').click();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);
    const sel = await page.locator('.inspector').innerText();
    if (!sel.includes('repo:Aftergraph/')) fail('ArrowDown did not move graph selection into the inspector');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    const cleared = await page.locator('.inspector').innerText();
    if (cleared.includes('repo:Aftergraph/')) fail('Escape did not clear the selection');
    await page.close();
  }
  // Tablet: full graph in a narrower viewport — must render without overflow
  {
    const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    const nodes = await page.locator('.rf-node').count();
    if (nodes < 20) fail(`tablet shows ${nodes} nodes, expected full topology (>= 20)`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) fail(`tablet horizontal overflow: ${overflow}px`);
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
