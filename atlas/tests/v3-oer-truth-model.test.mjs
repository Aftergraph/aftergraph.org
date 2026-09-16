import { describe, it, expect } from 'vitest';
import {
  EPISTEMIC_STATES,
  CURRENTNESS_STATES,
  SOURCE_CLASSES,
  VERIFICATION_STATES,
} from '../src/v3/types.ts';
import { GovernanceTopologyAdapter } from '../src/v3/adapters/GovernanceTopologyAdapter.ts';
import { GitHubRepositoryAdapter } from '../src/v3/adapters/GitHubRepositoryAdapter.ts';
import { SentinelVerificationAdapter } from '../src/v3/adapters/SentinelVerificationAdapter.ts';

describe('OER-225 decomposed evidence dimensions', () => {
  it('defines independent epistemic, currentness, source, and verification dimensions', () => {
    expect(EPISTEMIC_STATES).toEqual(['observed', 'inferred', 'predicted', 'unknown']);
    expect(CURRENTNESS_STATES).toEqual(['current', 'stale', 'disputed', 'superseded']);
    expect(SOURCE_CLASSES).toContain('canonical_source');
    expect(SOURCE_CLASSES).toContain('verification');
    expect(VERIFICATION_STATES).toEqual(['unverified', 'verified', 'rejected', 'indeterminate']);
  });
  it('keeps governance declaration canonical-source metadata separate from epistemic state', () => {
    const adapter = new GovernanceTopologyAdapter();
    const [envelope] = adapter.toEnvelopes({
      nodes: [{ id: 'runtime', role: 'execution-plane', authority_scope: ['runtime:*'] }],
      edges: [],
      fetched_at: '2026-09-16T18:00:00Z',
    });
    expect(envelope).toMatchObject({
      epistemic: 'observed',
      currentness: 'current',
      source_class: 'canonical_source',
      verification: 'unverified',
    });
    expect(envelope).not.toHaveProperty('truth_plane');
  });

  it('does not upgrade a GitHub HEAD observation into verification', () => {
    const adapter = new GitHubRepositoryAdapter();
    const envelopes = adapter.toEnvelopes({
      full_name: 'Aftergraph/runtime',
      default_branch: 'main',
      sha: 'abcdef123456',
      updated_at: '2026-09-16T18:00:00Z',
      open_issues_count: 0,
      license_spdx: 'MIT',
    });
    expect(envelopes[1]).toMatchObject({
      epistemic: 'observed',
      currentness: 'current',
      source_class: 'observation',
      verification: 'unverified',
    });
    expect(envelopes[1]).not.toHaveProperty('truth_plane');
  });

  it('represents Sentinel verdicts only in the verification dimension', () => {
    const adapter = new SentinelVerificationAdapter();
    const envelopes = adapter.toEnvelopes({
      checks: [
        { check_id: 'pass', target: 'ci', status: 'pass', verified_at: '2026-09-16T18:00:00Z' },
        { check_id: 'fail', target: 'lint', status: 'fail', verified_at: '2026-09-16T18:00:00Z' },
        { check_id: 'skip', target: 'scan', status: 'skip', verified_at: '2026-09-16T18:00:00Z' },
      ],
      run_id: 'run-oer-225',
      completed_at: '2026-09-16T18:01:00Z',
    });
    expect(envelopes.map((item) => item.verification)).toEqual([
      'verified', 'rejected', 'indeterminate',
    ]);
    for (const envelope of envelopes) {
      expect(envelope).toMatchObject({
        epistemic: 'observed',
        currentness: 'current',
        source_class: 'verification',
      });
      expect(envelope).not.toHaveProperty('truth_plane');
    }
  });
});
