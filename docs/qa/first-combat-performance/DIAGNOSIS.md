# Nachweis der Blockierung beim ersten Kampf

Ausgangsstand: `353d154524cb9490b3db07a46bcafc8fe17179e1`. Die Diagnose trennt den Ort der Blockierung, die tatsächlich verbrauchte CPU-Zeit und die Zeit auf der GPU. Die wiederholten, leichter instrumentierten Abnahmemessungen stehen im [Hauptbericht](README.md); die folgenden Zahlen stammen aus zwei einzelnen, ausführlich instrumentierten Traces.

Der Kandidaten-Trace zeigt den korrigierten Renderingpfad vor der anschließend
gefundenen und behobenen Gate-Lifecycle-Regression. Die letzte Korrektur betrifft
nur den Umgang mit bereits entsorgten alten Programmhandles, nicht Lichtslots,
Shaderquellen, Materialien oder Zeichnung. Die abschließende Messmatrix prüft den
Produktionsbuild **mit** dieser zusätzlichen Korrektur; die Einzeltraces sind
kein Ersatz für die Messungen des endgültigen Build-Hashes.

## Was den Browser blockiert

Im ursprünglichen aktiven Kampf wartet Three beim ersten Zugriff auf neue Shaderprogramme synchron in `WebGLRenderingContext.getProgramInfoLog`. Gleichzeitig arbeitet der GPU-Prozess auf ANGLE-Worker-Threads. Die Renderer-Hauptschleife kann während dieser Wartezeit keine weiteren Frames abarbeiten.

| Aktiver Render der Baseline | Render-Walltime | Darin synchrone Programmabfragen | Renderer-Thread-CPU der umgebenden Aufgabe | ANGLE-Worker-CPU im Intervall | GC auf Renderer-Hauptthread |
| --- | ---: | ---: | ---: | ---: | ---: |
| erster | 4395,1 ms | 4351,1 ms, 14 Aufrufe | 94,5 ms | 4423,5 ms | 2,0 ms |
| nächster | 4611,1 ms | 4561,0 ms, 14 Aufrufe | 92,0 ms | 4624,0 ms | 1,7 ms |
| weiterer | 4876,0 ms | 4825,4 ms, 14 Aufrufe | 99,0 ms | 4905,7 ms | 0,0 ms |

Die Programmabfragen erklären jeweils rund 99 % der Render-Walltime. Die ANGLE-CPU-Zeit ist über mehrere Worker summiert und kann daher etwas größer als die Walltime sein. Der CPU-Profiler schreibt die Wartezeit der nativen Funktion zu; das bedeutet **nicht**, dass der Renderer-Thread vier Sekunden lang JavaScript berechnet. Die wesentlich kleineren `tdur`-Werte des Chromium-Traces belegen diese Unterscheidung.

Im gesamten Baseline-Capture benötigen 148 `getProgramInfoLog`-Aufrufe zusammen 30 424,5 ms. Die unmittelbar messbaren `compileShader`- und `linkProgram`-Aufrufe benötigen zusammen weniger als 3 ms: Sie stoßen asynchrone Arbeit an. Der spätere synchronisierende Zugriff wartet auf deren Ergebnis. Nur die Fehlerprüfung abzuschalten würde die darunterliegende Arbeit nicht beseitigen; die erste Programmnutzung oder Uniform-Reflexion könnte weiterhin warten.

## Warum neue Programme entstehen

Die echte Zahl sichtbarer Punktlichter verändert sich mit Zutatenaktivierung und Kampf-VFX. In der Baseline steigt sie im untersuchten Ablauf von 12 während der Vorbereitung auf 14, 15 und 16. Die Anzahl der Punktlichter fließt in Three in die konkrete Shaderquelle ein. Für die unveränderten Szenenmaterialien werden dadurch weitere Varianten benötigt.

Die Diagnose beruht nicht allein auf der Programmzahl:

1. Die zeitgleichen GL-Aufrufe, nativen CPU-Profiler-Stacks und ANGLE-Worker-Aufgaben weisen die blockierende Arbeit direkt nach.
2. Ein kontrollierter Versuch mit tatsächlich konstant 20 sichtbaren Lichtslots beseitigt die aktiven langsamen Programmabfragen: höchstes Frameintervall 199,9 ms, längster aktiver Long Task 50 ms. Zwei frühere Versuchsaufbauten hielten die reale Lichtzahl noch nicht konstant und bleiben ausdrücklich erfolglose Experimente.
3. Der Produktionskandidat hält die benötigte Lichtarray-Länge im untersuchten Kampf bei 17. Die Shaderquelle eines während der Vorbereitung geprüften Vorwärtsprogramms enthält ebenfalls 17 Punktlichter. Während des aktiven Kampfs bleiben die registrierten Programme bei 69; neue langsame Programmabfragen treten nicht auf.

