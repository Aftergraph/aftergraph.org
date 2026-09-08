const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const landing = read('index.html');
const launcher = read('launch.html');
const sentinelPage = read('sentinel.html');
const communityPage = read('community.html');
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
has(landing, 'href="/community"', 'community navigation route');
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
has(launcher, 'Aftergraph Discussions', 'launcher community destination');
has(launcher, 'PUBLIC-ROADMAP.md', 'launcher public roadmap destination');
has(launcher, 'discussions/17', 'launcher RFC intake destination');
has(launcher, 'ArrowDown', 'launcher keyboard navigation');
has(launcher, 'ArrowUp', 'launcher keyboard navigation');
has(launcher, 'Escape', 'launcher Escape behavior');
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
  'https://github.com/Aftergraph/runtime',
]) {
  assert.ok(!launcher.includes(privateUrl), `private repository link leaked into public launcher: ${privateUrl}`);
}

// Community is a public deliberation projection, never a new source of truth.
has(communityPage, 'Public deliberation plane', 'community purpose');
has(communityPage, 'github.com/orgs/Aftergraph/discussions', 'organization Discussions route');
has(communityPage, 'PUBLIC-ROADMAP.md', 'public roadmap route');
has(communityPage, 'RFC-PROCESS.md', 'RFC process route');
has(communityPage, 'Discussion is not authority', 'community evidence boundary');
has(communityPage, 'discussions/12', 'MISSION-Bench registry');
has(communityPage, 'discussions/13', 'prior-art challenge');
has(communityPage, 'discussions/14', 'architecture RFC');
has(communityPage, 'discussions/15', 'Sentinel verdict thread');
has(communityPage, 'discussions/16', 'public roadmap thread');
has(communityPage, 'discussions/17', 'RFC intake thread');
assert.ok(!communityPage.includes('https://github.com/Aftergraph/runtime'), 'private Runtime source leaked into community page');
assert.ok(!communityPage.includes('https://github.com/Aftergraph/context-continuity'), 'private Continuity source leaked into community page');

has(llms, '## Deep index (from the Knowledge Plane)', 'federated Knowledge Plane deep index');
has(llms, 'https://docs.aftergraph.org/llms.txt', 'Knowledge Plane llms federation');
has(llms, 'https://aftergraph.org/community', 'community llms entry');
has(llms, 'https://github.com/orgs/Aftergraph/discussions', 'Discussions llms entry');
has(llms, 'PUBLIC-ROADMAP.md', 'roadmap llms entry');
has(llms, 'RFC-PROCESS.md', 'RFC process llms entry');
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

// Reconciled against aftergraph.org main after #54 so topology/privacy assertions
// remain independent of the newer copy, metadata, navigation and a11y surface.
// Canonical public topology is a projection of Governance truth, not installed
// repo discovery. Runtime is currently private and therefore must not appear in
// the public source allowlist even though the Runtime capability is public-facing.
has(llms, 'Canonical platform topology: 21 repositories', 'canonical topology count');
has(llms, 'Public repositories: 12', 'canonical public repository count');
has(llms, 'Private repositories: 9', 'canonical private repository count');
const llmsPublic = llms.split('### Public')[1]?.split('### Private')[0] || '';
has(llmsPublic, '`wi-backend`', 'canonical Wie backend repo');
has(llmsPublic, '`sentinel`', 'Sentinel public repo');
assert.ok(!llmsPublic.includes('`runtime`'), 'private Runtime repository leaked into llms public allowlist');
assert.ok(!llms.includes('work-intelligence-v2'), 'legacy Work Intelligence repo slug leaked into llms');
assert.ok(!llms.includes('13 canonical cross-repo contracts'), 'volatile contract count must not be hardcoded in llms');

has(buildWorker, "read('status.html')", 'status source included in worker build');
has(buildWorker, "read('community.html')", 'community source included in worker build');
has(buildWorker, 'https://aftergraph.org/status', 'status sitemap entry');
has(buildWorker, 'https://aftergraph.org/community', 'community sitemap entry');
has(buildWorker, "p === '/status' || p === '/status/'", 'status worker route');
has(buildWorker, "p === '/community' || p === '/community/'", 'community worker route');
has(worker, "'Content-Security-Policy'", 'CSP');
has(worker, "'Strict-Transport-Security'", 'HSTS');
has(worker, 'aftergraph-site v', 'versioned health route');
has(worker, 'const STATUS =', 'compiled status surface');
has(worker, 'const COMMUNITY =', 'compiled community surface');
has(worker, "p === '/status' || p === '/status/'", 'compiled status route');
has(worker, "p === '/community' || p === '/community/'", 'compiled community route');

assert.ok(Array.isArray(statusData.repos), 'status-data repos must be an array');
assert.ok(statusData.repos.length > 0, 'status-data must contain public repositories');
assert.ok(statusData.repos.every((repo) => repo.visibility === 'public'), 'status-data must contain public repositories only');
assert.ok(!statusData.repos.some((repo) => repo.name === 'runtime'), 'private Runtime repository leaked into status data');
assert.ok(!statusData.repos.some((repo) => repo.name === 'work-intelligence-v2'), 'legacy Work Intelligence slug leaked into status data');
assert.ok(statusData.repos.some((repo) => repo.name === 'wi-backend'), 'status data must use canonical wi-backend slug');
has(statusPage, '21 canonical', 'status page canonical repository count');
has(statusPage, '12 public', 'status page public repository count');
has(statusPage, '9 private', 'status page private repository count');
has(statusPage, 'wi-backend', 'status page canonical Wie backend slug');
has(statusPage, 'wie.aftergraph.org/api/healthz', 'Wie production health endpoint');
assert.ok(!statusPage.includes('work-intelligence-v2'), 'legacy Work Intelligence slug leaked into status page');
assert.ok(!statusPage.includes('github.com/Aftergraph/runtime'), 'private Runtime repository link leaked into status page');
has(statusPage, 'docs.aftergraph.org', 'Knowledge Plane evidence link');

const publicSurface = `${landing}\n${launcher}\n${statusPage}\n${statusDataText}\n${llms}\n${communityPage}\n${worker}`.toLowerCase();
for (const privateRepo of ['context-continuity', 'skills-vault']) {
  assert.ok(!publicSurface.includes(privateRepo), `private repository leaked into public surface: ${privateRepo}`);
}

for (const forbidden of ['customer logos', 'trusted by thousands', 'industry-leading production']) {
  assert.ok(!landing.toLowerCase().includes(forbidden), `forbidden marketing claim: ${forbidden}`);
  assert.ok(!communityPage.toLowerCase().includes(forbidden), `forbidden marketing claim on community page: ${forbidden}`);
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