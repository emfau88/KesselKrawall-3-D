# Rendering- und Art-Direction-Rework — Master-Roadmap

Stand: 14. September 2026
Ausgangsstand: `a640541` (`Add main menu game shell`)

## Zielentscheidung

KesselKrawall 3D wird zuerst im vorhandenen Stack aus React, React Three Fiber
und Three.js visuell neu kalibriert. Der renderer-neutrale Core, Gameplay,
Content, UI-Flows und Speicherstände bleiben unverändert.

PlayCanvas ist kein beschlossener Engine-Wechsel. Es bleibt ein isolierter,
zeitlich begrenzter Bakeoff, der nur gestartet wird, wenn die R3F-Gates zeigen,
dass der bestehende Authoring-Workflow die visuelle Iteration weiterhin
wesentlich behindert.

Die Leitfrage lautet:

> Welche wenigen Änderungen erhöhen Tiefe, Materialqualität, visuelle
> Hierarchie und Kohärenz am stärksten?

## Verbindliche Leitplanken

- [ ] Keine Änderung an Kampfregeln, Balance oder deterministischer Simulation.
- [ ] Keine neuen Gegner, Kampagnen oder Arenen während des Golden-Scene-Reworks.
- [ ] Keine vollständige UI-Neugestaltung.
- [ ] Kein Big-Bang-Refactor und kein Rewrite auf Vanilla Three.js.
- [ ] Orthographic Camera bleibt bis zum bestandenen Kamera-Gate verfügbar.
- [ ] Mobile Portrait und Landscape sind bei jedem visuellen Gate Pflicht.
- [ ] Neue Effekte erhalten immer eine günstigere Mobile-Ausprägung.
- [ ] Assets werden erst nach bestandener visueller Freigabe optimiert.
- [ ] Jede Phase endet mit Screenshots, Messwerten und einer dokumentierten
      Go-/Rework-/Stop-Entscheidung.
- [ ] Keine vollständige PlayCanvas-Migration ohne bestandenen Golden-Slice-
      Bakeoff und ausdrückliche Freigabe.

## Zielbild und Golden Scene

Der Workshop ist die verbindliche Golden Scene. Er muss gleichzeitig beweisen:

- [ ] Spieler-Kessel ist der klare Hero-Fokus.
- [ ] Werkbank und fünf Zutatenplätze sind räumlich sofort verständlich.
- [ ] Holz, Stein, Eisen, Messing, Keramik, Glas und Magie unterscheiden sich
      durch ihre Lichtantwort und nicht nur durch Farbe.
- [ ] Kessel, Zutaten und Props wirken fest auf ihren Flächen verankert.
- [ ] KayKit, Quaternius, eigene GLBs und Runtime-Geometrie wirken wie Teile
      derselben stilisierten Fantasy-Welt.
- [ ] Magische Elemente leuchten gezielt; die Szene wirkt weder flach noch neon.
- [ ] Shop und HUD unterstützen die Bühne, ohne sie zu verdecken.
- [ ] Dieselbe Art Direction bleibt auf Desktop und Mobile erkennbar.

## Pflicht-Viewports

| Viewport  | Rolle             | Muss geprüft werden                                 |
| --------- | ----------------- | --------------------------------------------------- |
| 1920×1080 | großer Desktop    | Gesamtkomposition, Material- und Lichtqualität      |
| 1280×720  | Laptop/Referenz   | primärer Golden-Screenshot, vollständiger Spielraum |
| 915×412   | Mobile Landscape  | Safe Areas, Bühne und Shopband                      |
| 844×390   | kleines Landscape | Touchziele und minimale vertikale Fläche            |
| 390×844   | Mobile Portrait   | eigenes Framing, fünf Slots und Shopfluss           |

Optional bleibt 800×450 als Embedded-Smoke-Test erhalten.

## Bewertungsmatrix

Jede Variante erhält pro Pflicht-Viewport 1 bis 5 Punkte. Die Entscheidung wird
nicht allein nach persönlichem Geschmack getroffen.

| Kriterium                               | Gewicht | Mindestziel |
| --------------------------------------- | ------: | ----------: |
| Hero-Fokus und Silhouette               |    20 % |         4/5 |
| räumliche Tiefe und Größenstaffelung    |    15 % |         4/5 |
| Lesbarkeit von Kessel und fünf Slots    |    15 % |         4/5 |
| Materialtrennung und Oberflächenwirkung |    15 % |         4/5 |
| Lichtführung und Kontrast               |    15 % |         4/5 |
| gemeinsame Asset-Sprache                |    10 % |         4/5 |
| UI-/Mobile-Lesbarkeit                   |    10 % |         4/5 |

