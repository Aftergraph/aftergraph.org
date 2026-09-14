# Aftergraph Launcher Intent Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/launch` with the approved responsive Aftergraph intent-console design while preserving honest public capabilities, privacy boundaries, keyboard accessibility, and deploy compatibility.

**Architecture:** Keep the existing self-contained `site/launch.html` deployment model because `site/build-worker.cjs` compiles that page into the Cloudflare worker. Strengthen the existing V2 contract before implementation, then redesign markup/CSS/data/rendering in place and validate with the repository’s worker build plus real-browser QA.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Node.js contract checks, Cloudflare Worker compiler, Playwright Chromium from the existing `atlas` toolchain.

**Spec:** `docs/superpowers/specs/2026-09-15-aftergraph-launcher-intent-console-design.md`

## Global Constraints

- Do not expose private repository URLs.
- Do not claim or simulate privileged execution that is not wired.
- Preserve the current static-worker architecture; no framework migration.
- Preserve keyboard/listbox accessibility and touch-first mobile behavior.
- Respect `prefers-reduced-motion`.
- Regenerate `site/worker.js` after launcher changes.
- Evidence/readiness claims must target the exact feature-branch SHA.

---

### Task 1: Ratchet the launcher contract before redesign

**Files:**
- Modify: `site/verify-v2.cjs`

**Interfaces:**
- Consumes: `site/launch.html` as UTF-8 source.
- Produces: failing assertions for the new IA until Task 2 implements it.

- [ ] **Step 1: Add assertions for the approved information architecture**

Add exact checks for `Aftergraph Launcher`, `FIND`, `UNDERSTAND`, `ACT`, `VERIFY`, `Products / Systems`, `Actions`, `Explore system`, `Verify with Sentinel`, and the new search placeholder. Preserve all existing private-link and ARIA assertions.

- [ ] **Step 2: Run the contract and confirm RED**

Run: `node site/verify-v2.cjs`

Expected: FAIL on the first new launcher assertion while all pre-existing source files remain untouched.

- [ ] **Step 3: Commit the contract ratchet with the design docs**

```bash
git add site/verify-v2.cjs docs/superpowers/specs/2026-09-15-aftergraph-launcher-intent-console-design.md docs/superpowers/plans/2026-09-15-aftergraph-launcher-intent-console.md
git commit -s -m "test(site): define launcher intent-console contract"
```

### Task 2: Implement the accepted launcher surface

**Files:**
- Modify: `site/launch.html`

**Interfaces:**
- Consumes: existing public destinations and `af-recent` localStorage key.
- Produces: sectioned `Recent`, `Products / Systems`, and `Actions` listbox rows with deterministic search and safe navigation.

- [ ] **Step 1: Replace the old two-column palette/preview layout**

Implement one centered launcher panel, wide-screen graph decoration, minimal header/title sequence, search field, hint rail, grouped results, and footer backlink. Keep all visible text code-native.

- [ ] **Step 2: Introduce explicit launcher data types**

Use item objects with `kind`, `group`, `name`, `description`, `url`, `maturity`, `aliases`, and `icon` fields. Action objects are safe navigation only; no fake mutation/execution commands.

- [ ] **Step 3: Preserve and strengthen interaction behavior**

Search across names, descriptions, groups, and aliases; `>` filters Actions. Preserve `ArrowUp`, `ArrowDown`, `Home`, `End`, `Enter`, `Escape`, hover selection for fine pointers, recent history, and mobile no-autofocus behavior. Escape clears query without unexpected navigation.

- [ ] **Step 4: Implement responsive and accessibility states**

Desktop keeps graph atmosphere and descriptions; tablet removes peripheral ornament; mobile removes descriptions, keeps badges, uses sticky search, 56 px rows, safe-area spacing, and zero horizontal overflow. Keep `combobox`, `listbox`, `option`, `aria-selected`, `aria-activedescendant`, and visible `:focus-visible`.

- [ ] **Step 5: Run the contract and confirm GREEN**

Run: `node site/verify-v2.cjs`

Expected: `Aftergraph V2 contract: PASS`.

- [ ] **Step 6: Commit the launcher implementation**

```bash
git add site/launch.html
git commit -s -m "feat(site): redesign Aftergraph launcher intent console"
```

### Task 3: Compile the real deployment artifact

**Files:**
- Modify generated: `site/worker.js`

**Interfaces:**
- Consumes: `site/launch.html` through `site/build-worker.cjs`.
- Produces: the Cloudflare Worker bundle that serves `/launch`.

- [ ] **Step 1: Regenerate worker**

Run: `node site/build-worker.cjs`

- [ ] **Step 2: Re-run repository surface gates**

Run: `node site/verify-v2.cjs && git diff --check`

Expected: PASS and no whitespace errors.

- [ ] **Step 3: Commit generated deployment output**

```bash
git add site/worker.js
git commit -s -m "build(site): compile launcher deployment bundle"
```

### Task 4: Real-browser fidelity and interaction QA

**Files:**
- No production files unless QA finds a defect.

**Interfaces:**
- Consumes: local `site/` server and Chromium from `atlas` dependencies.
- Produces: evidence for desktop, mobile, keyboard, search, recents, and empty-state behavior.

- [ ] **Step 1: Install the existing locked browser toolchain if needed**

Run: `npm --prefix atlas ci`

- [ ] **Step 2: Serve the built site**

Run: `node site/serve-local.cjs 8472 site`

- [ ] **Step 3: Exercise launcher workflows in Chromium**

Verify at 1440×1000 and 390×844: initial layout, `wie` search, `> verify` action search, Arrow navigation + Enter, Escape clear, opening/reloading a destination to populate Recent, empty result state, focus visibility, reduced-motion compatibility, and no horizontal overflow.

- [ ] **Step 4: Compare against the accepted reference**

Inspect hierarchy, central-panel width, near-black/navy palette, cyan selection rail, amber/teal badges, row density, graph line treatment, whitespace, mobile collapse, and absence of dashboard-card sprawl. Fix any material mismatch and repeat Tasks 2–4 gates.

- [ ] **Step 5: Push and open a narrow PR**

Push `feat/launcher-intent-console`, open a PR against `main`, record exact-head local evidence, and let the repository PR workflow independently rerun the full contract. Do not merge before required checks/review policy are satisfied.
