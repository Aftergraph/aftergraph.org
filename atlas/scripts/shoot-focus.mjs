// One-off focused-input proof shot: Tab into the tree filter input so the
// :focus-visible ring is visible (after CSS removed outline:none).
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await page.goto('http://localhost:8492/atlas/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
await page.getByLabel('Filter entities').focus();
await page.keyboard.press('Tab');
await page.waitForTimeout(500);
await page.screenshot({ path: 'atlas/qa-shots-after/atlas-focus-ring-proof.png' });
console.log('focused element:', await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName));
console.log('focus visible:', await page.evaluate(() => {
  const st = getComputedStyle(document.activeElement);
  return st.outlineWidth !== '0px' || st.boxShadow !== 'none';
}));
await browser.close();
