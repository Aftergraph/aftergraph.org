# Aftergraph V3 Product Front Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `aftergraph.org` into a visitor-first Aftergraph masterbrand and product router that makes Studio, Wie and Sentinel understandable before exposing the deeper platform architecture, while preserving evidence boundaries, static delivery, accessibility and exact-head deployment discipline.

**Architecture:** Keep the existing static HTML/CSS/vanilla-JS + deterministic Cloudflare Worker compiler. Add one machine-readable public catalog that the launcher consumes at build time, add a deterministic V3 contract verifier, then restructure the homepage from systems-first to product-first without making `aftergraph.org` a new source of runtime/research truth. Active community and exact-head deployment work must be adopted before implementation rather than overwritten.

**Tech Stack:** Static HTML/CSS/vanilla JS, Node.js CommonJS build/verification scripts, JSON catalog, Cloudflare Worker, Wrangler.

**Spec:** `docs/superpowers/specs/2026-09-08-aftergraph-v3-product-front-door-design.md`

## Global Constraints

- Keep static HTML/CSS/vanilla JS; no React/Next/Astro migration in this wave.
- `aftergraph.org` owns IA/copy/presentation/deployment only; canonical runtime, research, governance and brand truth stay in their owner repositories.
- Core content/navigation must remain useful without JavaScript.
- Public lifecycle: `Intent -> Intelligence -> Authority -> Trust -> Runtime -> Durable Execution -> Evidence -> Independent Verification -> Verified Outcome`.
- Homepage user order: products first, platform mechanism second, evidence/research third.
- Primary product experiences: Studio, Wie, Sentinel.
- Infrastructure: AIE, Trust Gateway, Aftergraph Runtime, WORKS.
- Private repositories and held brands are never exposed merely because they exist.
- `autonomous-venture-company` is migration-source context, not a new public product destination.
- No fake customer logos, testimonials, run counts, spend, test totals, uptime numbers or adoption claims.
- Illustrative product/system data must be explicitly example/illustrative or omitted.
- Preserve semantic Brand OS palette and identity; no decorative visual effect without state/relationship meaning.
- Target WCAG 2.2 AA, visible focus, keyboard launcher, practical >=44px mobile primary controls and `prefers-reduced-motion`.
- Preserve existing CSP, HSTS, frame, MIME, referrer and permissions headers.
- Preserve or adopt `/community` and its smoke/launcher/nav integration when PR #57 lands.
- Preserve or adopt exact-head production deployment workflow from PR #58 when it lands.
- Repository reality at implementation time wins over this plan's 2026-09-08 evidence cut.

---

### Task 1: Refresh exact repository truth and adopt concurrent public-surface work

**Files:**
- Read: `.github/workflows/*`
- Read: `site/build-worker.cjs`
- Read: `site/index.html`
- Read: `site/launch.html`
- Read: `site/status.html`
- Read: `site/llms.txt`
- Read: `docs/superpowers/specs/2026-09-08-aftergraph-v3-product-front-door-design.md`
- No source write until branch has been refreshed.

**Interfaces:**
- Consumes: current remote `main`, PR #57 community behavior if merged, PR #58 exact-head deployment behavior if merged.
- Produces: an implementation branch based on current `main` with no stale overwrite risk.

- [ ] **Step 1: Fetch current remote state**

Run:

```bash
git fetch origin --prune
git checkout -b feat/aftergraph-v3-product-front-door origin/main
```

Expected: new feature branch starts at current remote `main`, not the planning branch's historical SHA.

- [ ] **Step 2: Inspect whether community and deploy work landed**

Run:

```bash
git log --oneline -20
find .github/workflows -maxdepth 1 -type f -print | sort
grep -R "community" -n site .github DEPLOYMENT.md 2>/dev/null | head -50
grep -R "ENABLE_DEPLOY\|CLOUDFLARE_API_TOKEN\|GITHUB_SHA" -n .github/workflows 2>/dev/null | head -50
```

Expected: record whether PR #57 and #58 are now part of `main`.

- [ ] **Step 3: Run the current repository gates before editing**

Run:

```bash
node site/build-worker.cjs
if [ -f site/verify-v2.cjs ]; then node site/verify-v2.cjs; fi
git diff --check
```

Expected: current branch baseline passes. If it does not, stop and separate pre-existing failure evidence from V3 work.

- [ ] **Step 4: Commit only if baseline generation legitimately updates tracked generated artifacts**

