# Erster aktiver Kampf: Performance-Abnahme

Arbeitsbranch: `codex/first-combat-performance`, exakt auf
`353d154524cb9490b3db07a46bcafc8fe17179e1` aufgebaut.
`master` und GitHub Pages werden nicht verändert. Kein Pull Request, kein Merge.

## 1. Reproduzierbares Problem und Messverfahren

Der erste aktive Kampf blockierte nach der bisherigen Asset-Vorbereitung für
mehrere Sekunden. Auch weitere Gegner und Wiederholungen können im Ausgangsstand
noch neue Varianten auslösen. Ruhende Szenen sind deshalb kein ausreichender Test.

Die Browsermessung beginnt **vor dem App-Start**. Ein identischer isolierter
Spielstand führt über echte Bedienelemente zu Fortsetzen, Kauf mit Merge,
Platztausch und Kampf. Der aktive Abschnitt läuft mit der nativen Geschwindigkeit
1×. Keine ausgelassenen Aufwärmframes und keine Änderung der Simulationszeit.
Das gesamte Frameintervall einschließlich einer überschrittenen Messfrist zählt.
Das Messfenster endet nach zehn Sekunden oder bei der früheren nativen
Ergebnisanzeige. Blockiert ein Frame über diese Frist hinaus, wird er vollständig
mitgezählt; die tatsächlichen Fensterlängen stehen bei jeder Rohmessung.
Nach dem Messfenster beendet die native 4×-Funktion den Kampf; das echte Ergebnis
und der Rückweg in die Werkbank werden geprüft.

Für weitere Kampfszenarien wird ausschließlich zwischen abgeschlossenen Kämpfen
ein fester QA-Spielstand in diesem isolierten Browser wiederhergestellt. Der
WebGL-Renderer bleibt derselbe. Die Produktionsanwendung enthält dafür keine
zusätzliche Debug-Schnittstelle.

Gemessen werden getrennt: Navigation bis benutzbare Werkbank, Kauf/Merge,
Platztausch, Klick bis aktiver Kampf, Vorbereitung, aktive Frameintervalle und
Long Tasks. Aktive Frames und Phasenübergänge bleiben in den Rohdaten getrennt
nachvollziehbar. Die komplette Kampfsimulation wird vor und nach Ablauf gehasht.

### Umgebung und kontrollierte Faktoren

- Headless Chromium 151 auf Windows; tatsächliche GPU-/Treiberangaben stehen in
  jedem Matrix-Gruppendatensatz. ANGLE/D3D11, keine CPU-Drosselung.
- Desktop 1440 × 900, Landscape 844 × 390, Portrait 390 × 844, jeweils DPR 1.
  Der tatsächliche Drawing Buffer wird vor und nach jedem Kampf geprüft.
- Mobile bedeutet **Viewport-/Touch-Emulation auf der Desktop-GPU**, keinen
  Smartphone-Benchmark. Die bestehende Mobile-LOD- und Schattenqualität bleibt aktiv.
- „Kalt“: frischer Browserprozess und JS-/WebGL-Kontext, leerer HTTP-Cache.
  GPU-Treiber- und ANGLE-Caches werden nicht zwangsweise gelöscht.
- „Warm“: Neuladen im selben Browser mit erhaltenem HTTP-Cache, neuem JS/WebGL.
  „Zweiter“ und „Wiederholt“: ohne Reload mit demselben Renderer.
- Je Konfiguration fünf unabhängige Browserstarts; Vorher und Nachher seriell,
  nach Wiederholung abwechselnd, nicht parallel auf derselben GPU.
- Die ausführlichen Traces dienen dem Ursachenbeweis. Die Messmatrix verwendet
  die leichtere Probe ohne GL-Aufrufwrapper, CPU-Profiler oder GPU-Timer-Queries.
  Auch diese Probe hat Overhead; absolute FPS sind keine allgemeine Gerätefreigabe.

## 2. Nachgewiesene Ursache

Die [vollständige Diagnose](DIAGNOSIS.md) enthält Chromium-Traces, CPU-Profile,
native WebGL-Aufrufzeiten und den kontrollierten Gegenversuch.

**Wechselnde temporäre Punktlichtzahlen erzeugen neue Shader-Varianten.** Beim
ersten synchronisierenden Programmzugriff wartet der Renderer auf ANGLE-Arbeit
im GPU-Prozess. In den belegten aktiven Baseline-Hängern erklären diese Wartezeiten
rund 99 % der 4,4–4,9 Sekunden langen Render-Aufrufe. Der Renderer-Thread verbraucht
dabei selbst nur rund 92–99 ms CPU; mehrere ANGLE-Worker arbeiten währenddessen.

