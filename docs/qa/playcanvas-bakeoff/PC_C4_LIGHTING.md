# PC-C4 — Lighting, Environment und Farbmanagement

Stand: 15. September 2026

## Ergebnis

Der isolierte Workshop besitzt ein reproduzierbares Licht- und IBL-System mit
derselben Dramaturgie auf Desktop und Mobile. PC-C4 ist technisch umgesetzt;
die subjektiven Bildgates bleiben bis zum kontrollierten A/B-Screenshot offen.

## Farbpfad

1. Die vom PlayCanvas-GLB-Loader als Farbinformation erkannten Basetexturen
   werden sRGB-korrekt gelesen.
2. Das prozedurale Equirectangular-Environment wird ausdrücklich als sRGB
   angelegt und für die lineare Beleuchtungsberechnung vorgefiltert.
3. Licht, Materialantwort und Environment-Reflexion werden im linearen Raum
   berechnet.
4. Die Kamera komprimiert HDR-Werte mit ACES 2 und gibt das Ergebnis mit
   `GAMMA_SRGB` aus.
5. Die warme Variante verwendet Exposure 1,04, die neutrale Variante 0,98.

## Lichtaufbau und Kosten

| Rolle | Typ | Anzahl | Schatten | Zweck |
| --- | --- | ---: | --- | --- |
| Key | Directional | 1 | PCF3 | Hero-Kessel, Werkbank und Hauptformen |
| Fill | Directional | 1 | nein | kühle Zeichnung in warmen Schatten |
| Rim | Directional | 1 | nein | Silhouette des Kessels |
| Kessel-Practical | Omni | 1 | nein | magischer Cyan-Akzent |
| sichtbare Kerzen | Omni + Geometrie | 2 | nein | motiviertes warmes Raumlicht |

Damit existieren sechs Lichter, aber nur ein Schatten-Caster. Zusätzliche
Omni-Schatten werden bewusst vermieden, bis ein messbarer visueller Nutzen
nachgewiesen ist.

## Qualitätsprofile

| Parameter | Desktop | Mobile |
| --- | ---: | ---: |
| Lighting Source | 64 px | 32 px |
| Environment Atlas | 256 px | 128 px |
| Reflection Samples | 64 | 32 |
| Ambient Samples | 128 | 64 |
| Key Shadow Map | 2048 px | 1024 px |

Beide Profile verwenden identische Lichtrollen, Farben und Positionen. Mobile
reduziert ausschließlich Kosten. Die IBL-Erzeugungszeit und die tatsächlich
gewählte Atlasgröße werden live im Status-HUD angezeigt und nicht geschätzt.

## Reproduzierbare Varianten

- Warm, automatische Qualität: `http://127.0.0.1:5190/`
- Neutral: `http://127.0.0.1:5190/?light=neutral`
- Mobiles Kostenprofil: `http://127.0.0.1:5190/?quality=mobile`
- Kombinierbar mit Kamera und FOV, etwa
  `?camera=portrait&light=neutral&quality=mobile&fov=40`.

## Noch offene visuelle Abnahme

- Warm und neutral in denselben fünf Pflicht-Viewports gegenüberstellen.
- Environment-Intensität nach PC-C5 an Eisen, Messing, Holz und Glas bewerten.
- Hero-Fokus, Schattenzeichnung, Metalllesbarkeit und Farbstich mit der
  Scorecard bewerten.
- Frame-Time, Drawcalls und GPU-Kosten unter den dokumentierten Messbedingungen
  erfassen.
