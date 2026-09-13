# Brand Usage — aftergraph.org

> How this site consumes `@aftergraph/brand` tokens and assets.

## Token Sync Strategy

| Concern | Source | Method |
|---|---|---|
| CSS custom properties (`src/styles/tokens.css`) | `Aftergraph/brand` → `tokens.css` + `tokens.json` | Build-time copy via `scripts/sync-brand-tokens.mjs` (TODO) |
| SVG logos & icons | `Aftergraph/brand/svg/*` | Referenced at build time; **never copied into this repo** |
| Favicon | ❌ **MISSING in brand repo** | Must be added to `Aftergraph/brand` before wiring |
| OG / social image | `Aftergraph/brand/svg/aftergraph-social-banner.svg` | Rasterized at build time from canonical SVG |
| Typography (Inter, JetBrains Mono, Source Serif 4) | Google Fonts / self-hosted | Site-local `@font-face` declarations (not in brand repo) |

### What lives here vs. what stays in brand

- **Here**: `src/styles/tokens.css` — Astro-friendly CSS custom properties with dark-first defaults. This file is a *derived artifact*; the canonical source is `Aftergraph/brand/tokens.css`.
- **Brand repo**: All SVG masters, token definitions (`tokens.json`, `tokens.css`), usage rules, design system spec.
- **Never here**: Raw PNG/WebP exports, hand-edited bitmaps, modified SVGs.

### Sync workflow (to be implemented)

```sh
# scripts/sync-brand-tokens.mjs (future)
# 1. Fetch tokens.css + tokens.json from Aftergraph/brand@main
# 2. Transform --ag-brand-* prefix → --ag-* for site ergonomics
# 3. Write src/styles/tokens.css
# 4. Fail if brand version mismatch or missing critical tokens
```

Until the sync script exists, `tokens.css` was manually derived from `Aftergraph/brand@v1.0.0`. The prefix was shortened from `--ag-brand-*` to `--ag-*` for site-local ergonomics; semantic values are identical.

## Logo & Favicon Wiring

### Logo (available ✅)

Use SVGs directly from the brand package:

```astro
<!-- In layouts/BaseLayout.astro -->
<img src="@aftergraph/brand/svg/aftergraph-wordmark-light.svg" alt="Aftergraph" height="28" />
```

Or inline the SVG for zero-request rendering:

```astro
<Fragment set:html={await fs.readFile('node_modules/@aftergraph/brand/svg/aftergraph-monogram.svg', 'utf-8')} />
```

Available variants (see `Aftergraph/brand/manifest.json`):
- `aftergraph-wordmark.svg` / `aftergraph-wordmark-light.svg`
- `aftergraph-monogram.svg` / `-mono` / `-inverse`
- `aftergraph-lockup-horizontal.svg` / `-light` / `-stacked`
- `aftergraph-app-icon.svg`

### Favicon (✅ resolved via Brand OS 1.1.0)

`scripts/sync-brand.mjs` fetches pinned `@aftergraph/brand v1.1.0` bytes:
`svg/favicon.svg` → served at `/favicon.ico`,
`svg/aftergraph-social-banner.svg` → served at `/og-image.svg`.
The former local `site/monogram.svg` stopgap is removed. Token primitives in
`src/styles/tokens.css` are drift-guarded against the release by the same script.

## Theme Contract

- **Dark is default**: `:root` uses dark semantic tokens. No `data-theme` attribute needed for dark mode.
- **Light override**: Set `data-theme="light"` on `<html>` or any container.
- **System preference**: Not auto-detected by tokens alone. Layout must add a `<script>` to toggle `data-theme` based on `prefers-color-scheme` if desired.
- **Reduced motion**: Tokens respect `prefers-reduced-motion: reduce` — all motion variables collapse to `0ms`.

## Accessibility Notes

All dark-theme foreground/background pairs meet WCAG 2.2 AA minimum:
- `--ag-text` on `--ag-canvas`: **18.2:1** (AAA)
- `--ag-control` on `--ag-canvas`: **10.5:1** (AAA)
- `--ag-evidence` on `--ag-canvas`: **10.2:1** (AAA)
- `--ag-text-muted` on `--ag-canvas`: **6.1:1** (AA)

Light theme pairs also compliant. See `Aftergraph/brand/DESIGN-SYSTEM.md` §3 for full matrix.

## Prohibited

- Do not create local color tokens that duplicate or override brand primitives.
- Do not rasterize SVGs manually; use build-time tooling.
- Do not use `Control Cyan` (#42C7E8) on white/light backgrounds without a dark container.
- Do not modify SVG paths, strokes, or fills locally.