Eine neue Variante gewinnt nur, wenn:

- [ ] ihr gewichteter Gesamtscore mindestens 10 % über der Baseline liegt,
- [ ] kein Pflicht-Viewport unter 3/5 fällt,
- [ ] keine zentrale Interaktion verdeckt oder abgeschnitten wird,
- [ ] das Performance-Budget eingehalten wird,
- [ ] mindestens zwei direkte A/B-Screenshots den Gewinn nachvollziehbar zeigen.

---

# Track A — Verbindlicher R3F-/Three.js-Rework

## Bulk R0 — Projektgrenzen und Messsystem

**Zweck:** Vergleichbarkeit schaffen, bevor sich das Bild verändert.
**Größe:** S
**Abhängigkeit:** keine

### Aufgaben

- [ ] Eigenen Arbeitsbranch für den Rendering-Rework anlegen.
- [ ] Aktuellen Commit, Browser, GPU/Renderer, Betriebssystem und Datum im
      Baseline-Bericht festhalten.
- [ ] Aktuelle Query-Modi `legacy`, `ecosystem` und `golden` verifizieren.
- [ ] Einen stabilen Seed und einen reproduzierbaren Workshop-Zustand mit drei
      Referenzzutaten definieren.
- [ ] Einen reproduzierbaren Arena-Zustand gegen Moor-Martha definieren.
- [ ] Screenshot-Verzeichnis `docs/qa/rendering-rework/` strukturieren.
- [ ] Einheitliche Dateinamen für Phase, Kamera, Viewport und Variante festlegen.
- [ ] Messung für First Meaningful 3D Frame, mittlere Frame-Time, P95-Frame-Time,
      Drawcalls, Triangles, sichtbare Lichter und Texturspeicher vorbereiten.
- [ ] Browser-Konsole und fehlgeschlagene Asset-Requests mitprotokollieren.
- [ ] Bestehende Tests, Typecheck und Build als unveränderte Baseline ausführen.

### Abnahmeartefakte

- [ ] `docs/qa/rendering-rework/BASELINE.md`
- [ ] Workshop- und Arena-Screenshots in allen fünf Pflicht-Viewports
- [ ] Baseline-Metriktabelle
- [ ] Liste aktueller Rendering-Schalter und Rückfallpfade

### Gate R0

- [ ] Jeder Screenshot ist mit demselben State reproduzierbar.
- [ ] Der Baseline-Build ist grün.
- [ ] Es existiert ein klarer Rückweg zum Ausgangsstand.

**Empfohlener Commit:** `Document rendering rework baseline`

---

## Bulk R1 — Camera Bakeoff und Komposition

**Zweck:** Den größten visuellen Hebel isoliert bewerten.
**Größe:** M
**Abhängigkeit:** R0

### Technischer Zuschnitt

- [ ] Kamera-Presets aus `FixedCamera.tsx` in eine eigene Verantwortlichkeit
      überführen, ohne alle Szenen gleichzeitig umzubauen.
- [ ] Reproduzierbaren Schalter für `ortho` und `perspective` anbieten.
- [ ] Eigene Presets für Workshop Desktop, Landscape und Portrait definieren.
- [ ] Eigene Presets für Arena Desktop, Landscape und Portrait vorbereiten,
      aber Arena in diesem Bulk noch nicht grundlegend umkomponieren.
- [ ] Perspective mit längerer Brennweite starten; extremes Weitwinkel vermeiden.
- [ ] Kamera-Ziel, Kesselgröße, Tischhorizont und negativen Raum bewusst festlegen.
- [ ] HUD-Safe-Areas in die Presetwahl einbeziehen.
- [ ] Fünf Slots, Zutatenflug und Auswahl-Popover in beiden Projektionen prüfen.

### Visuelle Varianten

- [ ] Orthographic Baseline aufnehmen.
- [ ] Perspective A: ungefähr 35–40° FOV testen.
- [ ] Perspective B: ungefähr 40–45° FOV testen.
- [ ] Optional eine leicht frontalere Tischkomposition testen.
- [ ] Je Variante alle fünf Pflicht-Viewports erfassen.

