# Codebasierter PlayCanvas-Bakeoff — Umsetzungsplan

Stand: 14. September 2026
Status: PC-C0 teilweise verifiziert; PC-C1 technisch umgesetzt
Produktionsstand: `a640541` (`Add main menu game shell`)

## 1. Ziel und Entscheidung

Der Versuch wird als vollständig codebasiertes PlayCanvas-React-Projekt im
bestehenden Repository angelegt. Er besitzt keinen PlayCanvas-Editorzustand,
keine MCP-Abhängigkeit und verändert den produktiven R3F-Einstieg nicht.

Der Bakeoff beantwortet zwei Fragen nacheinander:

1. **Rendering Proof:** Können dieselben Assets mit PlayCanvas mindestens
   gleichwertig und idealerweise sichtbar hochwertiger inszeniert werden?
2. **Integration Proof:** Kann der vorhandene renderer-neutrale Core ohne
   Duplizierung oder Regeländerung angebunden werden?

Nur ein bestandener Rendering Proof erlaubt den Integration Proof. Nur beide
bestandenen Proofs erlauben eine spätere Migrationsdiskussion.

## 2. Verbindliche technische Wahl

### Gewählt: PlayCanvas React mit gezielten Engine-Zugriffen

- [x] `@playcanvas/react` bildet die deklarative Scene Composition.
- [x] `playcanvas` liefert Engine, Materialien, Assets und Renderingfunktionen.
- [x] React bleibt für DOM-HUD, Variantensteuerung und spätere Core-Anbindung
      zuständig.
- [x] Direkte Engine-API wird nur dort verwendet, wo die React-Komponenten keine
      geeignete Abstraktion bieten, etwa `CameraFrame`, Profiling oder PMREM/IBL.
- [x] Alle direkten Engine-Brücken werden in kleinen, benannten Hooks oder
      Komponenten gekapselt.
- [x] Keine eigene allgemeine React-zu-ECS-Abstraktionsschicht entwickeln.

### Nicht gewählt

- [x] Kein PlayCanvas Editor.
- [x] Kein Editor MCP.
- [x] Keine VS-Code-Synchronisation mit einem Cloud-Editor-Projekt.
- [x] Keine Web-Components-Variante.
- [x] Kein kompletter Direct-Engine-Neubau der React-Anwendung.
- [x] Kein npm-Workspace-Umbau des produktiven Root-Packages für den ersten
      Versuch.

### Begründung

PlayCanvas React passt zur bestehenden Komponenten- und UI-Architektur. Die
direkte Engine bleibt trotzdem erreichbar. Ein eigenständiges Unterpackage
verhindert, dass neue Abhängigkeiten, TypeScript-Optionen oder Buildregeln den
produktiven R3F-Build unbemerkt verändern.

## 3. Isolationsvertrag

### Zielstruktur

```text
KesselKrawall3D/
├─ src/                              bestehendes R3F-Spiel, produktiv
├─ public/assets/                    bestehende lizenzierte Runtime-Assets
├─ experiments/
│  └─ playcanvas/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ camera/
│     │  ├─ rendering/
│     │  ├─ materials/
│     │  ├─ scene/
│     │  ├─ ui/
│     │  └─ integration/             erst im Integration Proof
│     ├─ public/                      nur experiment-spezifische Dateien
│     ├─ tests/
│     ├─ index.html
│     ├─ package.json
│     ├─ package-lock.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     └─ README.md
└─ docs/qa/playcanvas-bakeoff/
```

### Regeln

- [x] Produktive Dateien unter `src/presentation/` bleiben im Rendering Proof
      unverändert.
- [x] Dateien unter `src/core/` werden nie in das Experiment kopiert.
- [x] Gemeinsame GLBs und Texturen werden aus `public/assets/` gelesen und nicht
      dupliziert.
- [x] Experimentelle Assets tragen einen dokumentierten Grund und liegen nur
      unter `experiments/playcanvas/public/`.
- [x] Das Unterpackage besitzt eine eigene Lockdatei.
- [x] Root-`npm ci`, Root-Tests und Root-Build funktionieren unabhängig vom
      Experiment weiter.
- [x] Das Experiment besitzt eigene Dev-, Typecheck-, Test- und Buildbefehle.
- [x] Experimentelle Buildausgaben und temporäre Messdaten werden ignoriert.
- [x] Freigegebene Vergleichsscreenshots und Berichte werden versioniert.
- [x] Arbeit erfolgt auf `codex/playcanvas-bakeoff` oder einem gleichwertigen
      isolierten Branch.
