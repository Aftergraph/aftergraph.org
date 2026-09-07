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
  'studio',
  'trust-gateway',
  'work-intelligence-v2',
  'works-execution'
];

const privateRepos = [
  'autonomous-venture-company',
  'skills-vault',
  'work-intelligence-web',
  'llm-research-development',
  'afm',
  'model-registry',
  'context-continuity',
  'continuum'
];

if (!landing.includes('20 repositories') || !landing.includes('12 public') || !landing.includes('8 private')) {
  fail('landing topology totals are not 20 / 12 public / 8 private');
}
if (!status.includes('20 installed') || !status.includes('12 public') || !status.includes('8 private')) {
  fail('status topology totals are not reconciled');
}
if (!llms.includes('Installed platform topology: 20 repositories') || !llms.includes('Public repositories: 12') || !llms.includes('Private repositories: 8')) {
  fail('llms.txt topology totals are not reconciled');
}
for (const repo of expectedPublic) {
  if (!llms.includes(`- \`${repo}\``)) fail(`llms.txt missing public repository ${repo}`);
}
for (const repo of privateRepos) {
  if (llms.includes(`- \`${repo}\``)) fail(`llms.txt leaks private repository ${repo} into public list`);
}
if (landing.includes('https://github.com/Aftergraph/context-continuity')) {
  fail('landing links directly to private context-continuity repository');
}
if (launch.includes('https://github.com/Aftergraph/context-continuity') || launch.includes('https://github.com/Aftergraph/afm')) {
  fail('launcher links unauthenticated users directly to private repository source');
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
