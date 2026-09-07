# Aftergraph V2 Public Systems Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `aftergraph.org` and `/launch` into the approved Aftergraph V2 systems interface without changing the zero-dependency Cloudflare Worker delivery model or overstating product/research maturity.

**Architecture:** Keep `site/index.html` and `site/launch.html` as code-native HTML/CSS/JS sources, keep `site/build-worker.cjs` as the compiler into `site/worker.js`, and add a small deterministic verifier for V2 structural/accessibility/security invariants. The visual system stays aligned with the existing Brand OS semantic palette; `src/styles/tokens.css` is read-only source-of-truth material and is not hand-edited.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node.js CommonJS build/verification scripts, Cloudflare Worker, Wrangler.

**Spec:** `docs/superpowers/specs/2026-09-07-aftergraph-v2-systems-interface-design.md`

## Global Constraints

- Keep static HTML/CSS/JS; no frontend framework rewrite.
- Keep existing Cloudflare Worker static serving, security headers and `/healthz`.
- Canonical public story: `intent -> mission -> authority -> execution -> evidence -> verification -> verified outcome`.
- Hero headline: `Infrastructure for verifiable intelligent systems.`
- Header destinations: Platform, Research, Docs, Trust, Launch.
- Launcher intent groups: Build, Operate, Verify, Research.
- Preserve truthful maturity labelling; never visually promote research/prototype state.
- Preserve semantic palette: control cyan, evidence teal, authority violet, decision amber, infrastructure blue, near-black navy canvas.
- No invented customer logos, testimonials, production metrics, novelty claims or maturity upgrades.
- Support visible focus, keyboard launcher navigation and `prefers-reduced-motion`.
- No unnecessary third-party JS or large hero media.

---

### Task 1: Add a deterministic V2 contract verifier

**Files:**
- Create: `site/verify-v2.cjs`
- Read-only reference: `src/styles/tokens.css`

**Interfaces:**
- Consumes: `site/index.html`, `site/launch.html`, generated `site/worker.js`.
- Produces: process exit `0` only when V2 structural, accessibility, copy, maturity and security invariants are present.

- [ ] **Step 1: Create the failing verifier**

Create `site/verify-v2.cjs` with exact assertions for the approved interface:

```js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const landing = read('index.html');
const launcher = read('launch.html');
const worker = fs.existsSync(path.join(root, 'worker.js')) ? read('worker.js') : '';

function has(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

has(landing, 'Infrastructure for verifiable intelligent systems.', 'V2 hero headline');
has(landing, 'Mission', 'mission trace');
has(landing, 'Authority', 'authority trace');
has(landing, 'Evidence', 'evidence trace');
has(landing, 'Verified', 'verified outcome trace');
has(landing, 'Complete != Verified', 'research-integrity principle');
has(landing, 'href="https://docs.aftergraph.org', 'docs cross-link');
has(landing, 'prefers-reduced-motion', 'reduced-motion support');
has(landing, ':focus-visible', 'visible focus');
has(launcher, 'Build', 'launcher Build group');
has(launcher, 'Operate', 'launcher Operate group');
has(launcher, 'Verify', 'launcher Verify group');
has(launcher, 'Research', 'launcher Research group');
has(launcher, 'role="option"', 'launcher option semantics');
has(launcher, 'aria-selected', 'launcher selected-state semantics');
has(launcher, 'Escape', 'launcher Escape behavior');
has(worker, "'Content-Security-Policy'", 'CSP');
has(worker, "'Strict-Transport-Security'", 'HSTS');
has(worker, "route: 'aftergraph-site v2.0.0'", 'V2 health route');

for (const forbidden of ['customer logos', 'trusted by thousands', 'industry-leading production']) {
  assert.ok(!landing.toLowerCase().includes(forbidden), `forbidden marketing claim: ${forbidden}`);
}

console.log('Aftergraph V2 contract: PASS');
```

- [ ] **Step 2: Run the verifier and confirm RED**

Run:

```bash
node site/verify-v2.cjs
```

