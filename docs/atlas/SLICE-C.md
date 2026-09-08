# Slice C spec (dispatch after B1 lands; reads projection v0.2 only)

Scope: secondary views + impact analysis + snapshots + Ask Atlas V0 inside the `atlas/`
vite app B1 scaffolds. No new runtime deps except D3 (bundled, lockfile-pinned).
No edits outside `atlas/` except rebuilt `site/atlas/` output. No operational actions
anywhere (read-plane, ARCHITECTURE §6b).

## Data contract (all views read ONLY site/atlas/projection.json)

- Plane filtering reuses B1's derivation helper (assertions filtered by active plane set).
- Every rendered claim links its assertion id(s); missing provenance renders "unverified".
- Private entities show withheld markers; never fetch around them.

## Views

1. Impact analysis: BFS upstream/downstream over `consumes`/`provides`/`owns` relations
   from the selected entity, depth-capped (default 2) with plane badges per hop.
2. Development pulse: OBSERVED `head_sha`/`pushed_at` + PROPOSED `open_pr` assertions per
   repo; activity strip sorted by `valid_at`. No commit fetching beyond the projection.
3. Contract explorer: contract entities with `owns` (owner) + `consumes`/`provides` rows,
   version pins, and the owning governance ref/SHA.
4. Capability/tool/MCP graph: reads Enrich fixtures (`docs/atlas/enrich/fixtures.json`)
   ONLY as clearly-labelled preview data until the generator emits real capability
   assertions; quarantined/unverified entries flagged, never hidden.
5. AFM lineage: model entities → registry/lifecycle assertions (same preview rule as 4).
6. Research constellation: D3 force layout over `evaluates` relations, permanently labelled
   "exploratory arrangement — not canonical topology".
7. Snapshots: list versioned `projection-<cut>.json` files if present; diff = added/removed
   entity ids + changed assertion values + conflict open/resolved transitions.
8. Ask Atlas V0 (extractive): question → keyword/regex retrieval over assertions →
   answer template listing matching assertions with ids + provenance. Unanswerable →
   say so with the closest available assertion. No generative claims. Code the retrieval
   boundary as a separate module (`askRetrieve`) returning assertion sets, so the later
   grounded layer (retrieve → assemble → generate → validate) can reuse it; add a
   `validateAnswer` stub that rejects any claim lacking a supporting assertion id.

## Acceptance

- Vitest: BFS correctness on a fixture graph, Ask retrieval precision on canned questions,
  snapshot diff on two fixture projections, validator rejects unsupported claim.
- `npm run build` + full site gates green; reduced-motion + mobile neighborhood rules hold
  for new views; URL state extended (`?view=`) without breaking B1's `?node=&overlay=`.