- [ ] `master` erhält erst nach bestandenem Bulk-Gate einen eigenständig
      nachvollziehbaren Commit.

## 4. Umfangsgrenze

### Rendering Proof enthält

- [ ] Workshop-Raum und Werkbank.
- [ ] Spieler-Hero-Kessel.
- [ ] Fünf Zutatenplätze.
- [ ] Glut-Chili, Schleimpilz und Runenschale.
- [ ] Perspective Camera mit drei responsiven Presets.
- [ ] Key-, Fill-, Rim- und nachvollziehbare Practical Lights.
- [ ] Environment/IBL.
- [ ] gemeinsame Materialpolicy.
- [ ] Schatten und Grounding.
- [ ] einzeln schaltbares Bloom und SSAO.
- [ ] minimales Vergleichs-HUD.
- [ ] reproduzierbare Screenshots und Performancewerte.

### Rendering Proof enthält ausdrücklich nicht

- [ ] Kein Kampfsystem.
- [ ] Keine Moor-Martha-Arena.
- [ ] Keine Kauf-, Merge- oder Projektilanimation.
- [ ] Keine vollständigen Menüs.
- [ ] Keine Audiointegration.
- [ ] Keine Saves.
- [ ] Keine Neuherstellung von Hero-Assets.
- [ ] Keine weiteren 17 Zutaten.

### Integration Proof ergänzt später nur

- [ ] deterministischen Shopzustand aus dem bestehenden Core,
- [ ] drei Angebote,
- [ ] einen Kauf,
- [ ] sichtbaren Zutatenflug und Landung,
- [ ] einen einfachen Merge bis Level II,
- [ ] Kampfstart als nachweisbares Core-Event, noch keinen vollständigen Kampf.

## 5. Gemeinsamer Vergleichsvertrag

- [ ] R3F und PlayCanvas verwenden dieselben Assetdateien.
- [ ] Beide zeigen denselben Workshop-Zustand und dieselbe Zutatenbelegung.
- [ ] Beide verwenden dieselbe Zielkomposition, nicht zwingend identische
      numerische Lichtparameter.
- [ ] Viewports, Browser, Rechner und Messdauer sind identisch.
- [ ] Warm-up-Frames werden vor der Messung verworfen.
- [ ] Caches werden für Cold-Load- und Warm-Load-Messungen getrennt behandelt.
- [ ] Jede Postprocessing-Funktion ist einzeln abschaltbar.
- [ ] Es gibt keine PlayCanvas-exklusiven neuen Assets vor der Entscheidung.
- [ ] Vergleichsbilder werden ohne nachträgliche Bildbearbeitung gespeichert.
- [ ] Der aktuelle R3F-Stand wird zum Beginn des Bakeoffs per Commit-ID fixiert.

## 6. Pflicht-Viewports und Zielbudgets

| Viewport  | Modus             | Rendering-Ziel                 |
| --------- | ----------------- | ------------------------------ |
| 1920×1080 | Desktop           | maximale freigegebene Qualität |
| 1280×720  | Referenz          | primärer A/B-Golden-Screenshot |
| 915×412   | Mobile Landscape  | Safe Areas und Bühnenbreite    |
| 844×390   | kleines Landscape | minimale Höhe und Touchlayout  |
| 390×844   | Mobile Portrait   | eigenes Kamera-Preset          |

### Vorläufige Budgets

- [ ] Desktop: stabile 60 FPS auf derselben Referenzhardware wie R3F.
- [ ] Mobile: 30 FPS harte Untergrenze, 45–60 FPS bevorzugt.
- [ ] Keine wiederkehrenden P95-Frame-Zeiten über 33 ms im statischen Workshop.
- [ ] Kein höherer Cold-Load-Transfer als R3F plus 20 %, sofern die sichtbare
      Qualität den Unterschied nicht eindeutig rechtfertigt.
- [ ] Keine unkomprimierte Assetduplikation.
- [ ] Kein dauerhaftes dynamisches Licht ohne dokumentierten visuellen Zweck.
- [ ] Mobile verwendet höchstens die für das R3F-Mobile-Profil vergleichbare
      DPR- und Schattenklasse.

---

# Bulk PC-C0 — Baseline, Branch und Experimentvertrag

**Zweck:** Einen fairen und rückbaubaren Ausgangspunkt schaffen.
**Größe:** S
**Abhängigkeit:** keine
**Exit:** Dokumentation und Messzustände sind reproduzierbar.

## Aufgaben

