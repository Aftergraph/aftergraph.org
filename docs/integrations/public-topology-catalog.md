# Public repository catalog from Governance topology/2.0

`GET /platform/repositories.json` serves a read-only public catalog generated from the canonical `platform-topology/2.0` contract in `Aftergraph/after-graph-governance`.

## Source and refresh

`data/public-topology-source.json` pins the Governance source commit and input paths. The deploy and interface workflows check out that exact commit as `governance-source`, then run:

```sh
node scripts/generate-public-repository-catalog.mjs governance-source
```

The current pin is Governance PR #214 head `c25e557233afac3519cdefd5d04f8997615b655c`. It provides a deterministic consumer test for the proposed 44-repository topology. After PR #214 merges, update the source pin and both workflow checkout refs to the merged Governance commit, then regenerate the checked-in catalog and Worker bundle. This adapter does not fetch GitHub repository state at runtime.

## Public projection rules

- Only rows whose canonical topology `visibility` is `public` appear in the endpoint. Private rows are removed before serialization. Private names and repository heads are not copied into this catalog.
- The projection carries only the repository name/public GitHub URL and the explicit `role` and `lifecycle` classification fields. It does not project `owns`, `must_not_own`, `system_class`, `architecture_plane`, branch heads, or repository activity.
- The role allowlist comes from Governance `org-state/1.0`, excluding its legacy compatibility roles. Lifecycle values are explicitly allowlisted by the adapter. A source value outside either allowlist, including `unclassified` or `classification-pending`, produces `classification.state = "pending"`, a `Classification pending` label, and null for that field. Unknown source values are not echoed.
- `maturity` remains authored by `data/launcher-surfaces.json`; operational or research evidence remains in Atlas. The repository catalog schema has no maturity or evidence fields, and topology membership makes no production-readiness claim.

## Public response shape

The field set is defined by `site/public-repository-catalog.schema.json`; the adapter tests and Worker build gate enforce its closed object shapes, public visibility, and pending-label constraints. Its `source` object records contract, source repository/ref/path, and the topology review date (`topology_cut`). That date is provenance for the topology document, not runtime or production evidence.

Each repository contains:

```json
{
  "repository": "example-repo",
  "url": "https://github.com/Aftergraph/example-repo",
  "visibility": "public",
  "classification": {
    "state": "classified",
    "role": "canonical-contracts",
    "lifecycle": "active",
    "label": null
  }
}
```

When classification is pending, `state` is `pending`, the label is `Classification pending`, and unknown classification fields are `null`. Consumers must render that state without inferring a role or lifecycle.