### Gate R1 — bewusste Kameraentscheidung

- [ ] Bewertungsmatrix vollständig ausfüllen.
- [ ] Perspective nur übernehmen, wenn sie die Baseline messbar schlägt.
- [ ] Entscheidung einschließlich verworfener Varianten dokumentieren.
- [ ] Gewählte Kamera bleibt ohne Maus-Orbit und ohne Layoutsprünge stabil.
- [ ] Orthographic-Fallback erst nach der Freigabe als Debugmodus einordnen.

**Empfohlener Commit:** `Add reproducible camera composition bakeoff`

---

## Bulk R2 — Lighting Rebuild

**Zweck:** Form, Blickführung und Tiefe mit wenigen kontrollierbaren Quellen
herstellen.
**Größe:** M–L
**Abhängigkeit:** freigegebene Kamera aus R1

### Audit

- [ ] Alle globalen, lokalen, praktischen und VFX-Lichter inventarisieren.
- [ ] Pro Licht Zweck, Reichweite, Intensität, Schattenkosten und Besitzer
      dokumentieren.
- [ ] Dauerhafte Scene Lights von kurzlebigen Effektlichtern trennen.
- [ ] Lichter ohne klaren visuellen Zweck markieren und testweise deaktivieren.

### Neues Workshop-Rig

- [ ] Ein warmes, großes Key Light definieren.
- [ ] Ein weiches Fill Light für kontrollierte Schattenzeichnung definieren.
- [ ] Ein sparsames Rim/Back Light für die Kesselsilhouette definieren.
- [ ] Nur tatsächlich sichtbaren Kerzen/Feuerstellen Practical Lights geben.
- [ ] Magische Point Lights auf kurze Reichweite und klare Ereignisse begrenzen.
- [ ] Schattenkamera und Shadow Bias auf die Golden Scene kalibrieren.
- [ ] Lichtgruppen so strukturieren, dass Mobile Quellen reduzieren kann.

### Gate R2

- [ ] Hero-Kessel ist heller und kontrastreicher als Nebenprops.
- [ ] Schatten besitzen Zeichnung, ohne wichtige Zutaten zu verschlucken.
- [ ] Kein großflächiger Orange-/Grün-/Violett-Farbstich dominiert die Szene.
- [ ] Die Zahl permanent aktiver dynamischer Lichter ist deutlich reduziert.
- [ ] Desktop und Mobile zeigen dieselbe Lichtdramaturgie.

**Empfohlener Commit:** `Rebuild workshop lighting hierarchy`

---

## Bulk R3 — Farbmanagement, Environment und IBL

**Zweck:** PBR-Materialien erhalten eine gemeinsame indirekte Lichtwelt.
**Größe:** M
**Abhängigkeit:** R2

### Aufgaben

- [ ] Aktuellen Color-Space-, Tone-Mapping- und Exposure-Pfad dokumentieren.
- [ ] Neutrales `RoomEnvironment`/PMREM-Profil als Kontrollvariante testen.
- [ ] Warmes, nicht sichtbares Alchemy-Environment als zweite Variante testen.
- [ ] Environment-Intensität zunächst an Eisen, Messing, Glas und Flüssigkeit
      kalibrieren.
- [ ] Direkte Lichtintensitäten nach Einführung von IBL neu ausbalancieren.
- [ ] Prüfen, ob authored Materialien korrekte Color-Space-Metadaten besitzen.
- [ ] Environment-Qualität in das Runtime-Profil aufnehmen.

### Gate R3

- [ ] Runde Kesselformen sind auch außerhalb direkter Highlights lesbar.
- [ ] Metall, Holz und Keramik reagieren sichtbar unterschiedlich.
- [ ] Schwarzes Eisen säuft nicht ab und wirkt nicht grau-plastisch.
- [ ] Die Szene wird nicht durch allgemeine Environment-Helligkeit flach.
- [ ] Mobile kann eine günstigere Environment-Auflösung verwenden.

**Empfohlener Commit:** `Add calibrated environment lighting`

---

## Bulk R4 — Zentrale Materialsprache

**Zweck:** Die unterschiedlichen Asset-Quellen zu einer Welt verbinden.
**Größe:** L
**Abhängigkeit:** R3

### Materialpolicy

