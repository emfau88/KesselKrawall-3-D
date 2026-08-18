# Mobile- und Performance-QA

Stand: 18. August 2026

## Unterstützte Darstellung

Die Oberfläche ist für aktuelle Browser mit WebGL 2 und Web Audio ausgelegt.
Sie funktioniert mit Maus, Tastatur und Touch in Portrait und Landscape.

- Kamera-Zoom berücksichtigt Breite und Höhe des tatsächlichen Canvas.
- Portrait erhält ein zweizeiliges Shoplayout; Landscape nutzt eine kompakte
  horizontale Leiste.
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

Nach Lazy Loading und expliziter Vendor-Aufteilung (Produktionsbuild vom
18.08.2026):

| Chunk | minifiziert | gzip | Ladezeitpunkt |
|---|---:|---:|---|
| App/Core/UI | ca. 239 KB | ca. 75 KB | initial |
| R3F-Laufzeit | ca. 167 KB | ca. 53 KB | mit 3D-Bühne |
| Three.js | ca. 724 KB | ca. 185 KB | mit 3D-Bühne, langfristig cachebar |
| eigene 3D-Szene | ca. 28 KB | ca. 6 KB | mit 3D-Bühne |
| CSS | ca. 15 KB | ca. 4 KB | initial |

Der initiale JavaScript-Chunk sank dadurch von ungefähr 1,13 MB auf ungefähr
239 KB. Device Pixel Ratio ist auf 1,35 begrenzt, Schatten nutzen die günstige
Basic-Variante und 768er Shadowmaps.

## Verifikation

- TypeScript strict: Pflicht
- Vitest Core/Integration: Pflicht
- Produktionsbuild mit relativem `base`: Pflicht
- Third-Party-Lizenzbericht im Build: Pflicht
- Physischer Mobile-Smoketest nach Deployment: empfohlen, insbesondere für
  iOS-Audiofreigabe, Android-Browserleisten und gerätespezifische Safe Areas
