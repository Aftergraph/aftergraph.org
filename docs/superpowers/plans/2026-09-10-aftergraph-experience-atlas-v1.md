# Aftergraph Experience Atlas V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Aftergraph Atlas into the shared evidence-aware interaction layer for `aftergraph.org` and `docs.aftergraph.org` without creating a second source of truth.

**Architecture:** Extend the existing `atlas-projection/0.2` with a deterministic public experience adapter and stable URL contract. The public site renders a lightweight projection-backed hero that hands context to `/atlas`; docs consumes only publication-safe projected context and adds focused Astro workbench components for lenses, mission trace inspection, contract navigation and source/evidence drill-down.

**Tech Stack:** React 18 + React Flow + ELK + Vite for Atlas; static HTML/vanilla JS for the public home; Astro 7 + Starlight 0.42 + vanilla browser JS for docs; Node test scripts + Vitest + existing DOM smoke harnesses.

**Spec:** `docs/superpowers/specs/2026-09-10-aftergraph-experience-atlas-v1-design.md`

## Global Constraints

- Canonical repositories remain the source of truth; UI state never upgrades evidence or certainty.
- Keep `atlas-projection/0.2` as canonical input; derive an experience view rather than inventing a new truth store.
- Never expose private repository HEADs, withheld subjects, or client-hidden private data.
- Do not load React Flow, ELK, or D3 on the public landing page.
- Required interaction must work with keyboard, touch, and `prefers-reduced-motion`.
- Unknown, stale, malformed, withheld and unavailable states must fail explicitly.
- No new heavy rendering dependency.
- Every production behavior change follows RED → GREEN → regression verification.

---

### Task 1: Experience projection and deep-link contract

**Files:**
- Create: `atlas/src/lib/experience.js`
- Create: `atlas/tests/experience.test.mjs`
- Modify: `atlas/src/lib/derive.js`
- Modify: `site/verify-atlas.cjs`

**Interfaces:**
- Produces `deriveExperienceView(projection)` returning `{schema, cut, entities}`.
- Produces `atlasLink({entity, view, lens, related, snapshot})`.
- Produces `parseExperienceState(search)` while preserving existing Atlas `node`, `overlay`, and `view` state.

- [ ] **Step 1: Write the failing experience-contract tests**

```js
expect(deriveExperienceView(fixture).schema).toBe('aftergraph-experience/0.1');
expect(atlasLink({ entity: 'repo:Aftergraph/aie', view: 'topology', lens: 'SOURCE' }))
  .toBe('/atlas/?node=repo%3AAftergraph%2Faie&view=topology&lens=SOURCE');
expect(deriveExperienceView(privateFixture).entities.some(e => e.privateHead)).toBe(false);
```

- [ ] **Step 2: Run RED**

Run: `cd atlas && npm test -- --run tests/experience.test.mjs`
Expected: FAIL because `experience.js` does not exist.

- [ ] **Step 3: Implement minimal pure adapter + stable state parsing**

The adapter may copy only publication-safe identity, kind, label, public provenance links, supported lens flags, relation IDs and cut metadata from an already-gated AtlasProjection. Unknown lens values normalize to `SYSTEM`; unknown entity IDs remain unresolved rather than fuzzy-matching.

- [ ] **Step 4: Run GREEN + projection gates**

Run: `cd atlas && npm test -- --run && cd .. && node site/atlas-projection.test.mjs && node site/verify-atlas.cjs`
Expected: existing 40 tests plus new experience tests PASS; private-SHA gate remains PASS.

- [ ] **Step 5: Commit**

```bash
git add atlas/src/lib/experience.js atlas/tests/experience.test.mjs atlas/src/lib/derive.js site/verify-atlas.cjs
git commit -m "feat(atlas): add public experience projection contract"
```

### Task 2: Lightweight Living Hero → Atlas handoff

**Files:**
- Create: `site/experience-hero.js`
- Create: `site/experience-hero.test.mjs`
- Modify: `site/index.html`
- Modify: `site/verify-site.cjs`

