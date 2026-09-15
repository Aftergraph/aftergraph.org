// Atlas V3 Phase 4: Reconciliation Engine
// Contradictions are first-class data — never collapsed.

import type { Claim } from './types';

export interface ReconciledClaim {
  claim: Claim;
  status: 'resolved' | 'unresolved' | 'conflicting';
  group_key: string;
}

export interface ReconciliationResult {
  resolved: ReconciledClaim[];
  unresolved: ReconciledClaim[];
  conflicting: ReconciledClaim[];
  groups: Map<string, Claim[]>;
}

/**
 * Group key for subject+predicate bucketing.
 */
function groupKey(subject: string, predicate: string): string {
  return `${subject}||${predicate}`;
}

/**
 * Detect contradictions within a group of claims sharing the same subject+predicate.
 * A claim is conflicting if:
 *   - It lists other claim IDs in contradicting_claim_ids that exist in the group, OR
 *   - Another claim in the group lists it in their contradicting_claim_ids.
 *
 * Unresolved: only one claim in the group and no self-contradiction markers.
 * Resolved: multiple claims but none reference each other as contradictions.
 * Conflicting: at least one contradiction link exists within the group.
 */
export function reconcileClaims(claims: Claim[]): ReconciliationResult {
  const groups = new Map<string, Claim[]>();
  const claimIndex = new Map<string, Claim>();

  // Index all claims by ID for O(1) lookup
  for (const claim of claims) {
    claimIndex.set(claim.id, claim);
  }

  // Group by subject+predicate
  for (const claim of claims) {
    const key = groupKey(claim.subject, claim.predicate);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(claim);
  }

  const resolved: ReconciledClaim[] = [];
  const unresolved: ReconciledClaim[] = [];
  const conflicting: ReconciledClaim[] = [];

  for (const [key, groupClaims] of groups) {
    // Build set of claim IDs in this group
    const groupIds = new Set(groupClaims.map((c) => c.id));

    // Determine which claims have active contradictions within this group
    const conflictingIds = new Set<string>();
    for (const claim of groupClaims) {
      for (const contraId of claim.contradicting_claim_ids) {
        if (groupIds.has(contraId)) {
          conflictingIds.add(claim.id);
          conflictingIds.add(contraId);
        }
      }
    }

    for (const claim of groupClaims) {
      const rc: ReconciledClaim = { claim, group_key: key, status: 'unresolved' };

      if (conflictingIds.has(claim.id)) {
        rc.status = 'conflicting';
        conflicting.push(rc);
      } else if (groupClaims.length === 1) {
        // Single claim, no contradictions → unresolved (needs more evidence)
        rc.status = 'unresolved';
        unresolved.push(rc);
      } else {
        // Multiple claims, no contradiction links → resolved (consensus or compatible)
        rc.status = 'resolved';
        resolved.push(rc);
      }
    }
  }

  return { resolved, unresolved, conflicting, groups };
}