Normally expected: no commit. If `site/worker.js` is stale on current `main`, fix that as a separate atomic preflight commit only after confirming source/build mismatch:

```bash
git add site/worker.js site/wrangler.toml
git commit -m "chore(site): refresh generated worker before V3"
```

---

### Task 2: Add the deterministic V3 public-interface contract

**Files:**
- Create: `site/verify-v3.cjs`
- Read: `site/index.html`
- Read: `site/launch.html`
- Read: `site/status.html`
- Read: `site/build-worker.cjs`
- Generated read: `site/worker.js`

**Interfaces:**
- Consumes: source HTML and generated Worker.
- Produces: process exit `0` only when V3 visitor-first, product, evidence, accessibility and security invariants exist.

- [ ] **Step 1: Create the RED V3 verifier**

Create `site/verify-v3.cjs`:

```js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const landing = read('index.html');
const launcher = read('launch.html');
const status = read('status.html');
const build = read('build-worker.cjs');
const worker = fs.existsSync(path.join(root, 'worker.js')) ? read('worker.js') : '';

function has(haystack, needle, label = needle) {
  assert.ok(haystack.includes(needle), `missing ${label}`);
}

function lacks(haystack, needle, label = needle) {
  assert.ok(!haystack.toLowerCase().includes(needle.toLowerCase()), `forbidden ${label}`);
}

has(landing, 'Build autonomous systems that can prove they worked.', 'visitor-first hero');
has(landing, 'Explore products', 'primary product CTA');
has(landing, 'Launch Aftergraph', 'launch CTA');
has(landing, 'Studio', 'Studio product');
has(landing, 'Wie', 'Wie product');
has(landing, 'Sentinel', 'Sentinel product');
has(landing, 'What do you want to do?', 'intent router');
has(landing, 'Use intelligent systems', 'Use intent');
has(landing, 'Verify outcomes', 'Verify intent');
has(landing, 'Build and operate', 'Build intent');
has(landing, 'Research and extend', 'Research intent');
has(landing, 'Agent says done', 'claim vs verification explanation');
has(landing, 'Verified outcome', 'verified outcome concept');
has(landing, 'Aftergraph Runtime', 'Runtime platform owner');
has(landing, 'Trust Gateway', 'Trust platform owner');
has(landing, 'WORKS', 'Execution platform owner');
has(landing, 'AIE', 'Authority platform owner');
has(landing, 'prefers-reduced-motion', 'reduced-motion support');
has(landing, ':focus-visible', 'visible focus');
has(launcher, '__AG_PUBLIC_CATALOG__', 'build-time public catalog marker');
has(launcher, 'ArrowDown', 'launcher keyboard down');
has(launcher, 'ArrowUp', 'launcher keyboard up');
has(launcher, 'Escape', 'launcher escape behavior');
has(status, 'Availability', 'status availability dimension');
has(status, 'Maturity', 'status maturity dimension');
has(status, 'Evidence', 'status evidence dimension');
has(build, 'public-catalog.json', 'catalog compiler input');
has(worker, "'Content-Security-Policy'", 'CSP');
has(worker, "'Strict-Transport-Security'", 'HSTS');
has(worker, '/healthz', 'health route');

for (const phrase of [
  'trusted by thousands',
  'industry-leading production',
  '100% reliable',
  'veranza by aftergraph'
]) lacks(landing, phrase, phrase);

console.log('Aftergraph V3 contract: PASS');
```

- [ ] **Step 2: Run the verifier and prove RED**

Run:

```bash
node site/verify-v3.cjs
```

Expected: FAIL on `missing visitor-first hero` or another first unimplemented V3 invariant.

- [ ] **Step 3: Commit the test contract only**

```bash
git add site/verify-v3.cjs
git commit -m "test(site): codify Aftergraph V3 product-front-door contract"
```

---

### Task 3: Create one public catalog with fail-closed visibility rules

**Files:**
- Create: `site/public-catalog.json`
- Modify: `site/build-worker.cjs`
- Test: `site/verify-v3.cjs`

**Interfaces:**
- Consumes: public product/destination facts verified from canonical owners at implementation time.
- Produces: `catalog.destinations[]` used by `/launch` and build-time visibility gates.

- [ ] **Step 1: Create the catalog with an explicit schema-by-convention**

Create `site/public-catalog.json` using this shape and only publicly reachable entries:

```json
{
  "schema_version": "aftergraph.public-catalog/1.0",
  "evidence_cut": "2026-09-08",
  "destinations": [
    {
      "id": "studio",
      "name": "Studio",
      "group": "Use",
      "kind": "product",
      "purpose": "The primary human operating environment for Chat, Work, Space, control and evidence.",
      "maturity": "reference-build",
      "visibility": "public",
      "href": "https://github.com/Aftergraph/studio",
      "source_href": "https://github.com/Aftergraph/studio",
      "evidence_class": "repository-verified"
    },
    {
      "id": "wie",
      "name": "Wie",
      "group": "Use",
      "kind": "product",
      "purpose": "Turn source-neutral observations into governed WorkItems for review and downstream execution.",
      "maturity": "production-integration",
      "visibility": "public",
      "href": "https://wie.aftergraph.org/",
      "source_href": "https://github.com/Aftergraph/wi-backend",
      "evidence_class": "repository-verified"
    },
    {
      "id": "sentinel",
      "name": "Sentinel",
      "group": "Verify",
      "kind": "product",
      "purpose": "Evidence-backed code review bound to the exact reviewed subject.",
      "maturity": "prototype",
      "visibility": "public",
      "href": "/sentinel",
      "source_href": "https://github.com/Aftergraph/sentinel",
      "evidence_class": "repository-verified"
    }
  ]
}
```

Before committing, extend the same array with only currently public/reachable Build & Operate, Extend and Understand destinations. For each addition, copy the maturity wording from an owning public source or use a weaker truthful label.

Never add private repo URLs. In particular, do not add a direct public GitHub link for private Runtime, `wi-frontend`, Skills Vault, ACC, AFM/model internals or AVC.

- [ ] **Step 2: Add catalog validation to `build-worker.cjs`**

Immediately after the existing `read` helpers, add:

```js
const catalog = JSON.parse(read('public-catalog.json'));
const allowedGroups = new Set(['Use', 'Verify', 'Build & Operate', 'Extend', 'Understand']);
assert(catalog.schema_version === 'aftergraph.public-catalog/1.0', 'public catalog schema version');
assert(Array.isArray(catalog.destinations) && catalog.destinations.length > 0, 'public catalog must contain destinations');
assert(catalog.destinations.every((item) => item.visibility === 'public'), 'public catalog must fail closed on visibility');
assert(catalog.destinations.every((item) => allowedGroups.has(item.group)), 'public catalog contains an invalid group');
assert(!catalog.destinations.some((item) => /context-continuity|\/runtime(?:$|\/)|skills-vault|\/afm(?:$|\/)|autonomous-venture-company/i.test(item.source_href || '')), 'public catalog leaks a private or migration-source repository');
```

- [ ] **Step 3: Run the build and verifier**

Run:

```bash
node site/build-worker.cjs
node site/verify-v3.cjs
```

Expected: build passes catalog gates; V3 verifier remains RED because homepage/launcher work is not implemented.

- [ ] **Step 4: Commit the catalog slice**

```bash
git add site/public-catalog.json site/build-worker.cjs
git commit -m "feat(site): add governed public destination catalog"
```

---

### Task 4: Rebuild the first viewport around visitor intent

**Files:**
- Modify: `site/index.html`
- Test: `site/verify-v3.cjs`
- Read-only reference: Brand OS material already consumed by this repository.

**Interfaces:**
- Consumes: V3 copy/IA contract.
- Produces: hero + intent router that make useful product actions understandable before architecture terminology.

- [ ] **Step 1: Replace the hero headline and CTA hierarchy**

Required semantic core:

```html
<section class="hero" aria-labelledby="hero-title">
  <div class="hero-copy">
    <p class="eyebrow">Verified intelligent systems</p>
    <h1 id="hero-title">Build autonomous systems that can prove they worked.</h1>
    <p class="lede">Aftergraph connects intelligent work to bounded authority, durable execution, evidence and independent verification.</p>
    <div class="hero-actions">
      <a class="button primary" href="#products">Explore products</a>
      <a class="button secondary" href="/launch">Launch Aftergraph</a>
      <a class="text-link" href="https://docs.aftergraph.org/">Build with Aftergraph</a>
    </div>
  </div>
  <div class="hero-system" aria-label="Illustrative path from intent to verified outcome">...</div>
</section>
```

- [ ] **Step 2: Implement an illustrative state path with no fabricated metrics**

Use state labels only:

