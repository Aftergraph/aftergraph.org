# Aftergraph V3 — Product Front Door Design

Date: 2026-09-08
Status: APPROVED DIRECTION / IMPLEMENTATION-READY DESIGN
Scope: `Aftergraph/aftergraph.org` with canonical inputs from the broader `Aftergraph/*` organization
Supersedes: the public-information-architecture portions of `docs/superpowers/specs/2026-09-07-aftergraph-v2-systems-interface-design.md`; V2 delivery, evidence, accessibility and no-overclaim constraints remain binding unless explicitly replaced below.

## 1. Goal

Turn `aftergraph.org` from a systems-first research/infrastructure landing page into the masterbrand product front door for the whole Aftergraph platform.

The page must answer these questions in order:

1. What can Aftergraph do for me?
2. Which product or surface should I use?
3. How does the underlying platform work?
4. Why should I trust the result?
5. Where can I inspect evidence, documentation, research and source code?

The implementation must preserve the existing public truth boundary: `aftergraph.org` owns presentation, information architecture, copy and deployment, but never becomes the source of truth for product runtime state, scientific claims, design tokens, cross-repository contracts or maturity.

## 2. Current platform model

The public surface must reflect the platform as a portfolio instead of exposing the repository graph directly.

### Product experiences

- **Studio by Aftergraph** — primary general-purpose human operating environment. Permanent modes: Chat, Work, Space.
- **Wie by Aftergraph** — specialist Work Intelligence experience for source-neutral observation → canonical WorkItem inference, review and promotion.
- **Sentinel by Aftergraph** — developer-facing exact-subject code verification product with evidence-backed SHIP / DO NOT SHIP verdicts.

### Platform infrastructure

- **AIE** — authority, delegation, lifecycle, budget and revocation semantics; experimental standards/research track, not a generic production product claim.
- **Trust Gateway** — runtime admission, policy enforcement, approvals, secret boundary and action audit.
- **Aftergraph Runtime** — agent lifecycle, orchestration, dispatch, checkpoints, model edge and runtime telemetry.
- **WORKS** — durable WorkGraph execution, workers, leases, retries, recovery, execution evidence and quittance.

### Supporting systems

- **Context Continuity / ACC** — portable actionable state transfer.
- **Continuum** — adversarial continuity and containment evaluation.
- **Skills Vault** — governed capability supply chain.
- **LLM Research & Development / AFM / Model Registry** — model methodology, concrete model program and immutable lifecycle registry.
- **Intelligence Systems Research** — scientific claims, SPEC-001, MISSION-Bench and empirical work.
- **Governance** — canonical topology, ownership boundaries, cross-repo contracts and generated exact-head truth.
- **Docs** — provenance-aware Knowledge Plane and discovery surface.
- **Brand** — visual identity, semantic design tokens and master assets.

### Migration / held surfaces

- `autonomous-venture-company` is treated as a migration source, not a new public platform destination.
- provisional/held naming such as Veranza remains absent from the public site until its owner clears it for public use.
- proof-only repositories such as Sentinel fire-test repos never appear as products.

## 3. Product story

The homepage uses two complementary stories.

### Visitor-first story

```text
USE
  Studio
  Wie

VERIFY
  Sentinel

BUILD & OPERATE
  Runtime
  WORKS
  Trust Gateway
  AIE

EXTEND
  Skills
  Models
  Continuity

UNDERSTAND
  Docs
  Research
  Governance
```

This story determines homepage ordering and launcher taxonomy.

### System story

The deeper architecture retains the canonical lifecycle:

```text
Intent
→ Intelligence
→ Authority
→ Trust
→ Runtime
→ Durable Execution
→ Evidence
→ Independent Verification
→ Verified Outcome
```

This story explains how the products fit together after the visitor already understands what Aftergraph offers.

## 4. Conversion model

The public site is not optimized around one universal CTA. It is an adaptive front door with a strong product-first default.

Primary first-viewport actions:

1. **Explore products** — scrolls to the intent/product router.
2. **Launch Aftergraph** — opens `/launch`.

Secondary:

3. **Build with Aftergraph** — links to the developer Knowledge Plane.

Product-specific conversion:

- Studio → open/learn about Studio.
- Wie → open the public/live Wie destination when public routing is available.
- Sentinel → install/quickstart/repository or product page.
- Infrastructure → docs, source, contract or quickstart rather than pretending every component is a consumer SaaS surface.

## 5. Homepage information architecture

The page order is fixed for V3.

### 5.1 Header

Keep navigation compact:

- Products
- Platform
- Research
- Docs
- Community
- Launch

On narrow screens, preserve semantic order and large touch targets. No decorative status ticker in the header.

### 5.2 Hero

Working headline:

> Build autonomous systems that can prove they worked.

Required supporting concept:

> Aftergraph connects intelligent work to bounded authority, durable execution, evidence and independent verification.

The hero must make the outcome legible before exposing platform vocabulary.

Primary actions:

- Explore products
- Launch Aftergraph

Secondary text link:

- Build with Aftergraph

### 5.3 Live system visual

The right side or lower hero region contains a code-native, evidence-safe system visualization. It must not show fabricated production telemetry.

Preferred interaction:

```text
Intent received
      ↓
Work inferred
      ↓
Authority bounded
      ↓
Execution durable
      ↓
Evidence emitted
      ↓
Verifier checks exact subject
      ↓
Verified outcome
```

It may transition between illustrative states, but every number or identifier must either be clearly labelled `example` / `illustrative` or omitted.

No fake customer count, run count, spend, test total or uptime percentage is allowed in the hero.

### 5.4 Intent router

Heading concept:

> What do you want to do?

Four primary intents:

- **Use intelligent systems** → Studio, Wie
- **Verify outcomes** → Sentinel
- **Build and operate** → Runtime, WORKS, Trust Gateway, AIE
- **Research and extend** → Docs, Research, Skills, Models, Continuity, Governance

Each intent is a semantic region, not a generic grid of equal cards.

### 5.5 Product experiences

Feature Studio, Wie and Sentinel as the most concrete public-facing product experiences.

Each product block must show:

- user problem;
- outcome;
- simple flow;
- current maturity label sourced from the owning repository/public contract;
- one canonical destination;
- optional secondary docs/source destination.

Do not make product maturity visually equivalent when the evidence classes differ.

### 5.6 Product miniature rules

Product miniatures are allowed only when they communicate real product behavior.

Studio miniature:

```text
Chat | Work | Space
Mission
Active work
Needs You
Evidence
```

Wie miniature:

```text
Signal
→ Observation
→ WorkItem
→ Review
→ Publish / Promote
```

Sentinel miniature:

```text
Exact HEAD
Checks
Evidence
Verdict: SHIP / DO NOT SHIP
```

The miniature is an explanatory representation, not a claim that the displayed sample data occurred in production.

### 5.7 Difference / trust section

Required concept:

```text
Agent says done
      ≠
Verified outcome
```

Then show:

```text
Claim
→ Evidence
→ Independent verifier
→ Verdict bound to an exact subject
```

This becomes the cleanest public explanation of `Complete != Verified`.

### 5.8 Platform architecture

Only after the product story, show the platform lifecycle:

```text
Intelligence
→ Authority
→ Trust
→ Runtime
→ Execution
→ Evidence
→ Verification
```

Map canonical owners under each stage without turning repository names into the headline.

Example labels:

- Intelligence — Wie
- Authority — AIE
- Trust — Trust Gateway
- Runtime — Aftergraph Runtime
- Execution — WORKS
- Verification — Sentinel / domain verifiers
- Experience — Studio

Research and Governance are shown outside the execution path.

### 5.9 Evidence and status

Introduce a public proof/status concept that distinguishes:

- service availability;
- product maturity;
- repository/source identity;
- verification state;
- scientific evidence class.

The homepage may summarize these concepts but `/status` remains the detailed surface.

### 5.10 Knowledge and community

Create one clear continuation path:

```text
Learn
→ inspect source/evidence
→ reproduce or challenge
→ discuss
→ RFC / issue
→ implementation
```

Destinations:

- docs.aftergraph.org
- Aftergraph GitHub organization
- organization Discussions
- research repository
- governance source

### 5.11 Final CTA

The last section is contextual rather than generic.

Primary:

> Launch Aftergraph

Secondary routes:

- Open Studio
- Explore Wie
- Try Sentinel
- Read the docs

Only destinations that are actually public/reachable may be rendered as live launch actions.

## 6. `/launch` design

`/launch` becomes a compact portfolio command surface.

### Taxonomy

Use:

- Use
- Verify
- Build & Operate
- Extend
- Understand

Do not expose private repositories merely because they exist in organization topology.

### Destination schema

The implementation should converge on a single static/source-generated registry shape:

```js
{
  id: 'sentinel',
  name: 'Sentinel',
  group: 'Verify',
  kind: 'product',
  purpose: 'Evidence-backed code review bound to the exact reviewed subject.',
  maturity: 'prototype',
  visibility: 'public',
  href: '/sentinel',
  sourceHref: 'https://github.com/Aftergraph/sentinel',
  evidenceClass: 'repository-verified'
}
```

Field values must be grounded in canonical owner state. No field grants authority.

### Interaction requirements

- text search;
- keyboard ArrowUp / ArrowDown;
- Enter launches selected item;
- Escape clears search/selection state;
- visible focus;
- semantic listbox/options or an equally valid accessible link-list implementation;
- useful empty state;
- mobile single-column layout;
- `prefers-reduced-motion` support.

## 7. `/status` design