- [x] Aktuellen Git-Status prüfen und vorhandene Dokumentationsänderungen
      bewusst sichern.
- [x] Bakeoff-Branch anlegen.
- [x] R3F-Vergleichscommit fixieren.
- [x] Golden-Workshop-Seed und feste Belegung definieren.
- [ ] R3F-Screenshots in allen fünf Pflicht-Viewports erfassen.
- [ ] R3F Cold Load, Warm Load, durchschnittliche und P95-Frame-Time erfassen.
- [ ] R3F Drawcalls, Triangles, sichtbare Lichter und Assettransfers erfassen.
- [ ] Browser-, GPU-, Betriebssystem- und Gerätekontext dokumentieren.
- [ ] Ordner- und Dateinamensschema unter `docs/qa/playcanvas-bakeoff/`
      festlegen.
- [ ] Scorecard aus der Master-Roadmap für den Bakeoff kopierfrei referenzieren.

## Gate PC-C0

- [ ] Derselbe R3F-Zustand lässt sich zweimal identisch öffnen.
- [ ] Alle Pflichtscreenshots liegen vor.
- [x] Performancewerte besitzen dokumentierte Messbedingungen.
- [x] Bestehender Root-Build ist grün.

**Commit:** `Document PlayCanvas bakeoff baseline`

---

# Bulk PC-C1 — Isoliertes PlayCanvas-React-Unterpackage

**Zweck:** Technische Machbarkeit beweisen, noch ohne Art-Direction-Arbeit.
**Größe:** S
**Abhängigkeit:** PC-C0
**Exit:** Ein minimaler PlayCanvas-Build läuft isoliert lokal und in CI.

## Aufgaben

- [x] Aktuelle offizielle React-TypeScript-Vorlage in einem temporären Ordner
      erzeugen und vor Übernahme prüfen.
- [x] Nur erforderliche Starterdateien nach `experiments/playcanvas/` übernehmen.
- [x] `playcanvas` und `@playcanvas/react` exakt pinnen.
- [x] Node-Anforderung des Unterpackages mit CI-Node-Version abgleichen.
- [x] Eigenes `package.json` und eigene Lockdatei beibehalten.
- [x] Eigene TypeScript-Konfiguration ohne Änderungen an Root-tsconfig anlegen.
- [x] Eigenes Vite-`base: "./"` für beliebige Unterpfade setzen.
- [x] Minimalen PlayCanvas-Canvas mit Camera und Testmesh rendern.
- [ ] Canvas-Sizing, Device Pixel Ratio und Resize-Verhalten prüfen.
- [x] Fehlergrenze und verständlichen WebGL/WebGPU-Fallback vorsehen.
- [x] Root-Scripts nur als Komfort-Wrapper ergänzen, nicht als Abhängigkeitsmix.
- [x] Root-Workflow zunächst weiterhin unabhängig grün halten.

## Erwartete Befehle

```text
npm run pc:install
npm run pc:dev
npm run pc:typecheck
npm run pc:test
npm run pc:build
```

## Gate PC-C1

- [x] Root `npm ci`, Test, Typecheck und Build bleiben unverändert grün.
- [x] Unterpackage lässt sich aus frischem Checkout reproduzierbar installieren.
- [x] PlayCanvas-Devserver läuft ohne Editor oder MCP.
- [x] Experimenteller Produktionsbuild öffnet sich über einen relativen Pfad.
- [x] Keine produktive Route oder Datei wurde ersetzt.

**Commit:** `Scaffold isolated PlayCanvas React bakeoff`

---

# Bulk PC-C2 — Asset- und Szenenkalibrierung

**Zweck:** Dieselben Rohassets korrekt und messbar darstellen.
**Größe:** M
**Abhängigkeit:** PC-C1
**Exit:** Kessel, Workbench und drei Zutaten sind maßstäblich korrekt geladen.

## Aufgaben

- [x] Assetpfade relativ und GitHub-Pages-tauglich auflösen.
- [x] Hero-Kessel, Workbench und drei Referenzzutaten laden.
- [x] GLB-Bounds, Pivot, Achsen, Einheitenskalierung und Materialslots protokollieren.
- [x] Pro Asset einen kalibrierten Wrapper statt Änderungen am Original-GLB
      erstellen.
