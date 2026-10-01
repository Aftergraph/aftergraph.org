import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { adaptGovernanceTopology, approvedRoleValues } from '../scripts/governance-topology-adapter.mjs';

const source = JSON.parse(fs.readFileSync(new URL('../data/public-topology-source.json', import.meta.url), 'utf8'));
const topologySchema = {
  $id: 'https://aftergraph.dev/contracts/platform-topology/2.0.schema.json',
  $defs: { repository: { required: ['role', 'lifecycle'] } },
};
const orgStateSchema = {
  $defs: {
    repository: {
      properties: {
        role: {
          enum: [
            'canonical-contracts', 'agent-runtime', 'unclassified',
            'research', 'detection', 'product-web', 'skills-library', 'agent-workforce',
          ],
        },
      },
    },
  },
};
const fixture = (repositories) => ({
  $schema: './2.0.schema.json',
  schema_version: 'platform-topology/2.0',
  organization: 'Aftergraph',
  evidence_cut: '2026-10-01',
  repositories,
});
const row = (overrides = {}) => ({
  name: 'public-repo',
  canonical_branch: 'main',
  visibility: 'public',
  architecture_plane: null,
  system_class: 'example',
  role: 'canonical-contracts',
  lifecycle: 'active',
  owns: 'fixture description that must not be projected',
  must_not_own: 'fixture boundary that must not be projected',
  ...overrides,
});

test('public catalog consumes explicit role/lifecycle and excludes non-public source rows', () => {
  const catalog = adaptGovernanceTopology(fixture([
    row(),
    row({ name: 'private-repo', visibility: 'private', role: 'agent-runtime', owns: 'private text' }),
  ]), topologySchema, orgStateSchema, source);

  assert.deepEqual(catalog.repositories.map((item) => item.repository), ['public-repo']);
  assert.deepEqual(catalog.repositories[0].classification, {
    state: 'classified', role: 'canonical-contracts', lifecycle: 'active', label: null,
  });
  assert.equal(catalog.repositories[0].visibility, 'public');
  assert.equal('system_class' in catalog.repositories[0], false);
  assert.equal('plane' in catalog.repositories[0], false);
  assert.equal('maturity' in catalog.repositories[0], false);
  assert.equal('evidence' in catalog.repositories[0], false);
  assert.doesNotMatch(JSON.stringify(catalog), /private-repo|private text|fixture description|fixture boundary/);
});

test('unclassified and unknown role/lifecycle values are presented as pending without echoing unknown values', () => {
  const catalog = adaptGovernanceTopology(fixture([
    row({ name: 'known-pending', role: 'unclassified', lifecycle: 'classification-pending' }),
    row({ name: 'future-role', role: 'role-added-later' }),
    row({ name: 'future-lifecycle', lifecycle: 'not-yet-approved' }),
  ]), topologySchema, orgStateSchema, source);

  const byName = new Map(catalog.repositories.map((item) => [item.repository, item.classification]));
  assert.deepEqual(byName.get('known-pending'), {
    state: 'pending', role: null, lifecycle: null, label: 'Classification pending',
  });
  assert.deepEqual(byName.get('future-role'), {
    state: 'pending', role: null, lifecycle: 'active', label: 'Classification pending',
  });
  assert.deepEqual(byName.get('future-lifecycle'), {
    state: 'pending', role: 'canonical-contracts', lifecycle: null, label: 'Classification pending',
  });
  assert.doesNotMatch(JSON.stringify(catalog), /role-added-later|not-yet-approved/);
});

test('adapter rejects wrong contract versions and duplicate source names', () => {
  assert.throws(() => adaptGovernanceTopology({ ...fixture([row()]), schema_version: 'platform-topology/1.0' }, topologySchema, orgStateSchema, source), /unsupported topology contract/);
  assert.throws(() => adaptGovernanceTopology(fixture([row(), row()]), topologySchema, orgStateSchema, source), /duplicate repository names/);
});

