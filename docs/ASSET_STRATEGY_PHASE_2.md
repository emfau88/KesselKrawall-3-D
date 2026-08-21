# Phase 2 – Production-Art Bake-off und Golden Slice

Stand: 21. August 2026

## Ergebnis und Entscheidung

Der Bake-off besteht sein Ziel als **Pipeline-Nachweis**. Quaternius ist ab
jetzt die primäre visuelle Muttersprache für den kontrollierten Golden Slice;
KayKit bleibt nur als reproduzierbarer technischer Fallback. Eine vollständige
Assetmigration ist damit noch nicht automatisch freigegeben. Sinnvoll ist ein
schrittweiser Ausbau, der nach jeder Szene erneut gegen Screenshotqualität,
Mobilbudget und Charakterlesbarkeit geprüft wird.

Der aktuelle Golden Slice ist sichtbar näher an den drei Zielmockups als der
vorherige Build: texturiertes Holz und Mauerwerk, bessere kleine Requisiten,
eine wärmere Alchemiepalette, charakteristische Kesselfiguren und dichteres
Moor-Set-Dressing ersetzen den größten Teil der zuvor sichtbaren
Asset-Pack-/Programmer-Art-Mischung. Die Mockups bleiben dennoch eine Stufe
höher bei Raumtiefe, individueller Architektur, Dekodichte, komplett
maßgeschneiderten Zutaten und der Verzahnung von Fantasy-UI und 3D-Szene.

**Produktionsentscheidung: bedingtes GO.** Die Pipeline kann ein kommerziell
glaubwürdiges stilisiertes Indie-Ergebnis tragen. Für einen flächigen Ausbau
muss der projektspezifische Anteil pro Szene und Hero-Charakter weiter steigen;
ein bloßes Ausrollen weiterer Packmodelle würde wieder wie eine Asset-Demo
wirken.

## Gelieferter Umfang

### Kuratierte Assetbasis

- alle drei lokal bereitgestellten Standard-ZIPs auf Inhalt, Formate und
  enthaltene Lizenz geprüft;
- 338 verfügbare Modelle visuell und technisch gesichtet;
- nur 22 tatsächlich im Golden Slice benötigte Modelle ausgeliefert:
  13 Fantasy Props, 4 Village-Module und 5 Nature-Modelle;
- Texturen reproduzierbar auf maximal 512 px reduziert und PNG-optimiert;
- Runtime-Payload aller Quaternius-Dateien: 8,20 MiB statt der drei
  vollständigen Archive mit zusammen rund 396 MiB;
- Original-ZIPs per `.gitignore` ausgeschlossen; CC0-Lizenztexte und
  maschinenlesbares Manifest werden mit ausgeliefert.

Die Aufbereitung ist über `scripts/prepare_quaternius_assets.py`
reproduzierbar. `art/blender/audit_asset_metrics.py` prüft zusätzlich echte
Blender-Importmetriken und Modellabmessungen.

### Workshop

- Quaternius-Steinwand und unregelmäßiger Steinboden als durchgängige
  Architektur statt gemischter KayKit-Wände;
- texturierte Quaternius-Werkbank mit wesentlich ruhigerem, weniger schrägem
  Kamerawinkel;
- kuratierte Bücherregale, Flaschenregale, Wandlaternen, Buchständer, Kerzen,
  Tränke, Truhe, Fass, Rankpflanze und Banner;
- fünf weiterhin funktionale Ingredient Slots und echter Shop-/Merge-/Synergie-
  Ablauf;
- drei belegte Zutaten im finalen Desktop-Screenshot, ohne den Spielzustand für
  eine reine Renderdemo zu fälschen.

### Cauldron Character Construction Kit

Der Standardkessel aus Fantasy Props dient als hochwertiger texturierter
Donor-Korpus. Die alten vollständig prozeduralen Körper werden im Golden Slice
nicht mehr als Hauptgeometrie eingesetzt.

- `hero-cauldron-player-kit.glb`: projektspezifische Augen, Brauen, Nase,
  Schnurrbart, Mund, Rune, Schuhe und Messingornamentik;
- `hero-cauldron-moor-kit.glb`: eigene Augen-/Nasenform, Wurzelgriffe, Füße,
  Moosflächen und asymmetrische Silhouette;
- echte Quaternius-Pilze werden als austauschbare Moor-Module ergänzt;
- Flüssigkeit, Dampf, Blasen, Aura und Farbfamilie bleiben dynamisch;
- Cast, Hit, Guard, Heal, Victory und Defeat nutzen weiterhin den gemeinsamen
  Reaktionsvertrag.

`art/blender/build_cauldron_kits.py` entfernt reproduzierbar die alten Körper
und exportiert nur die wiederverwendbaren Charaktermodule. Damit werden die
Donor-Texturen nicht in jedem Hero-GLB dupliziert.

### Arena, Leben und Kampf

- Quaternius-Mauerwerk, Boden, Torrahmen, Fackeln, Banner, Rankpflanzen,
  Truhe/Fass und Nature-Dressing ersetzen den sichtbaren KayKit-Rahmen;
- Moor-Martha erhält tote Bäume, Pilze, Pflanzen, Felsen, grüne Miasma-
  Lichtstimmung und animierte Ambient-Motes;
- Publikum, Astrolabium, Braziers und Ringarena bleiben projektspezifische
  animierte Bühnenelemente;
- Kampfbeats besitzen jetzt klar getrennte Antizipation, Projektilflug und
  Einschlagphase;
