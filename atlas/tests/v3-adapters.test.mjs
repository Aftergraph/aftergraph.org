import { describe, it, expect } from 'vitest';
import { GovernanceTopologyAdapter } from '../src/v3/adapters/GovernanceTopologyAdapter.ts';
import { GovernanceDependenciesAdapter } from '../src/v3/adapters/GovernanceDependenciesAdapter.ts';
import { GitHubRepositoryAdapter } from '../src/v3/adapters/GitHubRepositoryAdapter.ts';
import { SentinelVerificationAdapter } from '../src/v3/adapters/SentinelVerificationAdapter.ts';

describe('GovernanceTopologyAdapter', () => {
  const adapter = new GovernanceTopologyAdapter();

  it('implements SourceAdapterContract fields', () => {
    expect(adapter.adapter_id).toBe('governance-topology-adapter');
    expect(adapter.source_type).toBe('governance_topology');
    expect(adapter.freshness_policy.max_age_seconds).toBeGreaterThan(0);
  });

  it('validates correct topology data', () => {
    const data = {
      nodes: [{ id: 'n1', role: 'maintainer', authority_scope: ['repo:*'] }],
      edges: [{ from: 'n1', to: 'n2', relation: 'approves' }],
      fetched_at: '2026-09-15T10:00:00Z',
    };
    expect(adapter.validate(data)).toBe(true);
  });

  it('rejects invalid topology data', () => {
    expect(adapter.validate({ nodes: null, edges: [], fetched_at: '' })).toBe(false);
    expect(adapter.validate({ nodes: [{ id: '', role: 'x', authority_scope: [] }], edges: [], fetched_at: '' })).toBe(false);
  });

  it('toEnvelopes returns real EvidenceEnvelope[] for nodes and edges', () => {
    const data = {
      nodes: [{ id: 'n1', role: 'maintainer', authority_scope: ['*'] }],
      edges: [{ from: 'n1', to: 'n2', relation: 'owns' }],
      fetched_at: '2026-09-15T10:00:00Z',
    };
    const envelopes = adapter.toEnvelopes(data);
    expect(envelopes.length).toBe(2);
    expect(envelopes[0].source_adapter_id).toBe('governance-topology-adapter');
    expect(envelopes[0]).toMatchObject({ epistemic: 'observed', currentness: 'current', source_class: 'canonical_source', verification: 'unverified' });
    expect(envelopes[0].payload_hash).toMatch(/^sha256:/);
    expect(envelopes[1].id).toContain('env-gov-edge');
  });
});

describe('GovernanceDependenciesAdapter', () => {
  const adapter = new GovernanceDependenciesAdapter();

  it('implements SourceAdapterContract fields', () => {
    expect(adapter.adapter_id).toBe('governance-dependencies-adapter');
    expect(adapter.freshness_policy.staleness_action).toBe('flag');
  });

  it('validates correct dependency data', () => {
    const data = {
      dependencies: [{ package_name: 'react', version: '18.2.0', depends_on: [], license: 'MIT' }],
      fetched_at: '2026-09-15T10:00:00Z',
    };
    expect(adapter.validate(data)).toBe(true);
  });

  it('rejects missing package_name', () => {
    const data = { dependencies: [{ package_name: '', version: '1.0', depends_on: [], license: 'MIT' }], fetched_at: '' };
    expect(adapter.validate(data)).toBe(false);
  });

  it('toEnvelopes produces one envelope per dependency', () => {
    const data = {
      dependencies: [
        { package_name: 'vitest', version: '1.0.0', depends_on: [], license: 'MIT' },
        { package_name: 'react', version: '18.2.0', depends_on: ['scheduler'], license: 'MIT' },
      ],
      fetched_at: '2026-09-15T10:00:00Z',
    };
    const envelopes = adapter.toEnvelopes(data);
    expect(envelopes.length).toBe(2);
    expect(envelopes[0]).toMatchObject({ epistemic: 'observed', currentness: 'current', source_class: 'canonical_source', verification: 'unverified' });
    expect(envelopes[0].payload_ref).toContain('r2://adapters/deps/');
  });
});

describe('GitHubRepositoryAdapter', () => {
  const adapter = new GitHubRepositoryAdapter();

  it('implements SourceAdapterContract fields', () => {
    expect(adapter.adapter_id).toBe('github-repo-adapter');
    expect(adapter.freshness_policy.max_age_seconds).toBe(1800);
  });

  it('validates correct repo data', () => {
    const data = { full_name: 'org/repo', default_branch: 'main', sha: 'abc123', updated_at: '2026-09-15T10:00:00Z', open_issues_count: 5, license_spdx: 'MIT' };
    expect(adapter.validate(data)).toBe(true);
  });

  it('rejects data missing sha', () => {
    expect(adapter.validate({ full_name: 'o/r', default_branch: 'main', sha: '' })).toBe(false);
  });

  it('toEnvelopes returns two envelopes (repo + head)', () => {
    const data = { full_name: 'org/repo', default_branch: 'main', sha: 'abc123def', updated_at: '2026-09-15T10:00:00Z', open_issues_count: 0, license_spdx: null };
    const envelopes = adapter.toEnvelopes(data);
    expect(envelopes.length).toBe(2);
    expect(envelopes[0].id).toContain('env-gh-repo');
    expect(envelopes[1].id).toContain('env-gh-head');
    expect(envelopes[1]).toMatchObject({ epistemic: 'observed', currentness: 'current', source_class: 'observation', verification: 'unverified' });
  });
});

describe('SentinelVerificationAdapter', () => {
  const adapter = new SentinelVerificationAdapter();

  it('implements SourceAdapterContract fields', () => {
    expect(adapter.adapter_id).toBe('sentinel-verification-adapter');
    expect(adapter.freshness_policy.staleness_action).toBe('flag');
    expect(adapter.freshness_policy.source_specific_overrides['security-scan'].max_age_seconds).toBe(3600);
  });

  it('validates correct sentinel data', () => {
    const data = {
      checks: [{ check_id: 'chk-1', target: 'ci', status: 'pass', verified_at: '2026-09-15T10:00:00Z' }],
      run_id: 'run-42',
      completed_at: '2026-09-15T10:01:00Z',
    };
    expect(adapter.validate(data)).toBe(true);
  });

  it('rejects invalid status values', () => {
    const data = {
      checks: [{ check_id: 'c1', target: 't', status: 'unknown', verified_at: '' }],
      run_id: 'r1',
      completed_at: '',
    };
    expect(adapter.validate(data)).toBe(false);
  });

  it('toEnvelopes maps Sentinel status only into verification outcome', () => {
    const data = {
      checks: [
        { check_id: 'c-pass', target: 'ci', status: 'pass', verified_at: '2026-09-15T10:00:00Z' },
        { check_id: 'c-fail', target: 'lint', status: 'fail', verified_at: '2026-09-15T10:00:00Z' },
      ],
      run_id: 'run-1',
      completed_at: '2026-09-15T10:01:00Z',
    };
    const envelopes = adapter.toEnvelopes(data);
    expect(envelopes.length).toBe(2);
    expect(envelopes[0]).toMatchObject({ epistemic: 'observed', source_class: 'verification', verification: 'verified' });
    expect(envelopes[1]).toMatchObject({ epistemic: 'observed', source_class: 'verification', verification: 'rejected' });
  });
});
