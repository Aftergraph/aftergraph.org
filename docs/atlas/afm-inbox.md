# AFM/AVC inbox (RELOCATED, not Atlas-verified)

Appended to docs/atlas/decision-pack.md by an unidentified co-author and relocated here 2026-09-08 to keep the Atlas owner brief on-scope. NOTE: a newer worktree refinement of these sections was lost when /tmp proved volatile before relocation (honest loss log). What follows is the last committed version. Atlas mission makes NO claims about its correctness.

---

## 5. AVC dissolution-matrix (målt 2026-09-08, lokale kloner)

- 23 `@avc/*`-pakker vs 34 `@aftergraph/*`-pakker. 20 runtime-pakker bærer
  `migrated from @avc/*`-markør (Wave 6 er langt — inkl. intelligence-gateway,
  orchestrator, kernel-core, ledger, memory-store).
- 17 pakkenavne findes begge steder (verificér paritet, slet derefter AVC-tvilling).
- 8 AVC-only: `brand-assets`, `brand-tokens`, `creative-assets` → flyt til `brand`;
  `company-daemon`, `product-catalog`, `product-installer-adapter`, `ui` → AVC
  beholder som product consumer; `hermes-adapter` → sletningskandidat (legacy Hermes).
- Anbefaling: paritets-tjek på de 17, flyt brand-*, beslut hermes-adapter. AVC er
  derefter migration source + consumer, ikke parallel platform.

## 6. Golden Mission lokalt bevis (10/10 PASS 2026-09-08)

- Kæde bevist uden model-loads: registry-alias `candidate` → `afm-0.12-arm-e-r3x2` →
  version-record → gate-evidence-sha (`9ef6da54…` matcher) → release-fil →
  router-beslutning (sealed envelope verificerer) → execution-target (`afm@12`) →
  fail-closed afvisning af broadening-katalog.
- Routing-suiter: 335/335 grønne (`intelligence-gateway` + `mission-routing`, efter `pnpm build`;
  frisk checkout fejler 28 filer på manglende `dist/` — README dækker allerede build-før-test).
- To sammensætningshuller: (a) `candidate`-alias peger på record med status
  `experimental` — alias fører, record halter; promotér record eller dokumentér draft.
  (b) Registry-versionsstrenge (`afm-0.12-…`) vs router-profil-int — ingen kanonisk
  mapping; beviset bruger lokal mapping, der skal erstattes af konvention.

## 7. Registry-schema rettet (udført)

- `model-version.schema.json` afviste `maintenance`, som livscyklus-politikken definerer.
  Enum udvidet — 0 records berørt, fremadkompatibelt. 15/15 version-records validerer.

