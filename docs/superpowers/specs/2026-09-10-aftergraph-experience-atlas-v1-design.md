# Aftergraph Experience Atlas V1 — Design

**Status:** Proposed design, approved for planning
**Date:** 2026-09-10
**Primary surface owner:** `Aftergraph/aftergraph.org`
**Consumer surface:** `Aftergraph/docs`

## 1. Purpose

Turn Aftergraph's public web surfaces from mostly static explanation into an interactive, inspectable representation of the real system without creating a second source of truth.

The experience model is:

- `aftergraph.org` = **experience the system**
- `docs.aftergraph.org` = **inspect and work with the system**
- GitHub canonical repositories = **verify the system**

The shared bridge is **Aftergraph Atlas**.

This design extends the existing Atlas implementation rather than replacing it. Atlas already provides an assertion-based projection, topology workspace, conflict/drift views, inspector, impact analysis, pulse, contracts, capabilities, research, snapshots/time-machine, Ask Atlas V0, URL state, accessibility checks and browser verification. The work here converts that strong observatory into the shared public interaction language for Aftergraph and its docs.

## 2. Non-goals

V1 does not:

- create a new database or canonical registry;
- move ownership of contracts, claims, research or product documentation into the web repositories;
- add a general-purpose AI chatbot;
- introduce 3D/WebGL as a requirement;
- add badges, points, achievements or decorative gamification;
- duplicate Atlas projection data inside docs;
- allow animation state to imply facts not present in source data;
- expose private repository HEADs, withheld subjects or other data prohibited by current Atlas publication boundaries.

## 3. Design principles

### 3.1 Truth before spectacle

Every meaningful node, edge, status, claim, source, contract, authority relationship and evidence state must originate from a canonical source or a deterministic projection derived from one. Static decorative elements may exist, but they must not masquerade as live system state.

### 3.2 Interaction must encode semantics

Motion is not decoration. A pulse represents an event or transition. Highlighted relationships represent actual projected relationships. Error, denied, stale, proposed and verified states are visually distinct and never collapsed into one generic glow.

### 3.3 Progressive disclosure

The first view is understandable without reading an architecture document. Detail appears through hover/focus, selection, lenses and inspectors. The experience should support a curious visitor, a developer and a research reviewer without forcing all three into the same information density.

### 3.4 One projection, multiple renderers

`aftergraph.org` owns and publishes the public Atlas experience projection. `docs.aftergraph.org` consumes a stable public subset/API or build artifact from that projection and maps it to documentation URLs and source context. Docs remains a compiler/rendering/discovery layer over canonical sources.

### 3.5 Accessibility and reduced motion are first-class

All core interactions must work with keyboard focus, touch and reduced-motion preferences. No required information may be available only through hover or animation.

## 4. Shared interaction model

The common public model is a graph of entities and relationships augmented by evidence-aware state.

### Required conceptual fields

Each interactive entity exposed to consumers must be representable with:

- stable public `id`;
- human display name;
- entity/system type;
- canonical owner or source reference when public;
- public maturity/status state where available;
- relationships to other public entities;
- applicable contracts/bindings;
- provenance/evidence references allowed for publication;
- freshness/cut metadata;
- deep-link targets for Atlas and docs;
- publication/withholding state.

The existing `AtlasProjection` remains the source data model. V1 may add a versioned **experience view** derived from it, but must not invent an independent truth store.

## 5. Semantic visual language

The Brand OS remains canonical for base tokens. The experience layer adds semantic behavior, not a competing palette.

Default semantic mapping:

- **control/system**: cyan/blue family;
- **authority/delegation**: purple family;
- **evidence/verified**: green family;
- **decision/human attention**: orange family;
- **denied/failed invariant**: error state from canonical tokens;
- **inactive/out of current scope**: reduced opacity;
- **proposed/unresolved**: dashed or otherwise explicitly non-final treatment;
- **stale**: visible freshness warning rather than silent dimming.

Animations must have a static equivalent in reduced-motion mode.

## 6. aftergraph.org experience

### 6.1 Interactive hero

The home hero becomes a lightweight entry into the living system rather than a looping decorative diagram.

