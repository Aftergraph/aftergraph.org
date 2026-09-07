const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const landing = read('index.html');
const launcher = read('launch.html');
const buildWorker = read('build-worker.cjs');
const statusPage = read('status.html');
const statusDataText = read('status-data.json');
const statusData = JSON.parse(statusDataText);
const llms = read('llms.txt');
const worker = fs.existsSync(path.join(root, 'worker.js')) ? read('worker.js') : '';

function has(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

has(landing, 'Infrastructure for', 'V2 hero headline prefix');
has(landing, 'verifiable', 'V2 hero emphasis');
has(landing, 'intelligent systems.', 'V2 hero headline suffix');
has(landing, 'Mission', 'mission trace');
has(landing, 'Authority', 'authority trace');
has(landing, 'Evidence', 'evidence trace');
has(landing, 'Verified', 'verified outcome trace');
has(landing, 'Complete != Verified', 'research-integrity principle');
has(landing, 'href="https://docs.aftergraph.org', 'docs cross-link');
has(landing, 'href="/status"', 'landing operational status route');
has(landing, 'prefers-reduced-motion', 'reduced-motion support');
has(landing, ':focus-visible', 'visible focus');

has(launcher, 'Build', 'launcher Build group');
has(launcher, 'Operate', 'launcher Operate group');
has(launcher, 'Verify', 'launcher Verify group');
has(launcher, 'Research', 'launcher Research group');
has(launcher, "name:'Knowledge Plane'", 'launcher Knowledge Plane destination');
has(launcher, 'https://docs.aftergraph.org/', 'launcher Knowledge Plane route');
assert.ok(/role=["']option["']|setAttribute\(["']role["'],\s*["']option["']\)/.test(launcher), 'missing launcher option semantics');
has(launcher, 'aria-selected', 'launcher selected-state semantics');
has(launcher, 'aria-activedescendant', 'launcher active-descendant semantics');
has(launcher, 'launcher-option-', 'stable launcher option ids');
has(launcher, 'Escape', 'launcher Escape behavior');
has(launcher, 'GROUPS.indexOf(a.item.group)-GROUPS.indexOf(b.item.group)', 'group-stable launcher ordering');
has(launcher, 'let renderIndex=0', 'DOM-aligned launcher selection index');

has(llms, '## Deep index (Knowledge Plane)', 'federated Knowledge Plane deep index');
has(llms, 'https://docs.aftergraph.org/llms.txt', 'Knowledge Plane llms federation');
has(llms, 'Public repositories represented by this surface', 'public repository allowlist');

has(buildWorker, "const st = read('status.html')", 'status source included in worker build');
has(buildWorker, 'https://aftergraph.org/status', 'status sitemap entry');
has(buildWorker, "p === '/status' || p === '/status/'", 'status worker route');
has(worker, "'Content-Security-Policy'", 'CSP');
has(worker, "'Strict-Transport-Security'", 'HSTS');
has(worker, 'aftergraph-site v2.0.0', 'V2 health route');
has(worker, 'const STATUS =', 'compiled status surface');
has(worker, "p === '/status' || p === '/status/'", 'compiled status route');

assert.ok(Array.isArray(statusData.repos), 'status-data repos must be an array');
assert.ok(statusData.repos.length > 0, 'status-data must contain public repositories');
assert.ok(statusData.repos.every((repo) => repo.visibility === 'public'), 'status-data must contain public repositories only');
has(statusPage, `(${statusData.repos.length} public repositories`, 'status page public repository count');
has(statusPage, 'Knowledge Plane build', 'Knowledge Plane build evidence card');
has(statusPage, 'https://docs.aftergraph.org/build-manifest.json', 'source-owned Knowledge Plane build manifest route');

const publicSurface = `${landing}\n${launcher}\n${statusPage}\n${statusDataText}\n${llms}\n${worker}`.toLowerCase();
for (const privateRepo of ['context-continuity', 'skills-vault']) {
  assert.ok(!publicSurface.includes(privateRepo), `private repository leaked into public surface: ${privateRepo}`);
}

for (const forbidden of ['customer logos', 'trusted by thousands', 'industry-leading production']) {
  assert.ok(!landing.toLowerCase().includes(forbidden), `forbidden marketing claim: ${forbidden}`);
}

console.log('Aftergraph V2 contract: PASS');
