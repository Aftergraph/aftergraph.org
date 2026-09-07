const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const landing = read('index.html');
const launcher = read('launch.html');
const worker = fs.existsSync(path.join(root, 'worker.js')) ? read('worker.js') : '';

function has(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

has(landing, 'Infrastructure for verifiable intelligent systems.', 'V2 hero headline');
for (const step of ['Mission', 'Authority', 'Execution', 'Evidence', 'Verification', 'Verified']) {
  has(landing, step, `${step} lifecycle step`);
}
has(landing, 'Complete != Verified', 'research-integrity principle');
has(landing, 'href="https://docs.aftergraph.org', 'docs cross-link');
has(landing, 'prefers-reduced-motion', 'reduced-motion support');
has(landing, ':focus-visible', 'visible focus');
for (const group of ['Build', 'Operate', 'Verify', 'Research']) {
  has(launcher, group, `launcher ${group} group`);
}
has(launcher, 'role="listbox"', 'launcher listbox semantics');
has(launcher, 'role="option"', 'launcher option semantics');
has(launcher, 'aria-selected', 'launcher selected-state semantics');
has(launcher, 'Escape', 'launcher Escape behavior');
for (const header of ["'Content-Security-Policy'", "'Strict-Transport-Security'"]) {
  has(worker, header, header.replaceAll("'", ''));
}
has(worker, '\\"route\\":\\"aftergraph-site v2.0.0\\"', 'V2 health route');

for (const forbidden of ['customer logos', 'trusted by thousands', 'industry-leading production']) {
  assert.ok(!landing.toLowerCase().includes(forbidden), `forbidden marketing claim: ${forbidden}`);
}

console.log('Aftergraph V2 contract: PASS');
