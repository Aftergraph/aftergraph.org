// Atlas V3 Phase 3: Sentinel Verification Adapter
// Fetches verification results and converts to EvidenceEnvelope[]

import type {
  SourceAdapterContract,
  FreshnessPolicy,
  EvidenceEnvelope,
} from '../types.ts';

export interface SentinelCheck {
  check_id: string;
  target: string;
  status: 'pass' | 'fail' | 'skip';
  verified_at: string;
  evidence_url?: string;
}

export interface SentinelVerificationData {
  checks: SentinelCheck[];
  run_id: string;
  completed_at: string;
}

export class SentinelVerificationAdapter implements SourceAdapterContract {
  adapter_id = 'sentinel-verification-adapter';
  source_type = 'sentinel_verification';
  freshness_policy: FreshnessPolicy = {
    max_age_seconds: 900,
    staleness_action: 'flag',
    source_specific_overrides: {
      'security-scan': { max_age_seconds: 3600, staleness_action: 'hide' },
    },
  };

  async fetch(sourceUrl: string): Promise<SentinelVerificationData> {
    const res = await globalThis.fetch(sourceUrl);
    if (!res.ok) {
      throw new Error(`SentinelVerificationAdapter: fetch failed ${res.status}`);
    }
    return (await res.json()) as SentinelVerificationData;
  }

  validate(data: SentinelVerificationData): boolean {
    if (!data || !Array.isArray(data.checks) || !data.run_id) return false;
    for (const check of data.checks) {
      if (!check.check_id || !check.target || !check.status) return false;
      if (!['pass', 'fail', 'skip'].includes(check.status)) return false;
    }
    return true;
  }

  toEnvelopes(data: SentinelVerificationData): EvidenceEnvelope[] {
    const envelopes: EvidenceEnvelope[] = [];
    const observedTime = new Date().toISOString();

    for (const check of data.checks) {
      envelopes.push({
        id: `env-sentinel-${check.check_id}`,
        source_adapter_id: this.adapter_id,
        valid_time: check.verified_at,
        observed_time: observedTime,
        payload_hash: `sha256:${simpleHash(JSON.stringify(check))}`,
        payload_ref: check.evidence_url ?? `r2://adapters/sentinel/checks/${check.check_id}.json`,
        truth_plane: check.status === 'pass' ? 'VERIFIED' : 'EXECUTED',
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