Initial state shows a small, legible system neighborhood. Pointer, keyboard focus or touch selection reveals directly connected relationships. A visitor can enter Atlas without losing the narrative context.

The hero follows the system story:

`Intent → Mission → Authority → Execution → Evidence → Verified Outcome`

This sequence is an explanatory interaction model. Where live/projected data is unavailable, the UI must explicitly label the sequence as an illustrative walkthrough rather than observed runtime state.

### 6.2 Living Atlas entry

The existing `/atlas` remains the full observatory. Home-page interactions deep-link into Atlas with stable URL selection/focus state rather than implementing a second graph engine.

Expected entry actions:

- inspect a system;
- trace a relationship;
- show evidence/source context;
- view impact/dependencies;
- open corresponding docs context.

### 6.3 Story → System → Evidence → Source

A visitor should be able to move monotonically toward stronger evidence:

1. public story on `aftergraph.org`;
2. selected entity/relationship in Atlas;
3. evidence/provenance inspection;
4. relevant docs page;
5. canonical public GitHub source when publication policy permits.

No step may increase certainty merely because the UI became more detailed.

## 7. docs.aftergraph.org workbench

Docs keeps Astro + Starlight and its existing information architecture. Interactivity is added as focused Astro islands/components rather than turning all documentation into a single-page application.

### 7.1 Persistent Lens Bar

Interactive technical pages may expose the following lenses:

- `SYSTEM` — topology, owners, dependencies and runtime/system relationships;
- `AUTHORITY` — principals, delegation, leases, revocation and governed boundaries where represented by source data;
- `EVIDENCE` — claims, provenance, verification and freshness;
- `COST` — budget/economic information only where canonical measured data exists;
- `SOURCE` — owner, public repo/path/ref, generated-from relationship and freshness.

A lens is hidden or explicitly unavailable when the underlying projection does not support it. The UI must never manufacture empty authority or cost semantics from naming conventions.

### 7.2 Golden Mission Trace Explorer

The current `MissionFlow.astro` is upgraded from an ordered owner/API/contract walkthrough into a step-driven trace explorer.

Minimum states:

`Created → Authority Resolved → Admitted → Executing → Verifying → Verified`

These labels are used only when supported by the canonical Golden Mission contract/runtime evidence. Failure/refusal/revocation/recovery variants must preserve their actual terminal/non-terminal semantics rather than being forced into the happy path.

Selecting a step opens an inspector that can expose, when available:

- reason / transition meaning;
- owner;
- API/binding;
- contract;
- source;
- authority decision;
- evidence;
- provenance/freshness.

The explorer must never imply that agent-declared completion equals verification.

### 7.3 Contract Graph upgrade

The existing `ContractGraph.astro` remains the baseline. V1 extends its useful behaviors rather than replacing it with decorative canvas work:

- pan/zoom when graph density warrants it;
- keyboard/touch node selection;
- detail inspector;
- deep links;
- owner/consumer traversal;
- source and evidence links;
- contract/layer filters;
- clear empty/no-path states.

### 7.4 Evidence and source inspector

A reusable inspector component provides the common transition from documentation prose to verifiable source context. It displays only publication-safe values and retains existing private-source withholding behavior.

## 8. Data flow

```text
canonical public/private repositories
        ↓
existing capture + deterministic projection pipeline
        ↓
AtlasProjection (publication rules enforced)
        ↓
versioned public experience view / adapter
        ↓                    ↓
aftergraph.org Atlas      docs build/interactive islands
        ↓                    ↓
story + observatory       workbench + source/evidence inspection
```

Private information is removed or withheld before the public projection boundary, never merely hidden with CSS or client-side filtering.

## 9. Deep-link contract

Cross-site navigation must preserve context through stable URL parameters or path state. At minimum a public entity selection should support:

- entity identifier;
- active view/lens when meaningful;
- optional related entity/path focus;
- snapshot/cut identifier when viewing historical state.

Unknown, removed or withheld identifiers fail gracefully and do not resolve to a misleading nearest match.

## 10. Performance constraints

V1 must protect the public landing page from Atlas application weight.