- [ ] Gemeinsame Parameterbereiche für Roughness, Metalness, Sättigung,
      Emissive und Environment-Intensität festlegen.
- [ ] Zielmaterialien definieren: Dark Iron, Aged Iron, Aged Brass, Warm Wood,
      Dark Wood, Fantasy Stone, Ceramic, Parchment, Glass, Magic Liquid und Crystal.
- [ ] Regeln für Texturauflösung, Texeldichte und Farbraum dokumentieren.
- [ ] Festlegen, wann authored Materialien erhalten, angepasst oder vollständig
      ersetzt werden.
- [ ] Materialinstanzen cachen und unnötige Duplikate verhindern.

### Reihenfolge

- [ ] Spieler-Kessel normalisieren.
- [ ] Hero-Workbench normalisieren.
- [ ] Arena-Dais normalisieren.
- [ ] Große Architekturflächen normalisieren.
- [ ] Große, bildprägende Props normalisieren.
- [ ] Kleine Props nur bei sichtbarer Inkohärenz anfassen.

### Gate R4

- [ ] Asset-Quellen sind im Golden Screenshot nicht mehr offensichtlich trennbar.
- [ ] Gemeinsame Materialien bleiben stilisiert und nicht fotorealistisch.
- [ ] Familienfarben bleiben Akzente statt kompletter Materialwelten.
- [ ] Drawcalls und Materialanzahl steigen nicht unkontrolliert.
- [ ] Materialpolicy ist für weitere Arenen wiederverwendbar.

**Empfohlener Commit:** `Unify golden scene material language`

---

## Decision Gate D1 — R3F fortsetzen oder PlayCanvas testen

Nach R4 wird nicht automatisch weitergebaut.

### R3F direkt fortsetzen, wenn

- [ ] der Golden-Screenshot gegenüber R0 klar professioneller wirkt,
- [ ] mindestens 4/5 bei Kamera, Licht und Materialwirkung erreicht werden,
- [ ] Kamera-/Licht-/Materialiteration reproduzierbar genug ist,
- [ ] Mobile innerhalb des Performance-Budgets bleibt.

### PlayCanvas-Bakeoff auslösen, wenn mindestens einer dieser Punkte zutrifft

- [ ] visuelle Parameter lassen sich nur mit unverhältnismäßig vielen
      Code-/Screenshot-Schleifen einstellen,
- [ ] Scene Composition bleibt ohne visuellen Editor schwer kontrollierbar,
- [ ] Materialien und Asset-Kalibrierung verursachen weiterhin hohe Reibung,
- [ ] die Qualität steigt, erreicht aber trotz sauberer Basis nicht den
      vereinbarten Mindestscore,
- [ ] der Nutzer möchte den Authoring-Workflow ausdrücklich vergleichen.

### Entscheidung dokumentieren

- [ ] `docs/qa/rendering-rework/DECISION_D1.md` erstellen.
- [ ] R0- und R4-Screenshots direkt gegenüberstellen.
- [ ] Aufwand, Iterationszahl, offene Grenzen und Empfehlung festhalten.

---

## Bulk R5 — Grounding, Contact Shadows und AO-Bakeoff

**Zweck:** Gewicht und Kontakt herstellen, ohne die Szene zuzuschmutzen.
**Größe:** M
**Abhängigkeit:** R4 beziehungsweise abgeschlossenes D1

- [ ] Bestehende Echtzeitschatten auf Kessel, Workbench, Dais und Zutaten prüfen.
- [ ] Einfache Contact-Shadow-/Blob-Shadow-Variante als günstige Baseline testen.
- [ ] Hochwertigere Contact-Shadow-Lösung auf Desktop testen.
- [ ] SSAO/GTAO nur als eigene A/B-Variante evaluieren.
- [ ] AO-Radius und Intensität auf Fugen und Objektkontakte begrenzen.
- [ ] Haloing, Flimmern und dunkle Ränder an transparenten Objekten prüfen.
- [ ] Mobile standardmäßig ohne teures AO testen.

### Gate R5

- [ ] Kein wichtiger Gegenstand wirkt schwebend.
- [ ] Kontaktwirkung ist auch ohne AO überzeugend.
- [ ] AO wird nur übernommen, wenn der Gewinn den Frame-Time-Preis rechtfertigt.

**Empfohlener Commit:** `Improve object grounding and contact shadows`

---

