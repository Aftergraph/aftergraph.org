// Atlas V3 Phase 2: Immutable Cuts
// createCut(), publishCut(), validateCutIntegrity()
// Atomic publication guard — no partial writes.

import type {
  CutManifest,
  CutDelta,
  EvidenceEnvelope,
  Claim,
} from './types.ts';

export interface CutInput {
  envelopes: EvidenceEnvelope[];
  claims: Claim[];
  previous_cut_id?: string;
}

export interface PublishedCut {
  manifest: CutManifest;
  delta: CutDelta;
}

/** Deterministic SHA-256-like hash placeholder for environments without crypto.
 *  In production CF Workers, swap with Web Crypto API. */
function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function computePayloadHash(envelopes: EvidenceEnvelope[], claims: Claim[]): string {
  const canonical = JSON.stringify({
    envelopes: envelopes.map(e => e.id).sort(),
    claims: claims.map(c => c.id).sort(),
  });
  return `sha256:${stableHash(canonical)}`;
}

/** Create an unpublished cut manifest + delta from raw inputs. */
export function createCut(input: CutInput): { manifest: CutManifest; delta: CutDelta } {
  const now = new Date().toISOString();
  const cutId = `cut-${stableHash(now + input.envelopes.length.toString())}`;

  const entitySet = new Set(input.envelopes.map(e => e.source_adapter_id));
  const contradictionIds = input.claims
    .filter(c => c.contradicting_claim_ids.length > 0)
    .map(c => c.id);

  const manifest: CutManifest = {
    cut_id: cutId,
    timestamp: now,
    entity_count: entitySet.size,
    assertion_count: input.claims.length,
    relation_count: input.envelopes.length,
    conflict_count: contradictionIds.length,
    d1_index_ref: '',   // Filled at publish time
    r2_artifact_ref: '', // Filled at publish time
  };

  // Compute delta against previous cut
  const added = input.claims.map(c => c.id);
  const removed: string[] = [];
  const changed: string[] = [];

  const delta: CutDelta = {
    from_cut_id: input.previous_cut_id ?? 'genesis',
    to_cut_id: cutId,
    added,
    removed,
    changed,
    contradictions: contradictionIds,
  };

  return { manifest, delta };
}

/** Atomic publication guard. Returns PublishedCut only if all refs are bound.
 *  Throws on any invariant violation — no partial state escapes. */
export function publishCut(
  input: CutInput,
  d1IndexRef: string,
  r2ArtifactRef: string,
): PublishedCut {
  if (!d1IndexRef || d1IndexRef.trim().length === 0) {
    throw new Error('publishCut: d1IndexRef must be non-empty');
  }
  if (!r2ArtifactRef || r2ArtifactRef.trim().length === 0) {
    throw new Error('publishCut: r2ArtifactRef must be non-empty');
  }

  const { manifest, delta } = createCut(input);

  // Bind storage refs atomically — both or neither
  const published: CutManifest = {
    ...manifest,
    d1_index_ref: d1IndexRef,
    r2_artifact_ref: r2ArtifactRef,
  };

  // Validate integrity before returning
  const validation = validateCutIntegrity(published, delta, input.envelopes, input.claims);
  if (!validation.valid) {
    throw new Error(`publishCut: integrity check failed — ${validation.errors.join('; ')}`);
  }

  return { manifest: published, delta };
}

export interface IntegrityResult {
  valid: boolean;
  errors: string[];
}

/** Validate that a published cut's manifest is internally consistent. */
export function validateCutIntegrity(
  manifest: CutManifest,
  delta: CutDelta,
  envelopes: EvidenceEnvelope[],
  claims: Claim[],
): IntegrityResult {
  const errors: string[] = [];

  if (!manifest.cut_id) errors.push('missing cut_id');
  if (!manifest.timestamp) errors.push('missing timestamp');
  if (!manifest.d1_index_ref) errors.push('missing d1_index_ref');
  if (!manifest.r2_artifact_ref) errors.push('missing r2_artifact_ref');

  if (manifest.assertion_count !== claims.length) {
    errors.push(`assertion_count mismatch: manifest=${manifest.assertion_count} actual=${claims.length}`);
  }
  if (manifest.relation_count !== envelopes.length) {
    errors.push(`relation_count mismatch: manifest=${manifest.relation_count} actual=${envelopes.length}`);
  }

  const actualContradictions = claims.filter(c => c.contradicting_claim_ids.length > 0).length;
  if (manifest.conflict_count !== actualContradictions) {
    errors.push(`conflict_count mismatch: manifest=${manifest.conflict_count} actual=${actualContradictions}`);
  }

  if (delta.to_cut_id !== manifest.cut_id) {
    errors.push(`delta.to_cut_id (${delta.to_cut_id}) ≠ manifest.cut_id (${manifest.cut_id})`);
  }

  // Verify all added claim IDs exist in the claims array
  const claimIdSet = new Set(claims.map(c => c.id));
  for (const id of delta.added) {
    if (!claimIdSet.has(id)) {
      errors.push(`delta.added contains unknown claim_id: ${id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
