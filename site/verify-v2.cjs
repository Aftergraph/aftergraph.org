const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const landing = read('index.html');
const launcher = read('launch.html');
const sentinelPage = read('sentinel.html');
const buildWorker = read('build-worker.cjs');
const statusPage = read('status.html');
const statusDataText = read('status-data.json');
const statusData = JSON.parse(statusDataText);
const llms = read('llms.txt');
const worker = fs.existsSync(path.join(root, 'worker.js')) ? read('worker.js') : '';

function has(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

// ponytail: hero contract follows the approved V2 landing (systems hero,
// lifecycle field, control layers) ported over the #14 baseline;
has(landing, 'Infrastructure for verifiable intelligent systems', 'V2 hero headline');
has(landing, 'Mission', 'mission trace');
has(landing, 'Authority', 'authority trace');
has(landing, 'Evidence', 'evidence trace');
has(landing, 'Verified', 'verified outcome trace');
has(landing, 'runtime authority', 'research-integrity principle');
has(landing, 'href="https://docs.aftergraph.org', 'docs cross-link');
has(landing, 'href="/status"', 'landing operational status route');
has(landing, 'prefers-reduced-motion', 'reduced-motion support');
has(landing, ':focus-visible', 'visible focus');
has(landing, 'data-mission-rail', 'golden mission scroll rail');
has(landing, 'requestAnimationFrame', 'rail scroll progression');

has(launcher, 'Build', 'launcher Build group');
has(launcher, 'Platform', 'launcher Platform group');
has(launcher, 'Verify', 'launcher Verify group');
has(launcher, 'Research', 'launcher Research group');
has(launcher, 'Knowledge Plane (docs)', 'launcher Knowledge Plane destination');
has(launcher, 'https://docs.aftergraph.org/', 'launcher Knowledge Plane route');
has(launcher, 'ArrowDown', 'launcher keyboard navigation');
has(launcher, 'ArrowUp', 'launcher keyboard navigation');
has(launcher, 'Escape', 'launcher Escape behavior');
// ponytail: merged launcher now carries full ARIA listbox semantics
// (shipped in the launcher-aria slice); these pin the contract.
has(launcher, 'role="listbox"', 'launcher listbox role');
has(launcher, 'role="option"', 'launcher option semantics');
has(launcher, 'aria-selected', 'launcher selected-state semantics');
has(launcher, 'aria-activedescendant', 'launcher active-descendant semantics');
has(launcher, 'launcher-option-', 'stable launcher option ids');
has(launcher, 'data-i=', 'launcher item affordance');
for (const privateUrl of [
  'https://github.com/Aftergraph/afm',
  'https://github.com/Aftergraph/context-continuity',
  'https://github.com/Aftergraph/skills-vault',
]) {
  assert.ok(!launcher.includes(privateUrl), `private repository link leaked into public launcher: ${privateUrl}`);
}

has(llms, '## Deep index (from the Knowledge Plane)', 'federated Knowledge Plane deep index');
has(llms, 'https://docs.aftergraph.org/llms.txt', 'Knowledge Plane llms federation');
has(llms, '## Platform topology (from Aftergraph/after-graph-governance)', 'public repository allowlist');
has(llms, '## Context packs (ACC-shaped, machine-usable)', 'ACC-shaped context-pack index');
for (const contextPack of [
  'context/index.json',
  'context/platform.json',
  'context/platform.golden-mission.json',
  'context/developers.json',
  'context/research.json',
  'context/standards.json',
]) {
  has(llms, `https://docs.aftergraph.org/${contextPack}`, `context pack ${contextPack}`);
}

has(buildWorker, "read('status.html')", 'status source included in worker build');
has(buildWorker, 'https://aftergraph.org/status', 'status sitemap entry');
has(buildWorker, "p === '/status' || p === '/status/'", 'status worker route');
has(worker, "'Content-Security-Policy'", 'CSP');
has(worker, "'Strict-Transport-Security'", 'HSTS');
has(worker, 'aftergraph-site v', 'versioned health route');
has(worker, 'const STATUS =', 'compiled status surface');
has(worker, "p === '/status' || p === '/status/'", 'compiled status route');

assert.ok(Array.isArray(statusData.repos), 'status-data repos must be an array');
assert.ok(statusData.repos.length > 0, 'status-data must contain public repositories');
assert.ok(statusData.repos.every((repo) => repo.visibility === 'public'), 'status-data must contain public repositories only');
has(statusPage, '20 installed', 'status page installed-repository count');
has(statusPage, '12 public', 'status page public repository count');
has(statusPage, 'docs.aftergraph.org', 'Knowledge Plane evidence link');

const publicSurface = `${landing}\n${launcher}\n${statusPage}\n${statusDataText}\n${llms}\n${worker}`.toLowerCase();
for (const privateRepo of ['context-continuity', 'skills-vault']) {
  assert.ok(!publicSurface.includes(privateRepo), `private repository leaked into public surface: ${privateRepo}`);
}

for (const forbidden of ['customer logos', 'trusted by thousands', 'industry-leading production']) {
  assert.ok(!landing.toLowerCase().includes(forbidden), `forbidden marketing claim: ${forbidden}`);
}

has(sentinelPage, 'Maturity: <b>prototype</b>', 'sentinel maturity label');
has(sentinelPage, 'prefers-reduced-motion', 'sentinel reduced-motion support');
has(sentinelPage, ':focus-visible', 'sentinel visible focus');
has(sentinelPage, 'https://github.com/Aftergraph/sentinel', 'sentinel repository link');
has(sentinelPage, 'href="/launch"', 'sentinel launcher cross-link');
has(sentinelPage, 'PR #482', 'sentinel hero live PR number');
has(sentinelPage, '98af672', 'sentinel hero live PR head');
has(sentinelPage, 'DO_NOT_SHIP', 'sentinel hero verdict');
has(sentinelPage, 'View evidence', 'sentinel hero evidence action');
has(sentinelPage, 'No training on your private code', 'sentinel hero trust line');
has(sentinelPage, 'reproduced', 'sentinel hero finding evidence tick');
has(sentinelPage, 'regression test', 'sentinel hero regression tick');
has(buildWorker, "read('sentinel.html')", 'sentinel source included in worker build');
has(buildWorker, 'https://aftergraph.org/sentinel', 'sentinel sitemap entry');
has(buildWorker, "p === '/sentinel' || p === '/sentinel/'", 'sentinel worker route');
has(worker, 'const SENTINEL =', 'compiled sentinel surface');
has(llms, 'https://aftergraph.org/sentinel', 'sentinel llms entry');
for (const forbidden of ['trusted by thousands', 'industry-leading production', 'customer logos']) {
  assert.ok(!sentinelPage.toLowerCase().includes(forbidden), `forbidden marketing claim on sentinel page: ${forbidden}`);
}

console.log('Aftergraph V2 contract: PASS');
