# Werkbank, Kauf und Merge: Performance-Abnahme

Arbeitsbranch `codex/workshop-purchase-performance`, exakt auf
`0456d1ff338de797102aac6d4f6c8664a23f22c2` aufgebaut. Der vorherige Kampf-Fix
und der Phase-3A.1-Grafikstand bleiben erhalten. Kein Merge, kein Pull Request,
kein Pages-Release. Die technischen Ergebnisse dieser Untersuchung sind keine
Freigabe eines global ruckelfreien Spiels oder echter Mobilgeräte.

## 1. Nachgewiesene Ursachen

### Hauptfehler: neue Lichtzahlen erzwingen neue Shader-Varianten

Der unveränderte Ausgangsstand wurde separat als Produktionsbuild auf Port 5201
eingefroren. Der Kandidat läuft auf Port 5202. Die Instrumentierung startet vor
dem App-Import und erfasst auch Menü, Raumaufbau und den ersten Kauf.

Im diagnostischen Baseline-Trace ist ein Merge-Renderaufruf **5.657,4 ms** lang.
Davon entfallen **5.598,2 ms** auf 14 synchrone `getProgramInfoLog`-Abfragen.
Der Renderer-Hauptthread benötigt innerhalb dieser Spanne nur **118,1 ms CPU**,
ANGLE-Worker dagegen **5.684,5 ms CPU**. GC: **0 ms**; keine gleichzeitig
abgeschlossenen Asset-Downloads. Bei einer weiteren Merge-Kaskade stehen
**5.195,3 ms Render-Wandzeit**, **5.134,7 ms** Programmabfragen,
**114,0 ms** Hauptthread-CPU, **5.207,2 ms** ANGLE-Worker-CPU und **2,8 ms** GC
einander gegenüber.

Das ist kein fünfsekündiger JavaScript-Merge-Algorithmus und auch kein Beleg
für fünf Sekunden GPU-Zeichenarbeit. Der Hauptthread wartet synchron auf die
Fertigstellung neuer WebGL-/ANGLE-Programme. CPU-Profil-Samplezeit in einer
nativen Abfrage ist **Wandzeitzuordnung**, keine tatsächlich verbrauchte
JavaScript-CPU-Zeit. ANGLE-Worker-CPU ist wiederum nicht GPU-Hardwarezeit.

Die genaue native Treiber-/D3D-Compilerfunktion ist ohne deren interne Symbole
nicht aufgelöst. Die für diesen Fix relevante Ursache ist trotzdem belegt:
Lichtzahlen wechseln bei Flug, Merge, Upgrade-Ausgabe und dauerhaftem Levellicht;
die erzeugten Shader enthalten die entsprechende `NUM_POINT_LIGHTS`-Variante.
Im isolierten Gegenversuch mit unveränderten realen Lichtern und konstant 15
Punktlichtslots verschwinden die fünfsekündigen Merge-Blockaden. Alle sechs
nativen Aktionen und ihre Ergebnisse bleiben gleich. Das ist ein kontrollierter
Werkbank-Nachweis, nicht nur die Übernahme der Kampf-Hypothese.

Auch Raumlichter werden durch bestehende Suspense-Grenzen schrittweise sichtbar.
Ein verworfener Zwischenkandidat stabilisierte nur Zutaten-/Effektlichter:
Käufe wurden schneller, aber Lichtzahlen 12 → 13 → 14 → 15 erzeugten beim
Menüaufbau neue mehrsekündige Wartezeiten. Dieser Kandidat ist **nicht** der
Abnahmestand. Die finale Lösung reserviert auch die vorhandenen Raumlichtslots
ab dem ersten Werkbank-/Menüframe.

### Weitere Vorgänge, ausdrücklich getrennt

- Erste neue Effektmaterialien verursachen auch bei konstanter Lichtzahl noch
  einzelne Shader-Wartezeiten. Ihre verbleibenden Spitzen stehen in den finalen
  Messdaten; der kleine Fix entfernt nicht sämtliche erstmaligen Kompilierungen.
