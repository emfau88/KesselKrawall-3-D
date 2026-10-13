# PlayCanvas-Bakeoff — PC-C2 Assetkalibrierung

Stand: 14. September 2026
Branch: `codex/playcanvas-bakeoff`

## Ergebnis

PC-C2 lädt die bestehende Hero-Werkbank, den Spieler-Kessel und drei
Referenzzutaten direkt aus dem produktiven `public/assets/hero`-Bestand. Keine
GLB-Datei wurde kopiert oder verändert. Alle Korrekturen liegen als zentrale
Transformdaten im PlayCanvas-Unterpackage.

Der deterministische Zustand entspricht der Baseline:

| Slot | Inhalt | Stufe |
|---:|---|---:|
| 1 | Glut-Chili | II |
| 2 | Schleimpilz | II |
| 3 | Runenschale | II |
| 4 | leer | — |
| 5 | leer | — |

## Assetinventar und Bounds

Die Bounds wurden mit Blender 5.2 aus den unveränderten GLBs ermittelt und in
die glTF-/PlayCanvas-Achsenordnung X/Y/Z übertragen. Einheit ist jeweils die im
GLB gespeicherte Szeneneinheit.

| Asset | Dateigröße | Minimum X/Y/Z | Maximum X/Y/Z | Größe X/Y/Z |
|---|---:|---|---|---|
| Hero-Werkbank | 640,696 B | −4.220 / −2.200 / −3.340 | 4.220 / 0.535 / 3.200 | 8.440 / 2.735 / 6.540 |
| Spieler-Kessel | 752,024 B | −1.255 / −1.170 / −1.428 | 1.255 / 0.910 / 1.170 | 2.510 / 2.080 / 2.598 |
| Glut-Chili | 109,644 B | −0.426 / −0.633 / −0.168 | 0.520 / 0.927 / 0.160 | 0.946 / 1.560 / 0.328 |
| Schleimpilz | 175,140 B | −0.620 / −0.590 / −0.580 | 0.620 / 0.600 / 0.580 | 1.240 / 1.190 / 1.160 |
| Runenschale | 98,244 B | −0.540 / −0.580 / −0.620 | 0.540 / 0.591 / 0.532 | 1.080 / 1.171 / 1.152 |

Gesamttransfer der fünf GLBs: 1,775,748 Byte, ohne HTTP-Kompression. Die GLBs
verwenden eingebettete Geometrie und Materialien; es entstehen keine weiteren
externen Texturrequests für diesen Zustand.

## Kalibrierung

- Die Werkbank wird mit Maßstab 1 geladen und über ihre Y-Minimumgrenze auf den
  Szenenboden gesetzt.
- Die Tischoberfläche liegt zentral bei Y = 2.735.
- Der Kessel verwendet den R3F-vergleichbaren Maßstab 1.05 und wird über seine
  Unterkante auf die Tischoberfläche gesetzt.
- Level-II-Zutaten verwenden den R3F-vergleichbaren effektiven Maßstab 1.04.
- Jede Zutatenhöhe berücksichtigt ihre eigene Y-Unterkante; dadurch stehen die
  Modelle auf den Slots statt darin zu schweben oder einzusinken.
- X/Z-Slotpositionen entsprechen der produktiven Workshop-Anordnung.
- PlayCanvas' Y-up-System entspricht der glTF-Runtimeachse. Der Blender-Bericht
  konvertiert dessen Z-up-Ausgabe für diese Tabelle zurück nach Y-up.
- Authored Materialslots bleiben in PC-C2 unverändert. Ihre gemeinsame
  Materialpolicy folgt erst in PC-C5.

## Pfad- und Ladevertrag

- Entwicklung: Vite stellt das gemeinsame Root-`public` unter `/assets` bereit.
- Statischer Unterpfad: Das Experiment referenziert `../assets`, passend zu
  `dist/playcanvas/` neben `dist/assets/`.
- `copyPublicDir: false` verhindert eine zweite Assetkopie im Experimentbuild.
- Bis alle fünf Modelle bereit sind, blockiert ein sichtbarer Loader die Szene.
- Ladefehler nennen das konkrete Modell und werden nicht still durch ein anderes
  Modell kaschiert.

## Verifikation

- fünf von fünf Asset-URLs: HTTP 200;
- alle Antworten: MIME `model/gltf-binary` und GLB-Magic `glTF`;
- fünf Isolation-/Assettests: bestanden;
- Typecheck: bestanden;
- nach Vite-Neustart und erzwungenem Seitenreload keine neuen Devserver-
  Konsolen- oder Assetladefehler protokolliert;
- Blender-Bounds-Skript: bestanden.

## Offene Gate-Punkte

Die eigentliche Bildabnahme von Auflage, Größenwirkung und Slot-Sichtbarkeit ist
noch offen, weil die verfügbare Windows-/Browser-Automationslaufzeit an einem
lokalen Kernel-Asset-Pfadfehler scheitert. Die Szene läuft im bereits geöffneten
lokalen Tab. PC-C3 darf erst nach visueller Bestätigung der PC-C2-Komposition
beginnen.