Das ist ein **CPU-Kompilierungs-/Synchronisationsproblem im Renderingpfad**,
nicht ein viersekündiger JavaScript-Simulationslauf und nicht vier Sekunden
Rasterarbeit auf der GPU. GC und Ressourcenuploads erklären diese konkreten
Blockierungen ebenfalls nicht. Die Programmzahl allein wurde ausdrücklich nicht
als Ursachenbeweis verwendet.

## 3. Kleine, gezielte Änderung

1. Die Arena reserviert fünf wiederverwendbare Punktlichtslots mit Intensität null.
   Sobald reale Aktivierungs-, Projektil-, Treffer- oder Ergebnislichter sichtbar
   werden, werden entsprechend weniger Nullslots verwendet. Die Shaderarray-Länge
   bleibt konstant. Kein echtes Licht wird entfernt oder in seinen Parametern
   verändert; die zusätzlichen Slots werfen keine Schatten.
2. Das bestehende Preparation-Gate wartet auf die tatsächlich montierten kritischen
   Modelle und die Umgebung. Es stößt die benötigten Programme an und prüft
   `KHR_parallel_shader_compile` asynchron. Erst nach Abschluss und zwei echten
   Renderdurchläufen wird die bestehende Kampfpräsentation freigegeben.
3. Die Vorbereitung ist abbrechbar. Ausstehende Poll-Timer werden entfernt;
   Kontextverlust beendet die Prüfung sicher. Bereits entsorgte Programme der
   vorherigen Werkbank werden nicht mehr benötigt und beim Warten übersprungen;
   alle noch lebenden Programme müssen tatsächlich fertig sein.

Keine Änderungen an Simulation, Balance, Modellen, Texturen, Materialwerten,
Kameraparametern, realen Lichtparametern, UI, Zutatenstufen oder Animationsregeln.
Kein VFX-Pooling- oder Engine-Umbau auf Verdacht.

## 4. Messdaten und Vorher-Nachher

### Desktop, überarbeitete Zutaten

Je Zeile und Build fünf Messungen. Zahlen sind **höchster aktiver Frame / Median
Klick bis bereit**. Sie sind keine Messung der ruhenden Bildrate.

| Szenario | Baseline | Korrigierter Stand |
| --- | ---: | ---: |
| Erster Kampf, kalter Browsercache | 8733 ms / 5812 ms | 133 ms / 2853 ms |
| Erster Kampf nach warmem Reload | 8716 ms / 5670 ms | 100 ms / 2679 ms |
| Zweiter Kampf, Moor-Martha | 9250 ms / 6198 ms | 167 ms / 2886 ms |
| Zischbert erneut, derselbe Renderer | 4617 ms / 2934 ms | 100 ms / 1570 ms |

20 Baseline-Kämpfe enthalten 57 aktive Intervalle über 250 ms; die 20 korrigierten
Kämpfe enthalten keines. Der längste aktive Long Task sinkt von 9256 auf 103 ms.
Auch die vollständige Klick-bis-Messende-Pipeline wird mitgezählt: im Kandidaten
höchstens 250 ms Frameintervall, nicht mehrere versteckte Blockadesekunden im Gate.
Die Vorbereitung selbst dauert weiterhin sichtbar einige Sekunden.

### Mobile-Emulation, überarbeitete Zutaten

Wieder jeweils fünf Messungen pro Build; gleiches Format: höchster aktiver Frame /
Median Klick bis bereit. Touch-Emulation verwendet die bestehende Mobile-Qualität.

| Ansicht und Cache | Baseline | Korrigierter Stand |
| --- | ---: | ---: |
| Portrait kalt | 6400 ms / 7082 ms | **350 ms** / 2644 ms |
| Portrait warm | 8300 ms / 851 ms | 33 ms / 898 ms |
| Landscape kalt | 8633 ms / 5916 ms | 167 ms / 2470 ms |
| Landscape warm | 7183 ms / 6620 ms | 33 ms / 866 ms |

Die warmen Preparation-Zeiten sind nicht pauschal schneller: einzelne Varianten
werden jetzt vor der Freigabe vorbereitet. Entscheidend sind die mitgemessene
gesamte Wartezeit und die beseitigten langen aktiven Blockaden. Der 350-ms-
Portrait-Ausreißer wird unten ausdrücklich eingeordnet, nicht herausgefiltert.

