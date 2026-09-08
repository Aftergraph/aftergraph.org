# Atlas beslutningspakke til Jonas (2026-09-08)

Atlas er bygget som read-only observatorium: den foreslår, du beslutter.
Alt nedenfor regenereres automatisk, når du har handlet — ingen kodeændringer nødvendige.
Fuld evidens: `docs/atlas/LEDGER.md` (E1–E6), eksakte heads i tabellen nederst i LEDGER.

## 1. sentinel-firetest2 er uregistreret (C2)

- Observeret: `Aftergraph/sentinel-firetest2` er live og public (cut 2026-09-08T15:48:21Z).
- Kanonisk: topology (gov `6b8c971`) kender `sentinel` + `sentinel-firetest`, men ikke `firetest2`.
- Anbefaling: arkivér `firetest2`, hvis den er afløst af `sentinel-firetest`; registrér den ellers
  i `docs/platform-topology/1.0.json` (assurance-planet). Alternativ: eksplicit `excluded`-markering,
  så Atlas holder op med at flagge den.

## 2. dependencies.yml peger stadig på gamle WI-navne (C7 / projektion-C4)

- Topology bruger `wi-backend`/`wi-frontend` (gov #49). `dependencies.yml` bruger stadig
  `work-intelligence-v2`/`work-intelligence-web` (studio, docs, WI-forbrug).
- Anbefaling: opdatér `dependencies.yml` til de nye slugs (samme PR som topology-ændringen burde).
  Alternativ: behold bevidst + dokumentér alias — så fjerner jeg konflikten som `acknowledged`.

## 3. Site-gates er uenige om WI-navnet (C4)

- `build-worker.cjs` kræver `wi-backend` og forbyder `work-intelligence-v2`; `verify-site.cjs`
  forventer stadig `work-intelligence-v2` i den offentlige liste.
- Anbefaling: ret `verify-site.cjs` til `wi-backend` (build-siden har allerede ret + site #53).
  Alternativ: ingen — den ene side tager fejl, begge kan ikke være sande.

## 4. Bekræft runtime-visibility

- Observeret: `Aftergraph/runtime` er privat. Bekræft, at det er hensigten (topology #49 registrerede den).
- Anbefaling: hvis privat er korrekt, ingen handling (Atlas viser kun navn/rolle). Hvis den skal være
  offentlig, åbn repoet — Atlas opdager det ved næste cut.

## Hvad sker der derefter

Næste Atlas-kørsel (`node site/generate-atlas-projection.mjs ...`) lukker løste konflikter af sig selv
og skriver nye SHA-pins. Du skal ikke røre Atlas-filerne.
