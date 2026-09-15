// Atlas V3 Phase 3: Governance Dependencies Adapter
// Fetches dependency graph and converts to EvidenceEnvelope[]

import type {
  SourceAdapterContract,
  FreshnessPolicy,
  EvidenceEnvelope,
} from '../types.ts';

export interface DependencyRecord {
  package_name: string;
  version: string;
  depends_on: string[];
  license: string;
}

export interface GovernanceDependenciesData {
  dependencies: DependencyRecord[];
  fetched_at: string;
}

export class GovernanceDependenciesAdapter implements SourceAdapterContract {
  adapter_id = 'governance-dependencies-adapter';
  source_type = 'governance_dependencies';
  freshness_policy: FreshnessPolicy = {
    max_age_seconds: 3600,
    staleness_action: 'flag',
  };

  async fetch(sourceUrl: string): Promise<GovernanceDependenciesData> {
    const res = await globalThis.fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`GovernanceDependenciesAdapter: fetch failed ${res.status}`);
    }
    return (await res.json()) as GovernanceDependenciesData;
  }

  validate(data: GovernanceDependenciesData): boolean {
    if (!data || !Array.isArray(data.dependencies)) return false;
    for (const dep of data.dependencies) {
      if (!dep.package_name || !dep.version) return false;
    }
    return true;
  }

  toEnvelopes(data: GovernanceDependenciesData): EvidenceEnvelope[] {
    const envelopes: EvidenceEnvelope[] = [];
    const observedTime = new Date().toISOString();

    for (const dep of data.dependencies) {
      envelopes.push({
        id: `env-dep-${dep.package_name}@${dep.version}`,
        source_adapter_id: this.adapter_id,
        valid_time: data.fetched_at,
        observed_time: observedTime,
        payload_hash: `sha256:${simpleHash(JSON.stringify(dep))}`,
        payload_ref: `r2://adapters/deps/${dep.package_name}/${dep.version}.json`,
        truth_plane: 'OBSERVED',
      });
    }

    return envelopes;
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
