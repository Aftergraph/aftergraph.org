# Atlas Visual System v1

Product identity: "Atlas by Aftergraph". Aftergraph is the masterbrand;
Atlas carries a restrained product motif only. All color tokens come from
Brand OS (`workspace/brand/DESIGN-SYSTEM.md`) and are already mapped to
`--ag-*` CSS vars in `atlas/src/app.css`. No Atlas-invented hex exists;
`--ag-danger #ff6b7a` is the single operational extension (conflict state).

## Principles

1. Evidence first: every visual either carries state or it ships.
2. Programmatic truth: real relationships render from AtlasProjection.
   Imagery is atmosphere, never evidence.
3. Quiet instrument, not theater: scientific-instrument aesthetic —
   technical maps, observability systems, mission control.
4. Dense but legible: high information density with strict hierarchy.

## Shape / line grammar

- Nodes: 6px-radius rects (repos/systems), circles (observations),
  diamonds (proposed/decision points).
- Edges: 1.5px solid for asserted relations; dashed for proposed;
  dotted for unknown/inferred.
- Chevron markers show flow direction on active paths only.
- Grid: 8px spacing scale (`--ag-space-1/2`), 8px surface radius.

## Truth-plane semantics (never color alone)

| plane | color | stroke | marker |
|---|---|---|---|
| CANONICAL | authority violet `#7759e8` | solid, 2px | square anchor |
| OBSERVED | control cyan `#42c7e8` | solid, 1.5px | circle |
| PROPOSED | decision amber `#f0a64a` | dashed 6/3 | diamond |
| DERIVED/EVIDENCE | evidence teal `#24c4ad` | solid + dot chain | seal tick |
| UNKNOWN | slate `#8993a4` | dotted 2/3 | hollow ring |
| CONFLICT | danger `#ff6b7a` | solid + split fork | fork glyph |
| STALE | slate 45% opacity | dashed + tick marks | hour ticks |

Shape + stroke + label always accompany color. All pairs hold ≥4.5:1
on `#080c14` except slate-at-45% (decorative only, never the sole carrier).

## Surface / depth

Canvas `#080c14` → workspace `#0e1630` → raised surfaces with
`--ag-shadow-sm/md`. Elevation signals interactivity, not decoration.

## Motion

Purpose-bound only: path activation, evidence→verification travel,
cut transitions, layout reflow on state change. 150–300ms ease.
Every animation ships a `prefers-reduced-motion` static equivalent;
verify-dom runs with `reducedMotion: reduce`.

## Icon treatment

24px grid, 1.75px strokes, `currentColor` default so icons inherit
context. Semantic carriers use `var(--ag-*, hex-fallback)`.
Capability vs authority glyphs are disjoint families (mechanism =
open geometry; authority = sealed/envelope geometry) — see manifest.

## Deliberately avoided

AI-magic, crypto, cyberpunk, sci-fi HUD, robot brains, neural wallpaper,
glowing circuits, particle clouds, generic SaaS illustration, warning-
triangle spam, red flashing alerts, broken glass, globe/map-pin logos,
readable fake UI or generated text inside imagery.