Expected: FAIL on `missing V2 hero headline` against the current V1 page.

- [ ] **Step 3: Commit the verifier only**

```bash
git add site/verify-v2.cjs
git commit -m "test(site): codify Aftergraph V2 interface contract"
```

---

### Task 2: Redesign the landing page around the systems model

**Files:**
- Modify: `site/index.html`
- Read-only reference: `src/styles/tokens.css`
- Test: `site/verify-v2.cjs`

**Interfaces:**
- Consumes: Brand OS semantic colors and approved V2 copy/IA.
- Produces: semantic static landing page with hero, mission trace, three-layer system model, platform maturity, research distinctions, Why Aftergraph and cross-site navigation.

- [ ] **Step 1: Replace the first viewport with the approved V2 hero**

Implement a semantic `<header>` with:

```html
<h1>Infrastructure for verifiable intelligent systems.</h1>
<p class="lede">Bound missions. Scoped authority. Durable execution. Evidence that can be checked independently.</p>
<div class="hero-actions">
  <a class="button primary" href="#platform">Explore the platform</a>
  <a class="button secondary" href="https://docs.aftergraph.org/">Read the docs</a>
  <a class="button secondary" href="/launch">Launch system</a>
</div>
```

Add a code-native trace using ordered semantic steps:

```html
<ol class="mission-trace" aria-label="Verified intelligent system lifecycle">
  <li data-kind="mission">Mission</li>
  <li data-kind="authority">Authority</li>
  <li data-kind="execution">Execution</li>
  <li data-kind="evidence">Evidence</li>
  <li data-kind="verified">Verified</li>
</ol>
```

CSS requirements:
- desktop trace horizontal, mobile trace vertical;
- no glow-heavy animated headline;
- animation only on connector/progress accents inside `@media (prefers-reduced-motion: no-preference)`;
- `:focus-visible` uses control cyan and `outline-offset: 3px`;
- buttons and nav links have minimum 44px practical touch height on mobile.

- [ ] **Step 2: Build the three-layer platform model**

Implement one open systems surface, not a generic card wall:

```html
<section id="platform" aria-labelledby="platform-title">
  <h2 id="platform-title">One system, three control layers</h2>
  <div class="system-layer institution">...</div>
  <div class="system-layer execution">...</div>
  <div class="system-layer evidence">...</div>
</section>
```

Required content mapping:
- Intelligence / Institution: AIE, mission semantics, authority/delegation/budgets.
- Control & Execution: WORKS Execution dominant, Work Intelligence, Trust Gateway, Studio.
- Evidence & Knowledge: verification/evidence, Governance, docs Knowledge Plane.

WORKS must have the strongest typographic emphasis while keeping its existing prototype maturity wording unless canonical source state says otherwise.

- [ ] **Step 3: Replace research cards with an evidence-state matrix**

Use four explicit rows/columns labelled exactly:

```text
Research result
Specification / standard proposal
Implementation / runtime
Verified production behavior
```

Feature SPEC-001 and MISSION-Bench as research/specification surfaces and include this explanatory sentence verbatim:

```text
Research evidence can justify a promotion decision; it is never runtime authority by itself.
```

- [ ] **Step 4: Implement Why Aftergraph as five durable principles**

The section must include:

```text
Complete != Verified
Purpose-bound authority
Durable execution and recovery
Deterministic evidence gates
Cost per verified outcome
```

Use typographic rows with concise explanations, not five decorative cards.

- [ ] **Step 5: Rebuild header/footer IA and cross-links**

Header links:

```html
<a href="#platform">Platform</a>
<a href="#research">Research</a>
<a href="https://docs.aftergraph.org/">Docs</a>
<a href="#trust">Trust</a>
<a href="/launch" class="nav-launch">Launch</a>
```

Footer groups: Build, Research, Trust, Company / GitHub. Include direct links to `https://github.com/Aftergraph` and `https://docs.aftergraph.org/`.

- [ ] **Step 6: Run the V2 verifier**