- [x] Fehlende Assets klar anzeigen und nicht still durch andere Modelle ersetzen.
- [x] Loader-Status bis zum ersten vollständigen Frame sichtbar machen.
- [x] Fünf Slottransforms als zentrale Layoutdaten definieren.
- [x] Kessel-, Tisch- und Slotkoordinaten aus einem gemeinsamen Scene Layout lesen.
- [x] Referenzzustand mit Chili, Schleimpilz und Runenschale herstellen.
- [x] Schatten-Caster und Receiver zunächst konservativ zuweisen.
- [x] Assetinstanzen und Materialien nicht pro Renderframe neu erzeugen.
- [ ] Assettransfers und Dekodierzeit dokumentieren.

## Gate PC-C2

- [x] Keine Assetdatei wurde dupliziert.
- [ ] Alle Modelle stehen korrekt auf ihrer Fläche.
- [ ] Größenverhältnisse entsprechen dem R3F-Vergleichszustand.
- [ ] Fünf Slots sind in allen Pflichtseitenverhältnissen grundsätzlich sichtbar.
- [x] Keine Konsolen- oder Assetladefehler.

**Commit:** `Calibrate shared assets in PlayCanvas`

---

# Bulk PC-C3 — Responsive Perspective Camera

**Zweck:** PlayCanvas’ räumliche Komposition isoliert beweisen.
**Größe:** M
**Abhängigkeit:** PC-C2
**Exit:** Drei reproduzierbare Kamera-Presets bestehen das Framing-Gate.

## Aufgaben

- [ ] Kamera-Layout als Datenstruktur statt verstreuter Konstanten definieren.
- [ ] Desktop-Preset für 16:9 und große Displays erstellen.
- [ ] Landscape-Preset für 915×412 und 844×390 erstellen.
- [ ] Portrait-Preset für 390×844 erstellen.
- [ ] FOV-Varianten 35–40° und 40–45° vergleichen.
- [ ] Kamera weiter zurückstellen, statt Weitwinkelverzerrung zu akzeptieren.
- [ ] Explizites Look-Target und Nah-/Fern-Clipping kalibrieren.
- [ ] Hero-Kessel, fünf Slots und relevante Werkbankkante priorisieren.
- [ ] Randdeko darf aus dem Bild fallen; Kerninteraktionen nicht.
- [ ] Reproduzierbaren Query-Schalter für Kamera- und Profilvarianten anbieten.
- [ ] Resize und Orientation Change ohne sichtbaren Layoutsprung testen.
- [ ] Direktvergleich mit dem zu PC-C0 fixierten R3F-Stand aufnehmen.

## Gate PC-C3

- [ ] Keine sichtbare Fisheye-Verzerrung.
- [ ] Hero-Fokus erreicht mindestens 4/5.
- [ ] Raumtiefe erreicht mindestens 4/5.
- [ ] Kessel und fünf Slots erreichen in jedem Viewport mindestens 4/5.
- [ ] Kamera verliert bei Rotation oder Browserleistenänderung keine Kernobjekte.

**Commit:** `Compose responsive PlayCanvas workshop camera`

---

# Bulk PC-C4 — Lighting, Environment und Farbmanagement

**Zweck:** Material- und Formlesbarkeit mit einem kontrollierten Lichtsystem
beweisen.
**Größe:** M–L
**Abhängigkeit:** PC-C3
**Exit:** Workshop besitzt Key/Fill/Rim, IBL und eine stabile Exposure-Basis.

## Aufgaben

- [ ] sRGB-, Linear-, Tone-Mapping- und Exposure-Pfad dokumentieren.
- [ ] Ein warmes Key Light auf Hero-Kessel und Werkbank setzen.
- [ ] Ein weiches Fill Light zur kontrollierten Schattenzeichnung ergänzen.
- [ ] Ein sparsames Rim Light für die Kesselsilhouette ergänzen.
- [ ] Praktische Lichtquellen nur an sichtbare Feuer-/Kerzenquellen binden.
- [ ] Neutrale und warme Environment-Variante vergleichen.
- [ ] Environment-Intensität an Eisen, Messing, Holz und Glas kalibrieren.
- [ ] Schattenauflösung, Bias, Normal Bias und Reichweite kalibrieren.
- [ ] Desktop und Mobile erhalten dieselbe Lichtdramaturgie.
- [ ] Mobile darf Schatten und Environment-Auflösung reduzieren.
- [ ] Zahl und Kosten sichtbarer Lichter messen.
- [ ] Varianten über Queryparameter einzeln reproduzierbar machen.

## Gate PC-C4

- [ ] Kessel ist klarer Hero-Fokus.
- [ ] Schatten zeichnen Form, ohne Zutaten zu verschlucken.
- [ ] Metall ist rund und lesbar, ohne plastikartig zu glänzen.
- [ ] Die Szene bleibt warm, aber nicht vollständig orange getönt.
- [ ] Mobile zeigt keine visuell andere Welt.