test('checked-in public catalog contains only public rows and keeps maturity/evidence outside this schema', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('./public-repository-catalog.json', import.meta.url), 'utf8'));
  const outputSchema = JSON.parse(fs.readFileSync(new URL('./public-repository-catalog.schema.json', import.meta.url), 'utf8'));
  assert.equal(catalog.schema, 'aftergraph-public-repository-catalog/1.0');
  assert.equal(outputSchema.$id, 'https://aftergraph.org/contracts/public-repository-catalog/1.0.schema.json');
  assert.equal(outputSchema.additionalProperties, false);
  assert.deepEqual(outputSchema.required, ['schema', 'source', 'repositories']);
  assert.equal(outputSchema.properties.repositories.items.additionalProperties, false);
  const classificationSchema = outputSchema.properties.repositories.items.properties.classification;
  assert.equal(classificationSchema.additionalProperties, false);
  assert.equal(classificationSchema.oneOf.length, 2);
  const matchesVariant = (classification, variant) => Object.entries(variant.properties).every(([field, rule]) => {
    if ('const' in rule && classification[field] !== rule.const) return false;
    if (Array.isArray(rule.enum) && !rule.enum.includes(classification[field])) return false;
    if (rule.type === 'string' && typeof classification[field] !== 'string') return false;
    if (Array.isArray(rule.type) && !rule.type.includes(classification[field] === null ? 'null' : typeof classification[field])) return false;
    return true;
  });
  assert.ok(catalog.repositories.length > 0);
  assert.ok(catalog.repositories.every((item) => item.visibility === 'public'));
  assert.ok(catalog.repositories.every((item) => !('maturity' in item) && !('evidence' in item)));
  assert.ok(catalog.repositories.some((item) => item.classification.state === 'pending'));
  assert.ok(catalog.repositories.every((item) => classificationSchema.oneOf.filter((variant) => matchesVariant(item.classification, variant)).length === 1));
});

if (process.env.AFTERGRAPH_GOVERNANCE_ROOT) {
  test('pinned Governance input projects every public row and excludes every private row', () => {
    const root = path.resolve(process.env.AFTERGRAPH_GOVERNANCE_ROOT);
    const topology = JSON.parse(fs.readFileSync(path.join(root, 'docs/platform-topology/2.0.json'), 'utf8'));
    const liveTopologySchema = JSON.parse(fs.readFileSync(path.join(root, 'docs/platform-topology/2.0.schema.json'), 'utf8'));
    const liveOrgStateSchema = JSON.parse(fs.readFileSync(path.join(root, 'docs/contracts/org-state/1.0.json'), 'utf8'));
    const projected = adaptGovernanceTopology(topology, liveTopologySchema, liveOrgStateSchema, source);
    const catalog = JSON.parse(fs.readFileSync(new URL('./public-repository-catalog.json', import.meta.url), 'utf8'));
    const outputSchema = JSON.parse(fs.readFileSync(new URL('./public-repository-catalog.schema.json', import.meta.url), 'utf8'));
    const classificationVariants = outputSchema.properties.repositories.items.properties.classification.oneOf;
    const classifiedSchema = classificationVariants.find((variant) => variant.properties.state.const === 'classified');
    const pendingSchema = classificationVariants.find((variant) => variant.properties.state.const === 'pending');
    const approvedRoles = [...approvedRoleValues(liveOrgStateSchema)].filter((role) => role !== 'unclassified').sort();
    const publicNames = topology.repositories.filter((repo) => repo.visibility === 'public').map((repo) => repo.name)
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    const privateNames = topology.repositories.filter((repo) => repo.visibility === 'private').map((repo) => repo.name);
    const catalogNames = new Set(catalog.repositories.map((repo) => repo.repository));

    assert.deepEqual(catalog.repositories.map((repo) => repo.repository), publicNames);
    assert.deepEqual(projected.repositories, catalog.repositories);
    assert.ok(privateNames.every((name) => !catalogNames.has(name)));
    assert.deepEqual([...classifiedSchema.properties.role.enum].sort(), approvedRoles);
    assert.deepEqual(pendingSchema.properties.role.enum.filter((role) => role !== null).sort(), approvedRoles);
    assert.deepEqual(classifiedSchema.properties.lifecycle.enum, ['active', 'temporary', 'internal-hold', 'legacy-transition']);
    assert.deepEqual(pendingSchema.properties.lifecycle.enum, [null, 'active', 'temporary', 'internal-hold', 'legacy-transition']);
  });
}