- GLB-/Texturaufbereitung und Schattenrendering existieren, erklären die belegten
  fünfsekündigen Merge-Fenster aber nicht. Beispielsweise summieren sich
  `bufferData` im Baseline-Diagnoselauf auf 5,2 ms und `texSubImage2D` auf 67,7 ms.
- Das CPU-Profil enthält auch eine separate einmalige Audio-Kontextinitialisierung
  von ungefähr 404 ms Wandzeit. Sie ist keine Merge-Regel und wird nicht verändert.
- Die React-Instrumentierung protokolliert Commit-Zahlen und Kaufphasen, nicht
  angebliche React-Render-CPU-Dauern. Kein Nachweis rechtfertigt hier einen großen
  Memoisierungs-, `useFrame`-, GC- oder Architekturumbau.
- Keine neuen Produktions-Asset-Ladepfade; Originalmodelle, Texturen und
  Materialparameter werden nicht angefasst.

Die Netzwerkanalyse zeigt tatsächlich doppelte **Anfragen** beim Start:
Byte-Preload und GLTFLoader fragen einige identische GLB-URLs separat an.
Im Baseline-Diagnoselauf sind es 36 GLB-Ressourceneinträge für 21 URLs;
15 URLs erscheinen zweimal. Die zweite Brasskin-Anfrage überträgt beispielsweise
nur 300 Byte statt nochmals den 3,95-MB-Dateikörper (Cache-Revalidierung).
Das ist keine nachgewiesene doppelte vollständige Übertragung je Kauf.
Nach Werkbankbereitschaft beginnt im Hauptablauf lediglich der erste Download
der Upgrade-Fassung (rund 5 ms). Die späteren Käufe laden Brasskin und Umgebung
nicht erneut. Diese vorhandene Preload-/Loader-Doppelanfrage bleibt dokumentiert,
wird aber ohne Nachweis eines relevanten Anteils am Hänger nicht umgebaut.

## 2. Gewollte Animationsdauer versus technische Blockade

| Ablauf | Unveränderte Sollphasen | Summe |
| --- | --- | ---: |
| Kauf ohne Merge | Flug 680 + Landung 180 + Reveal 260 ms | 1.120 ms |
| Kauf mit einem Merge | zusätzlich Merge 620 ms | 1.740 ms |
| Zweistufige Kaskade I → II → III | zwei Merge-Phasen à 620 ms | 2.360 ms |

Bei reduzierter Bewegung gelten unverändert die vorhandenen 90-/140-ms-Werte.
Der Audit beschleunigt keine Animation. React-Commit, Timerplanung, Bildtakt und
das anschließende Bereitschaftssample erzeugen kleine zusätzliche Zeitanteile.

Im Baseline-Trace wird ein 620-ms-Merge-Timer erst nach rund **6.139 ms**
ausgeführt: **5.519 ms verspätet**. Das ist eine reale Blockade, nicht eine
sechssekündige gewünschte Merge-Animation. Umgekehrt ist ein ungefähr 1,2 Sekunden
langer einfacher Kauf größtenteils das gewollte 1,12-Sekunden-Feedback.

Die früher erwähnten zwölf Sekunden waren Gesamtdauern eines automatisierten
Ablaufs, kein allgemeiner zwölfsekündiger Freeze. Dieser Audit erfasst pro Aktion
separat tatsächlichen Klick, ersten React-Kaufcommit, Flug, Landung, jeden Merge,
Reveal, Timerüberziehungen und erneute Bedienbarkeit. Überlappende Renderwartezeit,
Frameintervalle und Animationsdauer werden **nicht addiert**.

## 3. Ausgangsmessungen und Versuchsaufbau

Die Hauptmessreihe verwendet isolierte, identische Spielstände mit 40 Gold und
den drei bereits überarbeiteten Zutaten. Käufe laufen über echte Angebotsbuttons.
Kaskaden-Spielstände werden nur zwischen abgeschlossenen Aktionen über den
bestehenden externen QA-Probe wiederhergestellt; keine Produktions-Debug-API.
Anschließend folgen ein Kauf auf einen freien Platz und ein nativer
Platztausch-Rundlauf zwischen belegten Slots. Die Ergebnis-IDs und Level werden
geprüft. Der Warenladen ist das vorhandene Kaufband, kein zusätzliches Modal.