Nullintensive Slots ersetzen nur die Anzahl fehlender temporärer Lichter. Die echten Lichtfarben, Intensitäten, Reichweiten, Positionen und Sichtbarkeiten bleiben erhalten. Die Slots werfen keine zusätzlichen Schatten. Neue Effekte, die gleichzeitig mehr als die vereinbarten fünf temporären Lichter benötigen, können die Grenze künftig überschreiten; reale Lichter werden in diesem Fall nicht entfernt.

Der 20-Slot-Kontrollversuch startete ohne den Kauf-/Merge-Schritt der ausführlichen
Baseline. Seine Brettstufe und Vorbereitung sind deshalb **kein identischer
quantitativer End-to-end-Vergleich**. Er unterstützt den direkt aufgezeichneten
Lichtvarianten-Mechanismus, ersetzt aber nicht die finale Messmatrix mit exakt
gleichen gekauften, gemergten und getauschten Spielständen.

## Kleine, begründete Korrektur

Der Kandidat ergänzt zwei gezielte Maßnahmen:

- Die reale Arena reserviert fünf wiederverwendbare Nulllicht-Slots und tauscht deren Sichtbarkeit gegen die vorhandenen temporären Lichter. Dadurch bleibt die Shader-Variante während Aktivierungen stabil.
- Das bestehende Preparation-Gate stößt die benötigten Programme der tatsächlich montierten Arena an und prüft `KHR_parallel_shader_compile.COMPLETION_STATUS_KHR` asynchron. Die Arena wird erst nach Abschluss und zwei tatsächlichen Renderdurchläufen freigegeben. Während der Vorbereitung bleibt der letzte Werkbank-Frame hinter dem bestehenden Overlay stehen; die bisherigen Animations-Callbacks und der Browser laufen weiter.

Die Vorbereitung arbeitet mit Program-Handles und kann abgebrochen werden. Beim Abbruch endet das Polling, bevor spätere Timer auf bereits entfernte Ressourcen zugreifen können. Zusätzlich prüft **jeder** Poll-Durchlauf, welche der anfangs erfassten Handles noch echte GL-Programme sind: `renderer.info.programs` kann beim Szenenwechsel noch alte Werkbankprogramme enthalten, deren Materialien R3F erst später bei Idle entsorgt. Solche inzwischen ausgemusterten Handles werden übersprungen; auf alle weiterhin lebenden Programme wird unverändert gewartet. „Nicht mehr existent“ darf weder als weiter ausstehende Kompilierung behandelt noch mit einer Completion-Abfrage abgefragt werden.

Ohne `KHR_parallel_shader_compile` bleibt ein ausdrücklich begrenzter Fallback bestehen: Ein synchronisationsfreier erster Zugriff ist dort nicht zugesichert. Unit-Tests prüfen Abschluss, Abbruch, Kontextverlust, zwischenzeitlich ausgemusterte Werkbankprogramme und den Fallback; der Hauptbericht nennt zusätzlich die tatsächlich erfolgten Browserprüfungen.

### Während der Abnahme gefundene Gate-Regression

Eine Zwischenversion hielt die Vorbereitung beim wiederholten Zischbert-Kampf nach Zischbert und Moor-Martha offen, obwohl die Arena bereits vollständig montiert war. Der [gespeicherte Fehler-Probe](data/preparation-regression.json) zeigt den erneuten Klick bei 50 725,0 ms, Beginn der Vorbereitung bei 50 727,2 ms und bei 50 980,1 ms ein inzwischen entsorgtes Programm mit sieben Punktlichtern aus der vorherigen Werkbank. Das war kein noch kompilierendes Arena-Programm. Die frühere Bedingung wartete trotzdem weiter darauf, dass dieses ungültige Handle fertig werde; die Gate-Abnahme lief anschließend in den Timeout.

Die Korrektur filtert ausgemusterte Handles bei jedem Poll heraus und wartet nur auf verbleibende gültige Programme. Der zugehörige Regressionstest entfernt eines von drei erfassten Programmen nach Beginn des Pollings und verlangt weiterhin den Abschluss beider lebenden Programme. Der fehlgeschlagene Browserlauf bleibt als Regressionsevidenz erhalten und wird nicht als erfolgreicher Performance-Durchlauf gezählt. Erfolgreiche Wiederholungs- und Abbruchprüfungen des endgültigen Stands werden im Hauptbericht separat ausgewiesen.

