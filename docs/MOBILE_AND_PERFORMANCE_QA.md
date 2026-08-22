# Mobile- und Performance-QA

Stand: 22. August 2026

## Unterstützte Darstellung

Die Oberfläche ist für aktuelle Browser mit WebGL 2 und Web Audio ausgelegt.
Sie funktioniert mit Maus, Tastatur und Touch in Portrait und Landscape.

- Kamera-Zoom berücksichtigt Breite und Höhe des tatsächlichen Canvas.
- Portrait erhält ein zweizeiliges Shoplayout; Landscape nutzt eine kompakte
  horizontale Leiste.
- Der Portrait-Kampf nutzt eine vertikale Duellachse mit Gegner oben,
  freier VFX-Zone und Spieler-Rückansicht unten; Utility-Schalter weichen an
  den unteren Rand aus und überdecken keine Lebensbalken.
- Im kompakten Kampf verschwinden nicht notwendige Titelpaneele. Runwerte und
  Utilities sitzen in den unteren Safe Areas, während die Kamera Arena,
  Publikum, Zutaten und die vollständige Projektilbahn freihält.
- Slotsteuerung liegt zusätzlich als semantische DOM-Schaltflächen vor.
- Alle primären Touchziele sind bei grober Zeigereingabe mindestens 44×44 CSS-Pixel.
- `env(safe-area-inset-*)` hält HUD und Aktionen aus Displayausschnitten heraus.
- `prefers-reduced-motion` reduziert CSS-Übergänge.
- Audio startet erst nach einer Nutzerinteraktion und kann dauerhaft stumm
  geschaltet werden.
- Bei fehlendem WebGL erscheint ein verständlicher Fallback statt einer leeren
  Fläche.

## Zielgrößen

| Viewport | Orientierung | Layoutvertrag |
|---|---|---|
| 1920×1080 | Desktop Landscape | vollständige Beschriftungen, frontale Werkbank |
| 1280×720 | Desktop/Laptop | vollständiger Shop ohne Überlagerung |
| 907×510 | kompakt Landscape | verkürztes HUD, drei Angebote und Kampfaktion |
| 844×390 | Mobile Landscape | 44px-Touchziele, kompakter Reroll |
| 915×412 | Mobile Landscape | Safe-Area-taugliche Bedienleiste |
| 800×450 | Mobile/Embedded | vollständiger Kernloop |
| 390×844 | Mobile Portrait | zweizeiliger Shop, breitenlimitiertes 3D-Framing |

## Build-Budget

Nach Lazy Loading, expliziter Vendor-Aufteilung und Blender-/KayKit-Integration
(Produktionsbuild vom 22.08.2026):

| Chunk | minifiziert | gzip | Ladezeitpunkt |
|---|---:|---:|---|
| App/Core/UI | ca. 253 KB | ca. 78,8 KB | initial |
| R3F-Laufzeit | ca. 169 KB | ca. 54 KB | mit 3D-Bühne |
| Three.js | ca. 768 KB | ca. 197 KB | mit 3D-Bühne, langfristig cachebar |
| eigene 3D-Szene | ca. 84,6 KB | ca. 18,1 KB | mit 3D-Bühne |
| CSS | ca. 29,6 KB | ca. 7,1 KB | initial |

Der initiale JavaScript-Chunk bleibt dadurch bei ungefähr 253 KB. Der aktuelle
3D-Szenen-Chunk liegt nach dem Combat-Feedback-Pass bei rund 84,6 KB beziehungsweise
18,1 KB gzip. KayKit bleibt als A/B-Fallback mit gemeinsamem 17-KB-Atlas
enthalten. Die Quaternius-Auswahl umfasst 22 Modelle und 8,20 MiB
mobiloptimierte Runtime-Dateien über alle drei Pakete; pro Szene werden nur die
referenzierten Modelle und gemeinsamen Texturen geladen. Zwei kleine originale
Character-Kit-GLBs ergänzen den externen Donor, ohne dessen Texturen zu
duplizieren. Device Pixel Ratio ist auf 1,35 begrenzt; Schatten verwenden
PCF-Filtering und 1024er Shadowmaps.

## Verifikation

- TypeScript strict: Pflicht
- Vitest Core/Integration: 43 Tests in 11 Dateien bestanden
- Produktionsbuild mit relativem `base`: Pflicht
- Third-Party-Lizenzbericht im Build: Pflicht
- Browser-Smoke-Test Shop → Kauf → Arena → Ergebnis: bestanden
- 1280×720 Desktop, 844×390 Landscape und 390×844 Portrait: bestanden
- Automatisierter CDP-Durchlauf validiert Kaufverzögerung, Merge-Zwischenstand,
  endgültige Stufe II, sichtbare Kampfzahl, Poison-Statusbadge,
  Platzierungsbuff-Details und Layoutrechtecke: bestanden
- Mobile Portrait und Landscape: kein horizontaler oder vertikaler Overflow;
  HUD, Runwerte und Utilities bleiben vollständig innerhalb des Viewports
- Phase-2-Browsermatrix mit `legacy`, `ecosystem` und `golden`: bestanden
- Workshop mit drei belegten Slots, Moor-Martha sowie Fire-/Poison-VFX:
  bestanden
- Öffentlicher Pages-Smoke-Test mit Hero-GLB-Load, Kauf, Kampfstart und Pause:
  bestanden (`c19e502`)
- Physischer Mobile-Smoketest nach Deployment: empfohlen, insbesondere für
  iOS-Audiofreigabe, Android-Browserleisten und gerätespezifische Safe Areas
