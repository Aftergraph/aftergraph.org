// Truth layer for /next: what each Aftergraph system's source actually says,
// read from GitHub at build time. Nothing here is guessed: a field we could
// not read is null and the system's status is "unknown".
//
//   GITHUB_TOKEN=... node site/next-src/build-ecosystem-state.mjs
//
// Private repositories are listed by name only (status "private"); their
// activity is not published.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'Aftergraph';
const API = process.env.GITHUB_API_URL || 'https://api.github.com';

export function aggregateRuns(runs) {
  const list = (Array.isArray(runs) ? runs : []).filter((r) => r && typeof r === 'object');
  if (list.length === 0) return { status: 'unknown', runs: 0, failing: [] };
  // Latest run per workflow on this exact commit.
  const latest = new Map();
  for (const r of list) {
    const k = r.workflow_id ?? r.name;
    const prev = latest.get(k);
    if (!prev || String(r.created_at) > String(prev.created_at)) latest.set(k, r);
  }
  const vals = [...latest.values()];
  const failing = vals.filter((r) => r.status === 'completed' && ['failure', 'timed_out', 'startup_failure', 'action_required'].includes(r.conclusion)).map((r) => r.name);
  const pending = vals.some((r) => r.status !== 'completed');
  const status = failing.length ? 'failing' : pending ? 'pending' : 'passing';
  return { status, runs: vals.length, failing };
}

async function gh(path, token, fetchImpl) {
  const res = await fetchImpl(API + path, {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'aftergraph-site-truth-layer',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) return { missing: true };
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return { data: await res.json() };
}

export async function readRepo(name, { token, fetchImpl = fetch } = {}) {
  const out = { name, visibility: 'public', status: 'unknown', head: null, headAt: null, branch: null, release: null, openPRs: null, checks: null, errors: [] };
  const step = async (label, fn) => { try { await fn(); } catch (e) { out.errors.push(`${label}: ${e.message}`); } };
  let branch = null;
  await step('repo', async () => {
    const r = await gh(`/repos/${OWNER}/${name}`, token, fetchImpl);
    if (r.missing) throw new Error('not readable');
    branch = r.data.default_branch;
    out.branch = branch;
    if (r.data.archived) out.archived = true;
  });
  if (!branch) return out;
  await step('head', async () => {
    const r = await gh(`/repos/${OWNER}/${name}/commits/${encodeURIComponent(branch)}`, token, fetchImpl);
    if (r.missing) return;
    out.head = r.data.sha;
    out.headAt = r.data.commit?.committer?.date || null;
  });
  await step('release', async () => {
    const r = await gh(`/repos/${OWNER}/${name}/releases/latest`, token, fetchImpl);
    if (!r.missing) { out.release = { tag: r.data.tag_name, at: r.data.published_at, url: r.data.html_url }; return; }
    const t = await gh(`/repos/${OWNER}/${name}/tags?per_page=1`, token, fetchImpl);
    if (!t.missing && Array.isArray(t.data) && t.data[0]) out.release = { tag: t.data[0].name, at: null, url: null };
  });
  await step('pulls', async () => {
    const r = await gh(`/repos/${OWNER}/${name}/pulls?state=open&per_page=100`, token, fetchImpl);
    if (!r.missing && Array.isArray(r.data)) out.openPRs = r.data.length >= 100 ? '100+' : r.data.length;
  });
  if (out.head) {
    await step('checks', async () => {
      const r = await gh(`/repos/${OWNER}/${name}/actions/runs?head_sha=${out.head}&per_page=100`, token, fetchImpl);
      if (r.missing) return;
      out.checks = aggregateRuns(r.data.workflow_runs);
      out.status = out.checks.status === 'unknown' ? 'no-ci' : out.checks.status;
    });
  }
  if (out.errors.length && out.status !== 'failing') out.status = out.head ? out.status : 'unknown';
  return out;
}

export async function buildState({ catalog, token, fetchImpl = fetch, now = () => new Date() } = {}) {
  const repos = [];
  for (const r of catalog.repositories) {
    if (r.visibility !== 'public') { repos.push({ name: r.name, visibility: 'private', status: 'private' }); continue; }
    repos.push(await readRepo(r.name, { token, fetchImpl }));
  }
  const count = (s) => repos.filter((r) => r.status === s).length;
  return {
    schema: 'aftergraph.ecosystem-state/v1',
    generatedAt: now().toISOString(),
    source: 'GitHub REST API, read at build time; exact default-branch HEAD per public repository',
    counts: { total: repos.length, passing: count('passing'), failing: count('failing'), pending: count('pending'), noCi: count('no-ci'), unknown: count('unknown'), private: count('private') },
    repos,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('build-ecosystem-state.mjs')) {
  const catalog = JSON.parse(readFileSync(join(SITE, 'platform-catalog.json'), 'utf8'));
  const state = await buildState({ catalog, token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '' });
  writeFileSync(join(SITE, 'ecosystem-state.json'), JSON.stringify(state, null, 1) + '\n');
  console.log(`ecosystem-state ${JSON.stringify(state.counts)}`);
}
