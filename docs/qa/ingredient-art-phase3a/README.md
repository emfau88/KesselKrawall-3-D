# Phase 3A Zutaten und Fantasy Podeste

Basis: GitHub `master` **4980b81**, einschließlich Phase 1 und Phase 2.
Arbeitsbranch: `codex/ingredient-art-phase3a`. Kein Merge, kein Pages-Release.

Warm Fantasy ist für `?art=mockup` als Standard übernommen. Die Lichtparameter
selbst sind unverändert. Der Assetpass ersetzt ausschließlich die Podeste sowie
Glut-Chili, Schleimpilz und Runenschale. Golden, Legacy und Ecosystem verwenden
weiterhin die bisherigen Zutaten und Podeste.

## Ansehen und vergleichen

- [Lokaler Vorher-Nachher-Vergleich](http://127.0.0.1:5173/docs/qa/ingredient-art-phase3a/compare.html)
- [Phase 3A spielen](http://127.0.0.1:5173/?art=mockup&ingredients=phase3a)
- [Alte Zutaten mit identischem Warm Fantasy spielen](http://127.0.0.1:5173/?art=mockup&look=warm&ingredients=before)
- Weitere Lichtvarianten: `look=reference`, `look=dark`, `look=magical`.
- Der globale Standard ohne `art=mockup` bleibt Golden. `composition=before`
  erhält ebenfalls die ältere Darstellung.

Die HTML-Seite zeigt Werkbank und beide ersten Gegner für Desktop und mobile
Formate, eine Nahaufnahme und die Stufen I–III. Die Haupt-README enthält drei
Vergleichstafeln. Alle Aufnahmen stammen aus dem Spiel. Der Detailausschnitt wurde
mit 2880 × 1800 und unveränderter Perspektive gerendert und direkt ausgeschnitten,
nicht nachträglich bemalt oder durch einen Blender-Render ersetzt.

## Gestaltung und Umsetzung

**Podeste:** abgestufter dunkler Basalt mit abgeschrägten Kanten und zurückgesetzter
Mitte, schmale Messingfassungen, acht geschmiedete Klammern, eingelassene Runen und
ein dezentes Mittelsiegel. Freie Plätze besitzen dieselbe ausgearbeitete Form.
Belegte Plätze färben nur die Runen nach Zutatenfamilie; Auswahl und Buff-Verbindungen
bleiben durch die vorhandenen Markierungen erkennbar. In der Arena bleiben die
echten Fortschrittsbögen, Bereitschaftspunkte und Aktivierungspulse erhalten.

**Glut-Chili:** sich verjüngende, leicht gelappte Schote mit eingerollter Spitze,
gebogenem Stiel, Kelchblättern und wenigen warmen Hautflecken. Die neue Oberfläche
ist rot und wachsartig statt einer gleichmäßig dicken, stark leuchtenden Röhre.

**Schleimpilz:** asymmetrischer glockenförmiger Hut, schiefer gefalteter Stiel,
Unterseitenlamellen, aufliegende Warzen, drei ungleich lange Schleimtropfen und
kleine Wurzelfalten. Matte, fleckige Hutoberfläche und etwas glatterer Schleim
trennen organische Substanz von Gift. Kein großflächiges Neonleuchten.

**Runenschale:** echte Innenwand und Wandstärke, unregelmäßige Bruchkante,
mineralische Einschlüsse, feine Risslinien und ein plastisch ausgearbeitetes,
zurückhaltend türkisfarbenes Schutzzeichen. Die helle Eiersilhouette bleibt erhalten.

Die [ursprünglichen 2D-Bilder](../../../art/source/ingredients-campaign-1/reference/manifest.json)
geben Silhouette und Charakter vor. Sie werden nicht als flache Ersatzmodelle
eingebaut. Alle neuen Meshes entstehen reproduzierbar in
[build_ingredient_phase3a.py](../../../art/blender/build_ingredient_phase3a.py).
Die ursprünglichen GLBs und Bilder werden nicht überschrieben. Es wurden keine
kostenpflichtigen Ressourcen oder externen Generierungsdienste verwendet.

### Materialien und technische Grenzen

Jeder Assettyp besitzt drei Materialzonen. Alle Zonen eines Assets teilen einen
512²-Farbatlas am Desktop bzw. 256² mobil und eine kleine 128²-Mikronormaltextur.
Der Farbatlas enthält geometrieabhängige Farbvariation und feine Oberflächenstruktur,
**kein gebackenes Licht, AO oder Schlagschatten**. Rauheit und Metallanteil bleiben
pro Zone getrennt; Messing wird nicht zusammen mit Stein oder organischem Material
metallisiert. Neue Texturen sind ausschließlich neue Projektdateien.

Die Blender-5.2-Ausgabe wurde ausdrücklich auf erhaltene Materialfarben geprüft.
Ein fehlerhafter Multi-Material-Export füllte zunächst sekundäre Vertexfarben weiß.
Die Pipeline exportiert deshalb ein zusammengefasstes Mesh pro Material und bäckt
die unbeleuchtete Oberflächenfarbe. Das fertige Asset bleibt bei drei Draw Calls,
nicht einem Draw Call pro Verzierung.

Die Runtime teilt Geometrien und Materialien zwischen Podesten. Nur die begrenzten
Runen-Zustände benötigen Materialvarianten. Die neuen Modelle hängen innerhalb der
bestehenden Zutaten-Animationsgruppen. Kauf-Flug, Landung, Merge, Squash/Stretch und
Kampfaktivierungen bleiben erhalten. Größere Stufen stehen durch einen skalierungs-
abhängigen Ruhepunkt weiterhin auf dem Podest; ihre Größensteigerung, Stufensteine
und HUD-Kennzeichnung bleiben sichtbar. Die beiden Upgrade-Ringe sind für diese
drei Zutaten schmaler und messingfarben, damit sie die Modellform nicht verdecken.

Keine Spielwerte, Zeitabläufe, Kampfsimulation, Kamera, Spiel-UI, Umgebungsmodelle
oder Lichtprofile wurden geändert. Die neuen LOD-Dateien werden lediglich in das
bestehende Asset-Ladegate aufgenommen. Keine zusätzlichen Schattenlichter oder
Postprocessing-Effekte. Die bereits vorhandenen Aktivierungs-/Stufenlichter bleiben.

## Assetbudget

| Asset | Vorher Dreiecke / Primitives | Desktop neu | Mobile neu |
| --- | ---: | ---: | ---: |
| Chili | 4.028 / 8 | 2.142 / 3 | 1.074 / 3 |
| Schleimpilz | 6.680 / 13 | 2.726 / 3 | 1.846 / 3 |
| Runenschale | 3.836 / 8 | 2.194 / 3 | 1.458 / 3 |
| Ein neues Podest | bisher pro Szene aus Grundkörpern | 1.642 / 3 | 1.258 / 3 |

Die drei Zutaten reduzieren ihre Summe von 14.544 auf 7.062 Dreiecke am Desktop
und 4.378 mobil. Gleichzeitig sind die neuen Podeste detaillierter. Entscheidend
ist daher die weiter unten dokumentierte Gesamtlast der tatsächlichen Spielszene,
nicht nur die Zutatenersparnis.

Alle vier neuen Dateien zusammen benötigen ungefähr 1,56 MiB Download am Desktop
oder 0,72 MiB mobil. Der geschätzte RGBA8-Texturbedarf einschließlich Mipmaps beträgt
5,67 MiB bzw. 1,67 MiB für den vollständigen Satz; vorher hatten diese drei Zutaten
keine Bildtexturen. Die Texturkosten sind der bewusst eingegangene Qualitätstausch.
Der Cache wird pro Asset genutzt, nicht für jeden Sockel erneut geladen.
Details und SHA-256-Werte: [assets.json](assets.json).

Zusätzlich archiviert `before/` den vor der Umsetzung aufgenommenen Warm-Fantasy-
Stand von `4980b81`. Die direkt nebeneinander gezeigten Bilder stammen aus dem
abschließenden kontrollierten `ingredients=before`/Nachher-Durchlauf. Frühe
Fehlversuche und Zwischenstände bleiben im ignorierten lokalen `iterations/`.

### Gemessene Szenenlast

Finaler Vergleich auf dem lokalen PC (AMD Radeon, Chromium/ANGLE), jeweils
derselbe Spielstand unter Warm Fantasy. Draw Calls und Dreiecke enthalten die
vorhandenen Schattenpässe. Die folgenden Werte gelten für die Aufnahmezustände,
nicht für ein maximales, mit Effekten gefülltes Kampfgeschehen.

| Szene / Format | Draw Calls vorher → nachher | Dreiecke vorher → nachher | Geometrie MiB vorher → nachher | Texturschätzung MiB vorher → nachher |
| --- | ---: | ---: | ---: | ---: |
| Werkbank Desktop | 173 → 146 | 468.118 → 467.222 | 11,07 → 10,99 | 109,33 → 115,00 |
| Zischbert Desktop | 431 → 326 | 766.450 → 773.794 | 12,49 → 12,27 | 96,00 → 101,67 |
| Moor-Martha Desktop | 464 → 349 | 775.234 → 778.442 | 12,56 → 12,34 | 96,00 → 101,67 |
| Werkbank Mobile Portrait | 174 → 147 | 261.628 → 251.524 | 6,25 → 6,07 | 109,33 → 111,00 |
| Werkbank Mobile Landscape | 175 → 148 | 264.458 → 254.354 | 6,25 → 6,07 | 109,33 → 111,00 |
| Zischbert Mobile Landscape | 423 → 318 | 430.300 → 422.460 | 7,22 → 6,89 | 96,00 → 97,67 |
| Moor-Martha Mobile Landscape | 453 → 338 | 438.736 → 427.136 | 7,28 → 6,95 | 96,00 → 97,67 |

Die zusätzlichen Podeste erhöhen die Desktop-Dreiecke im Zischbert-Kampf um
0,96 % und bei Moor-Martha um 0,41 %. Gleichzeitig sinken die Draw Calls dort um
24–25 %. Mobil sinken sowohl Draw Calls als auch Dreiecke. Die Gesamtgeometrielast
bleibt hoch; der Assetpass löst das übergeordnete Performanceproblem nicht allein.

Der bestehende Schattenpass benötigt am Desktop in der Werkbank 46 → 36,
bei Zischbert 78 → 73 und bei Moor-Martha 86 → 76 Draw Calls. Seine Dreiecke steigen
am Desktop leicht, mobil sinken sie. Die CPU-Übermittlung liegt in diesen kurzen
Stichproben bei ungefähr 0,5–0,9 ms; **keine GPU-Zeitmessung**.
Alle ruhenden Vorher-/Nachher-Szenen zeigen bei 120 rAF-Intervallen rund 60 Hz
und 16,7–16,8 ms p95. Daraus folgt weder ein belegter FPS-Gewinn noch eine
Freigabe für reale Smartphones oder den ersten aktiven Kampf.

## Prüfung

Der geprüfte Ablauf führt vom gespeicherten Shop-Lauf über Kauf und sichtbaren
Merge, Auswahl und Platztausch, Stufen I–III sowie aktive Synergien und Platzierungs-
Buffs in die Kämpfe gegen Zischbert und Moor-Martha, bis zum Ergebnis und zurück.
Es gibt keine Backend-/Account-Grenze: Das Spiel ist vollständig clientseitig;
geprüft werden DOM-Interaktionen, gespeicherter Spielzustand, Asset-Requests und
die tatsächliche Three.js-Szene. Test-Spielstände leben nur im isolierten Browser.

Die Vergleichsmatrix prüft identische Kamera, HUD-Rechtecke, RNG, Inventar,
Lichtparameter, Exposure und Schatteneinstellungen. Screenshots bei 1440 × 900,
390 × 844 und 844 × 390 verwenden denselben Pausenzustand. Idle-Bewegungen bleiben
aktiv; die Aufnahme wartet nach Möglichkeit auf offene Kesselaugen.

Die Speicherangaben unterscheiden Renderer-Zähler von Schätzungen sichtbarer
Geometriearrays und Texturen. Sie sind keine gemessene VRAM-Belegung und enthalten
weder Treiberkopien noch alle Cache-, Render-Target- oder Morph-Daten. Framezeiten
sind kurze rAF-Stichproben ruhender Szenen auf dem PC. Physische Smartphone-Hardware
wurde nicht geprüft. Die dokumentierten Erstkampf-Hänger bleiben separat offen.

Finaler Stand: **139 Tests in 23 Dateien bestanden**, Typecheck und Produktionsbuild
erfolgreich. Der Build meldet weiterhin den bekannten großen Three.js-Chunk
(770,32 kB, Warnschwelle 750 kB); kein Buildfehler.
Die vollständige Ingame-Matrix besteht **42 Prüffälle**, 18 Hauptaufnahmen und
9 identische Kamera-/HUD-/Licht-Vergleichspaare ohne Laufzeitfehler.
Dazu kommen sechs Stufenaufnahmen und zwei echte Nahaufnahmen.
Die Einzelbelege stehen in [report.json](report.json).

Zusätzlich wurden **acht Varianten im Produktionsbuild** auf Port 5176 geprüft:
Golden, Legacy, Ecosystem, Mockup-Standard, Reference, Dark, Magical und die alten
Zutaten unter Warm Fantasy. Kauf, Merge und normaler Kampfstart bestehen in allen
acht Fällen, ohne Grafik-Fallback und ohne Laufzeitfehler. Im Mockup-Standard ist
zusätzlich der native Tausch zweier belegter Plätze über ihre 3D-Hitflächen geprüft.
Beleg: [variants-production.json](variants-production.json).

Die ersten Zusatzläufe mit abweichenden Chromium-Standardeinstellungen erreichten
Ladegate-/Kauf-Timeouts; der vorhandene reduzierte Grafikstart war bedienbar.
Der finale Produktionslauf verwendet dieselbe Direct3D11-/No-Proxy-Konfiguration
wie die Haupt-QA und besteht vollständig. Das ist keine Behebung oder allgemeine
Entwarnung für das separate First-use-Problem; Anwendung und Kampfsystem wurden
wegen dieser Testläufe nicht verändert.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/blender/build_ingredient_phase3a.py
npm test
npm run typecheck
npm run build
node scripts/audit_ingredient_assets.mjs
node scripts/qa_environment_composition.mjs http://127.0.0.1:5173/ docs/qa/ingredient-art-phase3a --ingredient-art
node scripts/qa_ingredient_variants.mjs http://127.0.0.1:5176/ --production
node scripts/render_ingredient_comparison.mjs
```

## Kritische visuelle Abnahme

Die deutlichste Verbesserung ist das Ensemble: Die dunklen Steinflächen und
Messingkanten konkurrieren weniger mit Brasskin. Die drei Zutaten sind als rote
Schote, grüner Pilz und helle Schale sofort voneinander unterscheidbar. In der
Nahaufnahme besitzen sie jetzt räumliche Bruchkanten, Tropfen, Lamellen und
Oberflächenvariation statt ausschließlich glatter Grundformen.

Das erreicht **noch nicht Brasskins handgemalt wirkende Detailqualität**. Die
Oberflächenvariation ist teilweise gleichmäßig prozedural; individuelle malerische
Abriebspuren fehlen. Die Risslinien der Schale können aus der Nähe noch aufgesetzt
wirken. Die identischen Podeste sind bewusst wiederverwendbar und entsprechend
regelmäßig. Auf Mobile und bei den kleineren Gegnerzutaten verschwinden feine
Runen und Lamellen; dort tragen Silhouette und Farbe die Erkennung.

Die bestehenden schwebenden Stufensteine bleiben funktional deutlich, passen
stilistisch aber noch nicht vollständig zu den neuen Materialoberflächen. Die
unveränderten Zutatenporträts im Shop und die übrigen 17 Zutaten zeigen weiterhin
die bisherige Gestaltung. Umgebung, VFX, Erstkampf-Hänger und das vollständige
North-Star-Matching sind nicht Gegenstand dieser Abnahme.

Nach Commit und Push endet Phase 3A zur visuellen Abnahme. Weitere Zutaten oder
Umgebungs-Assets werden erst nach Freigabe überarbeitet.
