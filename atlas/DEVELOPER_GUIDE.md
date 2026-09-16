# Atlas V3 Developer Guide

Architecture decisions, conventions, and known pitfalls for agents and contributors.

## State Management

- **View switching uses functional `setState`**: Always use `setState(prev => ...)` when updating view state (e.g., `openView`). Direct state references in closures become stale due to React's batching. This was the root cause of the view-switching bug where the UI rendered outdated state after rapid transitions.

## Performance & Bundling

- **ELK is lazy-loaded via `TopologyView.jsx`**: The ELK layout engine is heavy (~500KB). It is dynamically imported only when the topology view mounts. Do not import ELK at the top level or in shared modules — it will bloat the initial bundle and block first paint.

## Mobile Navigation

- **Mobile nav uses JS state, not CSS `:has()`**: The mobile navigation toggle is driven by React state (`isMobileNavOpen`), not CSS `:has()` selectors. Pure CSS approaches failed because `:has()` lacks reliable cross-browser support for sibling/descendant state propagation in our nav structure. Always wire mobile nav visibility through the component's state.

## Design Tokens

- **All colors must use `var(--ag-*)` tokens**: Never hardcode hex, rgb, or named colors. Every color reference must be a CSS custom property from the `--ag-*` namespace (e.g., `var(--ag-color-primary)`, `var(--ag-bg-surface)`). Hardcoded colors bypass theme switching and fail accessibility audits. Grep for violations with: `grep -rn '#[0-9a-fA-F]\{3,8\}' src/ --include='*.jsx' --include='*.css'`

## Copy & Localization

- **All user-facing copy must be Danish, no AI-slop**: Text shown to users must be natural Danish, not machine-translated or generic English filler. Avoid phrases like "Velkommen til", "Klik her", or overly formal constructions unless they match the existing voice. When adding new strings, review adjacent copy for tone consistency. If unsure, flag for human review rather than guessing.

## Build Pipeline

```bash
npm run build && cd ../site && node build-worker.cjs
```

The Atlas app builds first (`npm run build`), then the site worker is generated separately. Both steps must succeed for a valid deploy artifact. Do not skip the worker build — it serves the app at the edge.

## Deployment

```bash
CLOUDFLARE_ACCOUNT_ID=<account-id> npx wrangler deploy
```

Deployment targets Cloudflare Workers/Pages. The `CLOUDFLARE_ACCOUNT_ID` environment variable is required; without it, Wrangler will prompt interactively or fail in CI. Ensure the variable is set in your shell or CI secrets before deploying.

## Testing

```bash
npx vitest run
```

Run the full test suite with Vitest. Tests are co-located with source files (`*.test.jsx`, `*.spec.js`). Watch mode (`npx vitest`) is available for development but always use `run` for CI and pre-commit verification.

## Known Pitfalls

### AnimatePresence `mode="wait"` + `key` breaks children updates

When using Framer Motion's `<AnimatePresence mode="wait">`, adding a `key` prop to child components causes them to re-mount on every parent state change instead of updating in place. This leads to lost internal state, interrupted animations, and unnecessary DOM churn.

**Fix**: Only apply `key` to the direct child of `AnimatePresence` when you intentionally want exit/enter transitions. For stable children that should update without remounting, omit the `key` or use a stable identifier that doesn't change on unrelated state updates.

**Symptom**: Child components reset their local state or replay mount animations when they should merely re-render.
