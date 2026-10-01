import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

const pages = ['/index.html', '/status.html', '/sentinel.html', '/community.html', '/launch.html'];

for (const path of pages) {
  test(`${path} renders with a title and no page errors`, async ({ app, browser }) => {
    const errors: string[] = [];
    browser.on('pageerror', (e: Error) => errors.push(e.message));
    await app.open(path);
    await expect(browser.locator('body')).toBeVisible();
    await expect(browser).toHaveTitle(/\S/);
    expect(errors).toEqual([]);
  });
}
