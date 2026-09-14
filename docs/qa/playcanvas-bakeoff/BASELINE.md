# PlayCanvas-Bakeoff — PC-C0 Baseline

Stand: 14. September 2026  
Branch: `codex/playcanvas-bakeoff`  
Fixierter Produktionscommit: `a640541` (`Add main menu game shell`)

## Isolationsvertrag

- Das produktive R3F-Spiel bleibt unter `src/` und wird weiterhin durch den
  bestehenden Pages-Workflow gebaut.
- Der PlayCanvas-Versuch lebt ausschließlich unter `experiments/playcanvas/`.
- `src/core/` wird im Rendering Proof nicht importiert und niemals kopiert.
- Bestehende Runtime-Assets werden in späteren Bulks nur lesend aus
  `public/assets/` verwendet.
- Der Versuch benötigt weder PlayCanvas Editor noch MCP.
- Der erste Rendering Proof wird nicht auf GitHub Pages veröffentlicht, bevor
  sein eigenes Gate bestanden ist.

## Reproduzierbarer Vergleichszustand

Der Renderingvergleich verwendet den bereits im produktiven Hauptmenü fest
definierten Workshop-Tableau-Zustand:

| Slot | Zutat       | Stufe |
| ---: | ----------- | ----: |
|    1 | Glut-Chili  |    II |
|    2 | Schleimpilz |    II |
|    3 | Runenschale |    II |
|    4 | leer        |     — |
|    5 | leer        |     — |

Der Zustand ist unabhängig von Savegame, Systemzeit und Zufallszahlengenerator.
Für die späteren A/B-Aufnahmen wird das Menü als Overlay ausgeblendet, nicht der
darunterliegende Szenenzustand verändert.

## Pflicht-Viewports und Dateinamen

```text
docs/qa/playcanvas-bakeoff/
  r3f-pc-c0-workshop-1920x1080.png
  r3f-pc-c0-workshop-1280x720.png
  r3f-pc-c0-workshop-915x412.png
  r3f-pc-c0-workshop-844x390.png
  r3f-pc-c0-workshop-390x844.png
  pc-pc-c3-workshop-<viewport>-<camera>.png
  pc-pc-c4-workshop-<viewport>-<lighting>.png
  pc-pc-c5-workshop-<viewport>-<materials>.png
  pc-pc-c6-workshop-<viewport>-<effects>.png
```

Vorhandene historische Referenzen bleiben zusätzlich verfügbar:

- `docs/screenshots/main-menu-desktop.png`
- `docs/screenshots/workshop-desktop.png`
- `docs/screenshots/workshop-mobile-portrait.png`
- `docs/screenshots/workshop-mobile-landscape.png`
- `docs/qa/phase-2/workshop-golden.png`

## Systemkontext

| Feld                        | Wert                                  |
| --------------------------- | ------------------------------------- |
| Betriebssystem              | Windows 10/11 Buildlinie `10.0.26200` |
| Shell                       | PowerShell                            |
| lokale Node-Runtime         | `22.17.1`                             |
| gebündelte Scaffold-Runtime | `24.19.0`                             |
| npm                         | `10.9.2`                              |
| Browser/GPU                 | bei visueller Aufnahme nachzutragen   |

Das offizielle `create-playcanvas` 0.8.0 benötigt Node 22.23.2 oder neuer und
wurde deshalb mit der gebündelten Node-24-Runtime ausgeführt. Das erzeugte
Unterpackage verwendet keine Generator-Runtime und akzeptiert dieselbe
Node-22.12+-Linie wie Vite 8 und das Produktrepository.

## Produkt-Baseline

Quality Gate am 14. September 2026:

- 16 Testdateien bestanden;
- 53 Tests bestanden;
- TypeScript-Projektbuild bestanden;
- Vite-Produktionsbuild bestanden;
- lokaler Devserver antwortet mit HTTP 200.

### JavaScript- und CSS-Budget

| Chunk       | minifiziert |      gzip |
| ----------- | ----------: | --------: |
| App/Core/UI |   298.29 KB |  91.54 KB |
| R3F         |   169.21 KB |  54.06 KB |
| Three.js    |   768.23 KB | 197.05 KB |
| 3D-Szene    |   113.22 KB |  23.28 KB |
| CSS         |    54.94 KB |  12.14 KB |

## Messprotokoll für PC-C3 bis PC-C6

Pro Variante werden nach mindestens 120 Warm-up-Frames mindestens 600 Frames
gemessen. Cold Load und Warm Load werden getrennt ausgeführt.

Zu erfassen:

- Zeitpunkt Navigation → erster vollständiger 3D-Frame;
- durchschnittliche Frame-Time;
- P95-Frame-Time;
- Drawcalls und Triangles;
- sichtbare dynamische Lichter und Schatten-Caster;
- Material-/Shaderanzahl;
- übertragene Assets bei leerem und warmem Cache;
- Browserkonsolenfehler und fehlgeschlagene Requests.

Die gewichtete visuelle Scorecard bleibt die kanonische Tabelle aus
`docs/RENDERING_REWORK_ROADMAP.md`; sie wird nicht abweichend dupliziert.

## Gate-Status PC-C0

- [x] Isolierter Branch angelegt.
- [x] Produktionscommit fixiert.
- [x] deterministischer Workshop-Zustand definiert.
- [x] Messbedingungen und Dateinamen definiert.
- [x] Root-Tests, Typecheck und Build grün.
- [x] Historische Desktop-/Portrait-/Landscape-Referenzen inventarisiert.
- [ ] Frische Screenshots in allen fünf Pflicht-Viewports.
- [ ] Browser- und GPU-Daten aus derselben Aufnahmesitzung.
- [ ] echte Frame-, Drawcall- und Transfermesswerte.

Die letzten drei Punkte bleiben offen, weil die integrierte Browser-Runtime in
dieser Sitzung an einem lokalen Kernel-Asset-Pfadfehler scheiterte. Es wurde
bewusst kein anderes Browserautomationssystem verwendet. Das technische
Scaffold aus PC-C1 ist davon unabhängig; PC-C2 darf erst nach Abschluss dieses
visuellen Gates beginnen.