```html
<ol class="outcome-path">
  <li><span>01</span><strong>Intent received</strong></li>
  <li><span>02</span><strong>Work inferred</strong></li>
  <li><span>03</span><strong>Authority bounded</strong></li>
  <li><span>04</span><strong>Execution durable</strong></li>
  <li><span>05</span><strong>Evidence emitted</strong></li>
  <li><span>06</span><strong>Verifier checks subject</strong></li>
  <li><span>07</span><strong>Verified outcome</strong></li>
</ol>
```

Do not include sample currency, repository counts, test counts or success percentages in this hero visual.

- [ ] **Step 3: Add the four-intent router directly after hero**

Required structure:

```html
<section id="products" aria-labelledby="intent-title">
  <p class="section-kicker">Products</p>
  <h2 id="intent-title">What do you want to do?</h2>
  <div class="intent-grid">
    <a href="#use"><strong>Use intelligent systems</strong><span>Studio · Wie</span></a>
    <a href="#verify"><strong>Verify outcomes</strong><span>Sentinel</span></a>
    <a href="#platform"><strong>Build and operate</strong><span>Runtime · WORKS · Trust Gateway · AIE</span></a>
    <a href="#research"><strong>Research and extend</strong><span>Docs · Research · Skills · Models · Continuity</span></a>
  </div>
</section>
```

- [ ] **Step 4: Apply state-driven motion only under no-preference**

CSS must include:

```css
@media (prefers-reduced-motion: no-preference) {
  .outcome-path li::after { transition: transform 280ms ease, opacity 280ms ease; }
  .intent-grid a { transition: transform 180ms ease, border-color 180ms ease, background 180ms ease; }
  .intent-grid a:hover { transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 5: Run V3 verifier**

```bash
node site/verify-v3.cjs
```

Expected: hero/intent assertions pass; later product/launcher/status assertions remain RED.

- [ ] **Step 6: Commit the first-viewport slice**

```bash
git add site/index.html
git commit -m "feat(site): make Aftergraph V3 visitor and product first"
```

---

### Task 5: Add Studio, Wie and Sentinel as distinct product experiences

**Files:**
- Modify: `site/index.html`
- Test: `site/verify-v3.cjs`

**Interfaces:**
- Consumes: canonical product roles and source-bounded maturity labels.
- Produces: three explanatory product blocks with outcome, miniature, maturity and destination.

- [ ] **Step 1: Add the Studio product block**

Required conceptual content:

```html
<article id="use" class="product-feature product-studio">
  <p class="product-kind">Primary experience</p>
  <h3>Studio by Aftergraph</h3>
  <p>Work with governed intelligence through three permanent modes: Chat, Work and Space.</p>
  <div class="product-miniature" aria-label="Illustrative Studio interface">
    <div class="mode-tabs"><span>Chat</span><span>Work</span><span>Space</span></div>
    <div class="mini-row"><span>Mission</span><strong>Active</strong></div>
    <div class="mini-row"><span>Needs You</span><strong>Review</strong></div>
    <div class="mini-row"><span>Evidence</span><strong>Available</strong></div>
  </div>
</article>
```

Use repository-backed wording such as `reference build` where the canonical owner does not claim a public production runtime.

- [ ] **Step 2: Add the Wie product block**

Required flow:

```html
<ol class="mini-flow" aria-label="Wie work inference flow">
  <li>Signal</li>
  <li>Observation</li>
  <li>WorkItem</li>
  <li>Review</li>
  <li>Publish / Promote</li>
</ol>
```

Public destination should use the live public Wie URL only if it is reachable at implementation/deployment verification time; otherwise downgrade to docs/source and label the live route unavailable rather than silently linking to a broken surface.

- [ ] **Step 3: Add the Sentinel product block**

Required miniature:

```html
<div class="sentinel-verdict" aria-label="Illustrative Sentinel verdict">
  <div><span>Subject</span><strong>Exact HEAD</strong></div>
  <div><span>Evidence</span><strong>Cited</strong></div>
  <div><span>Verdict</span><strong>SHIP / DO NOT SHIP</strong></div>