Messumgebung: Headless Chromium 151 unter Windows, AMD Radeon Graphics über
ANGLE/D3D11/WebGL2, keine CPU-Drosselung. Exakte Browser-/GPU-/Treiberdaten stehen
in den Rohdaten-Summaries. Desktop 1440 × 900, Portrait 390 × 844, Landscape
844 × 390, jeweils DPR 1. **Mobile ist Browser-/Touch-Emulation auf diesem PC,
kein Smartphone-Benchmark.** Mobile-LOD und bestehende Schattenqualität bleiben aktiv.

Der tatsächliche Drawing Buffer wird ebenfalls gespeichert und bleibt pro
Interaktionslauf konstant. Insbesondere kann die bestehende CSS-Skalierung der
Menü-Canvas beim Desktopstart einen Buffer von 1490 × 931 verursachen. Die
Baseline wird nicht künstlich auf eine andere Auflösung normiert; abweichende
Buffer müssen beim Vergleich ausdrücklich berücksichtigt werden.

„Kalt“ bedeutet neuer Chromium-Prozess, isolierter Kontext, leerer HTTP-Cache,
neue JS-/WebGL-Instanzen; OS-/Treiber-Caches werden nicht gelöscht. „Warm“ ist
Reload im selben Kontext mit erhaltenem HTTP-Cache, aber neuen JS-/WebGL-Instanzen.
Wiederholte Käufe und Kaskaden innerhalb eines Laufs verwenden denselben Renderer.
Alle GPU-Läufe laufen seriell. CPU-/WebGL-Traces und GPU-Timerquery-Diagnose sind
von der leichter instrumentierten wiederholten Hauptmessreihe getrennt.

Median und P95 verwenden den nächsten Rang. Bei fünf Läufen ist P95 der höchste
Messwert und keine belastbare Aussage über eine gesamte Gerätepopulation.
Thermik, Treibercaches und Hintergrundlast können schwanken; deshalb bleiben
Einzelmessungen und Maximalintervalle erhalten. Baseline und Kandidat werden
in der Hauptreihe blockweise ausgeführt, nicht zufällig alternierend.

## 4. Kleine, nachgewiesene Korrektur

`WorkshopLightBudget` hält ausschließlich im Menü-/Werkbankmodus die Anzahl
sichtbarer Punktlichtslots konstant. Es ersetzt unbenutzte Slots durch schwarze
Lichter mit Intensität null, ohne Schatten. Reale Lichter behalten Farbe,
Intensität, Position, Reichweite, Sichtbarkeit und Schatteneigenschaften.

Die dokumentierte Obergrenze ist sechs Raumlichter plus neun dynamische Slots:
fünf Werkbankplätze und eine Reserve, zusätzlich Merge-Ausgabe, Aura und
Merge-Licht. Die beiden Merge-Eingänge ersetzen die konsumierten Tischobjekte
und werden nicht doppelt gezählt. Für Legacy werden bis zu acht, für Golden und
Ecosystem bis zu sieben Raumslots reserviert, einschließlich der vorübergehenden
Fallback-Kerze beim Laden der Umgebung. Animierte Elternsichtbarkeit und Kamera-Layer werden beim
eigentlichen Renderaufruf berücksichtigt. Ein späterer Kapazitätsüberlauf blendet
keine echten Lichter aus, kann aber wieder eine Shader-Variante erzeugen und muss
als Vertragsänderung überprüft werden.

Der Controller entfernt seine Lichter und seinen Callback vollständig beim
Wechsel zur Arena. Die separate Kampfverwaltung und das asynchrone
Preparation-Gate bleiben unverändert. Keine Änderungen an Simulation, Kaufpreis,
Merge-Regeln, Animationsphasen, Assets, Lichtprofilen, Kamera oder UI.

## 5. Vorher-Nachher-Messungen