**Commit:** `Establish PlayCanvas workshop lighting and IBL`

---

# Bulk PC-C5 — Gemeinsame Materialsprache

**Zweck:** Asset-Pack-Grenzen innerhalb des PlayCanvas-Versuchs sichtbar
auflösen.
**Größe:** L
**Abhängigkeit:** PC-C4
**Exit:** Hero-Assets und Environment folgen derselben Materialpolicy.

## Aufgaben

- [ ] Materialfactory oder gecachten Materialkatalog erstellen.
- [ ] Dark Iron, Aged Brass, Warm Wood, Dark Wood, Fantasy Stone, Ceramic,
      Glass, Magic Liquid und Crystal definieren.
- [ ] Roughness-, Metalness-, Emissive- und Environment-Bereiche dokumentieren.
- [ ] Authored Materialien zunächst inventarisieren, nicht pauschal überschreiben.
- [ ] Hero-Kessel zuerst kalibrieren.
- [ ] Workbench danach kalibrieren.
- [ ] Große Architekturflächen anschließend kalibrieren.
- [ ] Drei Zutaten an dieselbe Policy anbinden.
- [ ] Familienfarben nur als Akzente einsetzen.
- [ ] Materialinstanzen und Shader-Varianten zählen.
- [ ] Transparenz und Alpha-Blending im HDR-Pfad prüfen.
- [ ] Mobile-Materialantwort ohne separate Art Direction sicherstellen.

## Gate PC-C5

- [ ] Eisen, Messing, Holz, Stein und Magie sind ohne Text unterscheidbar.
- [ ] Assetquellen wirken im Golden Screenshot nicht wie getrennte Packs.
- [ ] Materialtrennung erreicht mindestens 4/5.
- [ ] Gemeinsame Asset-Sprache erreicht mindestens 4/5.
- [ ] Material- und Shaderanzahl bleiben im dokumentierten Rahmen.

**Commit:** `Unify PlayCanvas golden scene materials`

---

# Bulk PC-C6 — Grounding und Postprocessing-Bakeoff

**Zweck:** Finalen Renderinggewinn messen, ohne Effekte als Reparaturmittel zu
verwenden.
**Größe:** M
**Abhängigkeit:** PC-C5
**Exit:** Schatten, SSAO und Bloom sind einzeln bewertet und profiliert.

## Aufgaben

- [ ] Kessel-, Zutaten- und Tischkontakt zunächst nur mit Schlagschatten prüfen.
- [ ] Günstige zusätzliche Contact-Shadow-Lösung testen, falls erforderlich.
- [ ] Modernes `CameraFrame` kontrolliert anbinden.
- [ ] HDR-Tone-Mapping vor allen Effekten stabilisieren.
- [ ] Bloom ausschließlich für sehr helle Magie-/Flüssigkeitswerte aktivieren.
- [ ] SSAO separat aktivieren und Radius/Intensität subtil kalibrieren.
- [ ] Bloom und SSAO jeweils einzeln sowie gemeinsam messen.
- [ ] TAA gegen MSAA/Standard-Antialiasing vergleichen, falls sinnvoll.
- [ ] Transparente Flüssigkeit, Partikel und DOM-HUD auf Artefakte prüfen.
- [ ] Halos, Flimmern, Ghosting und generelle Weichzeichnung dokumentieren.
- [ ] Mobile-Profil zunächst ohne SSAO und mit reduziertem Bloom testen.
- [ ] Jede verworfene Funktion ausdrücklich dokumentieren.

## Gate PC-C6

- [ ] Kein Hero-Objekt wirkt schwebend.
- [ ] Bloom betrifft sichtbar nur magische Highlights.
- [ ] SSAO wird nur übernommen, wenn der Qualitätsgewinn seine Frame-Kosten
      rechtfertigt.
- [ ] Postprocessing verschlechtert keine Zutaten- oder UI-Lesbarkeit.
- [ ] Mobile hält die harte 30-FPS-Untergrenze.

**Commit:** `Evaluate PlayCanvas grounding and post effects`

---

# Decision Gate PC-D1 — Rendering Proof

Nach PC-C6 wird die Entwicklung gestoppt und bewertet.

## Abnahme

