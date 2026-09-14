# PlayCanvas-Bakeoff — PC-C1 Scaffold

Stand: 14. September 2026
Branch: `codex/playcanvas-bakeoff`

## Ergebnis

Das codebasierte PlayCanvas-React-Unterpackage liegt isoliert unter
`experiments/playcanvas/`. Es ersetzt weder den produktiven R3F-Einstieg noch
eine bestehende Route und benötigt weder PlayCanvas Editor noch MCP.

Die technische Testbühne enthält:

- PlayCanvas `2.22.2` und `@playcanvas/react` `0.11.5`, exakt gepinnt;
- React 19, TypeScript 6 und Vite 8 in einer eigenen Lockdatei;
- Camera, Directional Light und ein rotierendes Testmesh;
- responsives Fullscreen-Canvas und minimales DOM-Statusoverlay;
- React Error Boundary mit verständlicher Initialisierungsfehlermeldung;
- Isolationstests gegen Core-Imports und Eingriffe in den Produkteinstieg;
- einen separaten CI-Workflow mit Produkt-Guard und Experiment-Job.

## Verifikation

### Produktanwendung

- `npm ci`: bestanden;
- 16 Testdateien und 53 Tests: bestanden;
- Typecheck: bestanden;
- Produktionsbuild: bestanden;
- Devserver: HTTP 200.

### PlayCanvas-Unterpackage

- frisches `npm ci`: 376 Packages, 0 bekannte Schwachstellen;
- 3 Isolationstests: bestanden;
- Typecheck: bestanden;
- ESLint: bestanden;
- Prettier-Check: bestanden;
- Produktionsbuild mit `base: "./"`: bestanden;
- Devserver: HTTP 200 unter `http://127.0.0.1:5190/`.
- statischer Build unter `/dist/`: HTML, JavaScript und CSS jeweils HTTP 200.

## Build-Budget des technischen Scaffolds

| Datei                 | minifiziert |      gzip |
| --------------------- | ----------: | --------: |
| PlayCanvas-Hauptchunk | 2,246.21 KB | 589.19 KB |
| CSS                   |     1.82 KB |   0.83 KB |
| HTML                  |     0.50 KB |   0.31 KB |

Der PlayCanvas-Hauptchunk überschreitet Vites Standardwarnschwelle deutlich.
Das ist für PC-C1 kein Funktionsfehler, wird aber als messbares Risiko für den
späteren Rendering-Bakeoff geführt. Asset- und Engine-Ladestrategie müssen vor
einer eventuellen Produktentscheidung optimiert und fair mit R3F verglichen
werden.

Vite meldet außerdem die Browser-Externalisierung von `node:worker_threads` in
optionalen PlayCanvas-Workerpfaden. Der Build ist erfolgreich; die betroffenen
Draco-/Gaussian-Splat-Pfade werden in diesem Scaffold nicht verwendet. Bei
späterer Nutzung muss dies gezielt erneut geprüft werden.

## Noch offener visueller Prüfpunkt

Die integrierte Browser-Laufzeit konnte in dieser Sitzung wegen eines lokalen
Kernel-Asset-Pfadfehlers nicht initialisiert werden. Deshalb sind die visuelle
Canvas-, DPR- und Resize-Prüfung sowie die visuelle Ausführung des statischen
Builds noch nicht abgehakt. HTTP-Erreichbarkeit, relative Buildpfade und der
Toolchain-Gate sind verifiziert.

PC-C2 beginnt erst, nachdem dieser visuelle Prüfpunkt und die in
`BASELINE.md` festgehaltene PC-C0-Screenshotmatrix abgeschlossen sind.
