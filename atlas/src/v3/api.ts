// Atlas V3 Phase 5: API Layer
// In-memory fallback — no D1/R2 dependency for testing.

import type { Claim, CutManifest, CutDelta, SourceAdapterContract } from './types';
import { reconcileClaims, type ReconciliationResult } from './reconciliation';

export interface ClaimFilter {
  subject?: string;
  predicate?: string;
  object?: string;
  envelope_id?: string;
  limit?: number;
  offset?: number;
}

export interface QueryClaimsResponse {
  claims: Claim[];
  total: number;
  filter: ClaimFilter;
}

export interface GetCutResponse {
  manifest: CutManifest | null;
  found: boolean;
}

export interface GetDeltaResponse {
  delta: CutDelta | null;
  found: boolean;
}

export interface ListAdaptersResponse {
  adapters: SourceAdapterContract[];
}

/**
 * AtlasAPI — typed query interface with in-memory storage backend.
 * All methods return plain objects (no streaming, no D1/R2 coupling).
 */
export class AtlasAPI {
  private claims: Claim[] = [];
  private cuts: Map<string, CutManifest> = new Map();
  private deltas: Map<string, CutDelta> = new Map();
  private adapters: SourceAdapterContract[] = [];

  /** Seed claims into the in-memory store. */
  seedClaims(claims: Claim[]): void {
    this.claims = [...claims];
  }

  /** Seed cut manifests. */
  seedCuts(cuts: CutManifest[]): void {
    for (const cut of cuts) {
      this.cuts.set(cut.cut_id, cut);
    }
  }

  /** Seed cut deltas. Key format: `${from_cut_id}::${to_cut_id}`. */
  seedDeltas(deltas: CutDelta[]): void {
    for (const delta of deltas) {
      this.deltas.set(`${delta.from_cut_id}::${delta.to_cut_id}`, delta);
    }
  }

  /** Seed source adapters. */
  seedAdapters(adapters: SourceAdapterContract[]): void {
    this.adapters = [...adapters];
  }

  /**
   * Query claims with optional filters.
   * Filters are AND-combined. Returns paginated results.
   */
  queryClaims(filter: ClaimFilter = {}): QueryClaimsResponse {
    let filtered = this.claims;

    if (filter.subject !== undefined) {
      filtered = filtered.filter((c) => c.subject === filter.subject);
    }
    if (filter.predicate !== undefined) {
      filtered = filtered.filter((c) => c.predicate === filter.predicate);
    }
    if (filter.object !== undefined) {
      filtered = filtered.filter((c) => c.object === filter.object);
    }
    if (filter.envelope_id !== undefined) {
      filtered = filtered.filter((c) => c.envelope_id === filter.envelope_id);
    }

    const total = filtered.length;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? total;
    const paged = filtered.slice(offset, offset + limit);

    return { claims: paged, total, filter };
  }

  /**
   * Retrieve a cut manifest by ID.
   */
  getCut(cutId: string): GetCutResponse {
    const manifest = this.cuts.get(cutId) ?? null;
    return { manifest, found: manifest !== null };
  }

  /**
   * Compute or retrieve a delta between two cuts.
   * In-memory fallback computes from stored deltas; returns null if not seeded.
   */
  getDelta(from: string, to: string): GetDeltaResponse {
    const key = `${from}::${to}`;
    const delta = this.deltas.get(key) ?? null;
    return { delta, found: delta !== null };
  }

  /**
   * List registered source adapters.
   */
  listAdapters(): ListAdaptersResponse {
    return { adapters: [...this.adapters] };
  }

  /**
   * Run reconciliation over current claims.
   * Convenience method — delegates to reconcileClaims.
   */
  reconcile(): ReconciliationResult {
    return reconcileClaims(this.claims);
  }
}
