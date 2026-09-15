# Aftergraph Launcher Intent Console — Design

## Context

`/launch` is currently a destination list with fuzzy search, keyboard navigation, recent-history persistence, maturity badges, and a desktop preview pane. The approved redesign keeps those useful mechanics but changes the mental model from “directory of links” to the canonical public launcher for finding and entering Aftergraph systems.

The accepted visual reference is the generated dark Aftergraph launcher concept from this conversation: a single central command surface, subtle graph lines entering and leaving the panel, compact sectioned rows, restrained cyan/amber status language, and no dashboard-card sprawl.

## Goal

Build a production-quality, responsive launcher that makes the Aftergraph ecosystem easier to scan, search, and enter while remaining honest about what the public website can actually execute.

The interaction contract is:

`find → understand → act → verify`

The public launcher may navigate to real products, systems, repositories, documentation, Atlas, Sentinel, and status surfaces. It must not pretend to perform privileged execution, approvals, repository mutation, or verification that is not actually wired.

## Non-goals

- No new backend or authentication layer.
- No fake agent execution or simulated operational data.
- No new product claims or invented production status.
- No exposure of private repository URLs.
- No framework migration; preserve the repository’s self-contained static launcher architecture.

## Information architecture

### Header

A minimal `← AFTERGRAPH` backlink anchors the surface. Desktop adds the `Aftergraph Launcher` title and the small conceptual sequence `FIND → UNDERSTAND → ACT → VERIFY`; mobile omits nonessential chrome.

### Primary command surface

One prominent search field owns focus on fine-pointer desktop but does not force the mobile keyboard open. Placeholder: `Find a product, system, repo, research, or action…`.

Default results are grouped as:

1. **Recent** — deduplicated destinations previously opened on this device, capped at five.
2. **Products / Systems** — canonical public-facing Aftergraph destinations and safe links to public repositories/docs.
3. **Actions** — truthful navigation actions such as `Explore system`, `Verify with Sentinel`, `Open documentation`, and `Open status`.

Search operates across name, description, group, aliases, and action intent. `>` remains a power-user command prefix for the action set.

### Row anatomy

Each result row contains an icon, primary name, concise desktop description, maturity/state badge when applicable, and a directional affordance. The selected row uses a cyan left rail plus a low-contrast cyan wash. Descriptions collapse on narrow mobile screens before names or status badges do.

## Visual system

- Background: near-black navy, matching the current Aftergraph public surface.
- Surface: one translucent navy panel with a thin cool-gray border; no nested card grid.
- Accent: cyan for navigation/focus; teal for production; amber for demo/prototype; violet only for graph/system accents.
- Graph motif: deterministic CSS/SVG linework entering the launcher from both sides on wide screens. It is decorative (`aria-hidden`) and removed/simplified on mobile.
- Radius and elevation stay restrained and consistent with the accepted reference.
- Typography uses the existing system-font stack; no new external font dependency.

## Interaction and accessibility

- Preserve `ArrowUp`, `ArrowDown`, `Home`, `End`, `Enter`, and `Escape` behavior.
- `Escape` clears the current query; the page backlink remains the explicit exit.
- Keep real `combobox` + `listbox` + `option` semantics, `aria-selected`, stable option IDs, and `aria-activedescendant`.
- Every pointer target is at least 44 px; mobile rows target 56 px.
- Focus indicators remain visible and meet contrast requirements.
- Motion is limited to subtle graph/selection transitions and is disabled by `prefers-reduced-motion`.
- Empty search results render a useful, non-dead-end message.

## State and privacy

`localStorage` stores only destination identifiers in `af-recent`. No financial, identity, auth, repository SHA, or user-content data is persisted. Invalid stored data must fail safely to an empty recent set.

The existing public-surface privacy invariant remains: private repository URLs must not appear in launcher HTML or the compiled worker.

## Responsive behavior

Desktop centers the launcher within a wide atmospheric graph field. The panel is approximately 860–960 px wide and must remain the visual focus. Tablet removes side labels/ornament before reducing core information density. Mobile becomes a full-width touch-first panel with sticky search, hidden desktop descriptions, safe-area padding, and no horizontal overflow at 390 px.

## Verification contract

The implementation is complete only when:

1. `site/verify-v2.cjs` asserts the new launcher IA and preserves all privacy/a11y invariants.
2. `node site/build-worker.cjs` regenerates the deployed worker and `git diff --check` is clean.
3. Browser QA verifies keyboard interaction, search filtering, action-prefix filtering, recents, empty state, and mobile layout.
4. Desktop and 390 px screenshots are visually compared against the accepted reference for hierarchy, palette, density, row anatomy, graph motif, and responsive collapse.
5. The exact feature-branch SHA is the evidence target for any readiness claim.
