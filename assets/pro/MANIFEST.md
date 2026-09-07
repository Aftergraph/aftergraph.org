# Aftergraph Pro Assets — manifest

Hand-crafted, original vector masters + script-rasterized PNGs.
Palette derived from `src/styles/tokens.css` (brand v1.0.0, dark-first).

## Palette

| Token | Hex | Use |
|---|---|---|
| Institution Black | `#080C14` | canvas / favicon ground |
| Graph Midnight | `#0E1630` | raised surfaces, icon gradient top |
| Evidence White | `#F5F7FA` | wordmark, nodes, title bars |
| Slate | `#8993A4` | secondary text, muted strokes |
| Control Cyan | `#42C7E8` | primary mark, strokes, accents |
| Evidence Teal | `#24C4AD` | verification, evidence states |
| Authority Violet | `#7759E8` | mission/governance accents |
| Decision Amber | `#F0A64A` | enforcement/mission glyph |
| System Blue | `#4C8BD8` | execution node |
| Danger | `#FF6B7A` | (reserved, unused in this set) |

## Files

| File | Purpose |
|---|---|
| `logo.svg` (560×128) | horizontal lockup: monogram + AFTERGRAPH. wordmark |
| `favicon.svg` (32×32) | simplified monogram on ink tile (gap noted in BRAND-USAGE.md) |
| `icons/icon.svg` (512) | master app icon with gradient + glow |
| `icons/glyph-check.svg` | verification glyph |
| `icons/glyph-shield.svg` | governance glyph |
| `icons/glyph-graph.svg` | work-graph glyph |
| `icons/glyph-launch.svg` | launch glyph |
| `icons/glyph-evidence.svg` | evidence-seal glyph |
| `icons/glyph-mission.svg` | mission-target glyph |
| `og-card.svg` (1200×630) | social card master (canonical; use for raster OG) |
| `hero.svg` (1180×560) | operating-model pipeline illustration |
| `empty-states/empty-missions.svg` | empty missions |
| `empty-states/empty-evidence.svg` | empty evidence |
| `empty-states/empty-search.svg` | empty search / no results |
| `backgrounds/bg-grid.svg` | tileable grid |
| `backgrounds/bg-dots.svg` | tileable dot matrix |
| `backgrounds/bg-aurora.svg` | aurora gradient field |
| `logo-stacked.svg` (480×560) | centered lockup for footers, slides, splash |
| `logo-horizontal-light.svg` (560×128) | light-surface variant (docs, README, print) |
| `og-card-v2.svg` (1200×630) | social card with real typography — **served live at `/og-image.svg`** |
| `avatar-circle.svg` (512) | profile avatar with safe-area circle crop |
| `hero-v2.svg` (1600×800) | landing-hero pipeline scene |
| `empty-error.svg` | 4th empty state: verification-failed |
| `safari-pinned-tab.svg` | monochrome pinned-tab glyph — **served at `/safari-pinned-tab.svg`** |
| `maskable-icon.svg` (512) | PWA maskable master — **served at `/maskable-icon.svg`** |
| `brandkit-board.svg` (1600×1200) | 3×3 brand-kit overview board |
| `brand.css` | companion stylesheet (vars + `.ag-pro-*` helpers) |
| `render-png.py` | stdlib-only PNG rasterizer (no PIL needed) |
| `favicon-16x16.png` / `favicon-32x32.png` / `favicon-48x48.png` | raster favicons |
| `favicon.ico` | multi-size ICO (16/32/48 PNG entries) |
| `icon-192.png` / `icon-512.png` | PWA icons |
| `apple-touch-icon.png` (180) | iOS touch icon, square corners |
| `og-card.png` (1200×630) | abstract geometric OG fallback (canonical art is `og-card.svg`) |
| `site.webmanifest` | PWA manifest pointing at raster icons |

## Live wiring (site/worker.js, ESM module worker)

`site/` embeds copies of the served files (Wrangler Text/Data rules only
bundle inside the worker directory): `favicon.svg`, `og-image.svg`
(from `og-card-v2.svg`), `maskable-icon.svg`, `safari-pinned-tab.svg`,
`site.webmanifest`, `apple-touch-icon.png`, `icon-192/512.png`,
`favicon-16/32.png`. If a master in this folder changes, re-copy it into
`site/` — the worker serves the copy, not this original.

## Regenerate

```sh
python3 render-png.py            # writes PNGs + ICO next to the script
OUT_DIR=./dist python3 render-png.py
```
