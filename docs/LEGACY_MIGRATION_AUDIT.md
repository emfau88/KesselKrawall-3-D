# Legacy-Migrationsaudit

Stand: 18. August 2026
Referenz: separates lokales `KesselKrawall-reference`-Repository
Commit: `5c4ec098b36d44d6dde4de31cba422de8b4f2b24` (`origin/main`)

## Audit-Garantie

Das Referenz-Repository wurde separat geklont und vor sowie nach dem Audit mit
einem leeren `git status --porcelain` geprüft. In dieser Phase wurde daraus
nichts kopiert, installiert, gebaut oder verändert. Das neue Repository besitzt
eine eigene `.git`-Historie.

Untersucht wurden Importgrenzen, exportierte APIs, Kernspezifikation,
datengetriebener Content, Save-Sanitizing, Simulation, die 76 vorhandenen Tests
(348 Assertions), Audio-/Asset-Provenienz sowie Aufbau und Verantwortlichkeiten
der alten Presentation.

## Entscheidungsschlüssel

| Entscheidung | Bedeutung |
|---|---|
| **KEEP** | Verhalten und Datenmodell unverändert als Baseline erhalten; trotzdem bewusst in die neue Struktur übertragen. |
| **ADAPT** | Wertvolle Logik erhalten, aber Kopplung, API oder Datenform vor der Übernahme bereinigen. |
| **REFERENCE ONLY** | Nur als UX-, Timing-, Farb- oder Verhaltensreferenz lesen; nicht als Grundlage der neuen Runtime verwenden. |
| **DISCARD** | Nicht migrieren. Die neue Architektur ersetzt dieses System vollständig. |

## Migrationsmatrix

