# DECISIONS

## 1. Repository name: `aftergraph.org`

Audit 2026-09-07 of all Aftergraph repos showed no existing owner of the
public web surface:

- `docs` — Knowledge Plane portal compiler (content aggregation, no spec
  ownership). A compiler, not a front door.
- `brand` — Brand OS: tokens, assets, communication contracts. Supplies the
  visual system, does not host the site.
- `studio` — operator/product experience (mission status, approvals). App UI,
  not marketing.
- `work-intelligence-web` — product web experience for Work Intelligence.
  Product surface, not org surface.

A new repo with the canonical name avoids duplicate ownership and makes the
mapping domain <-> repo obvious.

## 2. Stack: Astro + Cloudflare Workers Static Assets

- Content-heavy, mostly static site (marketing, research, docs entry, launcher
  hub). No per-request personalization today.
- Astro content collections + MDX give typed content, deterministic builds and
  minimal shipped JS — the cheapest path to Lighthouse >= 95.
- Workers Static Assets keeps deployment on existing Aftergraph infrastructure
  (same account, same zone, zero new vendors). No SSR runtime to operate.
- GitHub-derived content (repo cards, releases, CI state) is fetched at build
  time with file cache, never at request time (rate-limit safety).
- Rejected: Next.js (SSR runtime for a static site), headless CMS (no editors
  yet — content lives in git beside the code).

## 3. Launcher is part of the site, not a separate app

`/launch` is a route in the same Astro build (command-palette UX, static index
of destinations). Authenticated workspace routing later must not require a
redesign: destination entries carry an optional `requiresAuth` flag from day one.

## 4. Evidence labelling is structural, not editorial

Every content type that can carry a claim (research, benchmark, product
capability, roadmap) has a required `maturity` field
(`research | experiment | prototype | production | roadmap`). Pages render the
label; CI fails the build on missing labels. See `CONTENT.md`.