## Bulk R6 — Hero-Asset-Entscheidung und drei Referenzzutaten

**Zweck:** Erst nach fairer Darstellung entscheiden, was wirklich neu gebaut
werden muss.
**Größe:** M bis XL, abhängig vom Gate
**Abhängigkeit:** R5

### Spieler-Kessel

- [ ] Bestehenden Kessel unter finaler Kamera, Licht, IBL und Materialpolicy
      erneut bewerten.
- [ ] Silhouette, Rand, Gesicht, Griffe, Beine, Flüssigkeit und Mobile-Lesbarkeit
      einzeln bewerten.
- [ ] Entscheidung treffen: behalten, gezielt überarbeiten oder neu bauen.
- [ ] Bei Neubau vor Blender-Arbeit ein Turnaround mit Front, Seite, Rückseite
      und 3/4-Ansicht freigeben.
- [ ] Preview-Render vor GLB-Integration abnehmen.

### Referenzzutaten

- [ ] Glut-Chili als Feuer-Referenz überarbeiten.
- [ ] Schleimpilz als Gift-Referenz überarbeiten.
- [ ] Runenschale als Schutz-Referenz überarbeiten.
- [ ] Level I, II und III durch Silhouette, Größe und Formdetail unterscheiden.
- [ ] Materialien an die zentrale Policy anbinden.
- [ ] Lesbarkeit in realer Mobile-Spielgröße prüfen.

### Gate R6

- [ ] Kessel ist ohne UI eindeutig der Spieler-Hero.
- [ ] Alle drei Zutaten sind ohne Farbe oder Text voneinander unterscheidbar.
- [ ] Level II und III wirken wie tatsächliche Aufwertungen.
- [ ] Kein Ausbau der übrigen 17 Zutaten vor dieser Freigabe.

**Empfohlene Commits:** ein Commit für Kesselentscheidung, ein Commit für die
drei Zutaten.

---

## Bulk R7 — Surface Variation und kontrolliertes Finish

**Zweck:** Plastik-/Primitive-Wirkung reduzieren, ohne Detailrauschen.
**Größe:** M
**Abhängigkeit:** R6

- [ ] Subtile Holzfarb- und Roughness-Variation hinzufügen.
- [ ] Steinflächen mit zurückhaltender Fugen-/Roughness-Variation versehen.
- [ ] Messing und Eisen kontrolliert altern, ohne Fotorealismus anzustreben.
- [ ] Wiederholungsmuster und offensichtliche Atlasgrenzen prüfen.
- [ ] Dezentes HDR-Bloom nur für Werte oberhalb der Magie-Schwelle testen.
- [ ] Minimale Vignette oder Color-Grading nur als A/B-Variante testen.
- [ ] Film Grain, Chromatic Aberration, Lens Distortion und Gameplay-DoF
      ausgeschlossen lassen.

### Gate R7

- [ ] Oberflächen sind reicher, aber die großen Formen bleiben dominant.
- [ ] Nichtmagische helle Flächen lösen kein sichtbares Bloom aus.
- [ ] UI und Zutaten bleiben scharf und kontrastreich.

**Empfohlener Commit:** `Polish golden scene surfaces and highlights`

---

## Bulk R8 — Mobile- und Performance-Härtung

**Zweck:** Die neue Art Direction skalierbar und stabil ausliefern.
**Größe:** M–L
**Abhängigkeit:** R7

### Qualitätsprofile

- [ ] Runtime-Profil um Environment, Contact Shadows/AO, Bloom, dynamische
      Lichter und dekorative Partikel erweitern.
- [ ] Desktop-Profil für Qualität kalibrieren.
- [ ] Mobile-Profil für thermische Stabilität und geringe Speicherlast
      kalibrieren.
- [ ] Optional ein Fallback-Profil für schwache oder problematische Geräte
      definieren.
- [ ] Profilwahl nachvollziehbar debugbar machen.

### Performance

- [ ] First Meaningful 3D Frame gegen R0 vergleichen.
- [ ] Durchschnitt und P95-Frame-Time in allen Pflicht-Viewports erfassen.
- [ ] Drawcalls, sichtbare Lichter, Schatten-Caster und Materialanzahl vergleichen.
- [ ] GPU- und Speicherkosten von AO/Bloom/Environment getrennt messen.
- [ ] Keine Qualitätsentscheidung allein auf Desktop-FPS stützen.
- [ ] Mindestens einen physischen iOS- und Android-Smoke-Test durchführen.
- [ ] Audio-Unlock, Browserleisten und Safe Areas auf Geräten prüfen.

