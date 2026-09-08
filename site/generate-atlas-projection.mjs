#!/usr/bin/env node
// Generates site/atlas/projection.json (AtlasProjection v0.2) from:
//   --ledger <dir>  observed_raw.json + obs_<repo>.json at an exact evidence cut (OBSERVED/PROPOSED)
//   --gov <dir>     after-graph-governance clone; canonical files read from origin/<branch> (CANONICAL)
//   --out <file>    projection output
//   --gov-branch <name, default main>, --now <ISO UTC, default current time>
// Planes live on assertions, never on entities. Rename shadows are kept verbatim.
// Private-source boundary: private repos expose slug/role/plane/visibility/presence only;
// heads, messages, push dates and PRs are withheld with an explicit marker.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

function arg(name, def = undefined) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) {
    if (def !== undefined) return def;
    throw new Error(`Missing ${name}`);
  }
  return process.argv[i + 1];
}

const LEDGER = arg('--ledger');
const GOV = arg('--gov');
const OUT = arg('--out');
const BRANCH = arg('--gov-branch', 'main');
const NOW = arg('--now', new Date().toISOString().replace(/\.\d+Z$/, 'Z'));
const SNAPSHOT_DIR = arg('--snapshot-dir', null);

// Rename map: canonical legacy slug -> observed slug (kept as data, edges NOT rewritten).
const RENAMES = {
  'work-intelligence-v2': 'wi-backend',
  'work-intelligence-web': 'wi-frontend',
};

function sh(cmd) {
  return execSync(cmd, { cwd: GOV, stdio: 'pipe' }).toString().trim();
}

let fetched = true;
try {
  sh(`git fetch --quiet origin ${BRANCH}`);
} catch {
  fetched = false;
}
let govSha;
try {
  govSha = sh(`git rev-parse origin/${BRANCH}`);
} catch {
  govSha = sh('git rev-parse HEAD');
  fetched = false;
}
if (!/^[0-9a-f]{40}$/.test(govSha)) throw new Error(`bad gov sha: ${govSha}`);

function govShow(p) {
  return execSync(`git show ${govSha}:${p}`, { cwd: GOV, stdio: 'pipe' }).toString();
}

const topology = JSON.parse(govShow('docs/platform-topology/1.0.json'));
const depsYml = govShow('dependencies.yml');