**40 vollständige Sitzungsaufzeichnungen, 240 native Kauf-/Merge-Aktionen**:
je fünf Läufe pro Build und Konfiguration. Davon entfallen 20 Sitzungen und
120 Aktionen auf den Kandidaten. Die Frame-Maxima umfassen den gesamten
Interaktionsabschnitt einschließlich Fixture-Wechsel und Platztausch.
Beide Builds verwenden pro Konfiguration den gleichen tatsächlichen Buffer:
Desktop 1490 × 931, Portrait 395 × 856, Landscape 873 × 403, jeweils DPR 1.

| Konfiguration, je n=5 | Längstes Frame vorher → nachher | Frames >250 ms vorher → nachher | Werkbank bereit, Median vorher → nachher |
| --- | ---: | ---: | ---: |
| Desktop kalt | 6.333,0 → **16,8 ms** | 27 → **0** | 12.812,2 → 9.098,8 ms |
| Desktop Warm-Reload | 1.033,4 → **16,8 ms** | 15 → **0** | 2.683,0 → 1.841,5 ms |
| Portrait kalt, emuliert | 6.933,1 → **16,8 ms** | 36 → **0** | 9.779,0 → 8.963,7 ms |
| Landscape kalt, emuliert | 4.733,1 → **33,4 ms** | 22 → **0** | 9.965,6 → 8.830,0 ms |

Im Interaktionsabschnitt des Kandidaten werden **keine Long Tasks ab 50 ms**
registriert. Das bedeutet nicht, dass der Spielstart frei von Hängern ist.
P95 der laufweisen maximalen Frameintervalle ist bei n=5 jeweils ebenfalls
das gezeigte Maximum. Frame-Mediane liegen ungefähr bei 16,7 ms.

Desktop-Kaltstart, **Gesamtdauer einschließlich gewollter Animation**:

| Aktion, n=5 | Median vorher → nachher | P95 vorher → nachher |
| --- | ---: | ---: |
| Erster Chili-Merge I → II | 2.212,4 → 1.795,6 ms | 3.340,7 → 1.795,6 ms |
| Nächster Pilz-Merge | 4.965,9 → 1.797,4 ms | 6.060,3 → 1.813,8 ms |
| Nächster Schalen-Merge | 6.443,5 → 1.796,9 ms | 7.990,0 → 1.814,3 ms |
| Erste Kaskade I → II → III | 6.379,5 → 2.429,5 ms | 7.441,8 → 2.446,2 ms |
| Wiederholte Kaskade | 2.428,6 → 2.430,6 ms | 2.444,9 → 2.432,4 ms |
| Kauf auf freien Platz | 1.164,3 → 1.165,5 ms | 1.199,7 → 1.182,5 ms |

Die bereits flüssige wiederholte Kaskade und der einfache Kauf werden nicht
künstlich schneller: Das gewollte Timing bleibt praktisch gleich. Der erste
React-Kaufcommit erfolgt im Desktop-Kaltstart-Median nach 4,5 → 3,3 ms;
der schnelle Commit allein hätte die anschließenden Renderblockaden nicht gezeigt.
Alle Einzelphasen, Timerüberziehungen, P95-Werte und weiteren Konfigurationen
stehen in [measurements.json](measurements.json).

Der finale separat aufgezeichnete Diagnose-Trace erreicht im aktiven
Werkbankabschnitt maximal 33,3 ms ohne Long Tasks. Der erste isolierte
Nulllicht-Gegenversuch hatte noch einzelne 350–467-ms-Spitzen bei neuen
Effektmaterialien. Diese bleiben dokumentiert; Treiber-/Compiler-Caches und
Instrumentierung beeinflussen solche Erstverwendungen.

| Ressourcen, gleiche ruhende Desktop-Szene | Baseline | Kandidat |
| --- | ---: | ---: |
| Registrierte Three-Programme am Ende des Diagnoseablaufs | 113 | 22 |
| Draw Calls | 140 | 140 |
| Dreiecke | 465.094 | 465.094 |
| Three-Geometrien | 58 | 58 |
| Three-Texturen | 57 | 57 |

Die Programmzahl ist kein direkter GPU-Speicherwert und allein kein
Ursachennachweis. Während der Desktop-Animationen bleiben die Median-Maxima von
170 Draw Calls, 72 Geometrien und 57 Texturen erhalten. Der programmseitige
Median-Maximalwert sinkt dort von 114 auf 23.

