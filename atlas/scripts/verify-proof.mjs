import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8474/index.html';
const browser = await chromium.launch({ headless: true });

async function verifyCase({ health, provenance, expectedState, expectedLabel, expectedSha }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route('**/healthz', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(health),
  }));
  await page.route('**/provenance.json', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(provenance),
  }));
  await page.goto(base, { waitUntil: 'networkidle' });

  const state = page.locator('[data-proof-state]');
  await state.waitFor();
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-proof-state]');
    return el && el.dataset.state && el.dataset.state !== 'loading';
  });

  assert.equal(await state.getAttribute('data-state'), expectedState);
  assert.equal((await state.textContent())?.trim(), expectedLabel);

  const sha = (await page.locator('[data-proof-sha]').textContent())?.trim();
  assert.equal(sha, expectedSha);

  if (expectedState === 'ok') {
    const href = await page.locator('[data-proof-commit]').getAttribute('href');
    assert.equal(href, 'https://github.com/Aftergraph/aftergraph.org/commit/' + provenance.sha);
  }

  await page.close();
}

try {
  const health = {
    status: 'ok',
    sha: '0123456789abcdef0123456789abcdef01234567',
    deployed: '2026-10-01T21:45:00Z',
    route: 'aftergraph-site v1.2.0',
  };
  const provenance = {
    schema: 'aftergraph-deploy-provenance/1.0',
    repository: 'Aftergraph/aftergraph.org',
    sha: health.sha,
    deployed: health.deployed,
    route: health.route,
  };

  await verifyCase({
    health,
    provenance,
    expectedState: 'ok',
    expectedLabel: 'Deploy provenance verified',
    expectedSha: provenance.sha,
  });

  await verifyCase({
    health,
    provenance: { ...provenance, sha: 'ffffffffffffffffffffffffffffffffffffffff' },
    expectedState: 'error',
    expectedLabel: 'Provenance mismatch',
    expectedSha: 'unverified',
  });

  console.log('Aftergraph live proof browser contract: PASS');
} finally {
  await browser.close();
}
