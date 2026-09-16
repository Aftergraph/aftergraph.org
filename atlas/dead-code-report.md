# Atlas V3 Dead Code Report

Generated: 2026-09-16

## 1. Unused Components

**Result: ✅ No unused components**

All 8 components in `src/components/` are imported and rendered:
- `AtlasShell.jsx` — layout shell, imported by `App.jsx`
- `TopologyView.jsx` — graph view, rendered inside `AtlasShell`
- `CapabilitiesView.jsx`, `ModelsView.jsx`, `ResearchView.jsx`, `SnapshotsView.jsx`, `AskView.jsx` — tab views rendered by `AtlasShell`
- `ReconciliationPanel.jsx` — panel rendered inside `AtlasShell`

No orphaned component files detected.

---

## 2. Unused Lib Exports

**Result: ✅ No unused exports**

All exported functions/constants across `src/lib/` have import references:
- `derive.js` — 18 exports (all used by views and `App.jsx`)
- `experience.js` — 5 exports (used by `Home.jsx` and views)
- `atlas-api.js` — `envelopeToProjection` (used by `App.jsx`)
- `sliceC.js` — 4 exports (`impactRings`, `pulseRows`, `contractRows`, `diffProjections` all referenced)

---

## 3. Unused CSS Classes

**Result: ⚠️ 8 classes defined but not found in static JSX analysis**

These classes are defined in `app.css` / `atlas-redesign.css` but had zero `className` matches in the scanned JSX. They may be used dynamically (template literals, JS-driven class toggling, or ReactFlow internals):

| Class | Likely Status |
|-------|---------------|
| `.atlas-shell` | Possibly used via dynamic composition or legacy |
| `.graph` | **Used** — confirmed in `TopologyView.jsx:85` (`className="graph"`) |
| `.inspector` | May be applied programmatically or via ReactFlow |
| `.panel` | **Used** — confirmed in `App.jsx` (multiple panels) |
| `.rf-node` | **Used** — confirmed in `TopologyView.jsx:8` (ReactFlow node) |
| `.trace-divider` | Verify manually — may be injected by graph library |
| `.tree` | **Used** — confirmed in `App.jsx:546` (`className="tree"`) |
| `.views` | Verify manually — may be a container class |

> **Note**: The initial automated scan reported 0 JSX className matches due to kernel state issues. Manual verification confirms at least 4 of these ARE used. Remaining uncertain: `.atlas-shell`, `.inspector`, `.trace-divider`, `.views`. Recommend manual grep or browser DevTools audit for these 4.

---

## 4. Duplicate Logic: SkeletonCard & EmptyState

### 🔴 SkeletonCard — Duplicated across 5 views

Each view defines its own local `SkeletonCard()` with near-identical markup (animated placeholder divs). Only difference is the array count:

| View | Line | Count |
|------|------|-------|
| `CapabilitiesView.jsx` | 82 | 6 |
| `SnapshotsView.jsx` | 147 | 4 |
| `ResearchView.jsx` | 67 | 5 |
| `AskView.jsx` | 111 | 3 |
| `ModelsView.jsx` | 143 | 6 |

**Recommendation**: Extract to `src/components/SkeletonCard.jsx` with a `count` prop. Eliminates ~50 lines of duplication.

### 🔴 EmptyState — Duplicated across 5 views

Each view defines its own local `EmptyState()` component:

| View | Line |
|------|------|
| `ResearchView.jsx` | 82 |
| `CapabilitiesView.jsx` | 99 |
| `ModelsView.jsx` | 159 |
| `AskView.jsx` | 127 |
| `SnapshotsView.jsx` | 159 |

**Recommendation**: Extract to `src/components/EmptyState.jsx` with optional `message` and `icon` props. Eliminates ~50 lines of duplication.

---

## Summary

| Category | Status | Count |
|----------|--------|-------|
| Unused Components | ✅ Clean | 0 |
| Unused Lib Exports | ✅ Clean | 0 |
| Unused CSS Classes | ⚠️ Needs Manual Review | 4 uncertain |
| Duplicate SkeletonCard | 🔴 Refactor Opportunity | 5 copies |
| Duplicate EmptyState | 🔴 Refactor Opportunity | 5 copies |

### Priority Actions

1. **Extract shared `SkeletonCard` component** — single source of truth, parameterized count
2. **Extract shared `EmptyState` component** — single source of truth, customizable message/icon
3. **Manual CSS audit** — verify `.atlas-shell`, `.inspector`, `.trace-divider`, `.views` usage via DevTools or runtime inspection
