// Fail-closed gate for AtlasProjection v0.2 artifacts.
// Usage: node site/verify-atlas.cjs [site/atlas-projection.json]
// Exit 0 = PASS, exit 1 = FAIL with VERIFY-FAIL lines. No network, no writes.
const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || path.join(__dirname, 'atlas-projection.json');
let failCount = 0;
const fail = (message) => {
  console.error(`VERIFY-FAIL: ${message}`);
  failCount += 1;
};

let proj;
try {
  proj = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  fail(`cannot read projection JSON at ${FILE}: ${e.message}`);
  process.exit(1);
}

if (proj.schema !== 'atlas-projection/0.2') fail(`schema is ${JSON.stringify(proj.schema)}, want atlas-projection/0.2`);
if (!proj.meta || !/^[0-9a-f]{40}$/.test(proj.meta.gov_sha || '')) fail('meta.gov_sha must be a full 40-hex SHA');
if (!proj.meta || !/^\d{4}-\d{2}-\d{2}T/.test(proj.meta.evidence_cut || '')) fail('meta.evidence_cut must be ISO-8601 UTC');
const pins = (proj.meta && proj.meta.repo_pins) || {};
const privateRepos = new Set((proj.meta && proj.meta.private_repos) || []);
if (Object.keys(pins).length < 1) fail('meta.repo_pins is empty (no manually maintained repo list allowed, but pins must be generated)');
for (const [repo, sha] of Object.entries(pins)) {
  if (!/^[0-9a-f]{40}$/.test(sha)) fail(`repo_pins[${repo}] is not a full 40-hex SHA`);
  if (privateRepos.has(repo)) fail(`repo_pins[${repo}] is a private repo — exact private HEADs must not ship`);
}

const entities = new Map((proj.entities || []).map((e) => [e.id, e]));
for (const e of proj.entities || []) {
  if ('truth_plane' in e) fail(`entity ${e.id} carries truth_plane (planes live on assertions only)`);
  if (!['repository', 'contract', 'capability', 'model', 'study'].includes(e.kind)) fail(`entity ${e.id} has bad kind`);
}

const PROV_KEYS = ['source', 'source_type', 'repository', 'ref', 'evidence_level'];
const checkProv = (x, what) => {
  for (const k of PROV_KEYS) {
    if (!x.provenance || !x.provenance[k]) fail(`${what} ${x.id} missing provenance.${k}`);
  }
  if (!['CANONICAL', 'OBSERVED', 'PROPOSED'].includes(x.truth_plane)) fail(`${what} ${x.id} bad truth_plane`);
  if (!('conflict_id' in x)) fail(`${what} ${x.id} missing conflict_id`);
  if (!x.observed_at) fail(`${what} ${x.id} missing observed_at`);
};
for (const a of proj.assertions || []) {
  checkProv(a, 'assertion');
  if (!entities.has(a.subject)) fail(`assertion ${a.id} unknown subject ${a.subject}`);
  if (a.predicate === 'head_sha' && !/^[0-9a-f]{40}$/.test(a.value || '')) fail(`assertion ${a.id} abbreviated head_sha`);
}
for (const r of proj.relations || []) {
  checkProv(r, 'relation');
  if (!entities.has(r.source)) fail(`relation ${r.id} unknown source`);
  if (!entities.has(r.target)) fail(`relation ${r.id} unknown target`);
}

// Private-source boundary: public artifact must not carry private repo internals.
const privateSubjects = new Set([...privateRepos].map((n) => `repo:${n}`));
// The public governance SHA is exempt: canonical assertions legitimately cite it.
const govSha = (proj.meta && proj.meta.gov_sha) || '';
const leaksHead = (subject, ref) =>
  privateSubjects.has(subject) && /^[0-9a-f]{40}$/.test(ref || '') && ref !== govSha;
for (const a of proj.assertions || []) {
  const e = entities.get(a.subject);
  if (e && e.kind === 'repository' && e.identity && e.identity.visibility === 'private') {
    if (['head_sha', 'head_msg', 'pushed_at', 'open_pr'].includes(a.predicate)) {
      fail(`private-source leak: ${a.predicate} on ${a.subject}`);
    }
  }
  // E18 second vector: exact private HEADs must not hide in provenance refs of
  // otherwise-allowed predicates either (refs for private repos are branch-pinned).
  if (leaksHead(a.subject, a.provenance && a.provenance.ref)) {
    fail(`private-source leak: exact-head ref on ${a.subject} (${a.id})`);
  }
}
for (const r of proj.relations || []) {
  if (leaksHead(r.source, r.provenance && r.provenance.ref) || leaksHead(r.target, r.provenance && r.provenance.ref)) {
    fail(`private-source leak: exact-head ref on relation ${r.id}`);
  }
}

// Conflict references must resolve.
const assertionIds = new Set((proj.assertions || []).map((a) => a.id));
for (const c of proj.conflicts || []) {
  for (const p of c.pairs || []) {
    if (!assertionIds.has(p.a)) fail(`conflict ${c.id} references unknown assertion ${p.a}`);
    if (!assertionIds.has(p.b)) fail(`conflict ${c.id} references unknown assertion ${p.b}`);
  }
  for (const s of c.subjects || []) {
    if (!entities.has(s)) fail(`conflict ${c.id} references unknown entity ${s}`);
  }
}

if (failCount === 0) {
  console.log(
    `ATLAS-VERIFY PASS: ${(proj.entities || []).length} entities, ${(proj.assertions || []).length} assertions, ` +
      `${(proj.relations || []).length} relations, ${(proj.conflicts || []).length} conflicts (${FILE})`
  );
} else {
  console.error(`ATLAS-VERIFY FAIL: ${failCount} violation(s)`);
  process.exitCode = 1;
}