- [ ] Alle fünf Viewports für R3F und PlayCanvas nebeneinander dokumentieren.
- [ ] Gewichtete visuelle Scorecard unabhängig ausfüllen.
- [ ] Cold Load, Warm Load, Average und P95 Frame-Time vergleichen.
- [ ] Drawcalls, Triangles, Lichter, Materialien und Transfers vergleichen.
- [ ] Zahl der Implementierungs- und Screenshotiterationen dokumentieren.
- [ ] Browserfehler, Darstellungsartefakte und Mobile-Abstriche aufführen.
- [ ] Ergebnis als `GO`, `REWORK ONCE` oder `NO-GO` festhalten.

## GO nur wenn

- [ ] PlayCanvas den fixierten R3F-Stand im Gesamtscore um mindestens 10 %
      schlägt oder bei gleicher Qualität nachweisbar wesentlich leichter iterierbar
      ist.
- [ ] Kein Pflicht-Viewport unter 3/5 fällt.
- [ ] Mobile mindestens gleichwertig funktioniert.
- [ ] Build und Assetzugriff reproduzierbar sind.
- [ ] Es keine schwerwiegenden Engine-/React-Integrationsprobleme gibt.

## REWORK ONCE

- [ ] Nur zulässig, wenn höchstens zwei klar begrenzte Mängel das Gate verhindern.
- [ ] Nach genau einem kleinen Korrekturbulk erneut entscheiden.
- [ ] Keine schleichende Erweiterung des Rendering Proofs.

## NO-GO

- [ ] Experiment bleibt als dokumentierter technischer Vergleich erhalten oder
      wird auf Wunsch sauber entfernt.
- [ ] Keine Integration des Core beginnen.
- [ ] R3F-Master-Roadmap fortsetzen.

**Commit:** `Report PlayCanvas rendering proof decision`

---

# Bulk PC-C7 — Core-Grenze und Integrationsadapter

**Startbedingung:** PC-D1 = GO
**Zweck:** Beweisen, dass das Experiment den vorhandenen Core konsumiert, ohne
ihn zu verbiegen.
**Größe:** M
**Exit:** TypeScript-Core wird unverändert aus dem Experiment verwendet.

## Aufgaben

- [ ] Zulässige Imports aus `src/core` explizit inventarisieren.
- [ ] Vite-Alias und `server.fs.allow` eng auf den benötigten Corepfad begrenzen.
- [ ] TypeScript-Pfade so konfigurieren, dass keine zweite Corekopie entsteht.
- [ ] Eine kleine Adaptergrenze für GameState, Board und ShopOffer definieren.
- [ ] Keine PlayCanvas-Typen in `src/core` einführen.
- [ ] Keine PlayCanvas- oder Presentation-Daten im gespeicherten GameState ablegen.
- [ ] Seeded State aus dem Core erzeugen und im PlayCanvas-HUD anzeigen.
- [ ] Bestehende Core-Tests unverändert ausführen.
- [ ] Zusätzlichen Boundary-Test gegen Engine-Imports im Core ergänzen.
- [ ] Produktions- und Experimentbuild gemeinsam aus frischem Checkout testen.

## Gate PC-C7

- [ ] Kein Corecode wurde dupliziert.
- [ ] Kein bestehendes Regelverhalten wurde geändert.
- [ ] Core bleibt renderer-neutral und testbar.
- [ ] Unterpackage kann denselben Zustand deterministisch reproduzieren.
- [ ] Root- und Experimentbuild sind unabhängig grün.

**Commit:** `Connect renderer-neutral core to PlayCanvas`

---

# Bulk PC-C8 — Minimaler Shop-, Kauf- und Merge-Loop

**Startbedingung:** PC-C7 bestanden
**Zweck:** Die reale Presentation-Grenze testen, ohne einen zweiten kompletten
Spielclient zu bauen.
**Größe:** M–L
**Exit:** Ein kleiner, deterministischer Interaktionsloop ist vollständig.

## Aufgaben

- [ ] Drei Shopangebote als minimales DOM-HUD darstellen.
- [ ] Angebote aus dem echten Corezustand lesen.
- [ ] Kauf nur über bestehende Core-State-Transition ausführen.
- [ ] Visuellen Pending-Zustand während der Kaufanimation halten.
- [ ] Zutat erst nach Flug und Landung in der 3D-Boarddarstellung zeigen.
- [ ] Animationsabschluss von der Core-Simulation getrennt halten.
- [ ] Zwei identische Level-I-Zutaten deterministisch mergen.
- [ ] Merge-Antizipation, Zusammenzug, Impuls und Level-II-Ergebnis darstellen.
- [ ] Level II räumlich und materiell sichtbar unterscheiden.
- [ ] Kampfstart als Core-Aktion anbieten und resultierendes Ereignis protokollieren.
- [ ] Kein vollständiges Kampfplayback implementieren.
- [ ] Maus und Touch prüfen.
- [ ] Animationen mit reduzierter Bewegung prüfen.
- [ ] Transaktions-, Doppelklick- und Assetladefälle testen.

