# Phase 2 Lighting and Material Art Direction

Arbeitsbranch: `codex/environment-lighting-phase2`, Basis `ae4e37e`.
Die drei Looks sind Kandidaten zur visuellen Abnahme. Die Phase-1-Beleuchtung
bleibt Standard; `master` und GitHub Pages werden nicht verändert.

## Vergleich öffnen

- [HTML-Vergleich aller vier Looks](http://127.0.0.1:5173/docs/qa/environment-lighting/compare.html)
- [Referenz spielen](http://127.0.0.1:5173/?art=mockup&look=reference)
- [A Dark Fantasy spielen](http://127.0.0.1:5173/?art=mockup&look=dark)
- [B Warm Fantasy spielen](http://127.0.0.1:5173/?art=mockup&look=warm)
- [C Magical Fantasy spielen](http://127.0.0.1:5173/?art=mockup&look=magical)

Die Vergleichsseite bietet Werkbank, Zischbert und Moor-Martha jeweils für Desktop,
Mobile Landscape und Portrait. Vier Spalten erlauben den direkten Vergleich;
optional lassen sie sich als 2 × 2-Raster anordnen. Jedes Bild öffnet sich in
Originalgröße. Der eingeblendete North Star ist ausdrücklich eine Zielreferenz.
Die bestehende Spiel-UI wurde nicht um eine neue Auswahlleiste ergänzt.

## Analyse der Phase 1

Die flächige Aufhellung hatte mehrere gleichzeitig wirkende Quellen:

| Bestandteil | Phase 1 | Konsequenz für den Pass |
| --- | --- | --- |
| Ambient Light | Intensität 0,36 | Reduziert, damit schattige Bereiche unterscheidbar bleiben |
| Hemisphere Light | Intensität 0,95 | Stark zurückgenommen, kleine kühle Grundaufhellung bleibt |
| Directional Light | Intensität 2,8, warmer Farbton | Durch einen gerichteten Spot mit weicher Kante ersetzt |
| Zwei Point Lights | 7,5 und 4,2, große Reichweite | Als begrenzte Rück-/Seitenakzente neu positioniert |
| Room Environment | PMREM, Szene mit Intensität 1 | Bestehende Reflexion weiterverwendet, Intensität pro Look reduziert |
| Tone Mapping | ACES Filmic | Beibehalten, kein zusätzlicher Kontrastfilter |
| Exposure | 1,02 | In allen vier Varianten identisch; nicht als globale Verdunkelung benutzt |
| Schatten | Ein Licht, PCF, 1024² oder 512² | Ein Licht und dieselbe Auflösung bleiben erhalten |

Die Quelltexturen enthalten bereits aufgemalte Helligkeitsverläufe, Ritzen und
Glanzstellen. Mehr gleichmäßiges Umgebungslicht verwischt die Materialunterschiede;
zusätzliches künstliches AO würde diese vorhandene Schattierung dagegen verdoppeln.
Deshalb werden keine neuen AO- oder Normaltexturen erzeugt und keine gebackenen
Schatten durch weitere Texturkontraste verstärkt.

## Drei Lichtkonzepte

| Eigenschaft | A Dark Fantasy | B Warm Fantasy | C Magical Fantasy |
| --- | --- | --- | --- |
| Hauptlicht | Tieferes warmes Seitenlicht von links | Breiteres, helleres Warmlicht von links/vorn | Warmlicht von rechts/vorn |
| Ambient | 0,055 | 0,10 | 0,075 |
| Hemisphere | 0,18 | 0,32 | 0,25 |
| Environment | 0,20 | 0,34 | 0,27 |
| Hauptlichtintensität | 3,5 | 3,8 | 3,4 |
| Lokale Akzente | Bernstein und dezentes kühles Fülllicht | Kerzenwärme und zurückhaltender kühler Rand | Violett und Türkis, warmer Mittelpunkt |
| Absicht | Geheimnisvolle Tiefe, stärkere Seitenschatten | Lesbarkeit und Atmosphäre ausbalancieren | Alchemistische Farbkontraste, ohne alle Flächen einzufärben |

Der Spot bündelt das Licht auf den Spielbereich. Seine Intensität ist wegen des
anderen Lichttyps nicht numerisch als Helligkeitsfaktor gegenüber dem bisherigen
Directional Light zu lesen. `decay=0` ist eine bewusste stilisierte Bühnenlicht-
Entscheidung; die lokalen Point Lights behalten quadratische Entfernungsschwächung.
Die vorhandenen Wandkerzen erhalten mehr lokale Lichtwirkung, keine neuen
Schattenlichter. In der Arena sorgt der versetzte Rückakzent für Lesbarkeit des
Gegners; der Vordergrund behält einen eigenen dezenten Randakzent.

## Materialbehandlung

Alle Kandidaten teilen denselben Materialpass. So zeigt der A/B/C-Vergleich
tatsächlich unterschiedliche Lichtführung und nicht drei beliebige Texturfilter.

- **Holz:** warmer multiplikativer Farbwert `#dbb78e`, Roughness 0,76 und kleinere
  Environment-Reaktion. Die originale Maserung bleibt erhalten.
- **Stein:** zurückhaltender Farbwert `#d4cec4`, Roughness 0,94, Metalness 0 und
  reduzierte Environment-Reaktion. Die vorhandene Boden-Normal-/ORM-Textur bleibt aktiv.
- **Regale und Kleindekoration:** schwächere warme Tönung, keine künstliche
  Metallisierung des gesamten Atlasses.
- **Brasskin:** Roughness 0,46 statt etwa 0,52, Metalness bleibt 0,38. Die
  kontrollierte Environment-Reaktion erhält Reflexionen am Messing, ohne die
  bemalten Flächen durch stark erhöhte Metalness zu verfälschen.
- **Zischbert und Moor-Martha:** bestehende Metall-/Rauheitsunterschiede bleiben
  erhalten; nur die Environment-Reaktion wird abgestimmt. Mimik, Flüssigkeit,
  Emission und Animation bleiben unverändert.

Viele to3D-Assets nutzen einen einzigen Atlas für Holz, Wachs, Glas und Metall.
Ein globaler Metalness-Wert kann diese Teile nicht korrekt trennen. Die Kerzenhalter
werden deshalb nicht pauschal zu Metall erklärt. Wirklich getrennte Materialzonen
wären ein späterer Asset-Schritt, nicht Bestandteil dieser Phase.

Die Anpassung erfolgt nur an Laufzeitkopien. Texturen bleiben geteilt und
unverändert. Kurzlebige Materialkopien und die Environment-Renderressource werden
beim Abbau freigegeben; wiederverwendete ProductionAsset-Materialien bleiben wie
bisher im Asset-Cache, jetzt zusätzlich nach Look und Asset getrennt.
Die Varianten funktionieren ausschließlich mit der neuen `?art=mockup`-Komposition.
`composition=before`, Golden, Legacy und Ecosystem bleiben unbeeinflusst.

## Kritische Empfehlung

**B Warm Fantasy ist die bevorzugte Grundlage zur Abnahme, nicht die neue Vorgabe.**
Kessel, Zutaten, Regale und Boden bleiben gleichzeitig lesbar, während der Raum
nicht mehr gleichmäßig ausgewaschen wirkt. Die wärmeren Flächen und lokalen
Kerzeninseln kommen der Zielreferenz näher, ohne deren dunkle Randbereiche einfach
über das gesamte Spiel zu legen.

**A** erzeugt stärkere Dramatik. Sie bezahlt das mit dunkleren seitlichen
Kesselflächen und weniger sichtbarer Dekoration; dieser Trade-off ist insbesondere
auf kleinen oder schwach eingestellten Displays relevant. Dunkler bedeutet hier
nicht automatisch hochwertiger.

**C** setzt einen erkennbaren magischen Gegenpol zur Kerzenwärme. Das wirkt an der
Werkbank besonders deutlich; in den Arenen bleiben die Akzente absichtlich
zurückhaltender, damit die vorhandenen Feuer-/Giftfarben der Gegner lesbar bleiben.
Eine spätere gezielte Übernahme einzelner Akzente in B wäre denkbar, wird hier aber
nicht vorweggenommen.

### Weiterhin weit vom Mockup entfernt

Der Lichtpass verbessert Fokus, Wärme und die Trennung von Flächen. Er ersetzt
keine hochwertigen Zutaten, keine differenzierten Sockelmaterialien und keine
organischeren Kampf-VFX. Die regelmäßige Wandstruktur, die einfache Tür, die flachen
Portalformen und die uneinheitlichen Asset-Stile bleiben sichtbar. Auf Hochkant
bleiben außerdem die freien Wand-/Bodenflächen aus Phase 1 erhalten. An diesen
Punkten wurde bewusst weder Geometrie noch Kamera oder UI verändert.

## Prüfmethode

Der bestehende End-to-End-Test wurde um einen Lichtvergleich erweitert:
gleicher gespeicherter Lauf und RNG → Kauf mit Merge → Ladegate → beide Kämpfe →
Ergebnis → Rückkehr zur Werkbank. Auch die freigeschaltete Reserve wird bedient.
Kamera, HUD-Rechtecke, Original-Meshtopologie, DPR und Schattenauflösung werden
zwischen den Looks verglichen. Die Referenz wird zusätzlich gegen die gespeicherten
Kamera-, Licht- und Renderdaten aus Phase 1 geprüft.

Die Screenshots stammen aus dem Spiel, nicht aus ImageGen oder einem Offline-
Renderer. Kampfaufnahmen sind regulär pausiert. Idle-Bewegungen laufen weiter;
die Aufnahme wartet nach Möglichkeit auf geöffnete Augen. Keine Bildretusche.

Getestete Auflösungen: 1440 × 900, 844 × 390 und 390 × 844. Mobile verwendet die
mobilen LODs sowie Touch-/Viewport-Emulation auf diesem PC. Das ersetzt keinen
Test auf physischer Smartphone-Hardware.

Die Frame-Messung umfasst bis zu 120 rAF-Intervalle nach 20 Warm-up-Frames, sowohl
bei der Werkbank/pausierten Arena als auch im laufenden Kampf. Aktive Stichproben
enden vor dem Ergebnisbildschirm. Der bestehende Schattenpass wird vorübergehend
instrumentiert: Draw Calls, Dreiecke und CPU-Submission-Zeit, **keine GPU-Zeitmessung**.
Die Instrumentierung verändert weder Szene noch Anzahl der Renderdurchläufe und
wird anschließend entfernt. Diese kurzen Stichproben sind kein Worst-Case-Benchmark.

```powershell
npm test
npm run build
node scripts/test_mockup_assets.mjs
node scripts/qa_environment_composition.mjs http://127.0.0.1:5173/ docs/qa/environment-lighting --lighting
node scripts/render_lighting_comparison.mjs
```

## Ergebnisse vom 14. Oktober 2026

- **121 Unit-/Regressionstests in 22 Dateien bestanden**, darunter 14 neue
  Licht-/Materialtests. TypeScript und Produktionsbuild erfolgreich.
- **156 Assetprüfungen bestanden**: Originaldateien, Texturen und LODs unverändert.
- **72 End-to-End-Prüffälle, 27 Paarvergleiche und 36 echte Aufnahmen**, keine
  JavaScript-Laufzeitfehler. Kauf/Merge, Reserve, Ladegate, beide Gegner, Ergebnis
  und Rückkehr funktionieren in allen vier Looks und drei Bildschirmformaten.
- Referenzkamera, HUD, Topologie und Lichtkonfiguration stimmen mit Phase 1
  überein. Kein Eingriff in Spielregeln, Balance, Kamera oder Spiel-UI.
- Drei Desktop-Vergleichstafeln sind in der Haupt-README eingebettet; sechs weitere
  Tafeln und alle Einzelaufnahmen ergänzen die mobile Abnahme.
- Der Build meldet weiterhin den bestehenden großen Three.js-Chunk
  (770,32 kB minifiziert, 197,82 kB gzip). Kein Buildfehler, aber kein behobenes
  Download-/Startzeitbudget.

### Renderlast und Schatten

Desktop, identischer pausierter Spielzustand; Draw Calls/Dreiecke **einschließlich
des Schattenpasses**. Abweichungen entstehen durch den anderen Schatten-Lichtkegel,
nicht durch neue Meshes.

| Szene | Referenz | A Dark | B Warm / C Magical |
| --- | ---: | ---: | ---: |
| Werkbank | 173 / 468.118 | 172 / 462.131 | 173 / 468.118 |
| Zischbert | 430 / 763.462 | 429 / 757.475 | 431 / 766.450 |
| Moor-Martha | 463 / 772.246 | 462 / 766.259 | 464 / 775.234 |

In Mobile Portrait liegen B/C bei 174 / 261.628 (Werkbank), 406 / 412.254
(Zischbert) und 436 / 420.690 (Moor-Martha). Auch hier sind das höchstens ein
zusätzlicher Schatten-Draw gegenüber der Referenz. Die Geometrielast selbst bleibt
hoch; dieser Pass ist keine Geometrieoptimierung.

Die Lichtzahl bleibt gleich: 10 in der Werkbank, 15 bei Zischbert und 17 bei
Moor-Martha einschließlich vorhandener Trank-/Effektlichter. **Nur ein Licht wirft
Schatten**, weiterhin 1024² am Desktop und 512² mobil. Keine zusätzlichen
Postprocessing-Pässe. Der Schattenpass in Zischberts Desktop-Arena steigt von
77 auf 78 Draw Calls und von 231.751 auf 234.739 Dreiecke bei B/C; seine gemessene
CPU-Submission liegt typischerweise um 0,5 ms. Das ist keine GPU-Zeit.

### Offener Performance-Befund: erster aktiver Kampf

**Die ruhenden Szenen sind kein Beleg für durchgehend flüssigen Kampf.** In der
Hauptmatrix liegen die ruhenden Szenen im Mittel bei ungefähr 16,7 ms pro rAF-Frame
(ein Fall bei 17,1 ms). In einzelnen ersten Kämpfen treten dagegen lange Hänger
auf – ausdrücklich auch unter unveränderter Referenzbeleuchtung.

Ein gezielter separater Wiederholungslauf bestätigt das:

| Erster Zischbert-Kampf, Desktop | Referenz | B Warm |
| --- | ---: | ---: |
| Gemessene aktive Frames | 56 | 55 |
| Median | 16,7 ms | 16,7 ms |
| Mittelwert inklusive Hänger | 78,0 ms | 80,3 ms |
| Längstes Frameintervall | 3.399,9 ms | 3.466,5 ms |
| Registrierte Shaderprogramme, vorher → nachher | 48 → 72 | 48 → 72 |

Zusätzlich erfasst der Long-Task-Observer in beiden Fällen zwei Blockaden von
jeweils etwa 3,3–3,5 Sekunden. Er läuft bereits während der 20 Warm-up-Frames,
während diese Frames nicht in der rAF-Statistik enthalten sind. Deshalb können
Long-Task- und Frame-Maxima voneinander abweichen. Das Ergebnis ist kein Nachweis
einer regressionsfreien Kampf-Performance, trotz bestandener Funktionstests.

Der Anstieg der Shaderprogramme macht First-use-Kompilierung bzw. die
Material-/VFX-Initialisierung zu einem plausiblen Verdacht, **nicht zu einer
bewiesenen Ursache**. Ein gesonderter Performance-Schritt sollte einen Browser-
Trace auswerten und anschließend die tatsächlichen Kampfvarianten vor dem Start
vorbereiten. Keine Gameplay-/Ladegate-Änderung wurde in diesen Lichtpass eingeschoben.

Gemessen wurde in automatisiertem Chromium auf AMD Radeon(TM) Graphics über
ANGLE/D3D11, DPR 1, ohne CPU-Throttling. Eine belastbare Smartphone-Freigabe erfordert
weiterhin echte Geräte. Die zusätzliche Last des Lichtpasses ist klein; der
bestehende First-use-Hänger bleibt ausdrücklich offen.

Alle Rohmesswerte und Prüffälle: [report.json](report.json).
Zusätzliche Diagnose: [performance-followup/report.json](performance-followup/report.json).

```powershell
node scripts/qa_environment_composition.mjs http://127.0.0.1:5173/ docs/qa/environment-lighting/performance-followup --lighting --quick --measure-frames --looks=reference,warm
```

Die Phase endet nach Commit und Push auf dem Arbeitsbranch zur visuellen Abnahme.