- Feuer, Gift und Guard behalten verschiedene Formen, Trails, Farben und
  Impact-Silhouetten;
- längere Standard-/Hero-Beats geben Projektil und Trefferreaktion genug Raum,
  ohne die deterministische Simulation zu verändern; 1×, 2× und 4× bleiben
  bedienbar.

### Mobile

Der Portrait-Zoom priorisiert nun Kessel, Werkbank und Slots statt die gesamte
Raumbreite mit großen Leerflächen zeigen zu wollen. Getestet wurden 1440×900,
844×390 und 390×844. Landscape und Portrait blieben touchbedienbar; im Browser-
Smoke-Test traten keine Lade- oder WebGL-Fehler auf.

## Kontrollierter A/B/C-Vergleich

Der Screenshotmodus ist absichtlich im Build erhalten:

- `?art=legacy` – bisheriger KayKit-/Original-GLB-Stand;
- `?art=ecosystem` – Quaternius-Umgebung und neutraler Donor-Kessel;
- Standard beziehungsweise `?art=golden` – harmonisierte Umgebung plus
  KesselKrawall-Charaktermodule.

| Kriterium | A Legacy | B Ecosystem | C Golden | Beobachtung |
|---|---:|---:|---:|---|
| visuelle Kohärenz | 6,0/10 | 7,6/10 | 8,4/10 | C besitzt eine erkennbare gemeinsame Holz-/Stein-/Metallsprache. |
| Charakter/Persönlichkeit | 7,2/10 | 3,0/10 | 8,6/10 | B beweist, dass ein unveränderter Packkessel nicht genügt; C gewinnt durch die modularen Gesichter und Accessoires. |
| Lesbarkeit | 7,4/10 | 7,8/10 | 8,4/10 | Silhouetten, Familienfarben und Interaktionsplätze bleiben klar. |
| Oberflächen/Polish | 5,8/10 | 7,5/10 | 8,0/10 | Normal-/Roughness-Texturen und warmes Licht bringen den größten Sprung. |
| Nähe zum Mockup | 4,8/10 | 6,5/10 | 7,5/10 | C erreicht die gewünschte Richtung, noch nicht deren vollständige Dichte und Bespoke-Qualität. |
| Asset-Demo-Risiko (niedrig ist gut) | 5,5/10 | 8,0/10 | 3,5/10 | Der reine Ecosystem-Pass ist zu generisch; Character Kit, Licht und Komposition senken das Risiko deutlich. |

## QA-Bildmatrix

- `docs/qa/phase-2/workshop-legacy.png`
- `docs/qa/phase-2/workshop-ecosystem.png`
- `docs/qa/phase-2/workshop-golden.png`
- `docs/qa/phase-2/workshop-mobile-portrait.png`
- `docs/qa/phase-2/fire-attack.png`
- `docs/qa/phase-2/combat-vfx.png`
- `docs/screenshots/workshop-mobile-landscape.png`
- `docs/screenshots/arena-moor-martha.png`

Die drei Dateien unter `docs/screenshots/` bilden weiterhin die maximal drei
README-Screenshots. Die größere Matrix dient ausschließlich der kontrollierten
Produktions-QA.

## Bewusst noch offen

1. **Mehr maßgeschneiderte Raumtiefe:** Workshop und Arena sind noch deutlich
   flacher als die Mockups. Nächster Architekturpass sollte Nischen, Treppen,
   echte Seitenwände und unterschiedliche Höhenebenen als eigene Komposition
   bauen, nicht nur mehr Props hinzufügen.
2. **Weitere Kesselbasen:** Der Construction-Kit-Proof nutzt einen Basiskörper.
   Für die geplanten Familien fehlen noch mindestens schwer/gerüstet,
   schmal/schief und elegant/mystisch.
3. **Individuelle Zutaten:** Chili, Schleimpilz und Runenschale besitzen Hero-
   GLBs; viele weitere Zutaten sind noch bewusst codebasierte Übergangsmodelle.
4. **Gegnerindividualisierung:** Spieler und Moor-Martha sind der eigentliche
   Golden Slice. Weitere Gegner verwenden den hochwertigen Donor, besitzen aber
   noch keine gleichwertigen Blender-Charaktermodule.
5. **Arena-Dais und Publikum:** Beide funktionieren, tragen aber stärker den
   früheren prozeduralen Stil als die neue Architektur.
6. **Fantasy-UI/3D-Verzahnung:** Das HUD ist funktional und thematisch, wirkt
   jedoch noch stärker wie eine Schicht über dem Diorama als in den Mockups.
7. **Texturkompression:** 512-PNG ist Pages- und mobile-tauglich getestet;
   KTX2/BasisU wäre der nächste sinnvolle Speicher-/Transferpass vor größerem
   Contentausbau.

## Quality Gates

- Blender 5.2 Import, Kit-Export und Größen-/Triangle-Audit: bestanden
- TypeScript strict: bestanden
- Vitest: 8 Dateien, 33 Tests bestanden
- Vite-Produktionsbuild: bestanden
- Desktop Shop → Kampf → Ergebnis → nächste Runde: bestanden
- Moor-Martha Runde 2 inklusive Sieg/Niederlage/Rückkehr: bestanden
- Mobile Landscape 844×390: bestanden
- Mobile Portrait 390×844: bestanden
- Browserkonsole: keine Laufzeitfehler; nur bekannte Three.js-Clock-
  Deprecation-Warnung
