// Atlas V3 Phase 6: Read-only projection workspaces
// These are VIEW layers over the core data model — they never mutate Claims/Cuts.

import type { Claim, CutManifest, CutDelta, EvidenceEnvelope, EpistemicState, CurrentnessState, SourceClass, VerificationState } from './types.ts';

// Duck-typed interfaces for data that may come from other phases (cuts.ts, reconciliation.ts)
// We only depend on types.ts directly; these allow workspace code to operate on
// whatever shape the other phases eventually provide.

export interface WorkspaceQueryOptions {
  subject?: string;
  predicate?: string;
  object?: string;
  epistemic?: EpistemicState;
  currentness?: CurrentnessState;
  source_class?: SourceClass;
  verification?: VerificationState;
  min_confidence?: number;
  limit?: number;
}

export interface WorkspaceRenderResult {
  format: 'json' | 'text' | 'markdown';
  content: string;
  metadata: Record<string, unknown>;
}

export interface WorkspaceExportResult {
  format: string;
  data: unknown;
  generated_at: string;
}

/**
 * ExploreWorkspace: Free-form exploration of claims with filtering and faceting.
 * Read-only projection — never mutates underlying claims.
 */
export class ExploreWorkspace {
  private readonly claims: readonly Claim[];
  private readonly envelopes: readonly EvidenceEnvelope[];

  constructor(claims: readonly Claim[], envelopes: readonly EvidenceEnvelope[]) {
    this.claims = claims;
    this.envelopes = envelopes;
  }