## 6. Spielstart, Reaktionsfähigkeit und laufende Kosten

Die Lösung verschiebt die belegte mehrsekündige Merge-Blockade nicht in einen
neuen synchronen Lade-Gate. Es gibt keinen neuen Ladeabschnitt. Navigation bis
Werkbankbereitschaft und der Menü-/Startaufbau werden separat mitgemessen.
Erstmalige Materialinitialisierung beim Start bleibt aber ein begrenztes,
eigenständiges Restrisiko; nicht alle Menühänger werden durch stabile Lichtzahlen
vollständig beseitigt.

**Restproblem Start:** Der finale Kaltstart enthält weiterhin initiale
Frameintervalle bis **1.933,2 ms Desktop**, **2.266,6 ms Portrait** und
**2.350,0 ms Landscape**. Warm-Reload Desktop: maximal 633,3 ms. Die Werkbank
ist nicht unmittelbar nach Navigation vollständig geladen und flüssig.
Diese Werte werden nicht als Kaufblockade oder gelöster Startfehler ausgegeben.

Stabile Nulllichtslots sind **nicht GPU-kostenlos**. Im isolierten Desktop-
Gegenversuch derselben ruhenden Szene steigt die per asynchroner Timerquery
gemessene GPU-Medianzeit von ungefähr **7,15 auf 11,02 ms**, P95 von **8,63 auf
12,30 ms**. In beiden Fenstern werden rund 60 Bilder/s erreicht. Das sind je ein
kurzes diagnostisches Fenster, keine fünf unabhängigen Gerätebenchmarks. Die
zusätzlichen Lichtschleifen können auf schwächeren GPUs die laufende Bildrate
verschlechtern. Schattenlichtzahl, Meshes, Texturen und Draw Calls werden durch
den Controller selbst nicht erhöht.

Geometrie-/Texturzähler sind Three-Ressourcenzähler, **keine GPU-Bytewerte**.
Der zusätzliche JS-/Three-Bedarf besteht aus höchstens 15, 16 beziehungsweise 17
kleinen PointLight-Objekten. Browser-Heap-Snapshots der Funktionsprüfung liefern
ergänzende Prozesswerte, sind aber ohne erzwungene GC kein Leak-Nachweis.

In der gekürzten Desktop-Funktionsprüfung werden vor beziehungsweise nach
weiteren Zutaten, Reserve, Menüwechsel und echtem Browser-Reload 10,69 bzw.
44,59 MB verwendeter JS-Heap erfasst. Diese Snapshots liegen in unterschiedlichen
Lade-/GC-Zuständen und sind **kein Vorher-Nachher-Leakvergleich**. Die vollständigen
CDP-Werte einschließlich Backing Storage bleiben im QA-Rohbericht.

## 7. Bestehender Kampf-Fix und Funktionstests

Auf ausdrücklichen Nutzerwunsch wurde die weitergehende Browser-Abnahme
abgebrochen und auf die notwendigen Checks gekürzt. Die abgeschlossene
40er-Werkbankreihe wurde nicht wiederholt. Die ursprünglichen Kampf-Light-Slots
und `prepareScenePrograms` sind im Produktionsdiff unverändert.

| Gekürzte Kampf-Stichprobe, jeweils n=1 | Aktives Maximalframe | Aktive Long Tasks | Klick bis aktiv |
| --- | ---: | ---: | ---: |
| Baseline 0456d1f, Zischbert | 66,6 ms | 0 | 2.434,1 ms |
| Kandidat, Zischbert | 166,6 ms | 0 | 4.565,6 ms |
| Kandidat, Moor-Martha, gleiche Sitzung | 33,4 ms | 0 | 2.701,8 ms |

Alle drei aufgeführten Kämpfe erreichen ihr vollständiges natives Ergebnis.
Zischberts Ergebnis-Hash stimmt exakt zwischen Baseline und Kandidat überein;
der deterministische Ereignisablauf bleibt während der Wiedergabe gleich.
Die drei polierten Zutaten, native Aktivierungen und die Geometrie der
Cooldown-Anzeigen werden überprüft. Die Arena zählt weiterhin 17 beziehungsweise
18 Punktlichtslots: keine mitgeschleppten Werkbank-Paddinglichter.

