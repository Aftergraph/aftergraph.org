# Aftergraph Launcher Release V2 — Implementation Plan

1. Add a public launcher registry source/projection and deterministic generator/verifier.
2. Refactor `site/launch.html` to consume the generated registry and expose intent/entity/action/evidence semantics without runtime claims.
3. Add privacy-preserving telemetry client events and a strict same-origin Worker aggregate endpoint backed by `AG_STATS` KV.
4. Add telemetry and registry contract tests to CI and V2 verification.
5. Convert Atlas ELK to dynamic import and add a build assertion proving ELK is not eagerly imported by the entry chunk.
6. Extend launcher browser verification for registry loading, evidence actions, zero-result behavior and telemetry payload privacy.
7. Capture deterministic desktop/mobile launcher visual evidence.
8. Integrate a canonical launcher entrypoint/shortcut into Studio, Sentinel and Wie in isolated repository branches, with repo-native verification.
9. Push all branches, update/open governed PRs, and request normal independent review where required.
10. After merge queue lands the aftergraph.org PR, verify exact-HEAD production deploy, routes, launcher behavior and telemetry health.

Every release claim must name its exact SHA. No direct push to protected `main`, no force push, no self-approval, and no bypass of independent review or merge queue policy.
