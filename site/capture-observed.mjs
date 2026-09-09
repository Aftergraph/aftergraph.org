// Capture a fresh OBSERVED evidence cut for Atlas.
// Usage: node site/capture-observed.mjs --out <ledger-dir> [--now <ISO UTC>]
// Reads the live Aftergraph org via gh CLI (repo meta, default-branch head,
// open PRs) and writes observed_raw.json + obs_<repo>.json in the exact shapes
// site/generate-atlas-projection.mjs consumes.
// NOTE: the ledger dir holds exact private HEADs and other non-public state —
// it lives OUTSIDE the repo and must never be committed. The generator redacts
// private internals before anything ships. No network writes, only gh reads.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const arg = (name, dflt = null) => {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) {
    if (dflt !== null) return dflt;
    throw new Error(`missing required arg ${name}`);
  }
  return process.argv[i + 1];
};

const OUT = arg('--out');
const NOW = arg('--now', new Date().toISOString().replace(/\.\d+Z$/, 'Z'));

const gh = (args) => JSON.parse(execFileSync('gh', ['api', ...args], { stdio: 'pipe' }).toString());

fs.mkdirSync(OUT, { recursive: true });

const repos = gh(['orgs/Aftergraph/repos', '--paginate']).map((r) => r.name);
console.log(`org repos: ${repos.length}`);

const cut = [];
for (const repo of repos.sort()) {
  const meta = gh([
    `repos/Aftergraph/${repo}`,
    '-q',
    '{default_branch: .default_branch, private: .private, archived: .archived, pushed_at: .pushed_at}',
  ]);
  const branch = meta.default_branch || 'main';
  const commit = gh([
    `repos/Aftergraph/${repo}/commits/${encodeURIComponent(branch)}`,
    '-q',
    '{sha: .sha, msg: (.commit.message | split("\n")[0]), date: .commit.author.date}',
  ]);
  const prs = gh([
    `repos/Aftergraph/${repo}/pulls?state=open&per_page=100`,
    '--paginate',
    '-q',
    '[.[] | {baseRefName: .base.ref, headRefName: .head.ref, headRefOid: .head.sha, isDraft: .draft, number: .number, title: .title, updatedAt: .updated_at}]',
  ]);
  const entry = {
    repo,
    observed_at: NOW,
    head: { date: commit.date, msg: commit.msg, sha: commit.sha },
    meta: { archived: !!meta.archived, default_branch: branch, private: !!meta.private, pushed_at: meta.pushed_at },
    open_prs: prs,
  };
  fs.writeFileSync(path.join(OUT, `obs_${repo}.json`), JSON.stringify(entry) + '\n');
  cut.push(entry);
  console.log(`${repo}: ${commit.sha.slice(0, 7)}${meta.private ? ' (private)' : ''} prs=${prs.length}`);
}

fs.writeFileSync(
  path.join(OUT, 'observed_raw.json'),
  JSON.stringify({ evidence_cut: NOW, org: 'Aftergraph', repos: cut }, null, 0) + '\n'
);
console.log(`cut ${NOW}: ${cut.length}/${repos.length} repos -> ${OUT}`);