### Gate R8

- [ ] Desktop-Ziel: stabile 60 FPS auf Referenzhardware im Workshop.
- [ ] Mobile-Ziel: stabile 30 FPS als harte Untergrenze, 45–60 FPS bevorzugt.
- [ ] Keine wiederkehrenden P95-Spikes über 33 ms im statischen Workshop.
- [ ] Keine zentrale visuelle Funktion fällt im Mobile-Profil weg.
- [ ] Gameplay-Smoke-Test Shop → Kauf → Merge → Kampf → Ergebnis bleibt grün.

**Empfohlener Commit:** `Scale rendering rework across device profiles`

---

## Bulk R9 — Arena-Transfer und Gegneridentität

**Zweck:** Die bewiesene Golden-Scene-Sprache auf den Kampf übertragen.
**Größe:** L
**Abhängigkeit:** vollständig bestandenes R8

- [ ] Gewählte Kamera- und Materialprinzipien auf die Arena übertragen.
- [ ] Gemeinsames Arena-Key/Fill/Rim-System definieren.
- [ ] Spieler- und Gegnerkessel gleichwertig ausleuchten.
- [ ] Negativen Raum für Projektile bewahren.
- [ ] Gegneridentität primär über Regalia, Banner, Props und VFX erzeugen.
- [ ] Großflächige Gegner-Farbtönungen reduzieren.
- [ ] Moor-Martha als erster Golden Encounter abnehmen.
- [ ] Erst danach die übrigen sieben Gegner einzeln migrieren.
- [ ] Pro Gegner dieselbe Screenshot- und Performanceprüfung durchführen.

### Gate R9

- [ ] Gegnerkessel liegt nicht im Schatten.
- [ ] Projektilbahn und Treffer bleiben gegen Environment und Bloom lesbar.
- [ ] Arena und Workshop wirken wie Orte derselben Spielwelt.
- [ ] Gegner sind charakteristisch, ohne acht vollständig getrennte Lichtwelten.

**Empfohlene Commits:** Moor-Martha separat; weitere Gegner in kleinen Gruppen.

---

## Bulk R10 — Asset-Optimierung, Dokumentation und Release

**Zweck:** Nur freigegebene Qualität produktionsreif ausliefern.
**Größe:** M
**Abhängigkeit:** R9

- [ ] Ungenutzte Nodes, Materialien und Texturen aus finalen GLBs entfernen.
- [ ] Mesh-Optimierung nach visueller Vergleichsprüfung anwenden.
- [ ] Texturgrößen anhand tatsächlicher Bildschirmfläche reduzieren.
- [ ] KTX2/Basis nur nach Browser- und Qualitätsbakeoff einführen.
- [ ] Asset-Readiness-Gate mit neuen Environment-/Postprocessing-Ressourcen
      aktualisieren.
- [ ] Lizenzregister für alle neuen oder veränderten Assets prüfen.
- [ ] `ART_DIRECTION.md`, `PRODUCTION_ART_REVIEW.md` und
      `MOBILE_AND_PERFORMANCE_QA.md` aktualisieren.
- [ ] Maximal drei repräsentative README-Screenshots aktualisieren.
- [ ] Typecheck, Unit-/Integrationstests, Produktionsbuild und Browsermatrix
      vollständig ausführen.
- [ ] GitHub Pages veröffentlichen und Live-Build prüfen.
- [ ] Vorher-/Nachher-Bericht mit Messwerten und bewussten Restpunkten erstellen.

### Definition of Done

- [ ] Golden Scene wirkt wie ein bewusst produziertes stilisiertes 3D-Spiel.
- [ ] Gewählte Kameraprojektion ist dokumentiert und reproduzierbar.
- [ ] Workshop und Arena besitzen kontrollierte Lichtsysteme.
- [ ] Environment und zentrale Materialpolicy sind produktiv.
- [ ] Hero-Kessel, Werkbank und Umgebung wirken kohärent.
- [ ] Grounding und Postprocessing sind bewusst entschieden.
- [ ] Desktop, Mobile Landscape und Mobile Portrait sind bestanden.
- [ ] Gameplay ist funktional unverändert.
- [ ] Öffentliche Live-Version und Dokumentation entsprechen demselben Commit.