V3 prepares `/status` to become a provenance-aware platform status surface rather than a handcrafted marketing dashboard.

Required status dimensions:

```text
Surface availability
Maturity
Source repository
Source revision / evidence cut
Verification state where applicable
Scientific evidence class where applicable
Known limitation
```

Rules:

- availability != maturity;
- maturity != verification;
- verification != scientific reproduction;
- repository existence != production availability;
- public visibility != evidence strength.

The first implementation may remain build-time/static if live federation is not already available. It must never silently invent live state.

## 8. Product detail pages

V3 permits focused public product routes without requiring a framework migration.

Priority order:

1. `/sentinel`
2. Studio product surface or canonical Studio destination
3. Wie product surface or canonical Wie destination
4. platform/infrastructure overview

Product pages reuse the master navigation, semantic tokens, maturity language and evidence rules.

Do not duplicate large bodies of canonical docs. Product pages explain value and route to the owning source/Knowledge Plane.

## 9. Client architecture

Keep the current static Cloudflare Worker delivery model for V3.

### Required properties

- static HTML/CSS/vanilla JS remains supported;
- no React/Next/Astro migration for the public front door in this wave;
- no third-party client runtime required for basic navigation;
- all key content readable with JavaScript disabled;
- optional interactions progressively enhance the static document;
- existing security headers and `/healthz` behavior remain intact;
- generated Worker remains deterministic from source files.

### Source decomposition

The current `site/index.html` is large. V3 may split reusable source concerns only when the existing builder can deterministically compose them without introducing a dependency-heavy frontend toolchain.

Preferred responsibilities:

```text
site/index.html                 homepage structure + content
site/launch.html                launcher structure + interaction
site/status.html                status presentation
site/sentinel.html              Sentinel product page
site/build-worker.cjs           deterministic page → Worker compiler
src/styles/*                    semantic styling where existing architecture permits
site/verify-v3.cjs              deterministic V3 contract checks
```

Do not perform an unrelated architecture rewrite solely to make the file tree aesthetically satisfying.

## 10. Visual direction

Preserve the Institutional Graph / Brand OS visual grammar.

### Keep

- institutionBlack / graphMidnight base;
- evidenceWhite hierarchy;
- control cyan;
- evidence teal;
- authority violet;
- decision amber;
- system blue;
- graph/boundary/evidence motifs;
- typography-led hierarchy.

### Improve

- more open spatial composition;
- product miniatures instead of repeated marketing cards;
- clearer visual difference between user experience and infrastructure;
- subtle depth where it communicates layers/boundaries;
- interaction motion tied to state transitions;
- stronger first-viewport comprehension;
- richer mobile layout rather than desktop collapsed into a narrow column.

### Avoid

- arbitrary glow;
- decorative particle fields;
- fake telemetry;
- floating glass panels with no semantic purpose;
- animations that obscure state;
- gradients used as evidence of innovation;
- color as the sole status encoding.

## 11. Motion grammar

Motion explains state transitions.

Allowed examples:

- hero lifecycle progresses from intent to verified outcome;
- intent router reveals the selected destination group;
- product miniature transitions between meaningful states;
- evidence line visibly crosses the verifier boundary;
- launch search selection moves with clear focus.

Requirements:

- no interaction requires animation to understand;
- reduced-motion disables nonessential transforms, stagger and parallax;
- no continuous CPU-heavy background animation;
- motion should stop when the surface is inactive where practical.

## 12. Accessibility

Target WCAG 2.2 AA for the public client.

Required:

- semantic landmarks;
- logical heading order;
- visible `:focus-visible` state;
- real links/buttons;
- keyboard-operable launcher;
- no inaccessible custom scroll traps;
- practical >=44px touch targets for primary mobile controls;
- no information by color alone;
- sufficient contrast;
- reduced motion;
- product/status labels exposed as text;
- hero/product illustrations have meaningful accessible names or are correctly decorative.

## 13. Performance

V3 must preserve the advantage of the current static delivery model.

Targets are architectural rather than fabricated benchmark claims:

- no framework hydration requirement;
- no large hero video;
- no required third-party font/runtime request beyond existing policy;
- defer noncritical interaction code;
- keep visualizations code-native where possible;
- avoid layout shift caused by late UI composition;
- preserve cache/security behavior of the Cloudflare Worker.

Any measured performance number must come from an actual test run and must not be hardcoded into public copy.

## 14. Content truth and evidence

Public copy follows these rules:

1. The owning repository defines implementation/maturity truth.
2. Governance defines cross-repo topology, terminology and boundaries.
3. Research owns scientific claims and evidence classification.
4. Brand owns identity/tokens.
5. Docs renders/discovers canonical material but does not upgrade it.
6. `aftergraph.org` may summarize but may not create stronger claims.
7. Illustrative UI data must be labelled or obviously generic.
8. No customer logos, testimonials, adoption counts or production metrics without a canonical source.
9. No held/provisional product naming appears publicly before clearance.
10. `Complete != Verified` remains a first-class trust concept.

