# Front Door V4 Convergence Design

**Status:** Approved 2026-09-15
**Scope:** `Aftergraph/aftergraph.org` public homepage and launcher only.
**Canonical architecture source:** `Aftergraph/after-graph-governance/docs/PLATFORM-ARCHITECTURE-V4.md`.

## Goal
Converge the public front door on Aftergraph Platform Architecture V4 without turning the homepage into an architecture dashboard. Keep the product-first experience while making the platform's ownership, lifecycle, evidence boundaries, and user entry paths explicit and truthful.

## Public information architecture
The homepage exposes five user intents: **Build, Govern, Execute, Verify, Research**. These are navigation intents, not new architecture planes and not sources of authority. `/launch` exposes the same five semantic actions through the generated launcher registry.

The canonical seven permanent planes remain exactly: **Intelligence, Authority, Trust, Runtime, Execution, Verification, Experience**. The public lifecycle is rendered in normative order as `Intent / Experience → Intelligence → Authority → Trust → Runtime → Execution → Evidence → Verification → Verified Outcome`. Evidence and Verified Outcome are lifecycle artifacts/results, never additional planes.

## Ownership and honesty
Plane labels map to canonical owners: Intelligence=`wi-backend`; Authority=`aie`; Trust=`trust-gateway`; Runtime=`runtime`; Execution=`works-execution`; Verification=`sentinel`; Experience=`studio` primary and `wi-frontend` specialist. The public site does not infer maturity, authority, or production state from topology membership.

Strong technical claims must expose a nearby evidence/source affordance to an existing canonical public source: Atlas, Governance docs/repository, Sentinel, public status, or a product source. Research remains explicitly non-authoritative. Private repository URLs must never be emitted.

## Product flow
Studio is represented as `Goal → Progress → Needs You → Verified Outcome`. This is experience language, not a claim that Studio owns mission authority, durable execution, or verification truth. Product maturity labels remain visible.

## Visual behavior
Reuse the existing dark product-first visual system. The lifecycle becomes a compact, horizontally scrollable/stackable semantic rail rather than seven large technical cards. Five intent cards use the existing accent system and remain touch accessible. Evidence/source affordances use concise labels and existing link styles. Reduced-motion behavior remains intact.

## Launcher behavior
`data/launcher-surfaces.json` is the authored source; `scripts/generate-launcher-registry.mjs` remains the deterministic generator. Add exactly five public semantic actions corresponding to Build, Govern, Execute, Verify, Research, each resolving only to an existing truthful destination. Do not add privileged execution, approval, mutation, or fake verification behavior.

## Verification
Add contract tests that fail if the homepage omits or renames any permanent plane, presents Evidence as a plane, omits one of the five entry intents, regresses the Studio outcome flow, or loses evidence/source affordances. Extend launcher registry tests for the five semantic actions. Run generator drift checks, worker build/runtime tests, V2 verification, browser launcher QA, and desktop/mobile screenshot inspection before PR.

## Release
Ship through a narrow PR to protected `main`, use the merge queue, then rely on the restored exact-main production deployment chain. Production completion requires `/healthz` to report the merged SHA and independent smoke of `/`, `/launch`, registry/assets, status, Sentinel, Community, sitemap/robots/llms, plus browser QA.
