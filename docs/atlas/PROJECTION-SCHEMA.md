# AtlasProjection schema v0.2 (frozen 2026-09-08, supersedes v0.1)

`site/atlas-projection.json` is the ONLY data source the Atlas UI may read (source data,
committed). The vite build compiles it in; `build-worker.cjs` copies it to
`site/atlas/projection.json` as the served runtime fallback.
Generator: `site/generate-atlas-projection.mjs`. The UI must render `meta` provenance
and refuse to upgrade any claim beyond its recorded `evidence_level`.

## Why v0.2: planes belong on assertions, not entities

v0.1 attached a single `truth_plane` to each node. That is wrong: one entity
(e.g. a repository) routinely carries CANONICAL assertions (Governance role),
OBSERVED assertions (live HEAD), and PROPOSED assertions (open PRs) at the same time.
Collapsing those onto one plane property forces silent reconciliation — exactly what
Atlas must never do. v0.2 models stable entities plus provenance-bearing assertions.
The rendered graph is a DERIVED projection over assertions, computed per visible plane set.

## Conceptual model

```text
Entity (stable identity, NO truth_plane)
  └─ Assertion (one predicate value, ONE truth_plane + full provenance)
  └─ RelationAssertion (one edge, ONE truth_plane + full provenance)
```

- Two planes may assert different values for the same subject+predicate. Both are kept.
  The disagreement lands in `conflicts[]`. Never overwrite one plane with another.
- Derivation (graph layout input, impact sets, pulse rollups) reads assertions filtered by
  the active overlay plane set and records which planes fed each derived fact.

## Top-level shape

```json
{
  "schema": "atlas-projection/0.2",
  "meta": {
    "evidence_cut": "2026-09-08T15:48:21Z",
    "generator": "site/generate-atlas-projection.mjs",
    "gov_sha": "<full 40-hex after-graph-governance SHA>",
    "gov_topology": "docs/platform-topology/1.0.json",
    "repo_pins": { "<public full_name>": "<full 40-hex HEAD>" },
    "private_repos": [ "<private full_name>" ],
    "snapshot_of": null
  },
  // Conflicts name subjects/pairs AND proposed-resolution candidates: open
  // PR assertions on the involved sources (candidates for a human to judge,
  // never claimed resolutions). verify-atlas.cjs fails closed on dangling refs.
  // Private-source policy: repo_pins carries exact HEADs for PUBLIC repos only.
  // Private repos are listed by NAME in private_repos; their assertion provenance
  // refs point at the canonical branch (never the exact HEAD) and valid_at is
  // withheld. Names/roles travel via assertions; exact private state never ships.
  "entities": [ { "id": "repo:Aftergraph/aie", "kind": "repository", "identity": {} } ],
  "assertions": [],
  "relations": [],
  "conflicts": [ { "id": "C1", "status": "open", "a": "as-...", "b": "as-...", "note": "..." } ]
}
```

## Entity

| field | meaning |
|---|---|
| `id` | stable id: `repo:<full_name>` (observed slug; renames keep history via assertions), `contract:<name>/<version>`, `capability:<skill>`, `model:<name>`, `study:<id>` |
| `kind` | `repository` \| `contract` \| `capability` \| `model` \| `study` |
| `identity` | plane-neutral identifiers only: canonical full_name(s), aliases (e.g. legacy WI slugs). NO role, NO maturity, NO head — those are assertions. |

Entities carry no provenance and no truth_plane. Everything claim-like lives in assertions.

## Assertion

| field | meaning |
|---|---|
| `id` | `as-<short-hash>` stable within a cut |
| `subject` | entity id |
| `predicate` | e.g. `role`, `plane`, `visibility`, `canonical_branch`, `head_sha`, `head_msg`, `pushed_at`, `maturity`, `presence`, `lifecycle`, `evidence_class`, `trust` |
| `value` | scalar / object value (SHAs full 40-hex; `maturity: unknown` when no repo-owned source) |
| `truth_plane` | `CANONICAL` \| `OBSERVED` \| `PROPOSED` |
| `provenance` | source block (below) |
| `observed_at` | ISO-8601 UTC read timestamp |
| `valid_at` | commit/author timestamp where available, else null |
| `freshness` | `fresh` \| `stale` \| `unknown` (ref vs live at generation) |
| `conflict_id` | null or `conflicts[].id` |

## RelationAssertion

| field | meaning |
|---|---|
| `id` | `rel-<short-hash>` |
| `source` / `target` | entity ids |
| `relation` | `consumes` \| `provides` \| `owns` \| `evaluates` \| `hosts` \| `proposes` |
| `truth_plane` | `CANONICAL` \| `OBSERVED` \| `PROPOSED` |
| `provenance` | source block |
| `observed_at` | ISO-8601 UTC read timestamp |
| `freshness` | `fresh` \| `stale` \| `unknown` |
| `conflict_id` | null or conflict id |

Dependency edges come from `dependencies.yml` (CANONICAL). Rename shadows (e.g. canonical edge
targeting `work-intelligence-v2` while OBSERVED names `wi-backend`) are kept as-is on their own
plane; the disagreement lands in `conflicts[]`, never in a rewritten edge.

## Provenance source block (REQUIRED on every assertion and relation)

| field | meaning |
|---|---|
| `source` | e.g. `Aftergraph/after-graph-governance docs/platform-topology/1.0.json`, `github-api repos/Aftergraph/aie` |
| `source_type` | `governance-file` \| `github-api` \| `repo-file` \| `generated-derivation` |
| `repository` | full `owner/name` read from |
| `ref` | branch or full 40-hex SHA read at |
| `evidence_level` | `canonical` \| `observed` \| `proposed` \| `derived` \| `unverified` |

## Conflicts

```json
{ "id": "C1", "kind": "rename", "status": "open",
  "a": "as-<canonical name assertion>", "b": "as-<observed name assertion>",
  "note": "GitHub rename-redirect proven 2026-09-08; canonical registry stale." }
```

`status`: `open` \| `acknowledged` \| `resolved` (resolved = a later cut where both planes agree).

## Private-source boundary (public artifact rule)

`projection.json` ships as a PUBLIC static asset. For entities whose OBSERVED visibility
is `private`, the generator MUST OMIT `head_sha`, `head_msg`, `pushed_at` and `open_pr`
assertions and instead emit one DERIVED `withheld` assertion naming the omitted predicates
with reason `private-source-boundary`. Private entities keep: `slug`, `role`, `plane`,
`visibility`, `canonical_branch` (default-branch name only), `presence`. The verify gate
fails closed on any private internals. When canonical visibility disagrees with observed
privacy, OBSERVED wins and the pair lands in conflicts (C3 kind `visibility`).

## Minimal v0.2 generator scope (TDD slices)

1. Repository entities + per-plane assertions (role/plane/visibility CANONICAL;
   head_sha/head_msg/pushed_at/open PRs OBSERVED; PR-derived `proposes` relations PROPOSED).
2. `presence` as a DERIVED OBSERVED-vs-CANONICAL assertion pair, not a single flag.
3. `dependencies.yml` CANONICAL relations + C1/C2 conflicts.
4. Contract entities + `owns`/`consumes` relations (minimal rows).
5. Empty capabilities/models/studies entity sets (slices add them with `unverified` assertions).
