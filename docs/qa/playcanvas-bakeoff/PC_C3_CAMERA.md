# PlayCanvas-Bakeoff — PC-C3 Responsive Kamera

Stand: 14. September 2026
Branch: `codex/playcanvas-bakeoff`

## Ergebnis

PC-C3 ersetzt die provisorische Einzelkamera durch drei datengetriebene
Perspective-Camera-Presets. Der aktive Modus folgt automatisch dem Viewport,
kann für reproduzierbare A/B-Vergleiche aber über die URL festgesetzt werden.

| Preset | Referenz | Position | Look-Target | FOV | Clipping |
|---|---|---|---|---:|---|
| Desktop | 1920×1080 / 1280×720 | 0 / 7.10 / 13.40 | 0 / 3.05 / 0.65 | 39° | 0.1–80 |
| Landscape | 915×412 / 844×390 | 0 / 7.75 / 15.10 | 0 / 3.00 / 0.72 | 38° | 0.1–80 |
| Portrait | 390×844 | 0 / 9.20 / 24.20 | 0 / 3.05 / 0.65 | 42° | 0.1–90 |

Die Portraitkamera steht bewusst deutlich weiter entfernt. Dadurch bleibt der
Kessel zusammen mit allen fünf Slots sichtbar, ohne dies mit einem starkem
Weitwinkel und entsprechender Fisheye-Wirkung zu erzwingen.

## Automatische Auswahl

- Seitenverhältnis unter 0.8: Portrait;
- Höhe bis 500 px und Seitenverhältnis ab 1.5: Landscape;
- ansonsten: Desktop.

`resize` und `orientationchange` werden direkt beobachtet. Positions- und
Look-Target-Wechsel laufen mit zeitbasierter exponentieller Dämpfung, sodass ein
Presetwechsel nicht als harter Kamerasprung erscheint. Canvas-Füllmodus und
Renderauflösung folgen gleichzeitig automatisch dem Fenster.

## Reproduzierbare Varianten

```text
http://127.0.0.1:5190/?camera=desktop
http://127.0.0.1:5190/?camera=landscape
http://127.0.0.1:5190/?camera=portrait
http://127.0.0.1:5190/?camera=portrait&fov=42
```

`camera` akzeptiert `desktop`, `landscape` oder `portrait`. `fov` akzeptiert
jeden numerischen Wert von 35 bis 45 Grad. Ungültige Angaben fallen auf die
automatische Auswahl beziehungsweise den Preset-FOV zurück.

## Maschineller Framing-Gate

Ein Projektionsgeometrie-Test berechnet für jedes Preset die normalisierten
Bildkoordinaten der fünf Slotmittelpunkte und der maßgeblichen Kesselgrenzen.
Geprüft werden:

- positive Tiefe innerhalb Near/Far Clipping;
- horizontaler und vertikaler Bildraum mit mindestens acht Prozent Reserve;
- Referenzformate 1280×720, 844×390 und 390×844.

Alle kritischen Punkte bestehen diesen Test. Dadurch ist das geometrische
Framing reproduzierbar abgesichert und nicht nur durch geschätzte
Kamerakonstanten definiert.

## Verifikation

- acht PlayCanvas-Architektur-, Asset- und Kameratests: bestanden;
- Typecheck: bestanden;
- ESLint und Prettier: bestanden;
- Desktop-Devserver nach vollständigem Reload ohne neue Runtimefehler;
- Assets weiterhin ohne Kopie aus dem Root-`public` geladen.

## Offenes visuelles Gate

FOV-Varianten, Hero-Fokus, Raumtiefe und die endgültige 4/5-Wertung müssen noch
als echte Screenshots in allen fünf Pflicht-Viewports beurteilt werden. Die
Windows-/Browser-Automationslaufzeit ist weiterhin wegen ihres lokalen
Kernel-Asset-Pfadfehlers nicht verfügbar. Daher bleiben die visuellen
PC-C3-Gate-Checkboxen und der direkte R3F-Vergleich bewusst offen.
