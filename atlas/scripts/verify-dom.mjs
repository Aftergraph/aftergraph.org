// Atlas browser smoke: verify the current view-based shell and core user paths.
// Usage: node scripts/verify-dom.mjs [baseUrl]. Fails closed with VERIFY-FAIL lines.
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:8471/atlas/';
let failures = 0;
const fail = (m) => {
  console.error(`VERIFY-FAIL: ${m}`);
  failures += 1;
};
const overflowPx = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const browser = await chromium.launch();
try {
  // Overview is the intentional default experience.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByText('Atlas V3', { exact: true }).waitFor({ timeout: 15000 });
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15000 });

    const heading = await page.getByRole('heading', { level: 1 }).innerText();
    if (!heading.includes('Byg autonome systemer')) fail(`overview h1 unexpected: ${heading}`);

    const tabs = page.getByRole('tab');
    if (await tabs.count() !== 10) fail(`Atlas shell exposes ${await tabs.count()} tabs, expected 10`);
    const overview = page.getByRole('tab', { name: 'Overview', exact: true });
    if (await overview.getAttribute('aria-selected') !== 'true') fail('Overview is not selected by default');

    const overflow = await overflowPx(page);
    if (overflow > 1) fail(`desktop horizontal overflow: ${overflow}px`);

    const theme = page.getByRole('button', { name: /Switch to .* theme/ });
    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await theme.click();
    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    if (!before || !after || before === after) fail('theme toggle did not change document theme');

    // Roving-tab keyboard contract: ArrowRight activates the next view.
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    const topologyTab = page.getByRole('tab', { name: 'Topology', exact: true });
    if (await topologyTab.getAttribute('aria-selected') !== 'true') fail('ArrowRight did not activate Topology');
    if (!new URL(page.url()).searchParams.get('view')?.includes('topology')) fail('Topology view did not persist to URL');

    await page.close();
  }

  // Topology remains the graph/evidence exploration surface, but is no longer the default page.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}?view=topology`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('.graph').waitFor({ timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('.rf-node').length >= 20, null, { timeout: 20000 });

    const nodes = await page.locator('.rf-node').count();
    if (nodes < 20) fail(`topology shows ${nodes} nodes, expected >= 20`);

    for (const plane of ['CANONICAL', 'OBSERVED', 'PROPOSED']) {
      const button = page.getByRole('button', { name: plane, exact: true });
      if (await button.count() !== 1) fail(`missing ${plane} plane control`);
      else if (await button.getAttribute('aria-pressed') !== 'true') fail(`${plane} plane not enabled by default`);
    }

    const proposed = page.getByRole('button', { name: 'PROPOSED', exact: true });
    await proposed.click();
    if (await proposed.getAttribute('aria-pressed') !== 'false') fail('PROPOSED plane toggle did not change state');
    if (!new URL(page.url()).searchParams.has('overlay')) fail('plane state did not persist to URL');

    const filter = page.getByLabel('Filter entities');
    await filter.fill('wi-backend');
    await page.waitForTimeout(300);
    const matchingButtons = await page.locator('.tree button').count();
    if (matchingButtons !== 1) fail(`entity filter returned ${matchingButtons} buttons for wi-backend, expected 1`);
    await filter.fill('zzz-no-such-entity-qqq');
    const emptyState = page.getByRole('status');
    if (!(await emptyState.innerText()).includes('No entities match')) fail('entity filter hides empty state');

    const drift = page.getByRole('button', { name: 'Drift', exact: true });
    await drift.click();
    await page.locator('.drift-list').waitFor({ timeout: 5000 });
    if (!(await page.locator('.drift-list').innerText()).includes('Drift')) fail('Drift surface did not render');

    const overflow = await overflowPx(page);
    if (overflow > 1) fail(`topology horizontal overflow: ${overflow}px`);
    await page.close();
  }

  // Ask is evidence-bound and remains functional through the redesigned view.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}?view=ask`, { waitUntil: 'networkidle', timeout: 60000 });
    const input = page.getByLabel('Ask Atlas');
    await input.waitFor({ timeout: 15000 });
    await input.fill('wi-backend');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await page.waitForTimeout(500);
    const body = await page.locator('body').innerText();
    if (!body.includes('evidence hits') && !body.includes('Ingen matching assertions fundet')) {
      fail('Ask Atlas produced neither evidence results nor an honest empty state');
    }
    if (await page.locator('.empty h1').count()) fail('Ask Atlas rendered a fatal projection state');
    await page.close();
  }

  // Every primary view must mount without the old blank/error-boundary failure mode.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    for (const view of ['pulse', 'contracts', 'capabilities', 'models', 'research', 'snapshots', 'reconciliation']) {
      await page.goto(`${base}?view=${view}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.getByText('Atlas V3', { exact: true }).waitFor({ timeout: 10000 });
      if (await page.locator('.empty h1').count()) {
        fail(`${view} rendered a fatal projection state`);
      }
      const selected = page.getByRole('tab', { name: view === 'reconciliation' ? 'Conflicts' : view[0].toUpperCase() + view.slice(1), exact: true });
      if (await selected.count() === 1 && await selected.getAttribute('aria-selected') !== 'true') {
        fail(`${view} tab did not restore from URL`);
      }
    }
    await page.close();
  }

  // Accessibility and mobile shell contracts.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByText('Atlas V3', { exact: true }).waitFor({ timeout: 15000 });

    const menu = page.getByRole('button', { name: 'Open navigation menu' });
    await menu.click();
    if (await menu.getAttribute('aria-expanded') !== 'true') fail('mobile navigation did not open');

    const overflow = await overflowPx(page);
    if (overflow > 1) fail(`mobile horizontal overflow: ${overflow}px`);

    const h1 = await page.getByRole('heading', { level: 1 }).count();
    if (h1 < 1) fail('no h1 heading on mobile');
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => !(b.innerText || '').trim() && !b.getAttribute('aria-label')).length
    );
    if (unnamed > 0) fail(`${unnamed} buttons without accessible names`);
    await page.close();
  }

  // Reduced motion must preserve all required navigation/state.
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByText('Atlas V3', { exact: true }).waitFor({ timeout: 15000 });
    if (await page.getByRole('tab').count() !== 10) fail('reduced-motion mode hides Atlas navigation');
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