## Diagnose-Captures vorher und nachher

| Messgröße | Baseline | finaler Kandidat |
| --- | ---: | ---: |
| Klick auf Kampf bis aktiver Kampf | 5617,5 ms | 3355,8 ms |
| Dauer des sichtbaren Preparation-Gates | 5577,6 ms | 3300,6 ms |
| höchstes Frameintervall während Vorbereitung | 4033,1 ms | 200,0 ms |
| längster Long Task während Vorbereitung | 4024 ms | 191 ms |
| höchstes vollständig beobachtetes aktives Frameintervall | 4616,5 ms | 183,4 ms |
| aktive Frameintervalle über 250 ms | 2 | 0 |
| längster aktiver Long Task | 4614 ms | 0 aufgezeichnet |
| langsame aktive `getProgramInfoLog`-Wartezeit | 13 886,1 ms | 0 aufgezeichnet |
| aktive sichtbare Punktlichtzahlen | 14 / 15 / 16 | konstant 17 |
| Programme am Ende des Captures | 118 | 69 |
| aktive GPU-Timer-Samples: Median / Maximum | 15,16 / 37,49 ms, 27 Samples | 18,15 / 29,53 ms, 450 Samples |

Die Baseline endet nach einem weiteren 4876-ms-Render; dessen nächster vollständiger rAF-Abstand und Long-Task-Eintrag liegen außerhalb des gespeicherten Snapshots. Deshalb ist das dort tabellierte höchste vollständige Frameintervall kleiner als der direkt gemessene letzte Render. Der Kandidat enthält 467 aktive Frames und den vollständigen Übergang ins Ergebnis. Beide Saves enthalten denselben deterministischen Kampf mit 6000 ms Simulationsdauer und SHA-256 `7fd2d1ac6356c88638834a9147cfc53ec016eada3087683fc44802ffc059cb96`.

Die Verbesserung wird nicht als bloße Verlagerung eines blockierten Hauptthreads gewertet: Das Gate bleibt im Kandidaten rund 3,3 Sekunden sichtbar, aber sein höchster Frameabstand beträgt 200 ms. Die Klick-bis-Spielbereitschaft-Zeit wird vollständig mitgezählt und ist in diesen beiden Captures kürzer. Die Compilerarbeit selbst verschwindet dabei nicht; sie läuft vor der Freigabe asynchron.

## Getrenntes Problem: Spielstart und Kauf

Eine allgemeine Beschleunigung des gesamten Starts ist **nicht** nachgewiesen. Im selben ausführlich instrumentierten Kandidaten-Capture sind Werkbank und Kauf sogar langsamer:

| Messgröße | Baseline | finaler Kandidat |
| --- | ---: | ---: |
| Navigation bis gemeldete benutzbare Werkbank | 5392,1 ms | 8282,4 ms |
| Kauf einschließlich Merge-Präsentation | 11 417,4 ms | 20 306,7 ms |
| Navigation bis erster aktiver Kampf einschließlich Interaktionen | 22 867,8 ms | 32 460,0 ms |

Der Kandidat enthält in der Werkbank einen 8458-ms-Render mit 8365,8 ms synchronen Programmabfragen. Die Arena-Korrektur ist dort nicht aktiv; wechselnde Werkbanklichter und noch nicht vorbereitete Varianten bleiben ein separates nachgewiesenes Problem. Die Größe dieser Verschlechterung ist in zwei Einzeltraces kein gesicherter kausaler Effekt des Kandidaten: Shader-/Treiber-Caches, thermischer Zustand und Diagnose-Overhead sind nicht vollständig kontrolliert. Sie darf dennoch nicht verschwiegen oder aus einer End-to-end-Betrachtung herausgerechnet werden. Die wiederholte Messmatrix im Hauptbericht ist für die tatsächliche Regressionseinschätzung maßgeblich.

## Abgrenzung der anderen Hypothesen