---

# Track B — Optionaler codebasierter PlayCanvas-Bakeoff

Der optionale Track verwendet ein isoliertes `@playcanvas/react`-Unterpackage im
selben Repository. Er benötigt weder PlayCanvas Editor noch MCP und verändert
den produktiven R3F-Einstieg nicht. Die direkte PlayCanvas Engine-API bleibt für
eng begrenzte Renderingaufgaben wie `CameraFrame`, Profiling und Environment-
Konfiguration erreichbar.

Die vollständige, bulkweise Umsetzungsplanung steht in:

- [Codebasierter PlayCanvas-Bakeoff — Umsetzungsplan](PLAYCANVAS_CODE_BAKEOFF_PLAN.md)

Seine verbindliche Reihenfolge lautet:

1. `PC-C0` — Baseline und Isolationsvertrag
2. `PC-C1` — eigenständiges PlayCanvas-React-Unterpackage
3. `PC-C2` — gemeinsame Assetkalibrierung
4. `PC-C3` — responsive Perspective Camera
5. `PC-C4` — Lighting, Environment und Farbmanagement
6. `PC-C5` — gemeinsame Materialsprache
7. `PC-C6` — Grounding und Postprocessing
8. `PC-D1` — Rendering-Gate und Stop-/Go-Entscheidung
9. `PC-C7` — Core-Adapter, nur nach GO
10. `PC-C8` — minimaler Kauf-/Merge-Loop
11. `PC-C9` — Preview und endgültiger Go-/No-Go-Bericht

Ein vollständiger Kampf, Moor-Martha und weitere Arenen gehören ausdrücklich
nicht in den ersten Rendering Proof. Der Core wird erst nach bestandenem
Rendering-Gate eingebunden.

---

# Empfohlene Ausführungsreihenfolge

```text
R0 Baseline
  ↓
R1 Camera Bakeoff
  ↓
R2 Lighting
  ↓
R3 Environment / IBL
  ↓
R4 Material Unification
  ↓
Decision Gate D1
  ├─ R3F ausreichend und effizient → R5 bis R10
  └─ Nutzer startet Bakeoff → PC-C0 bis PC-C6
                               ├─ No-Go → zurück zu R5
                               └─ klarer Sieg → PC-C7 bis PC-C9
```

## Empfohlene Release- und Commit-Disziplin

- [ ] Pro Bulk mindestens ein eigenständig rückbaubarer Commit.
- [ ] Screenshots und Messbericht im selben Commit wie die zugehörige Variante.
- [ ] Keine Phase mit ungeklärtem Gate in `master` übernehmen.
- [ ] Produktionsbuild erst nach grünem Typecheck und Testlauf pushen.
- [ ] GitHub Pages nach jedem freigegebenen größeren Gate prüfen.
- [ ] Experimentelle Query-Schalter bis zur endgültigen Entscheidung behalten.

## Grobe Größenordnung

Die Angaben sind relative Arbeitsblöcke, keine festen Zeitversprechen.

| Bereich                     |   Größe |                    Risiko |
| --------------------------- | ------: | ------------------------: |
| R0 Baseline                 |       S |                   niedrig |
| R1 Kamera                   |       M |                    mittel |
| R2 Licht                    |     M–L |                    mittel |
| R3 IBL/Farbe                |       M |                    mittel |
| R4 Materialien              |       L |               mittel–hoch |
| R5 Grounding/AO             |       M |                    mittel |
| R6 Hero + drei Zutaten      |    M–XL | hoch, abhängig von Neubau |
| R7 Finish                   |       M |                    mittel |
| R8 Mobile/Performance       |     M–L |                      hoch |
| R9 Arena-Transfer           |       L |               mittel–hoch |
| R10 Release                 |       M |            niedrig–mittel |
| PC-C0 bis PC-C6 optional    | S + M–L |                    mittel |
| PC-C7 bis PC-C9 nur nach GO |     M–L |               mittel–hoch |

## Nächster freigegebener Auftrag

Der nächste Implementierungsschritt ist ausschließlich **Bulk R0**. Danach
folgt **Bulk R1**. Lighting, Materialien, neue Hero-Assets und PlayCanvas dürfen
nicht parallel vorgezogen werden, weil sie den Kamera-A/B-Test verfälschen.