## 15. SEO and machine-readable surface

Maintain or improve:

- canonical URL;
- OpenGraph metadata;
- Organization JSON-LD;
- sitemap;
- robots;
- `llms.txt`;
- `/.well-known/security.txt`;
- health/status machine-readable endpoints already supported by the repository.

`llms.txt` should route agents to canonical source planes rather than replicate volatile product truth.

## 16. Collision policy with active work

At the design evidence cut, aftergraph.org has active work around community routing and exact-head deployment.

V3 implementation must:

- preserve `/community` if it lands before V3 implementation;
- preserve the community destination in nav/launcher where public;
- preserve exact-head deployment/provenance work if it lands;
- rebase/refresh branch state before implementation;
- never overwrite current `main` with stale source files from this design cut;
- treat repository reality at execution time as authoritative.

## 17. Testing strategy

### Deterministic contract test

Add `site/verify-v3.cjs` or evolve the existing verifier with assertions for:

- visitor-first hero;
- primary CTAs;
- product intent taxonomy;
- Studio, Wie and Sentinel presence;
- platform lifecycle ordering;
- `Complete != Verified` / equivalent trust explanation;
- maturity/evidence semantics;
- launcher groups and keyboard behavior;
- reduced motion;
- visible focus;
- no forbidden fabricated claims;
- generated Worker retains key security headers and routes.

### Build tests

- run `node site/build-worker.cjs`;
- verify generated Worker includes all public routes;
- verify `/healthz` metadata remains correct;
- inspect no accidental private destination leaks.

### Rendered QA

Required minimum:

- desktop 1440x900;
- laptop ~1280 width;
- tablet ~768 width;
- mobile 390x844 or equivalent;
- keyboard-only launcher flow;
- reduced-motion rendering;
- no horizontal overflow;
- product miniatures remain understandable without animation.

### Production smoke

After authorized deployment:

- `/`
- `/launch`
- `/status`
- `/sentinel`
- `/community` if present
- `/healthz`
- `/llms.txt`
- `/robots.txt`
- `/sitemap.xml`
- `/.well-known/security.txt`

Production claims are not made when credentials or deployment evidence are unavailable.

## 18. Implementation slices

### Slice A — V3 contract and truth registry

- add deterministic V3 verifier;
- define one public destination/product registry shape;
- assert no private/held routes leak;
- align source names with current canonical org truth at execution time.

### Slice B — Homepage first viewport and intent router

- visitor-first hero;
- product-first CTA hierarchy;
- meaningful system visual;
- intent router.

### Slice C — Product experiences

- Studio product block;
- Wie product block;
- Sentinel product block;
- real maturity/evidence labels;
- canonical links.

### Slice D — Trust and platform model

- Complete vs Verified story;
- platform lifecycle;
- governance/research outside runtime authority;
- evidence/status summary.

### Slice E — Launcher

- V3 taxonomy;
- search;
- keyboard/mobile/accessibility states;
- visibility filtering.

### Slice F — Status and knowledge/community

- provenance-aware status model;
- docs/research/community continuation flow;
- machine-readable consistency.

### Slice G — Worker/build/release

- regenerate deterministic Worker;
- preserve security/deploy contracts;
- run rendered and static QA;
- merge through repository governance.

## 19. Definition of Done

V3 is complete when:

- a first-time visitor can identify useful Aftergraph products before learning the repo architecture;
- Studio, Wie and Sentinel have distinct understandable roles;
- infrastructure is presented as one composed platform rather than competing projects;
- research, governance and evidence remain outside runtime authority;
- the homepage explains `agent says done != verified outcome` without requiring research jargon;
- launcher routes by intent and never exposes private/held destinations accidentally;
- maturity/evidence language remains source-bounded;
- the site works without JS for core content/navigation;
- launcher is keyboard/mobile accessible;
- reduced-motion works;
- no framework migration is introduced;
- Cloudflare Worker build/security/health contracts remain intact;
- repository gates pass on exact implementation HEAD;
- production routes are smoked after authorized deployment;
- no stale org topology or fabricated proof is embedded into the public client.

## 20. Explicit non-goals

Do not in this V3 website slice:

- implement or migrate the whole Aftergraph platform;
- solve Governance topology drift inside the website repository;
- migrate AVC code;
- create APC-1 conformance itself;
- create a new frontend framework stack;
- move canonical docs/research into aftergraph.org;
- make private runtimes public;
- expose credentials or privileged control operations;
- represent AIE as an adopted industry standard;
- represent internal test results as external adoption;
- use Veranza publicly while held;
- retain proof-only repositories as public products;
- claim production deployment before production evidence exists.