| Legacy-Datei/System | Entscheidung | Befund und Migrationsziel |
|---|---|---|
| `app/game/types.ts` | **ADAPT** | Überwiegend renderer-neutral. `ItemDefinition` mischt aber Kampfwerte mit Name, Emoji und Beschreibung; `CombatEvent.label` enthält lokalisierte Presentation-Texte. Mechanische Typen nach `src/core/types`, Anzeige-Metadaten und Texte außerhalb des Core. |
| `app/game/data.ts` | **ADAPT** | Kanonische Baseline für 20 Zutaten, fünf Familien und 16 Gegner. Werte/IDs/Boards erhalten; Farben, Icons, Namen, Zitate und Beschreibungen in einen Presentation-/Content-Katalog trennen. |
| `app/game/campaigns.ts` | **KEEP / ADAPT** | Zwei Kampagnen, Familienauswahl und kuratierte Startangebote sind reine Regeln. Mechanische Kampagnendaten erhalten, lokalisierte Texte auslagern. |
| `app/game/state.ts` | **ADAPT** | Wertvolle reine Regeln für Seed-RNG, drei Shopangebote, Kauf, automatische Merge-Kaskaden, fünf Slots, Reserve, Reroll, Verkauf, Rewards, Siegel und Phasen. Deutsche Fehlerstrings durch stabile Fehlercodes ersetzen; Save-Sanitizer in eigenes Modul teilen. |
| `app/game/simulation.ts` | **KEEP / ADAPT** | Deterministische 100-ms-Simulation mit vollständigem Eventlog, Stats, Fire/Poison/Guard/Frost/Echo, Bossregeln und Timeout-Tiebreak. Mechanik erhalten. Ereignisse müssen strukturierte Codes statt deutscher Labels liefern. |
| `app/game/storage.ts` | **ADAPT** | Migrationen v2–v6 und tiefe Validierung sind wertvoll. Die DOM-`Storage`-Abhängigkeit wird durch ein kleines `KeyValueStorage`-Interface ersetzt; Browseradapter liegt unter `src/platform`. |
| `tests/game-core.test.ts` | **ADAPT** | 76 Tests kombinieren Core, Lokalisierung, alte Art-Mappings, Combat-Director, Audio und Floating Numbers. Renderer-neutrale Regeltests werden thematisch aufgeteilt; Presentation-Tests werden nicht blind mitkopiert. |
| `app/game/audio.ts` | **ADAPT** | Event-zu-Sound- und Drosselungsregeln sind nützliche Referenz. Browser-Audio-Engine, globale Singletons und konkrete Dateien werden erst nach Lizenzprüfung als separates Audio-System neu angebunden. |
| `app/game/i18n.tsx` | **ADAPT** | Vollständige DE/EN-Texte sind wertvoll, aber Dictionaries, React-Provider, DOM-Metadaten und Local Storage stecken in einer Datei. Reine Übersetzungsdaten/API von React- und Plattformadaptern trennen. |
| `app/game/itemInsights.ts` | **ADAPT** | Berechnung von Nachbar-, Tempo- und Synergiehinweisen ist nützlich. Derzeit an lokalisierte Prosa und `i18n.tsx` gekoppelt; künftig strukturierte Insight-Daten erzeugen und erst im UI texten. |
| `app/game/combatCooldownTimeline.ts` | **ADAPT** | Ermittelt aus echten Combat Events die sichtbare Cooldown-Zeitlinie. Die einzige unerwünschte Kopplung ist `isStatusTick` aus der alten Presentation; Klassifikation in einen renderer-neutralen Event-Selector verschieben. |
| `app/game/Game.tsx` | **DISCARD** | Rund 4.600 Zeilen bündeln Menüs, State, Browser-APIs, Audio, Scheduler, VFX, Shop, Battle und Result. Keine Grundlage für den Rebuild. |
| `app/game/ArtSprite.tsx` | **REFERENCE ONLY** | Pfad-Mappings und alte Sprite-Komponenten dienen nur als Content-/Character-Referenz. Keine Sprite-Isometrie im neuen Renderer. |
| `app/globals.css`, `app/menu.css` | **DISCARD** | Alte Panel-, Karten- und 2D-Komposition widerspricht dem 3D-Bühnenziel. |
| `app/game/combatPresentation.ts` | **REFERENCE ONLY** | Gruppiert Simulationsereignisse in Beats und enthält brauchbare UX-Learnings. Timing, deutsche Labels und 2D-VFX-Budget sind jedoch Presentation-Politik der alten Fassung und werden für die 3D-Choreografie neu entworfen. |
| `app/game/combatFloatingNumbers.ts` | **REFERENCE ONLY** | Bündelungs- und Lesbarkeitswerte können verglichen werden; das neue räumliche Feedback erhält eine eigene Lösung. |
| `app/game/presentationTimeline.ts` | **REFERENCE ONLY** | Pause-, Clock- und Scheduling-Ideen sind Referenz. Die neue R3F-Playback-Schicht besitzt eine eigene Uhr und koppelt niemals Regeln an Frames. |
| `public/assets/art`, `public/assets/backgrounds`, `public/assets/ui` | **REFERENCE ONLY** | 99 PNG- und 7 WebP-Dateien sind Farb-, Character- und UX-Referenzen. Es gibt im Repo keine separate Lizenz-/Provenienzdatei für diese Bilder; daher keine Runtime-Übernahme. |
| `public/assets/audio` | **ADAPT** | 23 OGG-Dateien mit vorhandener Attribution (überwiegend CC0, zwei CC BY 4.0). Kandidaten, aber noch nicht übernommen; Quelle, Bearbeitung und Attribution müssen pro Datei im neuen Repo bestätigt werden. |
| `docs/GAME_SPEC.md` | **KEEP** | Verbindliche Regelreferenz: zwei Kampagnen, fünf Familien, Economy, Merge, Kampf und Progression. Wird nicht als Runtime-Datei kopiert, sondern durch Core-Tests abgesichert. |
| `tools/balance-analysis.ts`, `tools/parking-counterfactual.ts`, `reports/*` | **ADAPT LATER** | Nützlich für spätere Balance-Regressionen, aber nicht für Core-Extraction oder Greybox erforderlich. |
| Next-/vinext-App-Shell, `next.config.ts`, `worker`, Cloudflare-/CrazyGames-Buildskripte | **DISCARD** | Ziel ist ein kleiner Vite-SPA-Build ohne Next.js oder Server. Plattformadapter werden später neu und isoliert ergänzt. |

## Tatsächlicher Legacy-Abhängigkeitsgraph

```text
types
  ↑
data ← campaigns
  ↑       ↑
state ────┘
  ↑
simulation

storage → state sanitizer
itemInsights → data + state + simulation + i18n/React
combatCooldownTimeline → combatPresentation → simulation constants

Game.tsx → nahezu alle Module + React + DOM + Browser-APIs + CSS/Assets
```