### Kontrollvergleich mit der älteren Phase-3A-Optik

`ingredients=phase3a` entspricht der Optik vor dem Zutaten-Polish, nicht einer
Änderung des Spielstands. Erneut fünf Messungen pro Build und Cachezustand.

| Desktop / ältere Zutaten | Baseline | Korrigierter Stand |
| --- | ---: | ---: |
| Kalt | 7666 ms / 5115 ms | 367 ms / 3128 ms |
| Warm | 9150 ms / 5629 ms | 100 ms / 2845 ms |

### Gesamtergebnis und Wartezeiten

100 vollständige Vergleichskämpfe in 40 Browser-Sitzungsgruppen, je fünf Läufe
in 20 Konfigurationen. Es ist eine gezielte Faktorabdeckung, **kein** vollständiges
Kreuzprodukt: zweite/wiederholte Gegner sind auf Desktop mit Polish fünfmal
gemessen; Mobile und ältere Zutaten werden jeweils kalt/warm fünfmal verglichen.

| Aktiver Kampf, 50 Messungen pro Build | Baseline | Fix |
| --- | ---: | ---: |
| Höchster Frameabstand | 9249,7 ms | 366,7 ms |
| Längster Long Task | 9256 ms | 299 ms |
| Frameintervalle über 250 ms | 126 | 3 in zwei Läufen |
| Frameintervalle über 1000 ms | 107 | 0 |

Auch die Übergangspipeline ab Kampfklick ist erfasst: 187 → 7 Intervalle über
250 ms, 160 → 0 über eine Sekunde. Ihr Fix-Maximum beträgt **816,6 ms** mit
747-ms-Long-Task im älteren Zutaten-Kaltlauf. Das ist eine verbleibende kurze
Vorbereitungsblockade, keine verschwiegene mehrsekündige Verlagerung. Die genaue
Ursache dieses Restbefunds ist mit der leichten Probe nicht isoliert.

Gepoolte Bereitschaftszeiten (Minimum / Median / Maximum; verschiedene Szenarien,
keine zusätzliche Behauptung statistischer Signifikanz):

| Zeit in ms | Baseline | Fix |
| --- | ---: | ---: |
| Kampfklick → bereit, n=50 | 799 / 5634 / 11081 | 318 / 2598 / 4383 |
| Navigation → Werkbank, n=40 | 1165 / 5291 / 10403 | 1343 / 5602 / 8592 |
| Kauf einschließlich Merge, n=40 | 1863 / 11997 / 26984 | 1851 / 11972 / 26226 |
| Navigation → bereit einschließlich Interaktionen, n=40 | 4648 / 24792 / 45122 | 3984 / 21346 / 38237 |

Die Start-/Kaufzeiten streuen stark und bleiben ein ernstes separates Problem.
Der Fix ist ausdrücklich **keine** Freigabe eines insgesamt schnellen Spielstarts.
Die besonders langsamen Kaufwerte aus den Einzeltraces werden durch die volle
Serie als weiterhin bestehendes Problem bestätigt, nicht als gelöst dargestellt.

Alle 100 Rohmessungen wurden auf identische Ergebnis-Hashes, tatsächliche
Drawing Buffer/DPR, Browser/GPU, vollständig erreichte Resultate und Fehler
geprüft: **0 Auditfehler, 0 Warnungen, 0 Laufzeit-/Assetfehler**. Jeder Build hat
über alle Messungen genau einen HTML-/Bundle-Hash. Die finalen Kandidaten laden
`index-BATde8RD.js`, die Baseline `index-DCbcnK5-.js`.

[Alle Konfigurationen mit Streuung, p95, Kauf und Bereitschaft](matrix-summary.md) ·
[maschinelle Auswertung einschließlich p99 und beobachteter FPS](matrix-summary.json) ·
[Manifest aller verlustfrei komprimierten Rohmessungen](measurements/manifest.md).
Die ursprünglichen 19,87 MB Roh-JSON sind mit SHA-256 und geprüftem Byte-Roundtrip
auf 1,85 MB gzip komprimiert. Der Summarizer liest diese Dateien direkt.

## 5. Funktionale und technische Prüfung

172 Unit-Tests in 26 Dateien und Typecheck bestanden. Der Produktionsbuild
erfolgt mit der unveränderten bestehenden Chunk-Warnung für den Three-Vendor.