## Gate PC-C8

- [ ] Kauf erzeugt keine doppelte oder vorzeitig sichtbare Zutat.
- [ ] Merge verändert den Core exakt einmal.
- [ ] Visuelle Dauer beeinflusst keine Spielregel.
- [ ] Shopzustand bleibt deterministisch.
- [ ] Desktop und Mobile können den Loop vollständig bedienen.

**Commit:** `Prove PlayCanvas shop and merge integration`

---

# Bulk PC-C9 — Vergleich, statischer Preview-Build und Go-/No-Go

**Zweck:** Eine belastbare Produktentscheidung vorbereiten.
**Größe:** M
**Abhängigkeit:** PC-C8
**Exit:** Bericht und Preview sind reproduzierbar; keine Migration startet.

## Aufgaben

- [ ] Experiment in ein separates Buildverzeichnis bauen.
- [ ] Root-Produktionsbuild unverändert erzeugen.
- [ ] PlayCanvas-Build kontrolliert unter `dist/playcanvas/` zusammenführen.
- [ ] Root-App und `/playcanvas/` lokal aus demselben statischen Verzeichnis testen.
- [ ] GitHub-Actions-Schritte für beide Lockdateien und Builds dokumentieren.
- [ ] Preview nur nach grünem Root- und Experiment-Gate veröffentlichen.
- [ ] GitHub-Pages-Unterpfad live prüfen.
- [ ] Finale A/B-Screenshots in allen Pflicht-Viewports aufnehmen.
- [ ] Visuelle Qualität und Performance erneut bewerten.
- [ ] Bundle-, Asset- und Cacheverhalten vergleichen.
- [ ] Wartungsaufwand und Abhängigkeitsrisiko dokumentieren.
- [ ] Übertragbarkeit von Hauptmenü, HUD, Audio, VFX und Arenen bewerten.
- [ ] Aufwand einer schrittweisen Presentation-Migration schätzen.
- [ ] Bericht mit einer eindeutigen Empfehlung erstellen.

## Mögliche Entscheidungen

### R3F behalten

- [ ] PlayCanvas-Preview als Dokumentationsartefakt kennzeichnen.
- [ ] Keine weiteren PlayCanvas-Features implementieren.
- [ ] Erkenntnisse zu Kamera, Licht und Materialien in Track A übernehmen.

### PlayCanvas nur als Visual-Prototyping-Werkzeug behalten

- [ ] Keine Runtime-Migration.
- [ ] Nutzung ausschließlich für zukünftige Look-Development-Experimente
      dokumentieren.

### Presentation schrittweise migrieren

- [ ] Neue eigenständige Migrationsroadmap erstellen.
- [ ] Core, Saves und Regeln unverändert übernehmen.
- [ ] Reihenfolge Workshop → Kampf → HUD → Menüs → Arenen verwenden.
- [ ] Für jeden migrierten Bereich einen R3F-Rückfallpfad behalten.
- [ ] Migration erst nach ausdrücklicher Freigabe beginnen.

## Gate PC-C9

- [ ] Live-Preview und Bericht referenzieren denselben Commit.
- [ ] Root-Spiel bleibt unter seiner bisherigen URL vollständig spielbar.
- [ ] PlayCanvas ist nur unter dem Unterpfad erreichbar.
- [ ] Keine Entscheidung beruht ausschließlich auf einem einzelnen Screenshot.
- [ ] Keine vollständige Migration wurde automatisch begonnen.

**Commit:** `Publish PlayCanvas bakeoff report`

---

# 7. Testmatrix

## Pro Bulk verpflichtend

- [ ] Experiment-Typecheck.
- [ ] Experiment-Produktionsbuild.
- [ ] Root-Typecheck.
- [ ] Root-Testlauf.
- [ ] Root-Produktionsbuild.
- [ ] `git diff --check`.
- [ ] Keine neuen Browserkonsolenfehler.

## Ab PC-C3