**Interfaces:**
- Consumes only a tiny static/public neighborhood embedded by the page build; it does not import Atlas vendors.
- Produces stable `/atlas/?node=...&view=topology&lens=SYSTEM` handoffs.

- [ ] **Step 1: Write RED tests for hero semantics and bundle isolation**

```js
assert.equal(buildAtlasHref('repo:Aftergraph/trust-gateway'), '/atlas/?node=repo%3AAftergraph%2Ftrust-gateway&view=topology&lens=SYSTEM');
assert.ok(!home.includes('vendor-flow-'));
assert.ok(!home.includes('elkjs'));
```

- [ ] **Step 2: Run RED**

Run: `node site/experience-hero.test.mjs`
Expected: FAIL on missing module/behavior.

- [ ] **Step 3: Implement semantic hero interaction**

Replace the decorative hero graph with selectable lifecycle/system nodes. Hover/focus/touch highlights real configured relationships; each selectable system exposes an `Inspect in Atlas` link. Keep the lifecycle walkthrough visibly labelled `Illustrative system walkthrough` unless backed by observed runtime evidence. Reduced-motion disables trace animation without hiding state.

- [ ] **Step 4: Run GREEN + static site verification**

Run: `node site/experience-hero.test.mjs && node site/verify-site.cjs && node site/verify-v2.cjs`
Expected: PASS and no Atlas vendor script referenced by `/`.

- [ ] **Step 5: Commit**

```bash
git add site/index.html site/experience-hero.js site/experience-hero.test.mjs site/verify-site.cjs
git commit -m "feat(site): make home a living Atlas entry"
```

### Task 3: Docs workbench lenses and source/evidence inspector

**Files in `Aftergraph/docs`:**
- Create: `src/components/WorkbenchLens.astro`
- Create: `src/components/SourceEvidenceInspector.astro`
- Create: `scripts/verify-workbench.mjs`
- Modify: `src/styles/v2.css`
- Modify: `package.json`

**Interfaces:**
- `WorkbenchLens` receives supported lens names and stores active state in `?lens=`.
- `SourceEvidenceInspector` receives publication-safe source/evidence records as props; missing values render `Not evidenced` or `Withheld`, never inferred values.

- [ ] **Step 1: Add RED verifier assertions**

```js
includes(lens, 'SYSTEM');
includes(lens, 'EVIDENCE');
includes(lens, 'SOURCE');
includes(inspector, 'Not evidenced');
includes(inspector, 'Withheld');
```

- [ ] **Step 2: Run RED**

Run: `npm run verify:workbench`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the two Astro components and scoped styles**

Use semantic buttons with `aria-pressed`, URL restoration, no framework hydration dependency, and explicit unavailable states. `AUTHORITY` and `COST` are rendered only when included in supported lenses by the caller.

- [ ] **Step 4: Run GREEN + docs build**

Run: `npx astro sync && npm run check && npm run verify:v2-ui && npm run verify:workbench && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit in docs repo**

```bash
git add src/components/WorkbenchLens.astro src/components/SourceEvidenceInspector.astro src/styles/v2.css scripts/verify-workbench.mjs package.json
git commit -m "feat(docs): add evidence-aware workbench lenses"
```

### Task 4: Golden Mission Trace Explorer

**Files in `Aftergraph/docs`:**
- Modify: `src/components/MissionFlow.astro`
- Modify: `src/content/docs/platform/golden-mission.mdx`
- Modify: `scripts/verify-workbench.mjs`
- Modify: `src/styles/v2.css`

**Interfaces:**
- The component continues consuming `src/data/golden-mission.json` + `src/data/system-map.json`.
- Selection is local UI state; source/contract/API links remain canonical bindings.
- UI labels route semantics honestly and do not claim runtime execution where the source only describes a route.

- [ ] **Step 1: Extend RED verifier with trace semantics**

```js
includes(mission, 'data-mission-step');
includes(mission, 'aria-current');
includes(mission, 'Route walkthrough');
includes(mission, 'Complete is not verified');
```

- [ ] **Step 2: Run RED**

Run: `npm run verify:workbench`
Expected: FAIL on missing trace affordances.

- [ ] **Step 3: Upgrade MissionFlow**

Render a keyboard/touch-selectable step rail plus inspector pane for owner, contract, API binding and verified-binding state. Preserve the existing 10 canonical route steps from generated data. Do not relabel route steps as observed runtime states. Add explicit copy that route completion does not equal a verified outcome.

- [ ] **Step 4: Run GREEN + build**

Run: `npm run verify:workbench && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit in docs repo**

