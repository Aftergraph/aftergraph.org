# Front Door V4 Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Aftergraph public homepage and launcher a truthful product-first projection of Platform Architecture V4.

**Architecture:** Keep `site/index.html` as the public presentation layer and `data/launcher-surfaces.json` as the authored launcher source. Encode V4 invariants in contract tests so presentation changes cannot invent planes, authority, maturity, or privileged actions.

**Tech Stack:** Static HTML/CSS/JS, Node.js test runner, deterministic registry/worker generators, Playwright browser verification.

**Spec:** `docs/superpowers/specs/2026-09-15-front-door-v4-convergence-design.md`

## Global Constraints
- Exactly seven permanent planes: Intelligence, Authority, Trust, Runtime, Execution, Verification, Experience.
- Evidence and Verified Outcome are lifecycle artifacts/results, not planes.
- Five public intents: Build, Govern, Execute, Verify, Research.
- No private repository URLs, fake privileged actions, or maturity/authority inference.
- Studio flow: Goal → Progress → Needs You → Verified Outcome.
- Preserve reduced-motion, keyboard, touch, and generated-artifact determinism.

---

### Task 1: Encode the V4 public contract
**Files:** Create `site/front-door-v4.test.mjs`; modify `site/launcher-registry.test.mjs`.
**Interfaces:** Consumes `site/index.html`, `data/launcher-surfaces.json`, generated registry. Produces executable invariants for Tasks 2–3.
- [ ] Write tests asserting the seven plane labels/owners, five intents, Studio flow, source affordances, and that Evidence is not presented as a plane.
- [ ] Write launcher tests asserting exactly one semantic action for each of Build/Govern/Execute/Verify/Research and only `navigate|evidence` action kinds.
- [ ] Run `node --test site/front-door-v4.test.mjs site/launcher-registry.test.mjs`; confirm the new assertions fail before implementation.
- [ ] Commit the red contract tests with `test(site): define V4 front-door contract`.

### Task 2: Converge homepage presentation
**Files:** Modify `site/index.html`.
**Interfaces:** Consumes Task 1 invariants. Produces the product-first V4 lifecycle, five entry paths, Studio outcome flow, and source affordances.
- [ ] Replace the four legacy intent cards with Build/Govern/Execute/Verify/Research while retaining existing accent vocabulary and truthful destinations.
- [ ] Render the lifecycle in canonical order and label canonical owners without creating an Evidence plane.
- [ ] Change Studio mini-flow to `Goal → Progress → Needs You → Verified Outcome` and add concise evidence/source links near strong technical claims.
- [ ] Preserve responsive and reduced-motion CSS; keep the lifecycle usable at 390px without horizontal page overflow.
- [ ] Run `node --test site/front-door-v4.test.mjs`; require PASS.
- [ ] Commit with `feat(site): converge front door on V4 architecture`.

### Task 3: Align launcher semantics
**Files:** Modify `data/launcher-surfaces.json`; regenerate `site/launcher-registry.json`; modify generated `site/worker.js` if the worker generator embeds it.
**Interfaces:** Produces five public semantic launcher actions consumed by `site/launcher-app.js` without changing its authority model.
- [ ] Add Build, Govern, Execute, Verify, Research actions with existing truthful public destinations and bounded aliases.
- [ ] Run `node scripts/generate-launcher-registry.mjs` and verify deterministic output.
- [ ] Run `node --test site/launcher-registry.test.mjs site/launcher-telemetry.test.mjs` and require PASS.
- [ ] Run `node site/build-worker.cjs` and `node --test site/launcher-worker.test.mjs`; require PASS.
- [ ] Commit with `feat(launcher): align intents with V4 front door`.

### Task 4: Full verification and browser QA
**Files:** Modify `site/verify-v2.cjs` only if a new invariant belongs in the release gate; generated Atlas/site artifacts only through existing generators.
**Interfaces:** Produces exact-HEAD release evidence.
- [ ] Run all repository-native Node tests relevant to site/launcher/Atlas and `git diff --check`.
- [ ] Run Atlas build/generation, `site/verify-atlas.cjs`, brand sync, launcher registry generation, worker build/tests, and `site/verify-v2.cjs`.
- [ ] Run launcher browser smoke and homepage browser inspection at 1440×1000 and 390×844; verify no overflow, broken links, console errors, or inaccessible intent controls.
- [ ] Re-run generators and use `git diff --exit-code` on generated artifacts to prove determinism.
- [ ] Commit any release-gate-only change with `test(site): gate V4 front-door contract`.

### Task 5: PR, merge queue, and production proof
**Files:** No source changes unless CI identifies a real defect.
**Interfaces:** Consumes green exact-head branch; produces merged exact-main production evidence.
- [ ] Push `feat/front-door-v4-convergence`, open a narrow PR referencing issue #64, and attach exact commands/results.
- [ ] Enable squash auto-merge through the existing protected merge queue; do not bypass it.
- [ ] Wait for exact-head CI and merged `main`; record the merge SHA.
- [ ] Verify automated production deployment reports that exact SHA in `/healthz`.
- [ ] Independently smoke `/`, `/launch`, launcher assets/registry, `/status`, `/sentinel`, `/community`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`, and telemetry method behavior.
- [ ] Close issue #64 only when its acceptance criteria are evidenced on production; otherwise leave the unmet criterion explicit.