- **GPU-Zeichenlast:** Asynchrone Timer-Queries liegen bei den erfassten aktiven Draws im Bereich einiger Zehn Millisekunden. Sie messen keine CPU-Kompilierung. Das spricht gegen mehrere Sekunden reine Rasterarbeit als Ursache dieser konkreten Hänger, ersetzt aber keinen echten Smartphone-Test.
- **GLB, Texturen und Morph-Targets:** Während der drei großen aktiven Baseline-Hänger werden keine Ressourcenübertragungen abgeschlossen. Gemessene Buffer-/Texturaufrufe erklären deren Dauer nicht. Morph-Modelle erfordern zusätzliche Programme, sind aber nicht die alleinige Ursache: Dieselbe Lichtvariation erzeugt Varianten für zahlreiche andere Materialien.
- **Shadow-Rendering:** Separate Schattenaufrufe liegen im Capture deutlich unter den mehrsekündigen Vorwärtsrendern. In den großen aktiven Hängern entfallen die entscheidenden Wartezeiten auf Vorwärtsprogramme.
- **JavaScript/Kampfsimulation:** Die Renderer-Thread-CPU beträgt in den großen Aufgaben rund 92–99 ms. Die deterministische Simulation wird beim Start berechnet und ihre Ergebnisse bleiben identisch. Sie erklärt die vier bis fünf Sekunden langen nativen GL-Warteintervalle nicht.
- **Garbage Collection:** GC beansprucht dort null bis zwei Millisekunden. Ein anderer Startabschnitt des Kandidaten enthält dagegen rund 257 ms GC; dieser separate Startbefund ist kein Beleg für die Ursache der aktiven Hänger.
- **VFX-Allokation:** Temporäre VFX ändern die Lichtzahl und lösen damit die belegte Varianteninitialisierung aus. Zusätzliche Mesh-/Materialerstellung existiert weiterhin; die Traces belegen sie nicht als dominante mehrsekündige Ursache. Ein allgemeiner VFX-Architekturumbau folgt daraus nicht.

## Rohdaten, Reproduktion und Grenzen

- Baseline: [Probe](data/baseline-diagnostic.json), [Offline-Auswertung](data/baseline-diagnostic.analysis.json), [Chromium-Trace](traces/baseline-desktop.trace.json.gz), [CPU-Profil](traces/baseline-desktop.cpuprofile).
- Finaler Kandidat: [Probe](data/candidate-diagnostic.json), [Offline-Auswertung](data/candidate-diagnostic.analysis.json), [Chromium-Trace](traces/candidate-desktop.trace.json.gz), [CPU-Profil](traces/candidate-desktop.cpuprofile).
- Kontrollversuch: [tatsächlich konstante Lichtzahl](data/controlled-stable-lights.json).

Die komprimierten Traces nach dem Entpacken in Chromium DevTools Performance oder Perfetto öffnen; die `.cpuprofile`-Dateien können direkt in DevTools geladen werden. Das Offline-Skript liest jeweils `run.json`, `run.trace.json.gz` und `run.cpuprofile` mit demselben Dateistamm:

```text
node scripts/analyze_combat_trace.mjs <run.json> <analysis.json>
```

Beide Diagnose-Captures verwenden Headless Chromium 151.0.7922.34 auf Windows, AMD Radeon Graphics über ANGLE/D3D11, Viewport 1440 × 900 und DPR 1. Ein wichtiger Unterschied: Der ursprüngliche Probe-Snapshot meldet einen tatsächlichen Drawing Buffer von 1490 × 931, der Kandidat 1440 × 900. Die GPU-Medians und Frameverteilungen dieser Einzeltraces sind daher keine sauber isolierte Rasterleistungsmessung. Die native GL-Warteursache bleibt direkt nachgewiesen; die Abnahme muss die identischen Auflösungen der Messmatrix verwenden.

„Kalt“ bedeutet frischen JS-/WebGL-Kontext und geleerten Chromium-HTTP-Cache. GPU-Treiber- und ANGLE-Caches werden nicht künstlich gelöscht. CPU-Profil und umfangreiches Tracing beeinflussen das Zeitverhalten. User-Timing-Marker verbinden die Zeitachsen der Baseline mit höchstens 163 µs Streuung. Die Trace-Namen zeigen ANGLE-Worker-Arbeit, aber keine internen D3D-Compiler- oder Treiber-Stacks; eine bestimmte Compiler-DLL wird nicht behauptet. Ausstehende GPU-Timer-Queries können am Capture-Ende fehlen.

**Diagnoseurteil:** Die Ursache der dokumentierten großen aktiven Hänger ist für diesen Ablauf ausreichend belegt: Lichtzahländerungen erzeugen neue Shader-Varianten; synchrone erste Programmzugriffe warten auf CPU-Arbeit im GPU-Prozess. Der finale Kandidat beseitigt diesen Mechanismus im gezeigten Kampfablauf. Ob alle geforderten Profile, Cachefälle und Wiederholungen das Erfolgskriterium erfüllen, entscheidet ausschließlich die wiederholte Abnahme im Hauptbericht. Die bereits sichtbaren Werkbank-/Kaufhänger sind dadurch nicht behoben.
