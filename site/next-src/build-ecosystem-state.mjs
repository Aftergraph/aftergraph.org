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
const NPM = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org';
const PYPI = process.env.PYPI_URL || 'https://pypi.org';

// selfRunId: the workflow run that is building this page right now. It is
// always in progress while we read, so counting it would publish this repo's
// own build as "pending" forever. It is excluded; every other run counts.
export function aggregateRuns(runs, { selfRunId = null } = {}) {
  const self = selfRunId == null || selfRunId === '' ? null : String(selfRunId);
  const list = (Array.isArray(runs) ? runs : []).filter((r) => r && typeof r === 'object' && (self === null || String(r.id) !== self));
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

// Public registry read (npm, PyPI). No token; 404 means the name is not there.
async function registry(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'aftergraph-site-truth-layer' } });
  if (res.status === 404) return { missing: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { data: await res.json() };
}

// [project] name/version from a pyproject.toml, without a TOML dependency.
export function pyprojectMeta(text) {
  let section = null; const out = { name: null, version: null };
  for (const line of String(text).split(/\r?\n/)) {
    const h = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (h) { section = h[1].trim(); continue; }
    if (section !== 'project') continue;
    const m = line.match(/^\s*(name|version)\s*=\s*["']([^"']+)["']/);
    if (m && !out[m[1]]) out[m[1]] = m[2];
  }
  return out;
}

// Whether a registry entry is ours: it must point back at an Aftergraph repo.
// A name that exists but links elsewhere is reported as taken, never as ours.
export function registryStatus(ecosystem, data) {
  const blob = JSON.stringify(ecosystem === 'npm'
    ? [data?.repository, data?.homepage, data?.bugs]
    : [data?.info?.project_urls, data?.info?.home_page]).toLowerCase();
  const ours = blob.includes('github.com/aftergraph/');
  const version = ecosystem === 'npm' ? data?.['dist-tags']?.latest ?? null : data?.info?.version ?? null;
  return { registry: ours ? 'published' : 'name-taken', registryVersion: version };
}

// Freshness of a repository from the age of its default-branch HEAD.
// active <= 14 days, quiet <= 60 days, dormant beyond that, unknown without a HEAD.
export function freshness(headAt, now = new Date()) {
  const t = Date.parse(headAt || '');
  if (!Number.isFinite(t)) return 'unknown';
  const days = (now.getTime() - t) / 864e5;
  return days <= 14 ? 'active' : days <= 60 ? 'quiet' : 'dormant';
}

export async function readRepo(name, { token, fetchImpl = fetch, now = () => new Date() } = {}) {
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
    if (!r.missing) { out.release = { tag: r.data.tag_name, at: r.data.published_at, url: r.data.html_url, aheadBy: null }; return; }
    const t = await gh(`/repos/${OWNER}/${name}/tags?per_page=1`, token, fetchImpl);
    if (!t.missing && Array.isArray(t.data) && t.data[0]) out.release = { tag: t.data[0].name, at: null, url: null, aheadBy: null };
  });
  if (out.release) {
    // How far the default branch has moved past the latest release: a release
    // that is many commits behind main is not a picture of the product today.
    await step('release-drift', async () => {
      const r = await gh(`/repos/${OWNER}/${name}/compare/${encodeURIComponent(out.release.tag)}...${encodeURIComponent(branch)}`, token, fetchImpl);
      if (!r.missing && Number.isInteger(r.data?.ahead_by)) out.release.aheadBy = r.data.ahead_by;
    });
  }
  await step('pulls', async () => {
    const r = await gh(`/repos/${OWNER}/${name}/pulls?state=open&per_page=100`, token, fetchImpl);
    if (!r.missing && Array.isArray(r.data)) out.openPRs = r.data.length >= 100 ? '100+' : r.data.length;
  });
  if (out.head) {
    await step('checks', async () => {
      const r = await gh(`/repos/${OWNER}/${name}/actions/runs?head_sha=${out.head}&per_page=100`, token, fetchImpl);
      if (r.missing) return;
      out.checks = aggregateRuns(r.data.workflow_runs, { selfRunId: process.env.GITHUB_RUN_ID || null });
      out.status = out.checks.status === 'unknown' ? 'no-ci' : out.checks.status;
    });
  }
  if (out.head) {
    // Root package manifests at the exact HEAD, checked against the public
    // registries. Monorepo workspaces are not walked; only root manifests count.
    await step('packages', async () => {
      const file = async (p) => {
        const r = await gh(`/repos/${OWNER}/${name}/contents/${p}?ref=${out.head}`, token, fetchImpl);
        if (r.missing || typeof r.data?.content !== 'string') return null;
        return Buffer.from(r.data.content, 'base64').toString('utf8');
      };
      const pkgs = [];
      const pj = await file('package.json');
      if (pj) { const j = JSON.parse(pj); if (j.name) pkgs.push({ ecosystem: 'npm', name: j.name, version: j.version || null, private: j.private === true }); }
      const pp = await file('pyproject.toml');
      if (pp) { const m = pyprojectMeta(pp); if (m.name) pkgs.push({ ecosystem: 'pypi', name: m.name, version: m.version, private: false }); }
      for (const p of pkgs) {
        p.registry = p.private ? 'private' : 'unknown'; p.registryVersion = null;
        if (p.private) continue;
        const url = p.ecosystem === 'npm' ? `${NPM}/${p.name.replace('/', '%2f')}` : `${PYPI}/pypi/${encodeURIComponent(p.name)}/json`;
        try {
          const r = await registry(url, fetchImpl);
          if (r.missing) p.registry = 'unpublished';
          else Object.assign(p, registryStatus(p.ecosystem, r.data));
        } catch (e) { out.errors.push(`registry ${p.ecosystem}:${p.name}: ${e.message}`); }
      }
      out.packages = pkgs;
    });
  }
  if (out.errors.length && out.status !== 'failing') out.status = out.head ? out.status : 'unknown';
  out.freshness = freshness(out.headAt, now());
  return out;
}

export async function buildState({ catalog, token, fetchImpl = fetch, now = () => new Date() } = {}) {
  const repos = [];
  for (const r of catalog.repositories) {
    if (r.visibility !== 'public') { repos.push({ name: r.name, visibility: 'private', status: 'private' }); continue; }
    repos.push(await readRepo(r.name, { token, fetchImpl, now }));
  }
  const count = (s) => repos.filter((r) => r.status === s).length;
  return {
    schema: 'aftergraph.ecosystem-state/v1',
    generatedAt: now().toISOString(),
    source: 'GitHub REST API, read at build time; exact default-branch HEAD per public repository',
    freshnessRule: 'active: HEAD <= 14 days old; quiet: <= 60 days; dormant: older',
    freshness: { active: repos.filter((r) => r.freshness === 'active').length, quiet: repos.filter((r) => r.freshness === 'quiet').length, dormant: repos.filter((r) => r.freshness === 'dormant').length },
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
