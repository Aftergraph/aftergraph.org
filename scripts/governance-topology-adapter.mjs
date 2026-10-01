const LEGACY_ROLE_VALUES = new Set([
  'research',
  'detection',
  'product-web',
  'skills-library',
  'agent-workforce',
]);

const APPROVED_LIFECYCLE_VALUES = new Set([
  'active',
  'temporary',
  'internal-hold',
  'legacy-transition',
  'classification-pending',
]);

const TOPOLOGY_SCHEMA_ID = 'https://aftergraph.dev/contracts/platform-topology/2.0.schema.json';

function fail(message) {
  throw new Error(`public topology adapter: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function approvedRoleValues(orgStateSchema) {
  const values = orgStateSchema?.$defs?.repository?.properties?.role?.enum;
  if (!Array.isArray(values) || !values.every((value) => typeof value === 'string')) {
    fail('org-state/1.0 role enum is missing or malformed');
  }

  const approved = values.filter((value) => !LEGACY_ROLE_VALUES.has(value));
  if (!approved.includes('unclassified')) fail('org-state/1.0 does not approve the pending role');
  return new Set(approved);
}

function validateTopology(topology, topologySchema) {
  if (!isRecord(topology)) fail('topology document must be an object');
  if (topology.schema_version !== 'platform-topology/2.0') fail('unsupported topology contract');
  if (topology.organization !== 'Aftergraph') fail('unexpected organization');
  if (topology.$schema !== './2.0.schema.json') fail('unexpected topology schema reference');
  if (topologySchema?.$id !== TOPOLOGY_SCHEMA_ID) fail('the Governance platform-topology/2.0 schema is missing');
  const repositoryShape = topologySchema?.$defs?.repository;
  if (!Array.isArray(repositoryShape?.required) || !repositoryShape.required.includes('role') || !repositoryShape.required.includes('lifecycle')) {
    fail('the Governance topology schema does not require role and lifecycle');
  }
  if (!Array.isArray(topology.repositories) || topology.repositories.length === 0) fail('repositories must be a non-empty array');

  const names = new Set();
  for (const [index, repository] of topology.repositories.entries()) {
    if (!isRecord(repository)) fail(`repository row ${index} must be an object`);
    const requiredStrings = ['name', 'canonical_branch', 'system_class', 'role', 'lifecycle', 'owns', 'must_not_own'];
    if (requiredStrings.some((field) => typeof repository[field] !== 'string' || repository[field].length === 0)) {
      fail(`repository row ${index} is missing a required text field`);
    }
    if (!['public', 'private'].includes(repository.visibility)) fail(`repository row ${index} has invalid visibility`);
    if (repository.architecture_plane !== null && typeof repository.architecture_plane !== 'string') {
      fail(`repository row ${index} has invalid architecture plane`);
    }
    if (names.has(repository.name)) fail('topology contains duplicate repository names');
    names.add(repository.name);
  }
}

export function adaptGovernanceTopology(topology, topologySchema, orgStateSchema, source) {
  validateTopology(topology, topologySchema);
  if (!isRecord(source)
    || source.repository !== 'Aftergraph/after-graph-governance'
    || typeof source.ref !== 'string'
    || !/^[0-9a-f]{40}$/.test(source.ref)
    || source.topology_path !== 'docs/platform-topology/2.0.json') {
    fail('pinned Governance source metadata is invalid');
  }

  const approvedRoles = approvedRoleValues(orgStateSchema);
  const repositories = topology.repositories
    .filter((repository) => repository.visibility === 'public')
    .map((repository) => {
      const roleIsApproved = approvedRoles.has(repository.role) && repository.role !== 'unclassified';
      const lifecycleIsApproved = APPROVED_LIFECYCLE_VALUES.has(repository.lifecycle)
        && repository.lifecycle !== 'classification-pending';
      const pending = !roleIsApproved || !lifecycleIsApproved;

      return {
        repository: repository.name,
        url: `https://github.com/Aftergraph/${encodeURIComponent(repository.name)}`,
        visibility: 'public',
        classification: {
          state: pending ? 'pending' : 'classified',
          role: roleIsApproved ? repository.role : null,
          lifecycle: lifecycleIsApproved ? repository.lifecycle : null,
          label: pending ? 'Classification pending' : null,
        },
      };
    })
    .sort((left, right) => left.repository < right.repository ? -1 : left.repository > right.repository ? 1 : 0);

  return {
    schema: 'aftergraph-public-repository-catalog/1.0',
    source: {
      contract: topology.schema_version,
      repository: source.repository,
      ref: source.ref,
      path: source.topology_path,
      topology_cut: typeof topology.evidence_cut === 'string' ? topology.evidence_cut : null,
    },
    repositories,
  };
}
