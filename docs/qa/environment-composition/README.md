# Environment Composition Phase 1

Stand: 14. Oktober 2026. Branch: `codex/environment-composition-phase1`.
Vergleichsbasis: `a989b9e`, neue GLBs mit bisheriger Raumkomposition.

Die Szene ist jetzt räumlich geschlossen und die Kamera rückt näher an das
Spielgeschehen. Das verbessert die Bühnenwirkung deutlich, erreicht aber noch
nicht die Wärme, Materialqualität und gestalterische Dichte des North-Star-Mockups.
Dieser Schritt endet zur visuellen Abnahme; kein Merge nach `master` und kein
GitHub-Pages-Release gehören zu dieser Abnahme.

## Lokal prüfen

- [Neue Komposition spielen](http://127.0.0.1:5173/?art=mockup)
- [Vorherige GLB-Komposition spielen](http://127.0.0.1:5173/?art=mockup&composition=before)
- [Alle Vorher-Nachher-Bilder vergleichen](http://127.0.0.1:5173/docs/qa/environment-composition/compare.html)
- [Golden-Variante](http://127.0.0.1:5173/?art=golden), Legacy und Ecosystem bleiben erhalten.

## Umgesetzt

- [x] Seitliche Torbogenlücken mit überlappenden Wandmodulen geschlossen.
- [x] Bogenflanken und Bereich oberhalb des Bogens mit passgenauer Mauerfüllung versehen.
- [x] Seitenwände fortgesetzt, Boden bis hinter die Raumgrenzen ergänzt und Decke geschlossen.
- [x] Vorhandene Wanddreiecke mit ihren originalen UVs für sichtbare Ergänzungen wiederverwendet; keine neuen GLBs.
- [x] Werkbank mit 0,7 m zurückgesetzter Holztür; Arena mit 2,8 m kurzem Korridor und Abschluss.
- [x] Perspektivische Kamera mit separater Hochkant-/Querformat-Komposition und HUD-Sicherheitsbereichen.
- [x] Alle fünf Zutatenplätze und die später freigeschaltete Reserve beim Kamera-Fitting berücksichtigt.
- [x] Mobile Querformat-Kampfsteuerung im Kopfbereich komprimiert, Zutatenleiste an den unteren Rand versetzt.
- [x] Holzmaterial der neuen Passage in das Kampf-Ladegate aufgenommen, auch ohne Werkbank-Cache.
- [x] Lichtparameter, bestehende GLB-Materialwerte, Gameplay, Gegnerpositionen und VFX unverändert gelassen.
- [ ] Visuelle Abnahme durch den Nutzer.

## Gestalterische Entscheidungen

### Perspektive statt Orthografie

Die perspektivische Kamera trennt Vordergrundkessel und Hintergrund stärker und
zeigt seitlich weiterlaufende Wände. Die orthografische Alternative wirkt flacher;
insbesondere die rückwärtige Architektur und der Gegner konkurrieren stärker mit
dem Spieler. Deshalb bleibt Perspektive die Vorgabe. Kamera-Fitting findet nur
bei Szenenwechsel und Größenänderungen statt, nicht in jedem Animationsframe.

Vergleich: [orthografische Werkbank](options/orthographic/workshop-after-desktop.png)
und [orthografische Arena](options/orthographic/battle-zischbert-after-desktop.png).
Spielbar über `?art=mockup&camera=orthographic`.

### Tür und Korridor

Für die Werkbank ist die zurückgesetzte Tür die klarere Lösung. Ein längerer
Korridor ist aus dieser fast frontalen Kamera größtenteils vom Kessel verdeckt
und liefert kaum zusätzlichen sichtbaren Tiefeneindruck. In der Arena bleibt
der kurze Korridor hinter dem vorhandenen Portal als geschlossener räumlicher
Abschluss. Auch dort verdeckt das unveränderte Portal viel von der Konstruktion:
Das ist kein belegter großer visueller Vorteil des Korridors.

- Werkbank: [Tür](options/door/workshop-after-desktop.png) / [Korridor](options/corridor/workshop-after-desktop.png)
- Arena: [Tür](options/door/battle-zischbert-after-desktop.png) / [Korridor](options/corridor/battle-zischbert-after-desktop.png)
- Beide Optionen bleiben über `?art=mockup&passage=door` beziehungsweise `&passage=corridor` prüfbar.

Die einfache Tür nutzt Ausschnitte der vorhandenen Holztextur. Sie erfüllt den
Raumabschluss, ist aber noch kein überzeugend ausgearbeitetes Hero-Asset.

## Vergleich zum North Star

[Zielbild](../../reference-art/final-north-star.png) und Spielaufnahmen dürfen nicht
gleichgesetzt werden. Näher gekommen sind wir bei geschlossenem Raum,
Vordergrundgewicht, sichtbarer Tiefe und fehlenden schwarzen Kulissenrändern.
Weiterhin deutlich entfernt sind wir bei:

1. **Licht und Kontrast:** gleichmäßige helle Ausleuchtung statt warmer Lichtinseln,
   dunkler Ecken und prägnanter Kontaktschatten. In dieser Phase bewusst unverändert.
2. **Materialien und Maßstab:** helle Holzflächen, regelmäßig wiederholte große
   Mauersteine und sichtbare Texturwiederholungen. Mehr Raum allein behebt das nicht.
3. **Kampfkomposition:** im Mockup steht der Spielerkessel auf einer Werkbank vor
   einer getrennten Gegnerplattform; hier stehen beide noch auf derselben Steinbühne.
4. **Zutaten und Sockel:** stark vereinfachte Zutaten und lilafarbene Podeste
   bleiben ein erheblicher Stilbruch zu den texturierten Kesseln und Raum-Assets.
5. **Inszenierung:** Portal, Runen und Kampf-VFX erreichen noch nicht die organischen
   Lichtspuren, Flüssigkeitsreaktionen und Detailfülle der Vorlage.
6. **Hochkantformat:** alle Plätze bleiben bedienbar, aber das breite Werkbanklayout
   lässt viel Wand und Boden im Bild. Ein echter Hochkant-Layoutumbau wäre ein
   eigener Schritt; die größere vertikale Perspektive allein löst das nicht.

Die richtige nächste Entscheidung ist deshalb die visuelle Abnahme dieser
Komposition, danach ein separater Lighting-/Material-Pass. Keine neue Asset-Runde
und kein Engine-Wechsel sind nötig, um diese nächsten Unterschiede anzugehen.

## Prüfverfahren

Der End-to-End-Weg ist: Hauptmenü → gültiger gespeicherter Lauf → Kauf und Merge →
Ladegate → Kampf gegen Zischbert/Moor-Martha → Ergebnis → Rückkehr zur Werkbank.
Das Spiel ist clientseitig; es gibt in diesem Ablauf keine Backend-API.

Die Vorher-Nachher-Aufnahmen verwenden gleiche Spielstände, RNG, Zutaten,
Gegnervarianten, Viewports und DPR. Lichtparameter und gemeinsam verwendete
GLB-Materialwerte werden im Test verglichen. Architektur, Kamera und die oben
benannte Querformat-HUD-Anordnung unterscheiden sich absichtlich. Kampfbilder
werden über die reguläre Pausefunktion festgehalten; Kerzen und Idle-Bewegungen
laufen weiter. Die Bilder sind keine Render-Mockups und nicht retuschiert.

Geprüfte Formate: Desktop 1440 × 900, Mobile Portrait 390 × 844 und Mobile Landscape
844 × 390. Die mobilen Läufe verwenden Chromium-Viewport-/Touch-Emulation, keine
physischen Smartphones. Die Reserve wird zusätzlich in einem Runde-5-Teststand
über echte Maus-/Touch-Eingaben geprüft. Sechs Strahltests pro Szene prüfen die
Torbogenflanken, oberen Anschlüsse und den Raumabschluss auf tatsächliche Geometrie.

```powershell
npm test
npm run build
node scripts/qa_environment_composition.mjs http://127.0.0.1:5173/ docs/qa/environment-composition
node scripts/render_composition_comparison.mjs http://127.0.0.1:5173/ docs/qa/environment-composition
```

Automatisierte Ergebnisse und Renderkosten stehen im [vollständigen Bericht](report.json).
Die Bildauswahl enthält Werkbank und beide ersten Gegner in allen drei Formaten.

### Ergebnisse

- 107 Tests in 21 Testdateien bestanden, einschließlich Kamera-Fitting,
  Variantenisolation, originalgetreuer UV-Interpolation und Passage-Ladeabhängigkeit.
- Produktionsbuild und TypeScript-Prüfung erfolgreich. Bestehende Warnung:
  Three.js-Vendor-Chunk 770,32 kB, oberhalb der 750-kB-Warnschwelle.
- 36 Browser-Prüffälle bestanden, 18 Spielaufnahmen, neun gepaarte Vergleiche;
  keine Laufzeitfehler oder fehlenden Asset-Requests.
- Keine Verstöße gegen die geprüften Sichtbarkeits-/HUD-Grenzen im Nachher-Zustand.
  Die automatischen Grenzen ersetzen nicht die visuelle Abnahme.
- Alle zehn bereitgestellten Mockup-Assettypen bleiben im geprüften Spielablauf enthalten.

### Gemessene Renderkosten

Die Zahlen stammen aus den aufgezeichneten Szenenframes; sie sind keine
Gesamtzahl aller geladenen Mesh-Dreiecke. DPR 1, Chromium mit ANGLE/D3D11 auf
AMD Radeon(TM) Graphics. Keine CPU-/GPU-Drosselung zur Smartphone-Simulation.

| Szene | Format | Dreiecke vorher → nachher | Draw Calls vorher → nachher |
| --- | --- | ---: | ---: |
| Werkbank | Desktop | 410.778 → 468.118 (+14,0 %) | 162 → 173 |
| Zischbert | Desktop | 694.750 → 763.462 (+9,9 %) | 413 → 430 |
| Moor-Martha | Desktop | 703.534 → 772.246 (+9,8 %) | 446 → 463 |
| Werkbank | Hochkant | 203.649 → 261.628 (+28,5 %) | 150 → 174 |
| Zischbert | Hochkant | 374.658 → 410.766 (+9,6 %) | 378 → 405 |
| Moor-Martha | Hochkant | 383.006 → 419.202 (+9,5 %) | 407 → 435 |
| Werkbank | Querformat | 229.904 → 264.458 (+15,0 %) | 162 → 175 |
| Zischbert | Querformat | 386.646 → 428.812 (+10,9 %) | 402 → 422 |
| Moor-Martha | Querformat | 395.082 → 437.248 (+10,7 %) | 432 → 452 |

Alle 18 kurzen Frame-Stichproben lagen bei rund 16,7 ms im Mittel und 16,7–16,8 ms
am 95. Perzentil. Diese Messung fand in der Werkbank beziehungsweise im pausierten
Kampf mit laufender Umgebungsanimation statt, **nicht unter maximaler Kampf-VFX-Last**.
Auf diesem Rechner wurde damit kein Einbruch sichtbar; die zusätzliche Last ist
trotzdem real. Besonders +28,5 % bei der Hochkant-Werkbank verlangt vor einem
Release einen physischen Smartphone-Test und gegebenenfalls vereinfachte Raumflächen.

## Technische Grenzen

Die Ergänzungen verwenden vorhandene Materialien und Frontflächen, wiederverwendete
Geometrie sowie einfache Flächen für Boden und Decke. Trotzdem steigt die sichtbare
Geometrielast durch den größeren geschlossenen Raum. Dies ist kein Performance-Pass.
Die hochpolygonalen Bodenmodule und die bereits vorhandenen Charaktermodelle
bleiben unverändert. Frame-Messungen umfassen 120 rAF-Intervalle nach 20 Warm-up-
Frames; sie enthalten VSync und Headless-Scheduling und sind keine isolierte GPU-
Messung oder Zusage für Smartphone-FPS.

Die React-Prüfung konzentriert sich auf memoisierten Geometrieaufbau, Freigabe
eigener Geometrie-/Texturressourcen und isolierte Aktivierung der neuen Variante.
Es wurden keine globalen Spielregeln oder fremden PlayCanvas-/Unity-Arbeiten geändert.
