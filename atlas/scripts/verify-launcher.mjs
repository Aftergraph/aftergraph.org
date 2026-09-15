import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8472/launch.html';
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const telemetry = [];
  await desktop.route('**/api/launcher/telemetry', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const raw = request.postData() || '';
      telemetry.push({ raw, payload: raw ? JSON.parse(raw) : null });
    }
    await route.fulfill({ status: 202, body: '' });
  });
  await desktop.goto(base, { waitUntil: 'networkidle' });

  const desktopState = await desktop.evaluate(() => ({
    title: document.querySelector('.intro-title')?.textContent.trim(),
    phases: document.querySelector('.phase-line')?.textContent.replace(/\s+/g, ' ').trim(),
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    panelWidth: Math.round(document.querySelector('.launcher-panel')?.getBoundingClientRect().width || 0),
  }));
  assert.equal(desktopState.title, 'Aftergraph Launcher');
  assert.equal(desktopState.phases, 'FIND→UNDERSTAND→ACT→VERIFY');
  assert.equal(desktopState.scrollWidth, desktopState.viewportWidth, 'desktop must not overflow horizontally');
  assert.ok(desktopState.panelWidth >= 820 && desktopState.panelWidth <= 900, `unexpected desktop panel width: ${desktopState.panelWidth}`);

  await desktop.locator('#q').fill('wie');
  assert.deepEqual(await desktop.locator('.item-name').allTextContents(), ['Work Intelligence']);

  await desktop.locator('#q').fill('brand');
  assert.ok((await desktop.locator('.item-name').allTextContents()).includes('Brand OS'), 'search must expose non-featured systems');

  await desktop.locator('#q').fill('> verify');
  assert.deepEqual(await desktop.locator('.item-name').allTextContents(), ['Verify with Sentinel']);

  await desktop.locator('#q').fill('evidence studio');
  assert.deepEqual(await desktop.locator('.item-name').allTextContents(), ['Inspect evidence — Studio']);
  assert.match(await desktop.locator('.item').first().getAttribute('aria-label'), /Studio/);

  await desktop.locator('#q').fill('verify studio');
  assert.deepEqual(await desktop.locator('.item-name').allTextContents(), ['Verify — Studio']);

  await desktop.locator('#q').fill('');
  await desktop.locator('#q').press('ArrowDown');
  assert.equal(await desktop.locator('.item[aria-selected="true"] .item-name').textContent(), 'Work Intelligence');

  await desktop.locator('#q').fill('atlas');
  await desktop.locator('#q').press('Enter');
  await desktop.waitForLoadState('domcontentloaded');
  assert.match(desktop.url(), /\/atlas\/?$/, 'Enter must navigate to Atlas');
  await desktop.goto(base, { waitUntil: 'networkidle' });
  assert.match(await desktop.locator('.group-head').first().textContent(), /Recent/i, 'opened destinations must become recent');
  assert.ok((await desktop.locator('.item-name').allTextContents()).includes('Atlas'));

  await desktop.locator('#q').fill('no-such-aftergraph-destination-xyz');
  assert.match(await desktop.locator('.empty').textContent(), /No matching destination/);
  await desktop.waitForTimeout(650);
  const zeroResult = telemetry.find((event) => event.payload?.event === 'zero_result');
  assert.ok(zeroResult, 'zero-result telemetry must be emitted');
  assert.equal(zeroResult.payload.intent, 'find');
  assert.equal(zeroResult.payload.result_bucket, '0');
  assert.ok(!('query' in zeroResult.payload), 'raw query must never leave the browser');
  assert.ok(!('url' in zeroResult.payload), 'raw URL must never leave the browser');
  assert.ok(telemetry.every((event) => !/no-such-aftergraph-destination-xyz/.test(event.raw)), 'raw search text leaked into telemetry');
  await desktop.locator('#q').press('Escape');
  assert.equal(await desktop.locator('#q').inputValue(), '');

  await desktop.locator('#q').evaluate((element) => element.blur());
  await desktop.keyboard.press('Control+K');
  assert.equal(await desktop.evaluate(() => document.activeElement?.id), 'q');
  await desktop.close();

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await reduced.goto(base, { waitUntil: 'domcontentloaded' });
  assert.equal(await reduced.locator('.graph-dot').first().evaluate((element) => getComputedStyle(element).animationName), 'none');
  await reduced.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(base, { waitUntil: 'networkidle' });
  const mobileState = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    intro: getComputedStyle(document.querySelector('.intro')).display,
    description: getComputedStyle(document.querySelector('.item-desc')).display,
    graph: getComputedStyle(document.querySelector('.graph-wing')).display,
    touchHint: getComputedStyle(document.querySelector('.hint-touch')).display,
    firstRowHeight: Math.round(document.querySelector('.item')?.getBoundingClientRect().height || 0),
  }));
  assert.equal(mobileState.scrollWidth, mobileState.viewportWidth, 'mobile must not overflow horizontally');
  assert.equal(mobileState.intro, 'none');
  assert.equal(mobileState.description, 'none');
  assert.equal(mobileState.graph, 'none');
  assert.notEqual(mobileState.touchHint, 'none');
  assert.ok(mobileState.firstRowHeight >= 56, `mobile row target below 56px: ${mobileState.firstRowHeight}`);
  await mobile.close();

  console.log('Aftergraph launcher browser smoke: PASS');
} finally {
  await browser.close();
}
