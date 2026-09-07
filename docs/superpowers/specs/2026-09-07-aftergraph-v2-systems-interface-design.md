# Aftergraph V2 — Systems Interface Design

Date: 2026-09-07
Status: APPROVED DESIGN
Scope: `Aftergraph/aftergraph.org` + `Aftergraph/docs`

## 1. Goal

Turn `aftergraph.org` into the canonical public front door and systems interface for Aftergraph, while keeping `docs.aftergraph.org` as the provenance-aware Knowledge Plane.

The public story is:

`intent -> mission -> authority -> execution -> evidence -> verification -> verified outcome`

The design must make the system understandable without overstating maturity. Research evidence, specifications, prototypes, and production behavior stay explicitly separated.

## 2. Product Positioning

Primary position:

> Infrastructure for verifiable intelligent systems.

Aftergraph is not presented as another agent framework or a generic AI company. The site explains the control surfaces around long-horizon intelligent systems: mission, authority, execution, evidence, verification, and governed institutional semantics.

## 3. Architecture Boundaries

### aftergraph.org

Role: marketing landing page, public system map, and launcher.

Keep the existing low-complexity stack:
- static HTML/CSS/JS
- Cloudflare Worker static serving
- no frontend framework rewrite
- existing security headers and `/healthz`

Primary source files:
- `site/index.html`
- `site/launch.html`
- `src/styles/tokens.css`
- generated `site/worker.js`

### docs.aftergraph.org

Role: compiler/rendering/discovery plane over canonical sources. It does not become a second marketing site and does not own canonical research/runtime truth.

Preserve:
- Astro + Starlight
- exact-SHA provenance
- freshness model
- source ownership boundaries
- contract/evidence rendering
- OpenAPI-generated API reference
- validation and private-leakage gates

Primary source files:
- `src/components/Hero.astro`
- `src/content/docs/index.mdx`
- `src/styles/brand.css`
- navigation configuration only where needed for IA

## 4. aftergraph.org Information Architecture

### Header

Keep the header intentionally small:
- Aftergraph mark/name
- Platform
- Research
- Docs
- Trust
- Launch

No search box, decorative status chrome, or extra secondary controls in the public header.

### Hero

Headline:

> Infrastructure for verifiable intelligent systems.

Supporting copy should communicate that agents operate under bounded missions and authority, actions leave evidence, and outcomes are independently verifiable.

Primary actions:
1. Explore the platform
2. Read the docs
3. Launch system

The hero includes a code-native systems trace rather than a screenshot or fake dashboard:

`Mission -> Authority -> Execution -> Evidence -> Verified`

The trace may animate subtly when reduced motion is not requested. It must remain legible and meaningful with animation disabled.

### System model

Show three connected layers rather than a flat product card wall:

1. Intelligence / Institution
   - AIE
   - mission semantics
   - authority / delegation / budget semantics

2. Control & Execution
   - WORKS Execution
   - Work Intelligence
   - Trust Gateway
   - Studio/operator surfaces where appropriate

3. Evidence & Knowledge
   - verification/evidence
   - Governance
   - Knowledge Plane / docs

The purpose is to explain relationships between products, not to maximize the number of cards.

### Platform maturity

WORKS remains the dominant runtime surface because it is currently the most mature public product surface.

Every product/specification/research item must keep truthful maturity labeling. A visual redesign must never upgrade maturity by implication.

### Research section

Separate four categories explicitly:
- research result
- specification / standard proposal
- implementation / runtime
- verified production behavior

Feature high-value research such as SPEC-001 and MISSION-Bench without implying that research evidence automatically becomes runtime authority.

### Why Aftergraph

Explain the system through durable principles rather than slogans:
- `Complete != Verified`
- attenuated, purpose-bound authority
- durable execution and recovery
- deterministic evidence gates
- measurable cost per verified outcome

Use restrained diagrams or code-native representations. Avoid invented metrics, customer logos, or commercial proof that does not exist.

### Footer

Group navigation by:
- Build
- Research
- Trust
- Company / GitHub

Keep repo and docs links direct and inspectable.

## 5. Launcher Design

`/launch` becomes a true command surface for the ecosystem.

### Interaction model

- fuzzy search
- arrow-key navigation
- Enter to launch
- Escape to clear/close transient UI where applicable
- accessible focus handling
- large touch targets on mobile

### Grouping

Destinations are grouped by intent:
- Build
- Operate
- Verify
- Research

Each result contains:
- destination name
- one-line purpose
- maturity/state when relevant
- destination type (product, docs, research, repo)

Maturity should be readable but visually subordinate to the destination itself.

### States

Implement and verify:
- default
- filtered/searching
- keyboard-selected
- hover/focus
- empty result
- mobile layout
- reduced-motion

## 6. docs.aftergraph.org Information Architecture

Target top-level journey:

`Start -> Platform -> Build -> Standards -> Evidence -> Research -> Trust`

The homepage prioritizes a developer journey instead of presenting six equally weighted cards.

Order of emphasis:
1. Quickstart / first useful action
2. Golden Mission / end-to-end mental model
3. Contract Explorer
4. API Reference
5. Evidence / provenance surfaces
6. deeper research and governance material

