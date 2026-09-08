#!/usr/bin/env node
// Builds hermetic Atlas test fixtures: a ledger dir (evidence cut) + a gov git repo.
// Deterministic: fixed SHAs are impossible, but content + topology are frozen and the
// gov commit uses fixed author/committer dates so repeated builds are identical
// except for the commit SHA (tests assert structure, never the SHA value).
// Usage: node mkfixtures.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const out = process.argv[2];
if (!out) throw new Error('Missing <outDir>');
const ledger = path.join(out, 'ledger');
const gov = path.join(out, 'gov');
fs.mkdirSync(ledger, { recursive: true });
fs.mkdirSync(gov, { recursive: true });

const CUT = '2026-09-08T15:48:21Z';
const heads = {
  alpha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  beta: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'wi-backend': 'cccccccccccccccccccccccccccccccccccccccc',
};
const obs = (repo, isPrivate, prs) => ({
  repo,
  observed_at: CUT,
  head: { date: '2026-09-08T13:00:00Z', msg: `${repo} head`, sha: heads[repo] },
  meta: { archived: false, default_branch: 'main', private: isPrivate, pushed_at: '2026-09-08T13:00:00Z' },
  open_prs: prs,
});
fs.writeFileSync(
  path.join(ledger, 'observed_raw.json'),
  JSON.stringify({ evidence_cut: CUT, org: 'Aftergraph', repos: [] })
);
fs.writeFileSync(path.join(ledger, 'obs_alpha.json'), JSON.stringify(obs('alpha', false, [
  { baseRefName: 'main', headRefName: 'feat/x', headRefOid: 'dddddddddddddddddddddddddddddddddddddddd', isDraft: false, number: 7, title: 'feat: x', updatedAt: '2026-09-08T14:00:00Z' },
])));
fs.writeFileSync(path.join(ledger, 'obs_beta.json'), JSON.stringify(obs('beta', true, [])));
fs.writeFileSync(path.join(ledger, 'obs_wi-backend.json'), JSON.stringify(obs('wi-backend', false, [
  { baseRefName: 'main', headRefName: 'feat/y', headRefOid: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', isDraft: false, number: 8, title: 'feat: y', updatedAt: '2026-09-08T14:00:00Z' },
])));

// Canonical: alpha + beta shared; legacy WI slug canonical-only; cron-fabric observed-only.
const topology = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  schema_version: 'platform-topology/1.0',
  organization: 'Aftergraph',
  evidence_cut: '2026-09-07',
  description: 'Atlas CI fixture.',
  repositories: [
    { name: 'alpha', canonical_branch: 'main', visibility: 'public', plane: 'test', role: 'test-a', owns: 'A' },
    { name: 'beta', canonical_branch: 'main', visibility: 'public', plane: 'test', role: 'test-b', owns: 'B' },
    { name: 'work-intelligence-v2', canonical_branch: 'main', visibility: 'public', plane: 'test', role: 'legacy', owns: 'legacy WI' },
  ],
};
fs.mkdirSync(path.join(gov, 'docs', 'platform-topology'), { recursive: true });
fs.writeFileSync(path.join(gov, 'docs', 'platform-topology', '1.0.json'), JSON.stringify(topology, null, 2));
fs.writeFileSync(
  path.join(gov, 'dependencies.yml'),
  `version: 3\ntopology_ref: docs/platform-topology/1.0.json\nmodules:\n  alpha:\n    repo: Aftergraph/alpha\n    role: test-a\n    consumes: [work-intelligence-v2]\n    provides: [alpha-thing]\n  work-intelligence-v2:\n    repo: Aftergraph/work-intelligence-v2\n    role: legacy\n    consumes: []\n    provides: [observations]\n`
);
const env = {
  ...process.env,
  GIT_AUTHOR_DATE: '2026-09-08T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-09-08T00:00:00Z',
  GIT_AUTHOR_NAME: 'atlas-ci',
  GIT_AUTHOR_EMAIL: 'atlas-ci@example.com',
  GIT_COMMITTER_NAME: 'atlas-ci',
  GIT_COMMITTER_EMAIL: 'atlas-ci@example.com',
};
execSync('git init -q -b main .', { cwd: gov });
execSync('git add -A', { cwd: gov });
execSync('git -c user.name=atlas-ci -c user.email=atlas-ci@example.com commit -qm fixture', { cwd: gov, env });
console.log(`fixtures -> ${out} gov=${execSync('git rev-parse HEAD', { cwd: gov }).toString().trim()}`);
