import fs from 'node:fs';
import path from 'node:path';

const governanceRoot = process.argv[2] || process.env.AFTERGRAPH_GOVERNANCE_ROOT || 'governance-source';
const source = path.resolve(governanceRoot, 'docs/platform-topology/2.0.json');
const output = path.resolve('site/platform-catalog.json');

if (!fs.existsSync(source)) {
  console.error('platform-catalog: missing Governance topology/2.0 at', source);
  process.exit(1);
}

const topology = JSON.parse(fs.readFileSync(source, 'utf8'));
if (topology.schema_version !== 'platform-topology/2.0' || !Array.isArray(topology.repositories)) {
  console.error('platform-catalog: unsupported topology schema');
  process.exit(1);
}

const repos = topology.repositories.map((repo) => ({
  name: repo.name,
  visibility: repo.visibility,
  lifecycle: repo.lifecycle,
  architecture_plane: repo.architecture_plane ?? null,
  system_class: repo.system_class,
  role: repo.role,
  owns: repo.owns,
  source_url: repo.visibility === 'public'
    ? `https://github.com/Aftergraph/${repo.name}`
    : null,
  expires_at: repo.expires_at ?? null,
}));

const permanent = repos.filter((repo) => repo.lifecycle !== 'temporary');
const active = repos.filter((repo) => repo.lifecycle === 'active');
const publicRepos = repos.filter((repo) => repo.visibility === 'public');
const privateRepos = repos.filter((repo) => repo.visibility === 'private');

const groups = {
  platform: repos.filter((repo) => repo.architecture_plane),
  products: repos.filter((repo) => [
    'primary-experience',
    'personal-agent-product',
    'service-operations-product-surface',
    'work-intelligence-experience',
    'human-operator-plane',
    'operational-intelligence-backend-projection',
  ].includes(repo.role)),
  capabilities: repos.filter((repo) => [
    'capability-supply-chain',
    'skill-compatibility-contract',
    'tool-routing-control-plane',
    'continuity-contract',
    'continuity-containment-verification',
    'model-program',
    'model-lifecycle-registry',
    'model-rnd-methodology',
    'scheduled-observation-fabric',
    'research-assurance',
    'knowledge-plane',
  ].includes(repo.role)),
};

const catalog = {
  schema: 'aftergraph-public-platform-catalog/1.0',
  source: {
    repository: 'Aftergraph/after-graph-governance',
    contract: 'docs/platform-topology/2.0.json',
    schema: topology.schema_version,
    evidence_cut: topology.evidence_cut,
    pinned_sha: process.env.AFTERGRAPH_GOVERNANCE_SHA || null,
  },
  counts: {
    canonical: repos.length,
    permanent: permanent.length,
    active: active.length,
    public: publicRepos.length,
    private: privateRepos.length,
    temporary: repos.filter((repo) => repo.lifecycle === 'temporary').length,
  },
  groups,
  repositories: repos,
};

fs.writeFileSync(output, JSON.stringify(catalog, null, 2) + '\n');
console.log(`platform-catalog: ${catalog.counts.canonical} canonical repos (${catalog.counts.public} public / ${catalog.counts.private} private), evidence cut ${topology.evidence_cut}`);