</div>
```

Primary destination: `/sentinel`.

- [ ] **Step 4: Add explicit maturity semantics as text**

Every product feature must contain a visible textual maturity badge/line, for example:

```html
<span class="maturity" data-state="prototype">Prototype</span>
```

Never rely on badge color alone.

- [ ] **Step 5: Run V3 verifier**

```bash
node site/verify-v3.cjs
```

Expected: Studio/Wie/Sentinel assertions pass.

- [ ] **Step 6: Commit product experiences**

```bash
git add site/index.html
git commit -m "feat(site): expose Studio Wie and Sentinel product experiences"
```

---

### Task 6: Move trust and platform architecture below the product story

**Files:**
- Modify: `site/index.html`
- Test: `site/verify-v3.cjs`

**Interfaces:**
- Consumes: canonical platform ownership boundaries.
- Produces: public trust explanation + platform lifecycle that does not grant research/UI runtime authority.

- [ ] **Step 1: Add the claim-to-verdict trust section**

Use this semantic structure:

```html
<section id="verify" aria-labelledby="verify-title">
  <p class="section-kicker">Trust</p>
  <h2 id="verify-title">Agent says done. The system still has to prove it.</h2>
  <ol class="verification-chain">
    <li><strong>Claim</strong><span>An actor declares an outcome.</span></li>
    <li><strong>Evidence</strong><span>Execution leaves inspectable artifacts.</span></li>
    <li><strong>Independent verifier</strong><span>A separate verifier checks the subject.</span></li>
    <li><strong>Verified outcome</strong><span>The verdict is bound to what was actually checked.</span></li>
  </ol>
</section>
```

- [ ] **Step 2: Add the canonical platform lifecycle**

Required ordered stages:

```html
<ol class="platform-lifecycle" aria-label="Aftergraph platform lifecycle">
  <li><span>Intelligence</span><strong>Wie</strong></li>
  <li><span>Authority</span><strong>AIE</strong></li>
  <li><span>Trust</span><strong>Trust Gateway</strong></li>
  <li><span>Runtime</span><strong>Aftergraph Runtime</strong></li>
  <li><span>Execution</span><strong>WORKS</strong></li>
  <li><span>Verification</span><strong>Sentinel / domain verifier</strong></li>
</ol>
```

Add separate notes that Studio is the Experience plane and Research/Governance remain outside execution authority.

- [ ] **Step 3: Remove or demote systems-first material that duplicates the new lifecycle**

Do not leave two competing architecture narratives in the page. Keep the stronger V3 lifecycle and reuse any valuable V2 evidence wording beneath it.

- [ ] **Step 4: Run V3 verifier**

```bash
node site/verify-v3.cjs
```

Expected: trust/platform assertions pass.

- [ ] **Step 5: Commit the platform/trust slice**

```bash
git add site/index.html
git commit -m "feat(site): explain evidence-gated platform composition"
```

---

### Task 7: Make `/launch` consume the governed public catalog

**Files:**
- Modify: `site/launch.html`
- Modify: `site/build-worker.cjs`
- Test: `site/verify-v3.cjs`

**Interfaces:**
- Consumes: `site/public-catalog.json`.
- Produces: a build-time-injected catalog with accessible search/keyboard navigation and no client network request.

- [ ] **Step 1: Replace the launch page's hand-maintained destination data with a build marker**

Inside the launcher script, define:

```js
const destinations = __AG_PUBLIC_CATALOG__;
```

Add a no-JS fallback immediately after the launcher shell:

```html
<noscript>
  <p>JavaScript is optional for the site, but launcher search needs it. Use the direct links below.</p>
  <ul>
    <li><a href="https://docs.aftergraph.org/">Docs</a></li>
    <li><a href="/sentinel">Sentinel</a></li>
    <li><a href="https://github.com/Aftergraph">GitHub</a></li>
  </ul>