Die [gepaarte Desktop-Prüfung](functional/desktop.json) und die
[Portrait-/Landscape-Funktionsprüfung](functional/mobile.json) sind bestanden:

- Native Käufe, Merge auf Stufe II, Platztausch und unveränderte Instanzen.
- Vollständige 1×-Kämpfe gegen Zischbert und Moor-Martha auf Desktop und beiden
  Mobile-Formaten, ohne fehlende Assets oder neue Laufzeitfehler.
- Desktop zusätzlich Reif-Rudi mit Frost/Echo/Schutz. Zusammen sind alle fünf
  Zutatenfamilien tatsächlich aktiviert, ihre Bewegung und sichtbaren Projektil-/
  Treffer-Geometrien beobachtet, nicht nur aus Simulationsereignissen vermutet.
- Glut-Chili, Schleimpilz und Runenschale sind bei Freigabe als echte GLB-Modelle
  vorhanden. Cooldown-Ringe werden während des Ablaufs auf korrekte Geometrie
  und fortschreitende Werte geprüft. Die deterministischen Ereignisse und ihre
  Zeitwerte stimmen vor/nach vollständigem Playback und zwischen Builds überein.
- Abbruch mit tatsächlich ausstehendem KHR-Polling, unveränderter Werkbank und
  anschließendem vollständigen nativen Neustart auf allen drei Formaten.
  Nur dieser ausdrücklich separate Lifecycle-Test hält die Completion-Antwort
  kontrolliert zurück; er fließt **nicht** in Performancewerte ein.
- Vier gepaarte Desktop-Bildprüfungen: Werkbank und drei Arenen. Kamera,
  Modell-/Materialfingerprints und physische Lichtparameter bleiben erhalten.
  Pixel-MAE beträgt 0,77–0,95 von 255; weniger als 0,94 % der Pixel unterscheiden
  sich stark. Ambient-Flammen, Flüssigkeit und Leerlaufanimation laufen während
  nativer Pause weiter; pixelgenaue Zeitidentität wird daher nicht behauptet.

Die Baseline konnte aufgrund ihrer Hänger einige kurze Zutatenanimationen nicht
sichtbar beobachten. Diese Lücken stehen separat im Protokoll; sie werden weder
als erfolgreicher Animationsnachweis ausgegeben noch dem Fix zugeschrieben.
Im Kandidaten sind sämtliche geforderten Animations-/VFX-Beobachtungen vorhanden.

Auch der [vollständige Grafikvarianten-Smoke](functional/graphics-variants.json)
ist bestanden: Mockup Reference, Dark, Magical und Warm sowie Golden, Legacy und
Ecosystem starten ohne reduzierten Fallback und erreichen nativ das identische
Zischbert-Ergebnis. Alle sieben Fälle haben keine Laufzeit-/Assetfehler.

Ausgewählte echte Ingame-Referenzbilder, derselbe pausierte Spielzustand:

[Baseline](functional/baseline-desktop-zischbert-paused.png) ·
[Korrigierter Stand](functional/candidate-desktop-zischbert-paused.png).
Weitere vom QA-Skript lokal erzeugte Screenshots sind nicht alle im Repository
dupliziert; die vollständigen Prüfprotokolle mit Szenenmetadaten sind enthalten.

## 6. Regressionen und verbleibende Risiken

- Werkbank und Kauf können weiterhin durch erstmalige Shader-Varianten blockieren.
  Die Arena-Korrektur ist dort nicht aktiv. Ihre Zeiten werden nicht aus der
  End-to-end-Betrachtung entfernt; zwei Einzeltraces schwanken dort stark.
- Die fünf Nullslots bedeuten in ruhigen Arena-Frames eine längere Lichtschleife
  als zuvor. Reale GPU-Zeiten und Frametimes müssen zusammen beurteilt werden.
- Ohne `KHR_parallel_shader_compile` ist eine nicht blockierende Erstverwendung
  nicht zugesichert. Der Fallback ist unit-getestet, nicht auf allen Browsern
  oder realen Mobilgeräten freigegeben.
- Künftige Effekte mit mehr als fünf gleichzeitigen temporären Lichtern können
  wieder eine neue Variante erzeugen. Ein Überlauf versteckt keine realen Lichter.
- Weitere Material- und Geometrieerstellung bleibt bestehen. Sie ist nicht als
  dominante Ursache des nachgewiesenen Mehrsekunden-Hängers belegt; dafür wurden
  keine spekulativen Produktionsänderungen vorgenommen.
