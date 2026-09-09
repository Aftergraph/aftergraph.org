# Atlas Asset Manifest v1

Conventions: SVG first; AVIF/WebP for raster editorial only; PNG only for
compat. Decorative assets ship `aria-hidden`; semantic carriers include
`<title>` and never act as the sole carrier of state (paired with text).

## Stage 1 — SHIPPED (hand-authored SVG, `atlas/public/assets/`)

| id | purpose | size | status |
|---|---|---|---|
| evidence-trace | source→assertion→evidence trail primitive | 120x24 | SHIPPED |
| assertion-marker | single assertion tick (evidence teal) | 24x24 | SHIPPED |
| provenance-anchor | canonical square anchor (violet) | 24x24 | SHIPPED |
| verified-seal | verification checkpoint seal | 24x24 | SHIPPED |
| conflict-split | fork/divergence glyph (danger) | 24x24 | SHIPPED |
| unknown-state | hollow ring + dotted (slate) | 24x24 | SHIPPED |
| stale-state | ticked ring, 45% slate | 24x24 | SHIPPED |
| proposed-state | dashed diamond (amber) | 24x24 | SHIPPED |
| drift-divergence-sm | two traces diverging, status size | 96x40 | SHIPPED |
| drift-divergence-lg | two traces diverging, explainer size | 320x180 | SHIPPED |
| empty-no-evidence | no supporting assertions | 160x120 | SHIPPED |
| empty-no-result | search/filter no match | 160x120 | SHIPPED |
| empty-private-withheld | private source withheld | 160x120 | SHIPPED |
| empty-not-connected | runtime not connected | 160x120 | SHIPPED |

All stage-1 files <5KB, LF, `var(--ag-*, brand-hex)` fills, no raster.

## Stage 2 — PLANNED (need owner review before generation)

- atlas-hero-system-map (16:9, 21:9, 4:3, portrait): raster editorial via
  openrouter-imagegen, art direction per mission brief §9, brand colors only.
- Atlas product lockup (horizontal/compact/mono/dark SVG): requires Brand OS
  clearance — tokens are provisional-not-trademark-cleared (ledger E5).
  No lockup ships before clearance.
- onboarding diagrams (§5), AFM lineage set (§K), research glyphs (§L),
  contract relation glyphs (§H), capability/authority families (§I),
  social/launch compositions from real screenshots (§7).

## Integration notes

- `atlas/public/*` ships at `/atlas/*` (vite `publicDir`); reference as
  `assets/<file>` from app code.
- Empty-state SVGs pair with existing E48 status copy (role=status text
  stays the semantic carrier; SVG is `aria-hidden`).
- Truth-plane glyphs back the NodeCard chips and drift legend; chips keep
  full plane names in `title` + inspector text.
