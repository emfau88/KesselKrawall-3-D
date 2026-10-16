# Phase 3A Polish – visuelle Abnahme

Basis: **1539387**, Branch `codex/ingredient-art-phase3a`.
Arbeitsbranch: **`codex/ingredient-art-phase3a-polish`**.
Warm Fantasy bleibt unverändert. Kein Merge nach `master`, kein Pages-Release.

## Ansehen

- [Kontrollierter Vorher-Nachher-Vergleich](http://127.0.0.1:5173/docs/qa/ingredient-art-phase3a-polish/compare.html)
- [Polish lokal spielen](http://127.0.0.1:5173/?art=mockup&ingredients=polish)
- [Phase 3A / 1539387 lokal spielen](http://127.0.0.1:5173/?art=mockup&ingredients=phase3a)
- [Archiv der ersten Phase 3A](../ingredient-art-phase3a/README.md)

Auf diesem Arbeitsbranch ist Polish der Standard für `?art=mockup`.
`ingredients=phase3a` erhält die bisherigen drei Modelle einschließlich der alten
Stufensteine; `ingredients=before` erhält den Stand vor Phase 3A. Golden, Legacy,
Ecosystem und `composition=before` bleiben unverändert. Auch `look=reference`,
`look=dark` und `look=magical` sind weiterhin verfügbar.

## Was tatsächlich geändert wurde

**Chili:** vollere Schulter und kräftigerer, sich verjüngender Körper; gekrümmte,
eingerollte Spitze; fünf ausgeformte Kelchblätter und gebogener Stiel. Die Haut
besitzt breite rote Farbvariation, dezente Flecken und weniger körnige Struktur.
Sie ist leicht wachsig, nicht selbstleuchtend. Stufe II verbreitert Körper und
Blattkranz; Stufe III ergänzt eine seitlich angewachsene zweite Schote.

**Schleimpilz:** weich gerundeter, asymmetrischer Hut mit abgesenktem Rand und
versetztem Scheitel statt der bisherigen spitzeren, steinig wirkenden Kappe.
Hut, helle Lamellen und gekrümmter, gefalteter Stiel sind getrennt modelliert.
Matte olivfarbene Haut, glatterer Schleim und flach aufliegende Lentizellen
unterscheiden die Oberflächen. Stufe II lässt einen kleinen Seitenpilz wachsen;
Stufe III besitzt zwei angewachsene Tochterkappen. Lamellen und Tropfen sind
echte Geometrie, keine flachen Ersatzbilder.

**Runenschale:** die bisherige Doppelwand, Öffnung und unregelmäßige Bruchkante
bleiben erhalten. Dünne, oberflächenfolgende Rissbänder ersetzen die dicken
dunklen Röhren. Das größere dunkel-türkise Schutzzeichen sitzt flacher auf der
Schale; wenige mineralische Einschlüsse differenzieren das Elfenbein. Stufe II
vergrößert Zeichen und Bruchkante leicht, Stufe III ergänzt seitliche Runenflügel.
Es handelt sich nicht um eine komplette Neumodellierung.

**Podeste und Upgrades:** die originalen Basalt-Messing-Podeste sind unverändert.
Nur bei diesen drei Zutaten bekommen Stufe II und III eine zusätzliche, gemeinsam
genutzte Fassung: zunächst ein niedriger Messingbund, danach eine höhere, offene
Krone mit kleinen familienfarbigen Einlagen. Die Zutat bleibt frei sichtbar.
Die bisherigen schwebenden weißen Steine und separaten Upgrade-Ringe entfallen
für diese drei Modelle. Die übrigen 17 Zutaten behalten ihre bisherigen Marker.
Bestehende Zahlen, Popover, Levelwerte, Auswahl-/Buff-Marker, Cooldown-Bögen und
Aktivierungsanimationen bleiben erhalten.

Das ursprüngliche Stufenlicht bleibt mit identischen Parametern bestehen. Es gibt
keine neuen permanenten Lichtquellen, Schattenlichter oder Postprocessing-Effekte.
Kamera, Lichtprofile, Architektur, UI, Balancing und Simulation wurden nicht
geändert. Das bestehende Ladegate erhält nur den zusätzlichen Asset-Eintrag für
die Upgrade-Fassung. Die bekannten Erstkampf-Hänger sind nicht behoben.

## Reproduzierbare Asset-Pipeline

[`polish_ingredient_phase3a.py`](../../../art/blender/polish_ingredient_phase3a.py)
verwendet die bestehende Blender-Pipeline. Neue Dateien liegen ausschließlich in
`public/assets/ingredient-phase3a-polish/`; ursprüngliche GLBs, Texturen und
2D-Referenzbilder bleiben bytegleich erhalten.

Jede Zutat hat drei Materialzonen, einen gemeinsamen unbeleuchteten Farbatlas
(512² Desktop / 256² Mobile) und eine 128²-Mikronormaltextur. Die Fassung besitzt
zwei Materialzonen und keinen zusätzlichen Farbatlas. Keine kostenpflichtigen
Assets, Dienste oder neuen externen Abhängigkeiten.

Level II/III sind echte Blender-Shape-Keys im selben GLB. Alle Stufen teilen
Topologie, Texturen und Materialien; die Runtime setzt nur die Morph-Gewichte
der jeweiligen Instanz. Die Morph-Gewichte und Fußhöhen werden je LOD/Stufe
geprüft. Geometrien werden zwischen Instanzen geteilt, Materialvarianten für
Runen bleiben begrenzt und gecacht. Es gibt keine neuen React-State-Updates
innerhalb der Animationsschleife.

Die UV-Flächen werden auf der voll gewachsenen Form gebacken: Andernfalls würden
anfänglich eingezogene Tochterpilze und Zweitschoten zu wenig Texturfläche
erhalten. Die endgültigen Level-III-Aufnahmen prüfen ausdrücklich diese Teile.
Der Bake enthält Oberflächenfarbe, aber kein gebackenes Licht oder AO.

## Assetbudget gegenüber 1539387

| Modell | Desktop Dreiecke vorher → nachher | Mobile vorher → nachher | Primitives vorher → nachher |
| --- | ---: | ---: | ---: |
| Chili | 2.142 → 1.698 | 1.074 → 1.174 | 3 → 3 |
| Schleimpilz | 2.726 → 2.726 | 1.846 → 2.198 | 3 → 3 |
| Runenschale | 2.194 → 1.806 | 1.458 → 1.358 | 3 → 3 |
| Optionale Fassung ab II | 0 → 702 | 0 → 622 | 0 → 2 |

Die drei Zutaten zusammen: **7.062 → 6.230 Dreiecke** Desktop, **4.378 → 4.730**
Mobile. Dabei sind die zunächst eingezogenen Upgrade-Teile bereits enthalten;
Stufe III lädt kein weiteres Zutatenmodell. Dazu kommen Fassungen ab Stufe II,
während die alten Stufensteine/-ringe entfallen. Deshalb ist die Gesamtlast in der
Spielszene aussagekräftiger als diese Einzelmodellzahlen.

Download der drei Zutaten: 1.280.920 → 1.259.376 Bytes Desktop,
573.760 → 693.116 Bytes Mobile. Die einmal geladene Fassung benötigt zusätzlich
68.760 / 66.048 Bytes. Das mobile Paket wächst damit: kein behaupteter
Download- oder Speichergewinn.

Die Zutaten-Bildtexturen bleiben bei 4,25 MiB Desktop / 1,25 MiB Mobile
(RGBA8 mit Mipmaps); die Fassung ergänzt circa 0,083 MiB. Die zusätzlichen
sparsamen Morph-Buffer im GLB betragen zusammen rund 190 / 150 KiB
für die drei Zutaten. Nach dem Laden werden sie als volle Attribute expandiert.
Zusätzlich erzeugt der installierte Three.js-WebGL-Renderer RGBA32F-Morphtexturen:
mindestens 376 KiB Desktop / 303 KiB Mobile einschließlich der geteilten Fassung,
vor möglichem Zeilen-Padding. Keine Stufentexturen in dreifacher Auflösung.

Die Zahlen sind nachvollziehbare Buffer-/Texturschätzungen, **keine gemessene
VRAM-Belegung**. Sie schließen Treiberkopien, Render-Targets und cache-only Assets
nicht vollständig ein. Einzelwerte und SHA-256: [assets.json](assets.json).

## Szenenlast und Tests

Gemessen auf dem lokalen PC mit Chromium/ANGLE und Radeon-GPU; mobile Formate
sind Touch-/Viewport-Emulation, **keine Messung auf einem Smartphone**. Jeweils
identische Spielstände, Kamera, DPR und Warm Fantasy. Die Tabellenwerte enthalten
die vorhandenen Schattenpässe; Speicher umfasst sichtbare Geometriearrays inklusive
Morphs, jedoch nicht die zusätzlich separat geschätzten GPU-Morphtexturen.

| Szene | Draw Calls vorher → nachher | Dreiecke vorher → nachher | Geometrie inkl. Morphs MiB |
| --- | ---: | ---: | ---: |
| Werkbank Desktop, gemischte Stufen | 146 → 144 | 467.222 → 466.498 | 14,193 → 14,441 |
| Desktop, alle Stufe I | 143 → 140 | 466.782 → 465.094 | 14,182 → 14,406 |
| Desktop, alle Stufe II | 152 → 152 | 468.102 → 469.306 | 14,216 → 14,441 |
| Desktop, alle Stufe III | 161 → 152 | 468.174 → 469.306 | 14,223 → 14,441 |
| Zischbert Desktop | 326 → 323 | 773.794 → 772.174 | 18,889 → 19,136 |
| Moor-Martha Desktop | 349 → 347 | 778.442 → 778.674 | 18,946 → 19,181 |
| Werkbank Mobile Portrait | 147 → 145 | 251.524 → 253.008 | 8,348 → 8,579 |
| Werkbank Mobile Landscape | 148 → 146 | 254.354 → 255.838 | 8,348 → 8,579 |
| Zischbert Mobile Landscape | 318 → 315 | 422.460 → 424.136 | 11,457 → 11,688 |
| Moor-Martha Mobile Landscape | 338 → 336 | 427.136 → 430.120 | 11,508 → 11,728 |

Der Bildtextur-Schätzwert wächst bei sichtbarer Upgrade-Fassung um 0,083 MiB,
ohne Fassung bleibt er identisch. Die Hauptszenen benötigen circa 0,22–0,25 MiB
zusätzliche Geometrie-/Morph-Arrays. Desktop-Dreiecke ändern sich nur gering;
Mobile Landscape steigt in der Werkbank um 0,58 %, bei Zischbert um 0,40 % und
bei Moor-Martha um 0,70 %. Die großen Draw-Call-Einsparungen aus Phase 3A bleiben
damit weitgehend erhalten; dieser Polish ist kein neuer großer Performancegewinn.

Die neue Fassung wirft Schatten: Werkbank gemischt **36 → 38**, alle Stufen II/III
**36 → 42**, Zischbert **73 → 75**, Moor-Martha **76 → 80** Schatten-Draw-Calls.
Es bleibt exakt ein Schattenlicht mit derselben Map-Auflösung. Gemessene mediane
CPU-Übermittlung des Schattenpasses liegt je nach Szene bei 0,4–1,3 ms; das ist
keine GPU-Zeitmessung. Neue Fassungen sind daher nicht kostenlos, auch wenn die
Gesamt-Draw-Calls durch entfernte schwebende Marker überwiegend leicht sinken.

Die meisten ruhenden Szenen liegen bei 120 rAF-Intervallen bei etwa 16,67 ms
Mittelwert und 16,7–16,8 ms p95. **Moor-Martha Desktop fällt im archivierten
Nachher-Lauf schlechter aus: 19,31 ms Mittelwert, 33,4 ms p95, 50,1 ms Maximum**
gegenüber 16,67 / 16,8 ms vorher. Ein früherer Lauf mit denselben fertigen Assets
lag dort bei 16,665 / 16,8 ms. Diese Schwankung wird nicht durch Auswahl des
günstigeren Samples verdeckt. Die kurzen Headless-Stichproben belegen weder einen
allgemeinen FPS-Gewinn noch die Ursache des langsameren Laufs oder eine mobile
Gerätefreigabe. Die bekannten Erstkampf-Hänger bleiben separat offen.

Die vollständigen Messdaten stehen in [report.json](report.json), einschließlich
beider mobiler Portrait-Kämpfe und der Warnung zur Animationsbeobachtung.
Die HTML-Vergleichsseite zeigt die Messwerte direkt bei jedem Bildpaar.

Unit-Tests: **161 Tests in 24 Dateien bestanden**. Typecheck und Produktionsbuild
sind erfolgreich. Der bestehende Three.js-Chunk bleibt bei 770,32 kB und erzeugt
weiterhin die Warnung zur 750-kB-Grenze, keinen Buildfehler.

Die Ingame-Matrix enthält **48 bestandene Ablauf-/Bildprüffälle plus eine nur
teilweise erfolgreiche Animationsbeobachtung**. 24 vollständige Spielaufnahmen
bilden 12 kontrollierte Vorher-Nachher-Paare; acht zusätzliche Nahaufnahmen zeigen
das Ensemble und jede Zutat einzeln. Alle 16 Ansichten der HTML-Seite laden;
drei Vergleichstafeln sind in der Haupt-README eingebunden.

Geprüft: nativer Kauf mit gesperrtem Kampfstart während des Flugs/Merges,
Merge I → II und die Kaskade zu III, Auswahl und Tausch mit einem freien Platz,
alle drei Zutaten auf I/II/III einschließlich tatsächlicher Morph-Gewichte und
Podest-Fassung, aktive Feuer-Synergie, unveränderter Glutkern-Platzierungsbuff,
freigeschaltete Reserve, Cooldown-Bögen/-Fortschritt, Kampfstart gegen beide ersten
Gegner, Pause/Fortsetzen, Ergebnis und Rückkehr zur Werkbank. Es gibt keine
Backend-Grenze: geprüft werden DOM-/Touch-Eingaben, localStorage-Spielzustand,
Asset-Requests und die echte Three.js-Szene. Keine Laufzeit- oder Asset-Ladefehler
in der abgeschlossenen Vergleichsmatrix.

Zusätzlich bestehen **neun Grafikvarianten im Produktionsbuild** auf Port 5176:
Golden, Legacy, Ecosystem, Mockup-Standard, Reference, Dark, Magical,
`ingredients=before` und `ingredients=phase3a`. Kauf, Merge und normaler Kampfstart
funktionieren jeweils ohne Grafik-Fallback und ohne Laufzeitfehler. Im
Mockup-Standard wurde zusätzlich der native Tausch zweier belegter Plätze geprüft.
Die Netzwerkprüfung bestätigt, dass Polish-GLBs nicht in Golden oder in die
Phase-3A-Referenz gelangen. Beleg: [variants-production.json](variants-production.json).

### Grenze der aktiven Animationsbeobachtung

Die unveränderten Aktionsgruppen wurden während nativer 1×-Wiedergabe ausgelesen,
nicht nur anhand von Kampfevents vermutet. Die erste Probe beobachtete aktive
Transformationen von Chili und Pilz, die zweite von der Schale. **Keine der beiden
Proben erfasste alle drei zuverlässig in einem einzigen Zeitfenster.** Die zweite
lief 23,89 Sekunden trotz 20-Sekunden-Grenze; die ersten planmäßigen Beats lagen
bei 1,31 / 2,36 / 4,46 Sekunden. Die Beobachtung isoliert die Ursache des langen
Frames nicht, passt aber zu den bereits dokumentierten First-use-Problemen.

Der Bericht behält diese Einschränkung als Warnung und die abgebrochene Assertion
in der Wiederaufnahme-Historie. Es wird weder eine vollständige Animations-
Timing-Freigabe noch eine Behebung der Erstkampf-Hänger behauptet. Bereits
bestandene Desktop-Bilder wurden beibehalten; nur fehlende Abläufe und Mobile
wurden anschließend ergänzt. Es gab dazwischen keine Änderungen an Spielcode,
Assets, Kamera oder Licht, sondern ausschließlich am Beobachtungs-/QA-Skript.

## Kritische gestalterische Bewertung

Der Fortschritt liegt vor allem in **Silhouette und Materialhierarchie**, nicht in
einer höheren Detailmenge: Chili und Pilz sind voller und weicher; die Schale
behält ihre Wiedererkennbarkeit, ohne die stark aufgesetzten dunklen Linien.
Die Upgrade-Elemente gehören nun zum Objekt und seinem Sockel. Leere Sockel
bleiben unverändert und konkurrieren nicht mit dem Kessel.

Es ist **noch keine vollständige Gleichwertigkeit mit Brasskin**. Dessen
individuelle gemalte Highlights, Patina und Materialkanten sind ausgeprägter als
die prozedurale Farbvariation dieser Zutaten. Besonders der Pilzhut bleibt aus
der Nähe relativ gleichmäßig. Die flachen Rissbänder liegen auf der Oberfläche,
sie sind keine eingeschnittenen Vertiefungen. Feine Lamellen, Lentizellen und
Podest-Runen gehen bei kleiner Spielgröße teilweise verloren.

Stufe III ist über zusätzliche Schote, Tochterkappen beziehungsweise Runenflügel
deutlich stärker gestaltet. Der Unterschied I → II ist bewusst zurückhaltender:
mehr Volumen und eine zusätzliche Messingfassung, beim Pilz ein erster kleiner
Auswuchs. Auf sehr kleinen Ansichten bleiben die vorhandenen Level-Informationen
wichtig. Die unveränderten Shop-Porträts zeigen außerdem weiterhin die bisherige
Darstellung. Dieser Pass verändert sie ausdrücklich nicht.

Besonders **Mobile Portrait** begrenzt die unveränderte Kamera die effektive
Darstellungsgröße: Die Zutaten sind als rote Schote, olivfarbener Pilz und helle
Schale erkennbar, einzelne Runen und die niedrige Stufe-II-Fassung aber nur klein.
In der Arena sieht man die Spielerzutaten von hinten; das vorne eingelassene
Schutzzeichen ist dort nicht sichtbar. Silhouette, Familienfarbe und unveränderte
HUD-Kennzeichnung tragen dann die Erkennung. Kamera, UI und Leuchtstärken bleiben
wie beauftragt unverändert; die genannten Grenzen gehören zur visuellen Abnahme.

**Empfehlung zur Abnahme:** Formensprache und integrierte Stufen sind eine bessere
Grundlage. Als endgültigen malerischen Qualitätsmaßstab für alle 20 Zutaten würde
ich sie noch nicht automatisch freigeben. Zuerst die tatsächlichen Desktop- und
Mobile-Spielansichten abnehmen; insbesondere prüfen, ob Stufe II ohne Nachlesen
ausreichend unterscheidbar ist. Falls der Anspruch exakt Brasskins gemalte
Oberflächenqualität bleibt, wäre danach ein begrenzter individueller Texturpass
an diesen drei Referenzzutaten sinnvoller als weitere geometrische Kleinteile.
Die übrigen 17 Zutaten werden ohne Freigabe nicht angefasst.

## Reproduktion

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python art/blender/polish_ingredient_phase3a.py
npm test
npm run typecheck
npm run build
node scripts/audit_ingredient_assets.mjs --polish
node scripts/qa_environment_composition.mjs http://127.0.0.1:5173/ docs/qa/ingredient-art-phase3a-polish --ingredient-polish
node scripts/qa_ingredient_variants.mjs http://127.0.0.1:5176/ --production --polish
node scripts/render_ingredient_comparison.mjs --polish
```

Testspeicherstände existieren nur im isolierten Browser. Der Nutzer-Spielstand
wird nicht verändert. Die Abnahme endet auf dem Arbeitsbranch; `master` und der
veröffentlichte GitHub-Pages-Stand bleiben unangetastet.
