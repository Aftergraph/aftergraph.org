import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

const pages = ['/index.html', '/status.html', '/sentinel.html', '/community.html', '/launch.html'];

// The web Browser fixture exposes no page-error hook, so this smoke checks
// render + non-empty title only. Runtime JS errors need a separate probe.
for (const path of pages) {
  test(`${path} renders with a non-empty title`, async ({ app, browser }) => {
    await app.open(path);
    await expect(browser.locator('body')).toBeVisible();
    expect((await browser.title()).trim().length).toBeGreaterThan(0);
  });
}