```bash
git add src/components/MissionFlow.astro src/content/docs/platform/golden-mission.mdx src/styles/v2.css scripts/verify-workbench.mjs
git commit -m "feat(docs): turn Golden Mission into trace explorer"
```

### Task 5: Contract Graph inspection + cross-site context

**Files in `Aftergraph/docs`:**
- Modify: `src/components/ContractGraph.astro`
- Modify: `src/content/docs/standards/contract-graph.mdx`
- Modify: `scripts/verify-workbench.mjs`
- Modify: `src/styles/v2.css`

**Interfaces:**
- Existing contract filter remains.
- Node selection exposes owner/consumer relationships and an Atlas deep link using the selected repo entity ID.
- Keyboard Enter selects; Escape clears; touch click selects.

- [ ] **Step 1: Add RED verifier assertions for selection and Atlas handoff**

```js
includes(contractGraph, 'data-node-id');
includes(contractGraph, 'Inspect in Atlas');
includes(contractGraph, 'Escape');
```

- [ ] **Step 2: Run RED**

Run: `npm run verify:workbench`
Expected: FAIL before component upgrade.

- [ ] **Step 3: Implement selection inspector and deep links**

Reuse the SVG graph. Do not introduce another graph library. Selected nodes keep connected edges highlighted and unrelated edges dimmed. The inspector names only relationships present in `graph.json`; the Atlas link uses `repo:Aftergraph/<slug>` and `view=topology&lens=SOURCE`.

- [ ] **Step 4: Run GREEN + docs build**

Run: `npm run verify:workbench && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit in docs repo**

```bash
git add src/components/ContractGraph.astro src/content/docs/standards/contract-graph.mdx src/styles/v2.css scripts/verify-workbench.mjs
git commit -m "feat(docs): make contract graph inspectable"
```

### Task 6: Integrated accessibility, browser, visual and performance gates

**Files:**
- Modify: `aftergraph.org/atlas/scripts/verify-dom.mjs`
- Modify: `aftergraph.org/site/verify-site.cjs`
- Modify: `docs/scripts/verify-workbench.mjs`
- Add generated screenshots only after successful local/browser verification.

- [ ] **Step 1: Add failing browser/static assertions**

Assert: hero selection is keyboard reachable; reduced-motion path has no required animated-only information; Atlas restores node/view/lens; docs lens URL restores; Golden Mission and Contract Graph inspectors are reachable by keyboard; mobile width has no horizontal overflow; `/` references no React Flow/ELK/D3 bundle.

- [ ] **Step 2: Run RED and fix only the observed failures**

Run the existing Atlas DOM smoke plus docs production build/static verifier. Each failure gets the smallest implementation correction and a regression assertion.

- [ ] **Step 3: Full regression**

```bash
# aftergraph.org
cd atlas && npm test -- --run && npm run build
cd .. && node site/atlas-projection.test.mjs && node site/verify-atlas.cjs && node site/verify-site.cjs

# docs
npx astro sync && npm run check && npm run verify:v2-ui && npm run verify:workbench && npm run build
```

Expected: all commands exit 0.

- [ ] **Step 4: Capture canonical desktop + mobile evidence**

Use the existing browser screenshot harnesses against the built local surfaces. Capture home Living Atlas, Atlas restored selection, docs Golden Mission, docs Contract Graph and mobile variants. Do not label these as production evidence until exact-head deployment is verified.

- [ ] **Step 5: Push two feature branches and open separate PRs**

`Aftergraph/aftergraph.org: feat/experience-atlas-v1` and `Aftergraph/docs: feat/experience-workbench-v1`. PR bodies must include exact test outputs, publication/privacy result, bundle-isolation result and remaining limitations. No bypass or direct-to-main push.