- Do not load the full React Flow/ELK/D3 Atlas bundle merely to render the home hero.
- Hero interaction uses a small derived payload and lightweight rendering.
- Full Atlas libraries load only when entering `/atlas` or another explicitly heavy surface.
- Docs pages hydrate only the interactive component needed on that page.
- Existing vendor chunking and Atlas growth checks remain intact.

No new heavy rendering dependency is introduced unless a measured requirement cannot be met by the existing Atlas stack or browser primitives.

## 11. Failure behavior

The experience must fail honestly.

- malformed projection → explicit unavailable/malformed state;
- stale cut → visible stale state;
- missing evidence → `not available` / `not evidenced`, never zero or verified;
- withheld/private source → publication-safe withheld state;
- unresolved relationship → explicit no-path/unknown result;
- network/load failure → static explanatory fallback and navigation remain usable;
- JS disabled → core site content and source links remain accessible where practicable.

## 12. Verification strategy

Implementation must use TDD and preserve the existing verification boundaries.

Required test classes:

1. **Projection contract tests** — deterministic schema, publication boundaries, no private-SHA regression and stable deep-link identifiers.
2. **Unit/component tests** — selection, lens state, filtering, trace stepping, fallbacks and reduced-motion behavior.
3. **DOM/browser smoke** — keyboard traversal, touch/mobile-sized layout, focus visibility, no overflow, graph/inspector interactions and deep-link restoration.
4. **Visual regression evidence** — canonical viewport captures for home hero, Atlas handoff, docs Golden Mission, Contract Graph and mobile.
5. **Cross-site link tests** — entity context round-trips between public site, Atlas, docs and canonical public source.
6. **Performance checks** — landing page does not eagerly load the full Atlas runtime; bundle growth is measured and gated.

## 13. Repository boundaries

### `Aftergraph/aftergraph.org`

Owns:

- Atlas projection/public experience adapter;
- Living Atlas rendering and full observatory;
- home hero interaction;
- public deep-link contract;
- publication/privacy gates for its projection.

### `Aftergraph/docs`

Owns:

- Starlight integration;
- Lens Bar UI;
- Golden Mission Trace Explorer;
- Contract Graph technical interaction;
- source/evidence inspector;
- documentation URL mappings.

### Canonical domain repositories

Continue to own their contracts, schemas, claims, evidence, research and product truth. Neither website may become the canonical owner merely because it renders the information.

## 14. Delivery slices

The implementation should be planned as independently verifiable slices:

1. **Experience projection + deep-link contract** in `aftergraph.org`.
2. **Living hero → Atlas handoff** in `aftergraph.org`.
3. **Docs shared workbench primitives**: lens state + evidence/source inspector.
4. **Golden Mission Trace Explorer**.
5. **Contract Graph upgrade and cross-site context links**.
6. **Integrated browser, accessibility, visual and performance verification**.

Each slice must leave a usable, testable state and must not depend on an unmerged speculative data model from a later slice.

## 15. Acceptance criteria

V1 is complete only when all of the following are true:

- aftergraph.org home exposes a meaningful interactive system entry, not a purely decorative animation;
- entering Atlas preserves the selected public entity/context;
- docs can consume the versioned public experience view without becoming a source of truth;
- Golden Mission is inspectable as a trace with source/contract/evidence context;
- Contract Graph supports inspectable navigation beyond hover-only highlighting;
- at least the SYSTEM, EVIDENCE and SOURCE lenses work on supported docs surfaces; AUTHORITY and COST appear only where backed by canonical data;
- public/private withholding guarantees remain intact;
- malformed, stale, unknown and unavailable states fail explicitly;
- keyboard, touch, mobile and reduced-motion paths are verified;
- landing page avoids eager loading of the full Atlas runtime;
- cross-site links resolve to stable, context-preserving destinations;
- production screenshots/evidence are captured against the exact deployed heads before claiming the experience shipped.

## 16. Design decision

Proceed with a **shared Atlas Experience Layer** rather than two independent redesigns or a site merger.

The goal is not to make Aftergraph look more animated. The goal is to make the public interface behave like the system Aftergraph describes: relational, evidence-aware, inspectable, stateful and explicit about uncertainty.