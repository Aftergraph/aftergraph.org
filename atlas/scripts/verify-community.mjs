import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8473/community';
const browser = await chromium.launch({ headless: true });
try {
  for (const cfg of [
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  ]) {
    const page = await browser.newPage(cfg);
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
    assert.equal(await page.title(), 'Community — Aftergraph');
    assert.match(await page.locator('h1').innerText(), /Challenge the system/);
    const body = await page.locator('body').innerText();
    assert.match(body, /Discussion is not authority\./);
    assert.match(body, /Security issues do not belong in public Discussions\./);
    assert.equal(await page.locator('.threadlist li').count(), 9, `${cfg.name}: featured thread count`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${cfg.name}: horizontal overflow ${overflow}px`);
    assert.deepEqual(consoleErrors, [], `${cfg.name}: console errors`);
    if (cfg.name === 'mobile') {
      const columns = await page.locator('.grid').first().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      assert.equal(columns, 1, 'mobile community cards must use one column');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      const style = getComputedStyle(element);
      return { tag: element?.tagName, outline: style.outlineWidth };
    });
    assert.notEqual(focus.tag, 'BODY', `${cfg.name}: keyboard focus must move`);
    assert.notEqual(focus.outline, '0px', `${cfg.name}: focused element must remain visible`);
    await page.close();
  }
  console.log('Aftergraph community browser smoke: PASS');
} finally {
  await browser.close();
}
