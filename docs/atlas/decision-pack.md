# Atlas beslutningspakke til Jonas (2026-09-10, cut 04:25:37Z)

Atlas er bygget som read-only observatorium: den foreslår, du beslutter.
Branch `feat/atlas` er grøn lokalt (alle gates: tests, build, verify, DOM-smoke,
leakage-gate). Fuld evidens: `docs/atlas/LEDGER.md` (E1–E57+).

## 1. Governance topology 2.0 er live (nyt)

- Gov `d3e5119`: `platform-topology/2.0.json` erstatter 1.0 som kanonisk kilde.
  Nye felter: `architecture_plane` (7 semantiske planer el. null), `system_class`,
  `lifecycle`, `must_not_own`. 27 repos registreret (skill-abi + skillport tilføjet #148).
- Dependencies.yml v4 refererer nu direkte `wi-backend`/`wi-frontend` (ingen legacy-slugs).
- **Alle tidligere konflikter (C1/C2/C4) er løst upstream** — projection viser 0 åbne.
- Anbefaling: ingen handling krævet; Atlas generatoren er allerede adapteret.

## 2. Bekræft runtime-visibility (stadig privat)

- Observeret: `Aftergraph/runtime` er privat. Bekræft, at det er hensigten.
- Anbefaling: hvis privat er korrekt, ingen handling (Atlas viser kun navn/rolle).

## 3. Visuel review af screenshots

- Screenshots ligger i `atlas/qa-shots/`. DOM-assertions er grønne, men
  menneske-øjne har ikke godkendt æstetikken endnu.
- Anbefaling: kig dem igennem ved lejlighed.

## 4. Merge af feat/atlas til main

- Verificeret: 16/16 projektionstests, 40/40 vitest, verify PASS, DOM-smoke PASS,
  0 private SHA'er i artefakter, 0 åbne konflikter.
- Anbefaling: review + merge når du er klar. Atlas deployer med det eksisterende site.

## Løst siden sidst

- C1 (WI rename): løst af gov 2.0 (topology bruger nu wi-backend/wi-frontend direkte).
- C2 (uregistrerede repos): løst af gov #136/#148 (alle 27 repos registreret).
- C4 (deps.yml legacy slugs): løst af deps.yml v4 (ingen legacy-referencer).
- Topology 1.0 → 2.0 migration komplet i generator + fixtures + docs.

## Hvad sker der derefter

Næste Atlas-kørsel opdaterer SHA-pins automatisk. Du skal ikke røre Atlas-filerne.