## 7. docs Hero

Retain the core proposition but reduce decorative AI-dashboard effects.

Remove or reduce by default:
- animated gradient headline
- shimmer
- excessive glow
- decorative pill/kicker emphasis
- unnecessary floating-card treatment

Preserve:
- exact semantic version/provenance access
- clear ownership boundary: repos own truth, governance owns boundaries, evidence owns claim strength
- primary links to Platform, Contracts, API Reference, and Evidence

Provenance remains a first-class trust mechanism, but it should not visually overpower first-use comprehension.

## 8. Visual System

Keep the existing semantic color mapping:
- control: cyan
- evidence: teal
- authority: violet
- decision: amber
- system/infrastructure: blue
- canvas: near-black navy

Changes:
- reduce glow intensity
- reduce border density
- use larger open regions instead of nested cards
- reserve semantic color for meaning, not decoration
- make typography and spacing carry hierarchy
- keep true dark canvas rather than warming the palette

Typography:
- display: Space Grotesk / existing display stack
- body: Inter / system fallback
- mono: JetBrains Mono / existing mono stack

No new font dependency is required.

## 9. Responsive Rules

Desktop:
- strong first viewport
- visual system flow visible without scrolling where practical
- content width remains controlled

Tablet:
- system layers stack without losing relationships
- launcher remains keyboard-usable

Mobile:
- no horizontal overflow
- hero copy and primary actions fit naturally
- touch targets >= practical mobile standards
- launcher rows become single-column, readable controls
- system flow may become vertical but must preserve semantic order

## 10. Accessibility

Required:
- semantic landmarks
- real links/buttons for actions
- visible focus states
- keyboard-operable launcher
- meaningful labels
- `prefers-reduced-motion`
- sufficient contrast
- no information encoded by color alone

## 11. Performance

No framework rewrite.

Performance principles:
- no unnecessary third-party JS
- no large hero media requirement
- code-native visualizations
- defer any optional behavior
- keep current Cloudflare Worker delivery model

The redesign must not materially regress the existing fast static delivery model.

## 12. Research Integrity / Content Rules

The public site must preserve the research program's central evidence discipline:
- `Complete(M) != Verified(M)` remains a first-class idea
- evidence and verifier authority stay distinct from agent self-report
- authority is scoped/attenuated rather than ambient
- cost is discussed as cost per verified outcome when relevant
- no novelty or maturity claim is upgraded by marketing copy

The Knowledge Plane remains a renderer/compiler over canonical repositories, not an independent truth source.

## 13. Implementation Slices

### Slice A — Main landing
- restructure hero
- implement mission/evidence trace
- implement layered system map
- restructure platform/research/trust sections
- responsive + accessibility pass

### Slice B — Launcher
- restructure data presentation
- intent grouping
- complete interaction states
- mobile + keyboard QA

### Slice C — Docs homepage
- simplify Hero.astro
- restructure index.mdx journey
- reduce decorative effects in brand.css
- preserve provenance and all gates

### Slice D — Cross-site coherence
- nav/link consistency
- typography/spacing/token consistency
- cross-link aftergraph.org <-> docs.aftergraph.org
- maturity terminology consistency

## 14. Testing and Verification

### aftergraph.org
- regenerate worker bundle
- inspect generated output
- validate security headers stay intact
- smoke `/`, `/launch`, `/healthz`, robots, sitemap
- desktop + mobile visual QA
- keyboard launcher interaction
- reduced-motion behavior

### docs
Run existing required gates, including:
- schema
- links
- ownership
- provenance
- private leakage
- OpenAPI
- catalog
- graph consistency
- context packs
- production smoke route set when deployable

Also verify:
- homepage desktop
- homepage mobile
- first-use developer journey
- no broken Starlight navigation
- provenance output remains correct

## 15. Deployment

`aftergraph.org`:
- build using existing `site/build-worker.cjs`
- deploy using existing Cloudflare Worker configuration
- verify `/healthz` and public HTTP 200 routes

`docs.aftergraph.org`:
- preserve current Cloudflare Pages deployment contract
- deploy only after all local/CI gates pass
- production smoke after deploy

If production credentials are not available in the current execution environment, commits may still be pushed but production must be reported as blocked rather than falsely claimed live.

## 16. Definition of Done

The V2 redesign is complete when:
- both public surfaces visually read as one Aftergraph system
- the system model is understandable from the first page
- WORKS maturity remains truthful and dominant where appropriate
- research/spec/runtime/production distinctions remain explicit
- launcher is fully keyboard/mobile usable
- docs retains provenance/freshness/validation guarantees
- builds and repository gates pass
- live routes are verified after deployment where authorized
- no material visual/accessibility issue remains in the tested desktop/mobile viewports

## 17. Explicit Non-goals

Do not:
- rewrite the landing in React/Next.js merely for styling
- add React Native or SwiftUI code to the web properties
- invent customer logos/testimonials
- invent production metrics
- collapse docs into the marketing site
- duplicate canonical research/spec content manually
- weaken provenance/freshness gates
- promote prototype/research maturity through copy or visual treatment
