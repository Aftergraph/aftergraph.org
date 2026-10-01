# Site e2e pilot

Observational pilot of [tester-army/e2e](https://github.com/tester-army/e2e) 0.15.1 against the static site.

- Deterministic tests only: no `agent.*` steps, so no model or API key is needed.
- Not a required gate. Runs on PRs touching `site/**` or `e2e/**`, `continue-on-error`.
- Local: `npm --prefix e2e ci && cd e2e && npx playwright install chromium && npx e2e run`.

Agent steps come later, once a model key lives on the CI host (see Aftergraph/.github RFC 0001).
