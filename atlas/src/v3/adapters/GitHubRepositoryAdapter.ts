// Atlas V3 Phase 3: GitHub Repository Adapter
// Fetches repo metadata and converts to EvidenceEnvelope[]

import type {
  SourceAdapterContract,
  FreshnessPolicy,
  EvidenceEnvelope,
} from '../types.ts';

export interface GitHubRepoData {
  full_name: string;
  default_branch: string;
  sha: string;
  updated_at: string;
  open_issues_count: number;
  license_spdx: string | null;
}

export class GitHubRepositoryAdapter implements SourceAdapterContract {
  adapter_id = 'github-repo-adapter';
  source_type = 'github_repository';
  freshness_policy: FreshnessPolicy = {
    max_age_seconds: 1800,
    staleness_action: 'warn',
  };

  async fetch(apiUrl: string): Promise<GitHubRepoData> {
    const res = await globalThis.fetch(apiUrl);
    if (!res.ok) {
      throw new Error(`GitHubRepositoryAdapter: fetch failed ${res.status}`);
    }
    return (await res.json()) as GitHubRepoData;
  }

  validate(data: GitHubRepoData): boolean {
    if (!data) return false;
    if (!data.full_name || !data.default_branch || !data.sha) return false;
    return true;
  }

  toEnvelopes(data: GitHubRepoData): EvidenceEnvelope[] {
    const observedTime = new Date().toISOString();
    const dimensions = {
      epistemic: 'observed' as const,
      currentness: 'current' as const,
      source_class: 'observation' as const,
      verification: 'unverified' as const,
    };

    return [
      {
        id: `env-gh-repo-${data.full_name.replace('/', '_')}`,
        source_adapter_id: this.adapter_id,
        valid_time: data.updated_at,
        observed_time: observedTime,
        payload_hash: `sha256:${simpleHash(JSON.stringify(data))}`,
        payload_ref: `r2://adapters/github/repos/${data.full_name.replace('/', '_')}.json`,
        ...dimensions,
      },
      {
        id: `env-gh-head-${data.full_name.replace('/', '_')}`,
        source_adapter_id: this.adapter_id,
        valid_time: data.updated_at,
        observed_time: observedTime,
        payload_hash: `sha256:${simpleHash(data.sha)}`,
        payload_ref: `r2://adapters/github/heads/${data.full_name.replace('/', '_')}/${data.sha.substring(0, 7)}.json`,
        ...dimensions,
      },
    ];
  }
}

function simpleHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