Der mechanische Kern importiert weder React noch Three.js. Er ist dennoch nicht
unverändert zu übernehmen, weil lokalisierte Labels, Anzeige-Metadaten und
Browser-Storage an mehreren Stellen in mechanische Daten ragen.

## Zu erhaltende Regel-Baseline

- Board mit fünf geordneten Slots; Nachbarn sind ausschließlich `n-1` und
  `n+1`.
- Drei Shopangebote, 7 Startgold, erster Reroll pro Runde kostenlos, danach
  1 Gold.
- Zwei gleiche Items gleicher Stufe mergen automatisch; Level I/II/III zählen
  als 1/2/4 Familienpunkte. Synergie-Schwelle ist 3.
- Reserve ist ab Runde 5 verfügbar, kämpft nicht und zählt nicht für Macht oder
  Synergien.
- Drei Siegel; die erste Niederlage in Runde 1 ist geschützt.
- Zwei Kampagnen mit je sechs regulären Gegnern, einer Elite und einem Boss.
- Simulation in 100-ms-Schritten, 100 Spieler-LP, 30-s-Legacy-Limit, Schildcap
  bei 50 %, deterministische Reihenfolge und vollständige Item-Statistik.
- Fire: 22 % mehr Direktschaden. Poison: +1 Stapel und 5 % Tempo, Cap 12,
  Toxinschock ab 10. Guard: 12 Startschild und 15 % stärkere Defensive. Frost:
  jede dritte Aktivierung verzögert 650 ms. Echo: jede dritte Aktivierung
  wiederholt mit 55 %.
- Simulation bestimmt Ergebnis und Zahlen vollständig vor der Darstellung.

## Testmigration

Die vorhandene Einzeldatei wird in Phase B mindestens in folgende Suiten
zerlegt:

```text
src/tests/core/state.test.ts
src/tests/core/merge.test.ts
src/tests/core/shop.test.ts
src/tests/core/simulation.test.ts
src/tests/core/synergy.test.ts
src/tests/core/campaigns.test.ts
src/tests/core/storage.test.ts
src/tests/core/combat-events.test.ts
```

Nicht als Core-Tests migriert werden Assertions zu `ArtSprite`, alter
Combat-Beat-Kompression, CSS-Timing, Floating Numbers oder der alten
Browser-Audio-Engine. Deren gewünschtes Verhalten wird später durch neue,
rendererbezogene Tests ersetzt.

## Phase-B-Allowlist

Nur diese Inhalte dürfen als Nächstes bewusst in `src/core` rekonstruiert
werden:

1. mechanische Typen und stabile IDs,
2. Item-, Gegner- und Kampagnenwerte,
3. State-Transitions und Seed-RNG,
4. deterministische Simulation und strukturierter Eventstream,
5. Save-Schema/Sanitizer hinter einem Plattforminterface,
6. zugehörige renderer-neutrale Tests.

Ausdrücklich gesperrt bleiben `Game.tsx`, alte CSS-Dateien, Sprite-Komponenten,
2D-Combat-Presentation und sämtliche undokumentierten Bildassets.

## Risiken und offene Punkte

- Im Referenz-Repository wurde keine Top-Level-Softwarelizenz gefunden. Die
  Übernahme erfolgt auf Basis des erteilten Projektauftrags; vor externer
  Veröffentlichung muss die Rechtekette des Legacy-Codes und der internen
  Bildassets ausdrücklich bestätigt werden.
- Die im Legacy-Repo dokumentierten Audio-Lizenzen sind noch keine Freigabe zur
  Übernahme. Jede tatsächlich kopierte Datei braucht einen Eintrag in
  `ASSET_LICENSES.md`.
- Das Vertical-Slice-Ziel von 8–12 Sekunden für den ersten Kampf weicht vom
  30-Sekunden-Legacy-Limit ab. Erst eine dokumentierte, getestete Slice-Regel
  darf dieses Timing verändern.
- `CombatEvent` und Action-Fehler benötigen stabile Codes, damit der Core nicht
  deutschsprachige Presentation-Texte erzeugt.

## Gate-Ergebnis

**Phase A – Audit: bestanden.** Die Migrationsgrenze ist dokumentiert. Vor
Phase B wurde kein Legacy-Modul in den neuen Client kopiert.