</noscript>
```

- [ ] **Step 2: Inject catalog data in `build-worker.cjs`**

After loading the catalog, replace the marker before metadata injection:

```js
launch = launch.replace('__AG_PUBLIC_CATALOG__', JSON.stringify(catalog.destinations));
assert(!launch.includes('__AG_PUBLIC_CATALOG__'), 'launcher catalog marker must be compiled');
```

Do not use a runtime fetch for the catalog.

- [ ] **Step 3: Group rendered results in canonical order**

Use:

```js
const groupOrder = ['Use', 'Verify', 'Build & Operate', 'Extend', 'Understand'];
```

Rendering must preserve this order while filtering by query.

- [ ] **Step 4: Implement one canonical selected-index function**

Use:

```js
function setActive(next) {
  const options = [...results.querySelectorAll('[role="option"]')];
  if (!options.length) { active = -1; return; }
  active = Math.max(0, Math.min(next, options.length - 1));
  options.forEach((el, index) => {
    const selected = index === active;
    el.classList.toggle('active', selected);
    el.setAttribute('aria-selected', String(selected));
    if (selected) el.scrollIntoView({ block: 'nearest' });
  });
}
```

Keyboard contract:

```text
ArrowDown -> active + 1
ArrowUp   -> active - 1
Enter     -> activate selected destination
Escape    -> clear query and selection; keep user on launcher
```

- [ ] **Step 5: Add useful empty state and maturity text**

Empty result must render text, not a blank panel:

```html
<p class="empty">No public Aftergraph destination matches that search.</p>
```

Each row must render `name`, `purpose`, `group/kind` and textual `maturity` when present.

- [ ] **Step 6: Build and run verifier**

```bash
node site/build-worker.cjs
node site/verify-v3.cjs
```

Expected: launcher marker exists in source, is absent from generated Worker, and launcher assertions pass.

- [ ] **Step 7: Commit launcher/catalog compilation**

```bash
git add site/launch.html site/build-worker.cjs site/worker.js site/wrangler.toml
git commit -m "feat(launcher): compile governed Aftergraph product catalog"
```

---

### Task 8: Upgrade `/status` from repo activity to evidence-aware platform status

**Files:**
- Modify: `site/status.html`
- Modify: `site/status-data.json`
- Modify: `site/build-worker.cjs` only if status-data injection is required by current implementation.
- Test: `site/verify-v3.cjs`

**Interfaces:**
- Consumes: build-time status snapshot and public health destinations.
- Produces: status surface that distinguishes availability, maturity and evidence rather than conflating them.

- [ ] **Step 1: Add explicit status dimensions to page copy**

Required labels:

```text
Availability
Maturity
Source
Evidence
Known limitations
```

Add this explanatory invariant visibly:

```text
Availability != maturity != verification != scientific reproduction.
```

- [ ] **Step 2: Extend status-data objects without inventing live truth**

Use additive fields only when they are actually known:

```json
{
  "name": "wi-backend",
  "visibility": "public",
  "maturity": "production-integration",
  "availability": "see-health-endpoint",
  "source": "Aftergraph/wi-backend",
  "evidence_class": "repository-verified",
  "limitations": "Frontend and provider availability are separate from backend maturity."
}
```

Do not convert old `pushed_at` timestamps into implied service health.

- [ ] **Step 3: Keep build provenance explicit**

Preserve `__AG_SHA__` and `__AG_DEPLOYED__` placeholders and the exact-head deployment workflow's replacement semantics if PR #58 has landed.

- [ ] **Step 4: Run V3 verifier**

```bash
node site/build-worker.cjs
node site/verify-v3.cjs
```

Expected: status assertions pass.

- [ ] **Step 5: Commit status semantics**

```bash
git add site/status.html site/status-data.json site/build-worker.cjs site/worker.js site/wrangler.toml
git commit -m "feat(status): separate availability maturity and evidence"
```

---

### Task 9: Reconcile navigation, community, machine-readable surfaces and documentation

**Files:**
- Modify: `site/index.html`
- Modify: `site/launch.html`
- Modify: `site/llms.txt`
- Modify: `site/build-worker.cjs`
- Modify: `SYSTEM-MAP.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DECISIONS.md`
- Modify: `README.md`
- Modify: `DEPLOYMENT.md` if current production workflow requires V3 commands/routes.
- Preserve: `site/community.html` if present after PR #57.

**Interfaces:**
- Consumes: completed V3 page structure and landed community/deploy contracts.
- Produces: one coherent human + agent routing model.

- [ ] **Step 1: Set the common public navigation order**

Use:

```text
Products
Platform
Research
Docs
Community
Launch
```

If `/community` has not landed, do not create a dead internal link; route Community to the canonical public Discussions surface until the page lands.

- [ ] **Step 2: Update `llms.txt` as routing, not duplicated volatile truth**

Ensure it directs agents to:

- public front door;
- public catalog/product surfaces;
- Knowledge Plane;
- Governance;
- Research;
- public Discussions/RFC plane;
- Sentinel.

Do not add private repository links or unsupported maturity claims.

- [ ] **Step 3: Update architecture documentation**

`ARCHITECTURE.md` must state that V3 changes presentation order, not authority:

```text
visitor intent -> product destination -> platform explanation -> evidence/source
```

while canonical execution remains owned elsewhere.

- [ ] **Step 4: Update `SYSTEM-MAP.md`**

Add the product-facing map:

```text
Experience: Studio / Wie
Verification: Sentinel
Infrastructure: AIE -> Trust Gateway -> Runtime -> WORKS
Cross-cutting: Governance / Research / Skills / Models / Continuity / Docs / Brand
```

Do not list proof-only/held repos as platform products.

- [ ] **Step 5: Record the V3 decision in `DECISIONS.md`**

Record:

```text
Decision: Product-first public IA, system-second explanation.
Reason: repository architecture is an implementation map; visitors need outcomes and destinations before topology.
Constraint: public presentation cannot upgrade evidence or authority.
```

- [ ] **Step 6: Update README and deployment commands**

README must point to the V3 spec and verifier:

```bash
node site/build-worker.cjs
node site/verify-v3.cjs
```

DEPLOYMENT must run both current regression gates and V3 gate where applicable.

- [ ] **Step 7: Build and run all repository-local site gates**

```bash
node site/build-worker.cjs
if [ -f site/verify-v2.cjs ]; then node site/verify-v2.cjs; fi
node site/verify-v3.cjs
git diff --check
```

Expected: all PASS.

- [ ] **Step 8: Commit cross-surface coherence**

```bash
git add site/index.html site/launch.html site/llms.txt site/build-worker.cjs site/worker.js site/wrangler.toml SYSTEM-MAP.md ARCHITECTURE.md DECISIONS.md README.md DEPLOYMENT.md site/community.html 2>/dev/null || true
git commit -m "docs(site): reconcile V3 product routing and public truth"
```

Before committing, use `git status --short` and stage only files that actually belong to this task; do not rely on the permissive command above to hide an unexpected change.

---

### Task 10: Rendered accessibility, responsive and interaction QA

**Files:**
- Modify only source files required to fix findings.
- Evidence: record commands/results in PR body or repository-approved verification artifact.

**Interfaces:**
- Consumes: complete V3 feature branch.
- Produces: rendered evidence that product-first UI works at desktop, tablet, mobile, keyboard and reduced-motion states.

- [ ] **Step 1: Start the local Worker**

Run:

```bash
cd site
npx wrangler@4.129.0 dev --local
```

Expected: Worker serves local site without build errors.

- [ ] **Step 2: Verify the primary human flow**

Manually/render-test:

```text
/ -> Explore products -> Studio/Wie/Sentinel section -> Platform -> /launch -> search "sentinel" -> keyboard select -> open /sentinel
```

Expected: no broken target, focus loss or horizontal overflow.

- [ ] **Step 3: Verify keyboard-only launcher flow**

Required sequence:

```text
Tab to search
Type "work"
ArrowDown
ArrowUp
Enter
Escape on a fresh launcher search
```

Expected: selection is visibly reflected and `aria-selected` stays synchronized with the active option.

- [ ] **Step 4: Verify target viewports**

Required minimum:

```text
1440x900
1280x800
768x1024
390x844
```

Expected: no horizontal overflow; product miniatures remain legible; intent router and navigation preserve hierarchy.

- [ ] **Step 5: Verify reduced motion**

Enable OS/browser reduced motion and reload `/` and `/launch`.

Expected: no essential information disappears; lifecycle and product state remain understandable without animation.

- [ ] **Step 6: Fix findings one at a time with the relevant verifier run after each fix**

For every fix:

```bash
node site/build-worker.cjs
node site/verify-v3.cjs
```

Expected: PASS after each change.

- [ ] **Step 7: Commit QA fixes**

```bash
git add site/index.html site/launch.html site/status.html site/build-worker.cjs site/worker.js site/wrangler.toml
git commit -m "fix(site): close V3 rendered QA findings"
```

Skip this commit if QA produced no source changes.

---

### Task 11: Exact-head final gate, PR and deployment evidence

**Files:**
- No new feature file unless a gate exposes a defect.

**Interfaces:**
- Consumes: final V3 branch HEAD.
- Produces: merge-ready PR and, only when authorized, exact-SHA production evidence.

- [ ] **Step 1: Regenerate from source at final HEAD**

```bash
node site/build-worker.cjs
```

Expected: deterministic generated Worker matches source.

- [ ] **Step 2: Run every local contract**

```bash
if [ -f site/verify-v2.cjs ]; then node site/verify-v2.cjs; fi
node site/verify-v3.cjs
git diff --check
git status --short
```

Expected: PASS; working tree clean after generated artifacts are committed.

- [ ] **Step 3: Verify no private or held identities leaked**

Run:

```bash
grep -RniE 'github.com/Aftergraph/(runtime|wi-frontend|context-continuity|skills-vault|afm|model-registry|autonomous-venture-company)|Veranza by Aftergraph' site/index.html site/launch.html site/public-catalog.json site/llms.txt && exit 1 || true
```

Expected: no forbidden public leak. If the implementation legitimately mentions a private component name without linking to its private source, narrow this gate instead of deleting truthful architecture text.

- [ ] **Step 4: Push feature branch**

```bash
git push -u origin feat/aftergraph-v3-product-front-door
```

- [ ] **Step 5: Open a PR with exact verification evidence**

PR body must include:

```text
## What
- visitor-first product IA
- Studio / Wie / Sentinel experiences
- governed public launcher catalog
- evidence-aware status semantics
- preserved community/deploy boundaries