- [ ] 1920×1080 Screenshot und Layoutrechtecke.
- [ ] 1280×720 Screenshot und Layoutrechtecke.
- [ ] 915×412 Screenshot und Layoutrechtecke.
- [ ] 844×390 Screenshot und Layoutrechtecke.
- [ ] 390×844 Screenshot und Layoutrechtecke.
- [ ] Kein horizontaler Overflow.
- [ ] Canvasauflösung entspricht dem gewählten Qualitätsprofil.

## Ab PC-C8

- [ ] Shopangebot per Maus kaufen.
- [ ] Shopangebot per Touch kaufen.
- [ ] Doppelklick erzeugt keinen Doppelkauf.
- [ ] Zutat erscheint erst nach Abschluss der Landung.
- [ ] Merge erzeugt exakt ein Level-II-Ergebnis.
- [ ] Orientation Change erhält den Zustand.
- [ ] Reduced Motion bleibt bedienbar.

# 8. Dokumentationsartefakte

- [x] `docs/qa/playcanvas-bakeoff/BASELINE.md`
- [ ] `docs/qa/playcanvas-bakeoff/RENDERING_PROOF.md`
- [x] `docs/qa/playcanvas-bakeoff/PC_C2_ASSET_CALIBRATION.md`
- [ ] `docs/qa/playcanvas-bakeoff/INTEGRATION_PROOF.md`
- [ ] `docs/qa/playcanvas-bakeoff/PERFORMANCE.md`
- [ ] `docs/qa/playcanvas-bakeoff/SCORECARD.md`
- [ ] `docs/qa/playcanvas-bakeoff/GO_NO_GO.md`
- [x] `experiments/playcanvas/README.md`
- [ ] maximal zwei PlayCanvas-Bakeoff-Screenshots in der Haupt-README erst nach
      bestandenem Rendering Proof.

# 9. Stop-Regeln

Der Versuch wird pausiert und bewertet, wenn:

- [ ] Root-Build oder bestehende Core-Tests durch das Experiment instabil werden.
- [ ] gemeinsame Assets dupliziert werden müssten.
- [ ] PlayCanvas-spezifische Anforderungen in den Core einsickern.
- [ ] drei aufeinanderfolgende Bulks ihr Gate nicht bestehen.
- [ ] Mobile die harte 30-FPS-Untergrenze nicht erreicht.
- [ ] ein notwendiges Renderingfeature nur durch einen unverhältnismäßig großen
      Custom-Renderer-Umbau erreichbar wäre.
- [ ] der Versuch zu einem zweiten vollständigen Spiel anwächst, bevor PC-D1
      bestanden ist.

# 10. Definition of Done des Bakeoffs

- [ ] Vollständig codebasiert; kein Editor- oder MCP-Zustand erforderlich.
- [ ] Isoliertes, reproduzierbares Unterpackage mit eigener Lockdatei.
- [ ] Gleiche Assets und gleiche Vergleichszustände wie R3F.
- [ ] Rendering Proof dokumentiert und entschieden.
- [ ] Integration Proof nur nach Rendering-GO umgesetzt.
- [ ] Core bleibt unverändert renderer-neutral.
- [ ] Desktop, Landscape und Portrait geprüft.
- [ ] Performance, Bundle und Arbeitsaufwand dokumentiert.
- [ ] Root-Spiel bleibt unverändert veröffentlichbar.
- [ ] Eine eindeutige Go-/No-Go-Empfehlung liegt vor.
- [ ] Keine Migration ohne neuen, ausdrücklich freigegebenen Auftrag.

# 11. Empfohlene Reihenfolge

```text
PC-C0 Baseline und Vertrag
  ↓
PC-C1 isoliertes Unterpackage
  ↓
PC-C2 Assetkalibrierung
  ↓
PC-C3 Kamera
  ↓
PC-C4 Licht und IBL
  ↓
PC-C5 Materialien
  ↓
PC-C6 Grounding und Postprocessing
  ↓
PC-D1 Rendering-Entscheidung
  ├─ NO-GO → Versuch beenden, R3F-Rework fortsetzen
  ├─ REWORK ONCE → ein begrenzter Korrekturbulk, dann erneut entscheiden
  └─ GO
       ↓
     PC-C7 Core-Adapter
       ↓
     PC-C8 Kauf-/Merge-Loop
       ↓
     PC-C9 Preview und endgültiger Go-/No-Go-Bericht
```

## Nächster zulässiger Implementierungsauftrag

Wenn der PlayCanvas-Versuch freigegeben wird, beginnt er ausschließlich mit
**PC-C0** und **PC-C1**. Kamera, Assets und Renderingpolish werden erst begonnen,
wenn Isolation, Builds und Rückfallpfad nachweislich funktionieren.
