# Batch 2 – Raumarchitektur und Atmosphäre

Aktueller Einbaustand: Alle vier GLBs sind eingegangen, technisch aufbereitet
und im isolierten `?art=mockup`-Vergleich integriert. Der Quellen-Checkpoint
unten ist historisch. Maßgeblich für den aktuellen spielbaren Stand:
[Vergleich und QA](../../../docs/qa/mockup-environment/README.md).

Die vier Einzelbilder wurden am 13.10.2026 mit dem eingebauten Imagegen
aus den verbindlichen Mockups abgeleitet. Jedes Asset hat eine eigene
PNG-Vorlage und den vollständigen verwendeten Prompt. Keine Collage
und keine gemeinsame Mehrfachansicht als to3D-Eingabe verwenden.

| Priorität | Asset | PNG für die einzelne Konvertierung | Vollständiger Prompt | Größter Beitrag |
| --- | --- | --- | --- | --- |
| 1 | Steinwand-Modul | [reference.png](dungeon-wall-module/reference.png) | [prompt.txt](dungeon-wall-module/prompt.txt) | Große Hintergrundflächen bekommen Steinstruktur, Fugen und räumliche Kanten statt glatter Platzhalter. |
| 2 | Massiver Steinbogen | [reference.png](dungeon-stone-arch/reference.png) | [prompt.txt](dungeon-stone-arch/prompt.txt) | Eine echte Raumöffnung und markante, tiefe Architektur für Werkbank und Arena. |
| 3 | Bestücktes Alchemistenregal | [reference.png](alchemy-shelf/reference.png) | [prompt.txt](alchemy-shelf/prompt.txt) | Bücher, Holz und farbige Tränke machen die Raumkulisse sichtbar bewohnt. |
| 4 | Wandkerzenhalter | [reference.png](wall-candle-sconce/reference.png) | [prompt.txt](wall-candle-sconce/prompt.txt) | Wiederverwendbare Träger für animierte Flammen und warme Lichtakzente. |

## Übergabe

- [x] Vier individuelle Bildvorlagen erstellt und visuell geprüft.
- [x] Echte RGBA-PNGs; beide äußeren Bildecken jeweils Alpha 0.
- [x] Steinbogen-Öffnung: Alpha 0 auch in der Bildmitte.
- [x] Prompts und Manifest im Projekt gespeichert.
- [x] B2-01: vom Nutzer konvertierte Steinwand-GLB erhalten und unverändert gesichert.
- [x] B2-01: Geometrie, UVs und Originalform geprüft; Modulanschlüsse brauchen noch einen In-Game-Reihungstest.
- [x] B2-02: Steinbogen als eigene GLB erhalten und unverändert gesichert.
- [x] B2-02: freie Öffnung, Dicke und Silhouette geprüft; beim Einbau Frontachse um Y 90 Grad an die Wand ausrichten.
- [x] B2-03: Regal als eigene GLB erhalten und unverändert gesichert.
- [x] B2-03: räumliche Form und erkennbare Flaschen/Bücher geprüft.
- [x] B2-04: Wandkerzenhalter als eigene GLB erhalten und unverändert gesichert.
- [x] B2-04: Halterform, Materialien und genaue Dochtposition geprüft.
- [x] Technische Aufbereitung, LODs, Materialien und Ursprünge.
- [x] Einbau und Screenshots im tatsächlich spielbaren Desktop-/Mobile-Layout.
- [ ] Abschließende gestalterische Abnahme am verbindlichen Mockup-Ziel.

Die Bilder sind hochwertige Ausgangsvorlagen, aber kein Beleg für die Qualität
der rekonstruieren GLBs oder des fertigen Spiels. Die Steinwand ist im Bild
geradlinig angelegt; Nahtfreiheit, Rückseite und reale Modulmaße werden erst
am Modell geprüft. Beim Bogen darf to3D das Loch nicht mit Geometrie schließen.
Das Regal wird zunächst als ein zusammenhängendes Dekorationsasset behandelt;
die Flaschen sind noch keine separat animierbaren Modelle. Beim Kerzenhalter
werden Flamme, Licht und Rauch später an einem gemessenen Dochtanker ergänzt.

Für gemessene Rohdaten, echte Durchgangsprüfung und noch offene Quality Gates:
[Technischer Audit der eingegangenen Batch-2-Modelle](TECHNICAL_REVIEW.md).

## Pipeline und Spielstatus

`Einzelbild -> einzelner to3D-Upload -> unveränderte source.glb -> technische
Nachbearbeitung -> Desktop-/Mobile-Modell -> Placement/VFX/Readiness -> QA`

Blender dient ausschließlich technischer Nachbearbeitung und Prüfung, nicht
einem neuen gestalterischen Ersatzmodell. Die Standardansicht bleibt unverändert;
die neue Vergleichsansicht verwendet die aufbereiteten Batch-1-/Batch-2-Modelle
und den gelieferten Boden/Pfeiler aus Batch 3. Der historische Rohdaten-Checkpoint
steht im [Batch-1-Audit](../batch-01/TECHNICAL_REVIEW.md).
