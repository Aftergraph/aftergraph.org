# aftergraph.org — Agent Execution Contract

<!-- Generated 2026-09-10 from REPOSITORY_INVENTORY.json, CI_COMMAND_INVENTORY.json, CI_RESULTS.json and a
     live probe of branch main at HEAD c29beca87f064e87ff0e965b8896ecec6cada7c5. Revision 1.
     NOTE: the workspace inventory recorded main at 769723a; this file was generated
     from the live checkout (main at c29beca87f064e87ff0e965b8896ecec6cada7c5). Re-verify against your SHA.
     Regenerate the command blocks; hand-edit only the Ratchet section. -->

## Project

  Name        aftergraph.org
  Role        Brand / public — public front door
  Purpose     Canonical public platform for aftergraph.org: marketing site, organization front door and system launcher for the Aftergraph ecosystem.
  Languages   no recognised build marker

## Local conventions (verified present on disk)

  BUILD:     — not detected in this repository
  TEST:      — not detected in this repository
  LINT:      — not detected in this repository
  TYPECHECK: — not detected in this repository
  VERIFY:    — not detected in this repository

  Probes
  - none

Precedence: this file beats the conversation; `/root/workspace/aftergraph/AGENTS.md` beats this file;
verified external state beats both.

## Executed verification (authoritative)

  No executed verification command is recorded for this repository in `CI_RESULTS.json`
  (scope: Aftergraph local repository-native verification, 18 rows, 2026-09-08).
  This repository therefore has no recorded computational sensor.
  Before relying on it unattended, add one and record the executed command here with a date.
  Do not invent a build or test command for this repository.

## Rules (inherited from the Aftergraph workspace contract)

  - Never commit secrets, tokens, or credentials. Never copy runtime secrets into fixtures, docs, or frontend code.
  - Conventional commits: `feat|fix|docs|refactor|test|chore(scope): description`. Sign off with a verified identity.
  - Run the repository's verification row for your SHA before opening a PR.
  - Evidence-bound: gate results tied to the exact SHA. Evidence from an older SHA is stale, not evidence.
  - Keep PRs narrow and reviewable. Preserve unrelated work. Update an existing PR rather than duplicating it.
  - Check `after-graph-governance/docs/contracts/` for relevant schemas before changing an interface.
  - Verify trust-gateway policy before touching approvals, auth, or budgets.
  - Prefer the smallest reuse-first change. Keep provider boundaries explicit and fail closed.
  - Risk surfaces (authority, permissions, audit, budgets, identity, secrets) require independent verification,
    not self-verification by the implementing agent.
  - Local green output does not prove production readiness. Do not claim completion from it.

## Ratchet — rules learned from observed failures

Every line below must trace to one observed agent failure in THIS repository.
Add a dated line when an agent fails in a new way; fix the strongest layer that prevents recurrence.

  (none recorded yet — this guide has not yet accumulated failure-derived rules)

Choose the strongest applicable layer:
  memory note  <  prompt instruction  <  guide rule  <  sensor (test/lint/schema)  <  environment constraint (permission, CI gate)

If a rule can be checked without human judgement, it does not belong in this list — it belongs in a sensor.

## Guide hygiene

  - Review monthly. Remove rules now enforced by automation. Consolidate rules addressing the same failure class.
  - When the same review comment appears three times, promote it to a gate that blocks the output.
  - Date every entry so stale guidance is identifiable.
  - A rule nobody can verify without subjective judgement is not a rule; rewrite or delete it.