- Ein korrigierter Portrait-Kaltlauf enthält einen **350-ms-rAF-Abstand** im
  KO-/Playback-Nachlauf, 7,89–8,24 Sekunden nach der Freigabe und noch 1,22 Sekunden
  vor dem Ergebnis. Er zählt ausdrücklich als aktiver Ausreißer. Der nahe 65-ms-
  Long Task endet bereits davor; die leichte Probe zeigt dort keinen Renderaufruf
  über 10 ms, Schattenaufruf über 4 ms, Programmzuwachs oder Ressourcenabschluss.
  Ohne passenden Trace ist die Ursache nicht belegt. Das Ideal **aller** aktiven
  Intervalle unter 250 ms wird damit nicht vollständig erreicht. Dieser Befund
  darf weder als Preparation noch als angeblich bestätigtes GPU-/GC-Problem
  herausgerechnet werden.
- Ein Kaltlauf mit der bewusst **älteren Phase-3A-Zutatenoptik** enthält zwei
  weitere aktive Abstände von 350 und 366,7 ms direkt nach der Freigabe. Dabei
  entsteht ein 299-ms-Long-Task; aufgezeichnete aktive Programme bleiben bei 53
  und Punktlichter bei 17. In diesen Intervallen liegt kein erfasster Renderaufruf
  über 10 ms. Ein Audio-Download überlappt erst den zweiten Abstand und erklärt
  den ersten Task nicht. Ohne CPU-Trace ist die verbleibende kurze Blockade weder
  React, Audio, GC noch dem Treiber sicher zuzuordnen. Dafür erfolgt kein weiterer
  Produktionsumbau auf Verdacht.

## 7. Reproduktion und Abnahmeurteil

Baseline aus Commit `353d154` separat bauen und unverändert bereitstellen, zum
Beispiel auf Port 5197; diesen Branch als Produktionsbuild auf Port 5198 starten.
Die Skripte verwenden Playwright aus dem lokalen Modulpfad oder dem gebündelten
Codex-Runtime-Pfad. Die Browserargumente sind im Skript festgehalten.

```powershell
node scripts/benchmark_combat_matrix.mjs --profiles=desktop --ingredients=polish --repeats=5 --window-ms=10000 --out=outputs/first-combat-performance/matrix-desktop
node scripts/benchmark_combat_matrix.mjs --profiles=portrait,landscape --ingredients=polish --scenarios=cold,warm-reload --repeats=5 --window-ms=10000 --out=outputs/first-combat-performance/matrix-mobile
node scripts/benchmark_combat_matrix.mjs --profiles=desktop --ingredients=phase3a --scenarios=cold,warm-reload --repeats=5 --window-ms=10000 --out=outputs/first-combat-performance/matrix-old-art
node scripts/qa_combat_performance.mjs
node scripts/qa_combat_graphics_variants.mjs --url=http://127.0.0.1:5198/
npm test
npm run typecheck
npm run build
```

Die verpackten Daten unabhängig erneut prüfen:

```powershell
node scripts/summarize_combat_matrix.mjs docs/qa/first-combat-performance/measurements/final-matrix-desktop docs/qa/first-combat-performance/measurements/final-matrix-mobile docs/qa/first-combat-performance/measurements/final-matrix-old-art --out=outputs/first-combat-performance/re-audit --raw=all
```

**Urteil:** Der belegte Lichtvarianten-/Shader-Wartemechanismus ist im geprüften
Ablauf gezielt behoben, nicht nur anhand einer höheren ruhenden FPS-Zahl vermutet.
Die 50 korrigierten Vergleichskämpfe enthalten keine mehrsekündige aktive Blockade;
auch ab Kampfklick ist kein Intervall über eine Sekunde mehr erfasst. Die
Compilerarbeit findet sichtbar und asynchron vor der Freigabe statt; die gesamte
Zeit bis zur Bereitschaft ist dokumentiert und im gepoolten Median geringer.

Das Ideal vollständig unter 250 ms ist **nicht erreicht**: zwei korrigierte Läufe
enthalten drei aktive Ausreißer, zusätzlich gibt es den 817-ms-Übergangspeak.
Die Restursachen bleiben offen. Werkbank/Kauf und echte Mobilgeräte benötigen
getrennte Folgearbeit. Kein weiterer Produktionsumbau auf Verdacht und keine
Freigabe eines global ruckelfreien Spiels. Abschluss auf diesem Arbeitsbranch;
kein Merge und kein Pages-Release.