// Minimal indentation parser for the observed dependencies.yml shape:
// top-level `modules:`, 2-space `name:`, 4-space scalar keys, inline [a, b] lists.
function parseDeps(src) {
  const modules = {};
  let cur = null;
  for (const line of src.split('\n')) {
    if (/^modules:\s*$/.test(line)) continue;
    let m = line.match(/^  ([A-Za-z0-9._-]+):\s*$/);
    if (m) {
      cur = m[1];
      modules[cur] = {};
      continue;
    }
    if (!cur) continue;
    m = line.match(/^    ([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    const t = v.trim();
    if (t.startsWith('[') && t.endsWith(']')) {
      const inner = t.slice(1, -1).trim();
      modules[cur][k] = inner ? inner.split(',').map((s) => s.trim()).filter(Boolean) : [];
    } else {
      modules[cur][k] = t;
    }
  }
  return modules;
}
const modules = parseDeps(depsYml);

const raw = JSON.parse(fs.readFileSync(path.join(LEDGER, 'observed_raw.json'), 'utf8'));
const CUT = raw.evidence_cut;
const observed = {};
for (const f of fs.readdirSync(LEDGER)) {
  if (!f.startsWith('obs_') || !f.endsWith('.json')) continue;
  const d = JSON.parse(fs.readFileSync(path.join(LEDGER, f), 'utf8'));
  observed[d.repo] = d;
}

const shortOf = (full) => full; // obs files keyed by short slug already
const canonByName = new Map(topology.repositories.map((r) => [r.name, r]));

const entities = new Map(); // id -> {id, kind, identity}
const assertions = [];
const relations = [];
const conflicts = [];

function addEntity(id, kind, identity) {
  if (!entities.has(id)) entities.set(id, { id, kind, identity });
  return entities.get(id);
}

function sid(...parts) {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);
}

function prov(source, source_type, repository, ref, evidence_level) {
  return { source, source_type, repository, ref, evidence_level };
}

function addAssertion(subject, predicate, value, truth_plane, provenance, valid_at, conflict_id = null) {
  const a = {
    id: `as-${sid(subject, predicate, truth_plane, JSON.stringify(value))}`,
    subject,
    predicate,
    value,
    truth_plane,
    provenance,
    observed_at: truth_plane === 'CANONICAL' ? NOW : CUT,
    valid_at: valid_at ?? null,
    freshness: truth_plane === 'CANONICAL' && !fetched ? 'unknown' : 'fresh',
    conflict_id,
  };
  assertions.push(a);
  return a;
}

function addRelation(source, target, relation, truth_plane, provenance, conflict_id = null) {
  const r = {
    id: `rel-${sid(source, relation, target, truth_plane, JSON.stringify(provenance))}`,
    source,
    relation,
    target,
    truth_plane,
    provenance,
    observed_at: truth_plane === 'CANONICAL' ? NOW : CUT,
    freshness: truth_plane === 'CANONICAL' && !fetched ? 'unknown' : 'fresh',
    conflict_id,
  };
  relations.push(r);
  return r;
}

const govProv = (evidence_level = 'canonical') =>
  prov(
    `Aftergraph/after-graph-governance docs/platform-topology/1.0.json@${govSha.slice(0, 7)}`,
    'governance-file',
    'Aftergraph/after-graph-governance',
    govSha,
    evidence_level
  );
const depsProv = () =>
  prov(
    `Aftergraph/after-graph-governance dependencies.yml@${govSha.slice(0, 7)}`,
    'governance-file',
    'Aftergraph/after-graph-governance',
    govSha,
    'canonical'
  );
const ghProv = (repo, ref, evidence_level) =>
  prov(`github-api repos/Aftergraph/${repo}`, 'github-api', `Aftergraph/${repo}`, ref, evidence_level);

// ---- repository entities: union of observed slugs + canonical-only names ----
const canonNames = new Set(topology.repositories.map((r) => r.name));
const observedNames = new Set(Object.keys(observed));
const renamedFrom = new Map(Object.entries(RENAMES)); // legacy -> current
const renamedTo = new Map(Object.entries(RENAMES).map(([a, b]) => [b, a])); // current -> legacy

for (const name of observedNames) {
  const d = observed[name];
  const legacy = renamedTo.get(name);
  addEntity(`repo:Aftergraph/${name}`, 'repository', {
    full_name: `Aftergraph/${name}`,
    aliases: legacy ? [legacy] : [],
    visibility: d.meta.private ? 'private' : 'public',
  });
}
for (const name of canonNames) {
  if (observedNames.has(name) || renamedFrom.has(name)) {
    if (renamedFrom.has(name)) {
      // Canonical-only legacy entity: canonical claims live here, never on the renamed entity.
      addEntity(`repo:Aftergraph/${name}`, 'repository', {
        full_name: `Aftergraph/${name}`,
        aliases: [],
        visibility: canonByName.get(name).visibility,
      });
    }
    continue;
  }
  const c = canonByName.get(name);
  addEntity(`repo:Aftergraph/${name}`, 'repository', {
    full_name: `Aftergraph/${name}`,
    aliases: [],
    visibility: c.visibility,
  });
}

// ---- contract entities + relations from dependencies.yml (kept verbatim) ----
function contractId(name, version) {
  return version ? `contract:${name}/${version}` : `contract:${name}`;
}
// Split a consumes/provides entry into {repo?, contract?, version?}.
function splitTarget(entry) {
  const dot = entry.indexOf('.');
  if (dot === -1) return { repo: entry, contract: null, version: null };
  const owner = entry.slice(0, dot);
  const rest = entry.slice(dot + 1);
  const slash = rest.indexOf('/');
  if (slash === -1) return { repo: owner, contract: rest, version: null };
  return { repo: owner, contract: rest.slice(0, slash), version: rest.slice(slash + 1) };
}
function repoEntityId(short) {
  return `repo:Aftergraph/${short}`;
}
// Ensure repo entities exist for every module + every bare repo target.
for (const [mod, m] of Object.entries(modules)) {
  if (!entities.has(repoEntityId(m.repo?.split('/')[1] ?? mod))) {
    addEntity(repoEntityId(mod), 'repository', { full_name: `Aftergraph/${mod}`, aliases: [], visibility: 'unknown' });
  }
}
for (const [mod, m] of Object.entries(modules)) {
  const src = repoEntityId(m.repo ? m.repo.split('/')[1] : mod);
  for (const entry of m.consumes ?? []) {
    const t = splitTarget(entry);
    if (t.contract) {
      const cid = contractId(t.contract, t.version);
      addEntity(cid, 'contract', { full_name: cid, aliases: [], visibility: 'unknown' });
      addRelation(src, cid, 'consumes', 'CANONICAL', depsProv());
      const owner = repoEntityId(t.repo);
      if (!entities.has(owner)) {
        addEntity(owner, 'repository', { full_name: `Aftergraph/${t.repo}`, aliases: [], visibility: 'unknown' });
      }
      addRelation(owner, cid, 'owns', 'CANONICAL', depsProv());
    } else {
      const tgt = repoEntityId(t.repo);
      if (!entities.has(tgt)) {
        addEntity(tgt, 'repository', { full_name: `Aftergraph/${t.repo}`, aliases: [], visibility: 'unknown' });
      }
      addRelation(src, tgt, 'consumes', 'CANONICAL', depsProv());
    }
  }
  for (const entry of m.provides ?? []) {
    const cid = contractId(entry, null);
    addEntity(cid, 'contract', { full_name: cid, aliases: [], visibility: 'unknown' });
    addRelation(src, cid, 'provides', 'CANONICAL', depsProv());
  }
}

// ---- CANONICAL assertions from topology ----
for (const r of topology.repositories) {
  const id = repoEntityId(r.name);
  if (!entities.has(id)) continue;
  const p = govProv();
  addAssertion(id, 'slug', r.name, 'CANONICAL', p, null);
  addAssertion(id, 'role', r.role, 'CANONICAL', p, null);
  addAssertion(id, 'plane', r.plane, 'CANONICAL', p, null);
  addAssertion(id, 'visibility', r.visibility, 'CANONICAL', p, null);
  addAssertion(id, 'canonical_branch', r.canonical_branch, 'CANONICAL', p, null);
  if (r.owns) addAssertion(id, 'owns', r.owns, 'CANONICAL', p, null);
}

// ---- OBSERVED + PROPOSED assertions from the evidence cut ----
const WITHHELD = ['head_sha', 'head_msg', 'pushed_at', 'open_pr'];
for (const [name, d] of Object.entries(observed)) {
  const id = repoEntityId(name);
  const isPrivate = !!d.meta.private;
  addAssertion(id, 'slug', name, 'OBSERVED', ghProv(name, d.head.sha, 'observed'), d.head.date);
  addAssertion(id, 'visibility', isPrivate ? 'private' : 'public', 'OBSERVED', ghProv(name, d.head.sha, 'observed'), null);
  addAssertion(id, 'canonical_branch', d.meta.default_branch, 'OBSERVED', ghProv(name, d.head.sha, 'observed'), null);
  if (isPrivate) {
    addAssertion(
      id,
      'withheld',
      { reason: 'private-source-boundary', predicates: WITHHELD },
      'OBSERVED',
      {
        ...ghProv(name, d.head.sha, 'observed'),
        source: `withheld by generator (private-source-boundary): Aftergraph/${name}`,
        source_type: 'generated-derivation',
        evidence_level: 'observed',
      },
      null
    );
    continue;
  }
  addAssertion(id, 'head_sha', d.head.sha, 'OBSERVED', ghProv(name, d.head.sha, 'observed'), d.head.date);
  addAssertion(id, 'head_msg', d.head.msg, 'OBSERVED', ghProv(name, d.head.sha, 'observed'), d.head.date);
  addAssertion(id, 'pushed_at', d.meta.pushed_at, 'OBSERVED', ghProv(name, d.head.sha, 'observed'), d.meta.pushed_at);
  const prs = Array.isArray(d.open_prs) ? d.open_prs : [];
  for (const pr of prs) {
    const val = {
      number: pr.number,
      title: pr.title,
      base: pr.baseRefName,
      head_ref: pr.headRefName,
      head_sha: pr.headRefOid,
      is_draft: pr.isDraft,
      updated_at: pr.updatedAt,
    };
    addAssertion(id, 'open_pr', val, 'PROPOSED', ghProv(name, pr.headRefOid, 'proposed'), pr.updatedAt);
    // A proposed change against this entity (self-scoped until file-level evidence exists).
    addRelation(id, id, 'proposes', 'PROPOSED', ghProv(name, pr.headRefOid, 'proposed'));
  }
}

// ---- presence as DERIVED assertion pairs ----
function presenceValue(name) {
  return { in_canonical: canonNames.has(name), in_observed: observedNames.has(name) };
}
for (const [id, e] of entities) {
  if (e.kind !== 'repository') continue;
  const short = e.identity.full_name.split('/')[1];
  const inObs = observedNames.has(short);
  addAssertion(
    id,
    'presence',
    presenceValue(short),
    inObs ? 'OBSERVED' : 'CANONICAL',
    {
      source: `atlas-generator derivation (topology@${govSha.slice(0, 7)} + cut ${CUT})`,
      source_type: 'generated-derivation',
      repository: 'Aftergraph/after-graph-governance',
      ref: govSha,
      evidence_level: 'derived',
    },
    null
  );
}

// ---- conflicts (both sides cited by assertion id) ----
function findAssertion(subject, predicate, plane) {
  return assertions.find((a) => a.subject === subject && a.predicate === predicate && a.truth_plane === plane);
}
// C1: WI renames.
{
  const pairs = [];
  for (const [legacy, current] of Object.entries(RENAMES)) {
    const a = findAssertion(repoEntityId(legacy), 'slug', 'CANONICAL');
    const b = findAssertion(repoEntityId(current), 'slug', 'OBSERVED');
    if (a && b) {
      a.conflict_id = 'C1';
      b.conflict_id = 'C1';
      pairs.push({ a: a.id, b: b.id, legacy, current });
    }
  }
  if (pairs.length) {
    conflicts.push({
      id: 'C1',
      kind: 'rename',
      status: 'open',
      pairs,
      note: 'GitHub rename-redirect proven 2026-09-08 (old slugs 301 to new); canonical registry still lists legacy slugs.',
    });
  }
}
// C2: observed-only repos with no canonical registration (excluding rename targets).
{
  const subjects = [];
  for (const [id, e] of entities) {
    if (e.kind !== 'repository') continue;
    const short = e.identity.full_name.split('/')[1];
    if (observedNames.has(short) && !canonNames.has(short) && !renamedTo.has(short)) {
      const p = findAssertion(id, 'presence', 'OBSERVED');
      if (p) {
        p.conflict_id = 'C2';
        subjects.push(id);
      }
    }
  }
  subjects.sort();
  if (subjects.length) {
    conflicts.push({
      id: 'C2',
      kind: 'unregistered',
      status: 'open',
      subjects,
      note: 'Live in the org at the evidence cut but absent from canonical topology; needs registration or explicit exclusion.',
    });
  }
}
// C4: intra-canonical drift — dependencies.yml targets legacy slugs the topology dropped.
{
  const subjects = [];
  for (const legacy of Object.keys(RENAMES)) {
    if (!canonNames.has(legacy) && entities.has(repoEntityId(legacy))) {
      subjects.push(repoEntityId(legacy));
    }
  }
  subjects.sort();
  if (subjects.length) {
    conflicts.push({
      id: 'C4',
      kind: 'intra-canonical',
      status: 'open',
      subjects,
      note: 'dependencies.yml still targets legacy WI slugs that platform-topology/1.0 no longer registers; edges kept verbatim as shadows.',
    });
  }
}
// C3: canonical visibility disagrees with observed privacy.
{
  const pairs = [];
  for (const [id, e] of entities) {
    if (e.kind !== 'repository') continue;
    const a = findAssertion(id, 'visibility', 'CANONICAL');
    const b = findAssertion(id, 'visibility', 'OBSERVED');
    if (a && b && a.value !== b.value) {
      a.conflict_id = 'C3';
      b.conflict_id = 'C3';
      pairs.push({ a: a.id, b: b.id, canonical: a.value, observed: b.value });
    }
  }
  if (pairs.length) {
    conflicts.push({
      id: 'C3',
      kind: 'visibility',
      status: 'open',
      pairs,
      note: 'Canonical topology visibility disagrees with observed repository privacy; private-source boundary follows OBSERVED.',
    });
  }
}

conflicts.sort((x, y) => (x.id < y.id ? -1 : 1));
const byId = (arr) => [...arr].sort((x, y) => (x.id < y.id ? -1 : 1));

const repoPins = {};
for (const [name, d] of Object.entries(observed)) {
  if (!/^[0-9a-f]{40}$/.test(d.head.sha)) throw new Error(`bad head sha for ${name}`);
  repoPins[`Aftergraph/${name}`] = d.head.sha;
}

const projection = {
  schema: 'atlas-projection/0.2',
  meta: {
    evidence_cut: CUT,
    generator: 'site/generate-atlas-projection.mjs',
    gov_sha: govSha,
    gov_topology: 'docs/platform-topology/1.0.json',
    repo_pins: Object.fromEntries(Object.entries(repoPins).sort(([a], [b]) => (a < b ? -1 : 1))),
    snapshot_of: null,
  },
  entities: byId([...entities.values()]),
  assertions: byId(assertions),
  relations: byId(relations),
  conflicts,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const outText = JSON.stringify(projection, null, 2) + '\n';
fs.writeFileSync(OUT, outText);
const n = (k) => projection[k].length;
console.log(`projection v0.2: ${n('entities')} entities, ${n('assertions')} assertions, ${n('relations')} relations, ${n('conflicts')} conflicts -> ${OUT}`);

// Versioned snapshots: immutable history. An existing snapshot for the same cut
// must be byte-identical or generation fails closed (never rewrite history).
if (SNAPSHOT_DIR) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const stamp = CUT.replace(/[:]/g, '-');
  const snapFile = `projection-${stamp}.json`;
  const snapPath = path.join(SNAPSHOT_DIR, snapFile);
  if (fs.existsSync(snapPath)) {
    const prior = fs.readFileSync(snapPath, 'utf8');
    if (prior !== outText) {
      throw new Error(`snapshot ${snapFile} exists with different content — history is immutable (new cut required)`);
    }
  } else {
    fs.writeFileSync(snapPath, outText);
  }
  const indexPath = path.join(SNAPSHOT_DIR, 'index.json');
  let index = [];
  if (fs.existsSync(indexPath)) index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  if (!index.some((e) => e.file === snapFile)) {
    index.push({
      file: snapFile,
      evidence_cut: CUT,
      gov_sha: govSha,
      entities: n('entities'),
      assertions: n('assertions'),
      relations: n('relations'),
      conflicts: conflicts.map((c) => c.id),
    });
    index.sort((a, b) => (a.evidence_cut < b.evidence_cut ? -1 : 1));
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
  }
  console.log(`snapshot: ${snapFile} (${index.length} in index)`);
}