## Verification
- exact HEAD: <full SHA>
- build-worker: PASS
- V2 regression gate: PASS (if present)
- V3 contract: PASS
- diff check: PASS
- rendered desktop/tablet/mobile: PASS
- keyboard launcher: PASS
- reduced motion: PASS

## Evidence boundary
No product maturity, scientific claim, service availability or adoption claim is upgraded by presentation.
```

- [ ] **Step 6: Let repository merge governance decide mergeability**

Do not bypass merge queue, branch protection or required checks.

- [ ] **Step 7: Deploy only through the repository-owned production path when available and authorized**

If the exact-head deployment workflow from PR #58 is present, use it rather than a manual side-channel deployment.

Expected production evidence must bind `/healthz` to the merged `main` SHA.

- [ ] **Step 8: Smoke public routes after production deploy**

Required:

```bash
curl -fsS https://aftergraph.org/healthz
curl -fsSI https://aftergraph.org/
curl -fsSI https://aftergraph.org/launch
curl -fsSI https://aftergraph.org/status
curl -fsSI https://aftergraph.org/sentinel
curl -fsSI https://aftergraph.org/llms.txt
curl -fsSI https://aftergraph.org/robots.txt
curl -fsSI https://aftergraph.org/sitemap.xml
curl -fsSI https://aftergraph.org/.well-known/security.txt
```

If `/community` exists in the merged Worker, also run:

```bash
curl -fsSI https://aftergraph.org/community
```

Expected: configured public routes return successful status and `/healthz` reports the exact deployed SHA.

- [ ] **Step 9: Report production state without inference**

Only state `LIVE` when the deploy workflow and exact-SHA smoke succeed. Otherwise state the exact blocker: merge pending, deployment disabled, credential/environment unavailable or smoke failure.

---

## Dependency order

```text
Task 1  refresh remote truth
   ↓
