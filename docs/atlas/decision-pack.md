# Atlas beslutningspakke til Jonas (2026-09-08, cut 19:30:48Z)

Atlas er bygget som read-only observatorium: den foreslår, du beslutter.
Branch `feat/atlas` er grøn i CI (alle gates: tests, build, verify, DOM-smoke,
leakage-gate). Fuld evidens: `docs/atlas/LEDGER.md` (E1–E26).

## 1. sentinel-firetest2 er uregistreret (C2, stadig åben)

- Observeret: `Aftergraph/sentinel-firetest2` er live og public (cut 2026-09-08T19:30:48Z).
- Kanonisk: topology (gov `5f53273`) kender `sentinel` + `sentinel-firetest`, men ikke `firetest2`.
- Anbefaling: arkivér `firetest2`, hvis den er afløst af `sentinel-firetest`; registrér den ellers
  i `docs/platform-topology/1.0.json` (assurance-planet). Alternativ: eksplicit `excluded`-markering,
  så Atlas holder op med at flagge den.

## 2. dependencies.yml peger stadig på gamle WI-navne (C4, stadig åben)

- Topology bruger `wi-backend`/`wi-frontend`. `dependencies.yml` bruger stadig
  `work-intelligence-v2`/`work-intelligence-web` (studio, docs, WI-forbrug).
- Anbefaling: opdatér `dependencies.yml` til de nye slugs.
  Alternativ: behold bevidst + dokumentér alias — så fjerner jeg konflikten som `acknowledged`.

## 3. Bekræft runtime-visibility (stadig privat)

- Observeret: `Aftergraph/runtime` er privat. Bekræft, at det er hensigten.
- Anbefaling: hvis privat er korrekt, ingen handling (Atlas viser kun navn/rolle). Hvis den skal være
  offentlig, åbn repoet — Atlas opdager det ved næste cut.

## 4. Fixture-udkast med private navne i git-historik (nyt)

- Audit-fund (E26): `docs/atlas/enrich/fixtures.json` indeholder et skill-navn og candidate
  release-filnavne fra private kilder, flagget "kræver Jonas-clearance". UI'en viser dem ikke
  længere (withheld + begrundelse), men navnene ligger i historikken på `feat/atlas`.
- Anbefaling: behold som udkast-eksempel (de er form-shaping, ikke publiseret fakta) — eller
  sig til, så purger jeg filen fra branch-historikken før merge.

## 5. Visuel review af screenshots (nyt)

- 4 friske screenshots ligger i `atlas/qa-shots/` (desktop, drift, inspector, mobil).
  DOM-assertions er grønne, men menneske-øjne har ikke set dem endnu.
- Anbefaling: kig dem igennem ved lejlighed; meld visuelle fejl tilbage, så retter jeg.

## 6. Merge af feat/atlas til main (nyt)

- Verificeret: 13/13 projektionstests, 39/39 vitest, verify PASS, DOM-smoke PASS,
  0 private SHA'er i artefakter, 2 kendte konflikter (C2+C4 ovenfor) synlige i UI.
- Anbefaling: review + merge, når beslutning 1–2 er håndteret (eller bevidst udskudt).
  Atlas deployer med det eksisterende site (ingen særskilt infra).

## Løst siden sidst

- Site-gates var uenige om WI-navnet: nu er begge sider enige om `wi-backend`
  (legacy-slug forbydes af gates). Punktet er lukket uden handling fra dig.

## Hvad sker der derefter

Næste Atlas-kørsel (`node site/capture-observed.mjs` + generator) lukker løste konflikter
af sig selv og skriver nye SHA-pins. Du skal ikke røre Atlas-filerne.
