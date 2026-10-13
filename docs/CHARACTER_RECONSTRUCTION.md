# Kesselcharaktere im Spiel

Brasskin ist der Spielerkessel in Hauptmenü, Werkbank und Kampf. Zischbert und
Moor-Martha ersetzen als erste beiden Gegner ihre bisherigen modularen Modelle.
Die ursprünglichen Charakterformen und Farbtexturen bleiben erhalten; lokale
Gesichtsmorphs und separat animierte Flüssigkeiten bringen sie in Bewegung.
Die Spielregeln und vorhandenen Zutatenmodelle bleiben unverändert.

## Charaktere und Mimik

Brasskin beginnt mit einem schmaleren, ruhigen Mund. Das breite Grinsen bleibt
Freude und Sieg vorbehalten. Treffer und Niederlage verwenden einen eigenen
schlaffen beziehungsweise herabgezogenen Ausdruck. `FaceNeutral` und `Hurt`
sind vollständige Formen vom Ausgangsgesicht aus und werden überblendet,
nicht gleichzeitig mit voller Stärke addiert.

Zischbert behält seine aggressiven Augen, Zähne, den Flammenrand und Lava-Risse.
Moor-Martha behält ihre schiefen, müden Gesichtszüge, Nase, Pilze und Moos.
Ihre asymmetrischen Augen verwenden eigene gemessene Masken. Alle drei besitzen
acht lokale Morphs für Blinzeln, Blick, neutralen Mund, Freude, Überraschung
und Treffer. Cast, Schutz, Heilung, Sieg und Niederlage kombinieren diese
Morphs mit Körperbewegungen und Reaktionen des Tranks.

## Einbindung und Ressourcen

`CauldronActor` wählt die neuen Charaktere ohne zusätzliche alte Gesichter oder
Regalia. `BrasskinCauldron` klont Instanzen und Materialien, hält Geometrie und
Texturen im Loader-Cache und räumt eigene Effekte beim Szenenwechsel auf.
Laufende Animationen ändern keine React-Zustände pro Frame.

Die Flüssigkeit erhält Wellen, einen bewegten Strudel, Blasen, Dampf und
Impulsreaktionen. Der gemeinsame `LivingLiquid`-Baustein verwendet Jade für
Brasskin, Orange für Zischbert und Giftgrün für Martha. Mobile verwendet zwölf
statt 24 Blasen und 20 statt 44 Dampfpartikel. Separate reduzierte GLBs werden
anhand des bestehenden Geräteprofils geladen, nicht nur kleiner dargestellt.

| Charakter | Desktop-Dreiecke | Mobile-Dreiecke | Desktop / Mobile Bytes |
|---|---:|---:|---:|
| Brasskin | 26.452 | 18.451 | 3.952.460 / 3.242.832 |
| Zischbert | 28.511 | 18.512 | 3.997.156 / 3.104.164 |
| Moor-Martha | 27.984 | 17.983 | 3.953.500 / 3.094.588 |

Die Koordinaten sind einheitlich: Y nach oben, Gesicht nach +Z, Füße bei null.
Im Kampf dreht die äußere Spielergruppe um 180 Grad zum Gegner; die Kamera
sieht Brasskins Rückseite. Der vorhandene Abstand und die freie Effektbahn
bleiben bestehen. Das Kampf-Ladegate enthält die tatsächlich gewählten
Spieler- und Gegnerdateien und wartet auf die gerenderte Arena.

## Quellen und reproduzierbare Aufbereitung

Die unveränderten Ausgangs-GLBs liegen unter `art/source/brasskin/` und
`art/source/enemies/`. Die Originalbilder, Quellen und Prüfsummen der ersten
beiden Gegner stehen im dortigen Referenzmanifest. Beide to3D-Aufträge wurden
auf ausdrücklichen Nutzerwunsch mit Qualität `high` und Verwendung `game`
ausgeführt. Die originale Quelldatei wird niemals durch die Bearbeitung ersetzt.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python art/blender/build_brasskin_morph_character.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python art/blender/build_legacy_enemy_characters.py -- --no-preview
node --test experiments/cauldron-character/tests/assets.test.mjs
node scripts/qa_characters.mjs http://127.0.0.1:5173/
```

Die bearbeitbaren `.blend`-Dateien liegen unter `art/blender/`; jeder Charakter
besitzt einen `character-contract.json` mit Struktur, Mimik und Exportmaßen.
Nur `FaceNeutral ≈ 0,85` ist standardmäßig aktiv. Alle anderen Startgewichte
sind null; die Tests prüfen die tatsächlichen binären GLB-Daten.

## Abnahme und Grenzen

Die neun Asset-Tests prüfen alle sechs GLBs auf Normalen, UVs, Texturen,
Morph-Daten, Startgewichte, Prüfsummen und Geometriebudgets. Neun vertikale
Strahlen pro Variante prüfen, dass kein alter Flüssigkeitsdeckel den neuen
Trank verdeckt. Die Brasskin-Vorschau besteht zusätzlich 18 Browserfälle.
Die Spieleinbindung und Desktop-/Mobile-Bilder stehen unter
[`qa/character-integration/`](qa/character-integration/README.md).

Das ist eine deutliche Verbesserung der Charaktere, kein neuer vollständiger
Produktions-Gesichtsrig. In den Originaltexturen sind Lichtreflexe enthalten;
an Wangen und Lippen können sie sich beim Verformen sichtbar strecken.
Zischberts geschlossene Augen behalten eine kleine orange Texturfalte.
Separate PBR-Textursets, Gesichts-Retopologie und physische Android-/iPhone-
Leistungsprüfungen stehen noch aus. Die Dokumentation der Quellen behauptet
keine kommerzielle Lizenzfreigabe; siehe [`ASSET_LICENSES.md`](ASSET_LICENSES.md).

Die zwölf Zutatenbilder aus Kampagne 1 sind unter
`art/source/ingredients-campaign-1/` ausschließlich als Referenzen gesichert.
**Es wurden keine Zutaten-3D-Aufträge gestartet.** Die bisherigen
Zutatenmodelle und Leveldarstellungen bleiben im Spiel.