  query(options: WorkspaceQueryOptions = {}): Claim[] {
    let results = [...this.claims];

    if (options.subject) {
      results = results.filter(c => c.subject === options.subject);
    }
    if (options.predicate) {
      results = results.filter(c => c.predicate === options.predicate);
    }
    if (options.object) {
      results = results.filter(c => c.object === options.object);
    }
    if (options.min_confidence !== undefined) {
      results = results.filter(c => (c.confidence ?? 0) >= options.min_confidence!);
    }
    if (options.epistemic || options.currentness || options.source_class || options.verification) {
      const envelopeMap = new Map(this.envelopes.map(e => [e.id, e]));
      results = results.filter(c => {
        const env = envelopeMap.get(c.envelope_id);
        if (!env) return false;
        if (options.epistemic && env.epistemic !== options.epistemic) return false;
        if (options.currentness && env.currentness !== options.currentness) return false;
        if (options.source_class && env.source_class !== options.source_class) return false;
        if (options.verification && env.verification !== options.verification) return false;
        return true;
      });
    }
    if (options.limit !== undefined && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  render(results?: Claim[]): WorkspaceRenderResult {
    const claims = results ?? this.query();
    return {
      format: 'json',
      content: JSON.stringify(claims, null, 2),
      metadata: {
        count: claims.length,
        total_available: this.claims.length,
        workspace: 'explore',
      },
    };
  }

  export(format: 'json' | 'csv' = 'json'): WorkspaceExportResult {
    const claims = this.query();
    let data: unknown;

    if (format === 'csv') {
      const header = 'id,envelope_id,subject,predicate,object,confidence\n';
      const rows = claims.map(c =>
        `${c.id},${c.envelope_id},${c.subject},${c.predicate},${c.object},${c.confidence ?? ''}`
      ).join('\n');
      data = header + rows;
    } else {
      data = claims;
    }

    return {
      format,
      data,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * EvidenceWorkspace: Provenance-focused view linking claims back to their evidence envelopes.
 * Read-only projection — never mutates underlying data.
 */
export class EvidenceWorkspace {
  private readonly claims: readonly Claim[];
  private readonly envelopes: readonly EvidenceEnvelope[];

  constructor(claims: readonly Claim[], envelopes: readonly EvidenceEnvelope[]) {
    this.claims = claims;
    this.envelopes = envelopes;
  }

  query(options: WorkspaceQueryOptions & { source_adapter_id?: string } = {}): Array<{ claim: Claim; envelope: EvidenceEnvelope }> {
    const envelopeMap = new Map(this.envelopes.map(e => [e.id, e]));
    let pairs = this.claims
      .map(c => ({ claim: c, envelope: envelopeMap.get(c.envelope_id) }))
      .filter((p): p is { claim: Claim; envelope: EvidenceEnvelope } => p.envelope !== undefined);

    if (options.source_adapter_id) {
      pairs = pairs.filter(p => p.envelope.source_adapter_id === options.source_adapter_id);
    }
    if (options.epistemic) pairs = pairs.filter(p => p.envelope.epistemic === options.epistemic);
    if (options.currentness) pairs = pairs.filter(p => p.envelope.currentness === options.currentness);
    if (options.source_class) pairs = pairs.filter(p => p.envelope.source_class === options.source_class);
    if (options.verification) pairs = pairs.filter(p => p.envelope.verification === options.verification);
    if (options.subject) {
      pairs = pairs.filter(p => p.claim.subject === options.subject);
    }
    if (options.predicate) {
      pairs = pairs.filter(p => p.claim.predicate === options.predicate);
    }
    if (options.min_confidence !== undefined) {
      pairs = pairs.filter(p => (p.claim.confidence ?? 0) >= options.min_confidence!);
    }
    if (options.limit !== undefined && options.limit > 0) {
      pairs = pairs.slice(0, options.limit);
    }

    return pairs;
  }

  render(results?: Array<{ claim: Claim; envelope: EvidenceEnvelope }>): WorkspaceRenderResult {
    const pairs = results ?? this.query();
    const lines = pairs.map(p =>
      `[${p.envelope.epistemic}/${p.envelope.currentness}/${p.envelope.source_class}/${p.envelope.verification}] ${p.claim.subject} --${p.claim.predicate}--> ${p.claim.object} (source: ${p.envelope.source_adapter_id}, observed: ${p.envelope.observed_time})`
    );
    return {
      format: 'text',
      content: lines.join('\n'),
      metadata: {
        count: pairs.length,
        workspace: 'evidence',
      },
    };
  }

  export(format: 'json' = 'json'): WorkspaceExportResult {
    const pairs = this.query();
    return {
      format,
      data: pairs,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * ChangesWorkspace: Diff-oriented view over CutDeltas showing what changed between cuts.
 * Read-only projection — never mutates underlying data.
 */
export class ChangesWorkspace {
  private readonly claims: readonly Claim[];
  private readonly deltas: readonly CutDelta[];
  private readonly manifests: readonly CutManifest[];

  constructor(
    claims: readonly Claim[],
    deltas: readonly CutDelta[],
    manifests: readonly CutManifest[],
  ) {
    this.claims = claims;
    this.deltas = deltas;
    this.manifests = manifests;
  }

  query(options: { from_cut_id?: string; to_cut_id?: string; change_type?: 'added' | 'removed' | 'changed' | 'contradictions' } = {}): Array<{ delta: CutDelta; resolved_claims: Record<string, Claim[]> }> {
    let filtered = [...this.deltas];

    if (options.from_cut_id) {
      filtered = filtered.filter(d => d.from_cut_id === options.from_cut_id);
    }
    if (options.to_cut_id) {
      filtered = filtered.filter(d => d.to_cut_id === options.to_cut_id);
    }

    const claimMap = new Map(this.claims.map(c => [c.id, c]));

    return filtered.map(delta => {
      const resolved: Record<string, Claim[]> = {};
      if (!options.change_type || options.change_type === 'added') {
        resolved.added = delta.added.map(id => claimMap.get(id)).filter((c): c is Claim => c !== undefined);
      }
      if (!options.change_type || options.change_type === 'removed') {
        resolved.removed = delta.removed.map(id => claimMap.get(id)).filter((c): c is Claim => c !== undefined);
      }
      if (!options.change_type || options.change_type === 'changed') {
        resolved.changed = delta.changed.map(id => claimMap.get(id)).filter((c): c is Claim => c !== undefined);
      }
      if (!options.change_type || options.change_type === 'contradictions') {
        resolved.contradictions = delta.contradictions.map(id => claimMap.get(id)).filter((c): c is Claim => c !== undefined);
      }
      return { delta, resolved_claims: resolved };
    });
  }

  render(results?: Array<{ delta: CutDelta; resolved_claims: Record<string, Claim[]> }>): WorkspaceRenderResult {
    const changes = results ?? this.query();
    const lines: string[] = [];
    for (const change of changes) {
      lines.push(`Δ ${change.delta.from_cut_id} → ${change.delta.to_cut_id}`);
      for (const [type, claims] of Object.entries(change.resolved_claims)) {
        if (claims.length > 0) {
          lines.push(`  ${type}: ${claims.length} claims`);
          for (const c of claims) {
            lines.push(`    - ${c.subject} --${c.predicate}--> ${c.object}`);
          }
        }
      }
    }
    return {
      format: 'text',
      content: lines.join('\n'),
      metadata: {
        delta_count: changes.length,
        workspace: 'changes',
      },
    };
  }

  export(format: 'json' = 'json'): WorkspaceExportResult {
    const changes = this.query();
    return {
      format,
      data: changes,
      generated_at: new Date().toISOString(),
    };
  }
}

/**
 * TraceWorkspace: Lineage tracing from a claim back through its envelope to source.
 * Read-only projection — never mutates underlying data.
 */
export class TraceWorkspace {
  private readonly claims: readonly Claim[];
  private readonly envelopes: readonly EvidenceEnvelope[];

  constructor(claims: readonly Claim[], envelopes: readonly EvidenceEnvelope[]) {
    this.claims = claims;
    this.envelopes = envelopes;
  }

  query(options: { claim_id?: string; subject?: string; depth?: number } = {}): Array<{ claim: Claim; envelope: EvidenceEnvelope; contradicting: Claim[] }> {
    const envelopeMap = new Map(this.envelopes.map(e => [e.id, e]));
    const claimMap = new Map(this.claims.map(c => [c.id, c]));

    let targets = [...this.claims];
    if (options.claim_id) {
      targets = targets.filter(c => c.id === options.claim_id);
    }
    if (options.subject) {
      targets = targets.filter(c => c.subject === options.subject);
    }

    return targets.map(claim => {
      const envelope = envelopeMap.get(claim.envelope_id)!;
      const contradicting = claim.contradicting_claim_ids
        .map(id => claimMap.get(id))
        .filter((c): c is Claim => c !== undefined);
      return { claim, envelope: envelope!, contradicting };
    }).filter(t => t.envelope !== undefined);
  }

  render(results?: Array<{ claim: Claim; envelope: EvidenceEnvelope; contradicting: Claim[] }>): WorkspaceRenderResult {
    const traces = results ?? this.query();
    const lines: string[] = [];
    for (const trace of traces) {
      lines.push(`TRACE ${trace.claim.id}:`);
      lines.push(`  claim: ${trace.claim.subject} --${trace.claim.predicate}--> ${trace.claim.object}`);
      lines.push(`  envelope: ${trace.envelope.id} (${trace.envelope.epistemic}/${trace.envelope.currentness}/${trace.envelope.source_class}/${trace.envelope.verification})`);
      lines.push(`  source: ${trace.envelope.source_adapter_id}`);
      lines.push(`  valid_time: ${trace.envelope.valid_time}`);
      lines.push(`  observed_time: ${trace.envelope.observed_time}`);
      lines.push(`  payload_hash: ${trace.envelope.payload_hash}`);
      if (trace.contradicting.length > 0) {
        lines.push(`  contradictions (${trace.contradicting.length}):`);
        for (const c of trace.contradicting) {
          lines.push(`    ⚠ ${c.id}: ${c.subject} --${c.predicate}--> ${c.object}`);
        }
      }
    }
    return {
      format: 'text',
      content: lines.join('\n'),
      metadata: {
        trace_count: traces.length,
        workspace: 'trace',
      },
    };
  }

  export(format: 'json' = 'json'): WorkspaceExportResult {
    const traces = this.query();
    return {
      format,
      data: traces,
      generated_at: new Date().toISOString(),
    };
  }
}