Run:

```bash
node site/verify-v2.cjs
```

Expected: still FAIL only for launcher/worker assertions not implemented yet; landing assertions PASS.

- [ ] **Step 7: Commit the landing slice**

```bash
git add site/index.html
git commit -m "feat(site): redesign landing as verifiable systems interface"
```

---

### Task 3: Upgrade `/launch` into an accessible intent-based command surface

**Files:**
- Modify: `site/launch.html`
- Test: `site/verify-v2.cjs`

**Interfaces:**
- Consumes: static destination registry declared inside `launch.html`.
- Produces: fuzzy-ish searchable command surface grouped by Build/Operate/Verify/Research with keyboard, pointer, mobile and empty states.

- [ ] **Step 1: Replace destination taxonomy**

Each destination object must use this shape:

```js
{
  group: 'Build',
  name: 'WORKS Execution',
  purpose: 'Durable mission execution, workers, leases, budgets and recovery.',
  url: 'https://github.com/Aftergraph/works-execution',
  maturity: 'prototype',
  type: 'product'
}
```

Use only these intent groups: `Build`, `Operate`, `Verify`, `Research`.

- [ ] **Step 2: Render real interactive controls with ARIA state**

Search input:

```html
<input id="q" type="search" aria-label="Search Aftergraph destinations" aria-controls="results" autocomplete="off">
```

Results container:

```html
<div id="results" class="results" role="listbox" aria-label="Aftergraph destinations"></div>
```

Every rendered destination must be an `<a>` or `<button>` with:

```html
role="option" aria-selected="false"
```

and the active item must update `aria-selected="true"`.

- [ ] **Step 3: Implement keyboard state as one canonical function**

Use:

```js
function setActive(next) {
  const options = [...results.querySelectorAll('[role="option"]')];
  active = Math.max(0, Math.min(next, options.length - 1));
  options.forEach((el, index) => {
    const selected = index === active;
    el.classList.toggle('active', selected);
    el.setAttribute('aria-selected', String(selected));
    if (selected) el.scrollIntoView({ block: 'nearest' });
  });
}
```

Keyboard behavior:
- ArrowDown: next result.
- ArrowUp: previous result.
- Enter: follow active result URL.
- Escape: if query non-empty, clear and re-render; otherwise return focus to the main launcher shell without navigating.

- [ ] **Step 4: Implement all visual states**

Required CSS states:
- default group + row;
- hover;
- `.active` keyboard selected;
- `:focus-visible`;
- `.empty` result state;
- mobile single-column row with purpose wrapping rather than disappearing;
- reduced motion with transitions disabled.

Use 44px minimum row/control height on narrow viewports.

- [ ] **Step 5: Re-run V2 verifier**

```bash
node site/verify-v2.cjs
```

Expected: landing and launcher assertions PASS; worker version assertion may still FAIL.

- [ ] **Step 6: Commit launcher slice**

```bash
git add site/launch.html
git commit -m "feat(launcher): add accessible intent-based command surface"
```

---

### Task 4: Regenerate the worker and preserve security/deployment contracts

**Files:**
- Modify: `site/build-worker.cjs`
- Generated: `site/worker.js`
- Generated: `site/wrangler.toml`
- Modify: `DEPLOYMENT.md`
- Test: `site/verify-v2.cjs`

**Interfaces:**
- Consumes: updated landing/launcher HTML.
- Produces: Worker serving V2 sources with unchanged CSP/HSTS/frame/referrer/permissions controls and health route identifying `aftergraph-site v2.0.0`.

- [ ] **Step 1: Update build metadata only, not the security posture**

Change the health payload route string to:

```js
route: 'aftergraph-site v2.0.0'
```

Update OG description to the V2 positioning while retaining the same Organization JSON-LD shape and public URLs.

Do not remove or weaken any key in `SECURE`.

- [ ] **Step 2: Regenerate worker artifacts**

Run:

```bash
node site/build-worker.cjs
```

Expected output includes:

```text
favicon injected: true | JSON-LD: true
```