**Kein pauschaler Ladezeit-Erfolg:** Der einzelne Kandidaten-Zischbert benötigt
länger bis zur Freigabe als der einzelne Baseline-Zischbert. Das ist ein
beobachteter Nachteil dieser kleinen Stichprobe, kein nachgewiesener ursächlicher
Regressionsbefund und keine Verbesserung. Weitere Kaltstart-Reihen wurden auf
Nutzerwunsch gestrichen. Die mehrsekündige **aktive** Blockade kehrt in den beiden
Kandidatenkämpfen nicht zurück; eine statistische Kampf-Freigabe folgt aus n=1
pro Gegner nicht.

Der native Rückweg und der folgende Kauf wurden ohne Reload und mit demselben
Renderer erfasst. Nur der legale Kauf-Spielstand wird nach Rückkehr kontrolliert
wiederhergestellt:

| Rückkehr-Stichprobe | Ergebnis → sichtbare Werkbank | Folgender Merge gesamt | Längstes Kauf-Frame |
| --- | ---: | ---: | ---: |
| Baseline nach Zischbert | 525,7 ms | 1.928,3 ms | 283,3 ms |
| Kandidat nach Zischbert | 312,3 ms | 1.826,3 ms | 33,3 ms |
| Kandidat nach Moor-Martha | 345,7 ms | 1.804,5 ms | 16,8 ms |

Die gekürzte native Desktop-Funktionsprüfung besteht: Hauptmenü/Werkbank,
Flug/Landung/Reveal, Merge I → II, Kaskade bis III, Reservekauf, belegter
Platztausch, Reserve-Rundtausch, Synergien/Nachbarschaftshinweis, Speichern,
Fortsetzen und Wiederherstellung nach echtem Browser-Reload. Die Hauptmessreihe
prüft wiederholte Käufe, Kaskaden und belegte Platzwechsel auch auf beiden
emulierten Mobile-Formaten.

**177 Unit-Tests in 27 Dateien, Typecheck und Produktionsbuild bestehen.**
Fünf neue Unit-Tests decken Lichtzahl, Raumlicht-Ankunft, Elternsichtbarkeit,
Kameralayer, Callback-/Ressourcen-Cleanup, Arenawechsel und Kapazitätsüberschreitung
ab. Die Grafikvarianten bleiben im Quellcode und in ihren vorhandenen Unit-Tests
erhalten. Zusätzliche vollständige Browserläufe für alle sieben Grafikvarianten,
weitere Familien, native Abbruch-/Neustart-Stichproben und mobile Kampfwiederholungen
wurden nach der Umfangskürzung **nicht** neu ausgeführt. Die bisherige Abnahme
wird nicht als neue Prüfung ausgegeben.

Die unterbrochene größere Kampfmatrix ist entsprechend archiviert; daraus wird
nur der vollständig abgeschlossene Baseline-Zischbert verwendet. Der historische
`baselineCommit`-Metadatenwert im wiederverwendeten Kampf-Harness lautet in diesen
ursprünglichen Rohdateien noch `353d154`; er ist **nicht** die Experimentbasis.
Die mitgespeicherte Bundle-Identität belegt `index-BATde8RD.js` für den tatsächlich
eingefrorenen 0456d1f-Build und `index-DJl5vgTm.js` für den Kandidaten. Der Harness
erlaubt künftig `--baseline-commit`; originale Rohdaten werden nicht umetikettiert.

## 8. Grenzen, technische Risiken und Reproduktion

Kein Anspruch auf völlige Ruckelfreiheit. Einzelne neue Effektmaterialien und
initiale GLB-/Materialprogramme können weiterhin Spitzen über 250 ms verursachen.
Die genaue Restursache jeder kürzeren Spitze muss getrennt diagnostiziert werden;
es gibt keinen spekulativen zusätzlichen Produktionsumbau.

