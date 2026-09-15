# Aftergraph Launcher Release V2 — Design

**Date:** 2026-09-15  
**Status:** Approved execution scope  
**Owner:** Aftergraph public entry point

## Goal

Finish the launcher release chain and evolve `/launch` from a hard-coded destination palette into a governed, reusable discovery surface built around `intent → entity → action → evidence`.

The public launcher remains navigational/read-only. It MUST NOT claim authentication, runtime authority, approvals, execution availability, or health that is not proven by the responsible system.

## Invariants

- Governance topology owns repository identity, visibility, lifecycle, role and ownership boundaries.
- `aftergraph.org` owns public projection, search/ranking, navigation UX and public telemetry.
- Private repositories may be represented only by public-safe product/system descriptors; they MUST NOT expose private source URLs or exact heads.
- Actions are typed as `navigate`, `evidence` or local `utility`; no fake remote execution.
- Telemetry never stores raw search text, URL query text, identities, IP-derived identifiers or local recent history.
- Generated artifacts are deterministic and CI-verified.
## Architecture

`data/launcher-registry.json` is the checked-in public projection consumed by the launcher. `scripts/generate-launcher-registry.mjs` derives it from the pinned Governance topology plus a small public-surface manifest that supplies presentation metadata and public URLs. A verifier rejects private repository URLs, unknown repository owners, unsupported action kinds and stale generated output.

The launcher loads this registry before rendering and falls back fail-closed to an embedded minimal recovery surface only if the registry cannot be fetched. Search maps user text to registry entities and typed actions. Results expose evidence links separately from primary navigation.

`/api/launcher/telemetry` accepts a strict event allow-list and writes aggregate counters to the existing `AG_STATS` KV binding. Events carry only event kind, entity/action ID, coarse latency bucket and result-count bucket. Raw queries are neither sent nor persisted.

Atlas loads ELK with dynamic import only when graph layout is requested, keeping the ~1.44 MB ELK bundle out of initial module loading while preserving deterministic layout options.

Cross-product adoption uses a tiny shared launcher-link contract rather than embedding private state. Studio, Sentinel and Wie receive a keyboard-accessible link/shortcut to `https://aftergraph.org/launch`; the canonical command engine and registry remain owned by aftergraph.org. Future same-origin embedding can reuse the same registry contract without forks.

## Verification

Required evidence: deterministic registry generation, registry policy tests, launcher browser tests, telemetry endpoint contract tests, worker/V2 contract, Atlas tests/build, production bundle drift, visual captures at 1440×1000 and 390×844, and per-consumer repo tests for any cross-product integration.
