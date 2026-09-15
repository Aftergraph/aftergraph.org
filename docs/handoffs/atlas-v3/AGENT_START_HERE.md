# Atlas V3 — Start Here

Read `2026-09-15-agent-handoff.md` before changing Atlas.

The approved direction is **Verifiable System Intelligence** with Atlas as **Continuous Verifiable System State**.

Immediate next actions:

1. branch/worktree from current `origin/main`;
2. write the detailed V3 spec + implementation plan;
3. TDD `EvidenceEnvelope`, `Claim`, `SourceAdapter`, `FreshnessPolicy`, `CutManifest`, `CutDelta`;
4. preserve `valid_time` and `observed_time` separately;
5. preserve truth planes `CANONICAL`, `OBSERVED`, `INFERRED`, `PROPOSED`, `VERIFIED`, `EXECUTED`;
6. implement immutable cuts with D1 index + R2 artifacts and atomic publication;
7. implement real adapters, reconciliation, then API;
8. only after the data path is real, refactor into Explore / Evidence / Changes / Trace;
9. do not ship fixtures, guessed status, or fake live state;
10. keep current `/atlas/` working until replacement passes exact-head production verification.
