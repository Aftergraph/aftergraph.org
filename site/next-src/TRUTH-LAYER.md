# /next truth layer

`/next` shows what each Aftergraph system's source says today, not what we
remember about it.

## What is live

`build-ecosystem-state.mjs` runs in the production deploy (and every 6 hours
on cron `17 */6 * * *`) and writes `site/ecosystem-state.json`, served as
`/next/ecosystem-state.json` (noindex, `max-age=300`). For every public repo
in `platform-catalog.json` it records:

- `head`, `headAt`: exact default-branch HEAD and its commit time
- `status`: CI verdict on that exact HEAD (`passing`, `failing`, `pending`,
  `no-ci`, `unknown`); a read error is `unknown`, never `passing`
- `freshness`: from HEAD age. `active` <= 14 days, `quiet` <= 60 days,
  `dormant` older, `unknown` with no HEAD
- `release`: latest release (or tag) and `aheadBy`, the number of commits main
  has moved past it, read from the GitHub compare API
- `openPRs`

Private repos are listed by name only, with status `private`.

`/next/ecosystem` renders the same file as a server-side table at build time
(no client JS, noindex): one row per catalog repo, sorted failing first, with
CI on HEAD, freshness, HEAD sha and date, latest release with `+aheadBy`, open
PRs and failing check names. Its "Verified" line is `generatedAt`; when the
file was not generated the page says so and lists nothing.

## What is hand-written, and how it stays honest

Product headlines and one-liners live in `COPY` in `generate-next.py`.
`COPY_VERIFIED` records the day they were last checked against the catalog
`owns` text and each repo README. `next.test.mjs` fails once that date is
older than 45 days, so stale copy blocks the deploy until someone re-checks it
and bumps the date.

## Reading a product page

- red/amber/green chip: CI on the exact HEAD
- dashed chip: freshness of the repo
- "main is N commits ahead": the latest release is older than what is on main;
  the release is not a picture of the product today