- [ ] **Step 3: Run deterministic V2 contract**

```bash
node site/verify-v2.cjs
```

Expected:

```text
Aftergraph V2 contract: PASS
```

- [ ] **Step 4: Inspect generated route/security strings**

Run:

```bash
node -e "const s=require('fs').readFileSync('site/worker.js','utf8'); for(const x of ['Content-Security-Policy','Strict-Transport-Security','/healthz','/launch','aftergraph-site v2.0.0']) if(!s.includes(x)) throw new Error(x); console.log('worker contract: PASS')"
```

Expected: `worker contract: PASS`.

- [ ] **Step 5: Update deployment documentation**

Document V2 source files, verifier command and deployment verification sequence:

```bash
node site/build-worker.cjs
node site/verify-v2.cjs
cd site && npx wrangler@4.129.0 deploy --config wrangler.toml --name aftergraph-site
curl -fsS https://aftergraph.org/healthz
curl -fsSI https://aftergraph.org/
curl -fsSI https://aftergraph.org/launch
```

- [ ] **Step 6: Commit generated runtime slice**

```bash
git add site/build-worker.cjs site/worker.js site/wrangler.toml DEPLOYMENT.md
git commit -m "release(site): compile Aftergraph V2 worker runtime"
```

---

### Task 5: Rendered QA, merge-queue readiness and production verification

**Files:**
- No source file required unless QA discovers a fix.

**Interfaces:**
- Consumes: complete V2 branch.
- Produces: visual/accessibility evidence, green repository checks, merge-ready PR and verified live routes when Cloudflare authorization is available.

- [ ] **Step 1: Run static gates from a clean branch state**

```bash
node site/build-worker.cjs
node site/verify-v2.cjs
git diff --check
git status --short
```

Expected: verifier PASS, `git diff --check` no output, only expected generated changes before commit and clean status after commit.

- [ ] **Step 2: Serve the generated worker locally**

Use the repository's Wrangler configuration:

```bash
cd site
npx wrangler@4.129.0 dev --local
```

Validate target flow:

```text
/ -> Explore platform -> /launch -> filter "evidence" -> keyboard select -> open destination
```

- [ ] **Step 3: Perform rendered desktop/mobile QA**

Required viewports:
- desktop: 1440x900;
- mobile: 390x844.

Verify:
- hero and mission trace fit first viewport;
- no horizontal overflow;
- system layers retain semantic order;
- launcher purpose text remains readable on mobile;
- visible keyboard focus;
- reduced-motion removes nonessential movement;
- no console/runtime errors.

- [ ] **Step 4: Compare rendered UI to approved concept before merge**

Use the frontend-app-builder fidelity workflow: inspect accepted concept and latest implementation screenshot side-by-side, record at least five comparison points covering headline/copy, hierarchy, palette, system-layer anatomy, launcher states and mobile behavior. Fix any material mismatch before continuing.

- [ ] **Step 5: Push branch and update PR**

Push `feat/aftergraph-v2-systems-interface` and ensure PR #12 contains implementation commits on top of the approved spec.

Repository rules require merge queue; do not bypass it.

- [ ] **Step 6: Merge through the configured queue after checks pass**

Expected: `main` advances only through repository rules, not direct Contents API writes.

- [ ] **Step 7: Deploy production when authorized**

```bash
cd site
npx wrangler@4.129.0 deploy --config wrangler.toml --name aftergraph-site
```

If authorization is unavailable, stop and report `PRODUCTION_DEPLOY_BLOCKED_AUTH` rather than claiming the site is live.

- [ ] **Step 8: Verify production**

```bash
curl -fsS https://aftergraph.org/healthz
curl -fsSI https://aftergraph.org/
curl -fsSI https://aftergraph.org/launch
curl -fsSI https://aftergraph.org/robots.txt
curl -fsSI https://aftergraph.org/sitemap.xml
```

Expected: HTTP 200 on all routes and `/healthz` includes `aftergraph-site v2.0.0`.
