// Atlas V3 Phase 3: Governance Topology Adapter
// Fetches governance topology and converts to EvidenceEnvelope[]

import type {
  SourceAdapterContract,
  FreshnessPolicy,
  EvidenceEnvelope,
} from '../types.ts';

export interface GovernanceNode {
  id: string;
  role: string;
  authority_scope: string[];
}

export interface GovernanceEdge {
  from: string;
  to: string;
  relation: string;
}

export interface GovernanceTopologyData {
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
  fetched_at: string;
}

export class GovernanceTopologyAdapter implements SourceAdapterContract {
  adapter_id = 'governance-topology-adapter';
  source_type = 'governance_topology';
  freshness_policy: FreshnessPolicy = {
    max_age_seconds: 86400,
    staleness_action: 'warn',
  };

  private _lastFetch: GovernanceTopologyData | null = null;

  async fetch(sourceUrl: string): Promise<GovernanceTopologyData> {
    const res = await globalThis.fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`GovernanceTopologyAdapter: fetch failed ${res.status}`);
    }
    this._lastFetch = (await res.json()) as GovernanceTopologyData;
    return this._lastFetch;
  }

  validate(data: GovernanceTopologyData): boolean {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
      return false;
    }
    for (const node of data.nodes) {
      if (!node.id || !node.role) return false;
    }
    for (const edge of data.edges) {
      if (!edge.from || !edge.to || !edge.relation) return false;
    }
    return true;
  }

  toEnvelopes(data: GovernanceTopologyData): EvidenceEnvelope[] {
    const envelopes: EvidenceEnvelope[] = [];
    const observedTime = new Date().toISOString();

    for (const node of data.nodes) {
      envelopes.push({
        id: `env-gov-node-${node.id}`,
        source_adapter_id: this.adapter_id,
        valid_time: data.fetched_at,
        observed_time: observedTime,
        payload_hash: `sha256:${simpleHash(JSON.stringify(node))}`,
        payload_ref: `r2://adapters/governance/nodes/${node.id}.json`,
        epistemic: 'observed',
        currentness: 'current',
        source_class: 'canonical_source',
        verification: 'unverified',
      });
    }

    for (const edge of data.edges) {
      envelopes.push({
        id: `env-gov-edge-${edge.from}-${edge.to}`,
        source_adapter_id: this.adapter_id,
        valid_time: data.fetched_at,
        observed_time: observedTime,
        payload_hash: `sha256:${simpleHash(JSON.stringify(edge))}`,
        payload_ref: `r2://adapters/governance/edges/${edge.from}_${edge.to}.json`,
        epistemic: 'observed',
        currentness: 'current',
        source_class: 'canonical_source',
        verification: 'unverified',
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