Der GPU-Dauerpreis ist ein bewusster Kompromiss gegen massive interaktive
Kompilierungsblockaden. Echte Smartphones, höhere DPR-Werte, andere Treiber und
Browser bleiben gesonderte Freigabeaufgaben. Künftige zusätzliche Raum-/Effektlichter
müssen die dokumentierte Obergrenze beachten. Die bestehende Kampf-Vorbereitung
ohne `KHR_parallel_shader_compile` besitzt weiterhin ihren dokumentierten Fallback.

```powershell
# Baseline unverändert separat bauen und auf Port 5201 einfrieren;
# Arbeitsbranch als Produktionsbuild auf Port 5202 starten. Dann seriell:
node scripts/benchmark_workshop.mjs --url=http://127.0.0.1:5201/ --label=baseline --repeats=5 --out=outputs/workshop-purchase-performance/matrix/baseline-desktop
node scripts/benchmark_workshop.mjs --url=http://127.0.0.1:5202/ --label=candidate --repeats=5 --out=outputs/workshop-purchase-performance/matrix/candidate-desktop
# Für beide Targets jeweils --profile=portrait bzw. landscape --cold-only.
node scripts/benchmark_workshop.mjs --url=http://127.0.0.1:5201/ --label=baseline --trace --cold-only --out=outputs/workshop-purchase-performance/baseline-trace
node scripts/benchmark_workshop.mjs --url=http://127.0.0.1:5201/ --label=control --trace --cold-only --constant-lights=15 --out=outputs/workshop-purchase-performance/constant-light-control
node scripts/summarize_workshop_benchmark.mjs outputs/workshop-purchase-performance/matrix outputs/workshop-purchase-performance/matrix-summary.json
node scripts/qa_workshop_interactions.mjs
npm test
npm run typecheck
npm run build
```

Die `constant-lights`-Option verändert ausschließlich den isolierten Diagnosebrowser,
nicht den Produktionsstand; sie ist keine Nutzeroption im Spiel. Traces lassen
sich entpackt in Chromium DevTools Performance beziehungsweise Perfetto öffnen.
Die CPU-Profile lassen sich in DevTools laden. Native GL-Wartefenster, Thread-CPU,
GC und zeitgleiche Ressourcen lassen sich mit `scripts/analyze_combat_trace.mjs`
anhand der gleichnamigen Rohdateien erneut zuordnen.

### Gesicherte Nachweise

[Messübersicht aller 40 Sitzungen](measurements.json) ·
[Rohdaten-/SHA-256-Verzeichnis](evidence/manifest.json) ·
[Baseline-Trace](evidence/baseline-trace/baseline-desktop-r1-cold.trace.json.gz) ·
[Kandidaten-Trace](evidence/final-trace/final-desktop-r1-cold.trace.json.gz) ·
[Kontrollversuch](evidence/constant-light-control/control-desktop-r1-cold.trace.json.gz) ·
[Werkbank-Funktionsprüfung](evidence/functional-workshop/report.json.gz) ·
[Gekürzte Kampf-Stichprobe](evidence/combat-smoke/summary.json.gz).

JSON und CPU-Profile sind verlustfrei gezippt, Traces bereits komprimiert.
Der Manifest enthält die Original- und Archiv-Hashes. Die zusammengefasste
Werkbankmessung lässt sich direkt aus den archivierten Rohdaten reproduzieren:

```powershell
node scripts/summarize_workshop_benchmark.mjs docs/qa/workshop-purchase-performance/evidence/matrix outputs/workshop-purchase-performance/re-audit.json
```

**Urteil:** Der belegte lichtzahlbedingte Kompilierungsfehler ist im geprüften
Werkbankablauf gezielt behoben: kein >250-ms-Intervall in den 120 korrigierten
Kauf-/Merge-Aktionen, bei unverändertem Animationstiming. Das ist mehr als eine
Verbesserung der Durchschnitts-FPS. Spielstart, einzelne erstmalige
Materialvarianten außerhalb dieser Messreihe, GPU-Dauerlast und die schwankende
Kampfvorbereitung bleiben ausdrücklich offen. Die gekürzte Regression liefert
keine neue umfassende Geräte-/Grafikvariantenfreigabe. Stopp zur technischen
Abnahme auf dem Arbeitsbranch; `master` und Pages bleiben unverändert.