Task 2  V3 RED contract
   ↓
Task 3  governed public catalog
   ↓
Task 4  first viewport + intent router
   ↓
Task 5  Studio / Wie / Sentinel
   ↓
Task 6  trust + platform model
   ↓
Task 7  launcher/catalog compiler
   ↓
Task 8  evidence-aware status
   ↓
Task 9  machine/docs/community coherence
   ↓
Task 10 rendered QA
   ↓
Task 11 exact-head PR/deploy gate
```

Tasks 5 and 8 may be developed independently after Tasks 2–4, but do not merge parallel edits to `site/index.html` without reconciling them against one current branch state.

## Self-review results

- **Spec coverage:** visitor-first IA, conversion hierarchy, Studio/Wie/Sentinel, platform lifecycle, evidence boundaries, launcher, status, community, machine-readable surfaces, accessibility, reduced motion, performance architecture, collision policy and production verification all map to explicit tasks.
- **Placeholder scan:** no implementation task contains `TBD`, `TODO`, `implement later`, generic error-handling instructions or unnamed test steps.
- **Type/name consistency:** catalog uses `schema_version`, `evidence_cut`, `destinations`, `id`, `name`, `group`, `kind`, `purpose`, `maturity`, `visibility`, `href`, `source_href`, `evidence_class`; launcher consumes `catalog.destinations`; V3 verifier checks the build marker and public surface semantics consistently.
- **Deliberate exclusions:** org-wide Governance reconciliation, AVC dissolution, APC-1, model/skills platform work and private runtime publication remain separate platform projects rather than being smuggled into a website PR.
