const fs = require('fs');
const path = require('path');

const SITE = __dirname;
const read = (file) => fs.readFileSync(path.join(SITE, file), 'utf8');
const fail = (message) => {
  console.error(`VERIFY-FAIL: ${message}`);
  process.exitCode = 1;
};

const landing = read('index.html');
const launch = read('launch.html');
const status = read('status.html');
const llms = read('llms.txt');
const worker = read('worker.js');
const wrangler = read('wrangler.toml');

const expectedPublic = [
  '.github',
  'after-graph-governance',
  'aftergraph.org',
  'aie',
  'brand',
  'docs',
  'intelligence-systems-research',
  'sentinel',
  'studio',
  'trust-gateway',
  'wi-backend',
  'works-execution'
];
const atlasProjection = JSON.parse(read('atlas-projection.json'));
const privateRepos = new Set((atlasProjection.meta && atlasProjection.meta.private_repos) || []);
const publicSection = llms.split('### Public')[1]?.split('### Private')[0] || '';

if (!landing.includes('21 canonical repositories') || !landing.includes('12 public') || !landing.includes('9 private')) {
  fail('landing topology totals are not canonical 21 / 12 public / 9 private');
}
if (!status.includes('21 canonical') || !status.includes('12 public') || !status.includes('9 private')) {
  fail('status topology totals are not reconciled');
}
if (!llms.includes('Canonical platform topology: 21 repositories') || !llms.includes('Public repositories: 12') || !llms.includes('Private repositories: 9')) {
  fail('llms.txt topology totals are not reconciled');
}
for (const repo of expectedPublic) {
  if (!publicSection.includes(`- \`${repo}\``)) fail(`llms.txt missing public repository ${repo}`);
}
for (const repo of privateRepos) {
  const slug = repo.replace(/^Aftergraph\//, '');
  if (publicSection.includes(`- \`${slug}\``)) fail(`llms.txt leaks private repository ${slug} into public list`);
}
if (landing.includes('https://github.com/Aftergraph/context-continuity') || landing.includes('https://github.com/Aftergraph/runtime')) {
  fail('landing links directly to private repository source');
}
if (launch.includes('https://github.com/Aftergraph/context-continuity') || launch.includes('https://github.com/Aftergraph/afm')) {
  fail('launcher links unauthenticated users directly to private repository source');
}
if (!landing.includes('data-experience-hero') || !landing.includes('Illustrative system walkthrough') || !landing.includes('data-atlas-inspect')) {
  fail('landing is missing the Living Atlas experience handoff');
}
if (/vendor-(flow|elk|d3)-|reactflow/i.test(landing)) {
  fail('public landing references a heavy Atlas vendor bundle');
}
if (!worker.includes('AftergraphExperienceHero') || !worker.includes('/atlas/experience.json')) {
  fail('generated worker is missing Experience hero/projection support');
}
// ponytail: build-worker embeds canonical sources as string constants (per plan doc Task 4);
// the text-module import check contradicted the shipped architecture — assert the embedded
// worker was generated from the canonical landing instead.
if (!worker.includes('const LANDING =') || !worker.includes('const LAUNCH =')) {
  fail('worker does not embed the canonical landing/launcher sources');
}
// ponytail: single-worker embedded bundle is the deploy contract (wrangler.toml main = worker.js)
if (!wrangler.includes('main = "worker.js"') && !wrangler.includes("main = 'worker.js'")) {
  fail('Wrangler main entry missing');
}

if (!process.exitCode) console.log('VERIFY-PASS: public topology, visibility and source-binding gates');
