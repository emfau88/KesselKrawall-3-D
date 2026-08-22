# P2 · Golden-Encounter-Rollout

P2 überträgt den Qualitätsstandard des Moor-Martha-Vertical-Slice auf die
vollständige erste Kampagne. Die acht Kämpfe teilen weiterhin dieselben
renderer-neutralen Regeln, besitzen in der Präsentation aber eine klar
erkennbare eigene Silhouette, Arena, Farbdramaturgie, Signature-Magie und
Klangfarbe.

## Gegneridentitäten

| Gegner | Regalia und Kesselcharakter | Arena | Signature |
| --- | --- | --- | --- |
| Zischbert | Funkenkronen und nervöse Glut | Glutkeller | Kaskadierende Zündsplitter |
| Moor-Martha | Wurzeln, Moos und Sporen | Moorsanktuarium | Gift- und Sporenblasen |
| Schild-Siggi | Schwebende Bastionsplatten | Runenbastion | Mehrlagige Schutzhexagone |
| Knister-Klara | Überladene Blitzleiter | Sturmforge | Elektrische Splitterlanzen |
| Tox-Toni | Ventile und Gärgiftbehälter | Giftlabor | Schwere Giftblasen |
| Brösel-Berta | Steinpanzer und Ofenplatten | Steinherd | Fliegende Trümmer |
| Meisterin Mirea | Goldene Arkansiegel | Arkantribüne | Mehrfach rotierende Siegel |
| Großkessel | Championkrone und Feuerstacheln | Championforge | Wutkranz und Bossakzent |

Die Profile liegen zentral in
`src/presentation/content/opponentPresentation.ts`. Kessel, Licht, Arena,
HUD, Ladeübergang, VFX und Audio lesen dieselbe Identität; dadurch können Name,
Farbe und Effekt nicht unbemerkt auseinanderlaufen.

## Zutaten und Werkstatt-Hierarchie

- Alle 20 Zutaten besitzen eine eigene Aktivierungsbewegung. Frost und Echo
  haben zusätzlich eigene Auren.
- Stufe II und III werden nicht nur im Text gezeigt: Das 3D-Modell wächst,
  erhält mehrere leuchtende Runenringe, zusätzliche Stufensteine und einen
  stärkeren Lichtakzent.
- Shopangebote erscheinen ausschließlich im unteren Kaufband. Die zuvor
  zusätzlich vor der Werkbank schwebenden Angebotsmodelle wurden entfernt.
- Jedes Kaufangebot verwendet ein individuelles Zutatenporträt, das die Form
  des zugehörigen 3D-Modells wiederholt; die früheren Familien-Platzhalter sind
  entfernt.
- Die redundante 1–5-Leiste wurde entfernt. Der physische Bestand liegt direkt
  auf den fünf anklickbaren Werkbankplätzen; Auswahl, Tausch, Buff-Verbindungen
  und Verkauf bleiben dort beziehungsweise im Kontextpanel verfügbar.

## Kampf-Hierarchie

Während eines Kampfes bildet nur noch die taktische Ebene das HUD:

1. Spieler- und Gegnerleben mit Statuszuständen,
2. Zeit und Abspielsteuerung,
3. Arena, Projektilbahn und Kampfzahlen,
4. Zutaten-Cooldowns am unteren sicheren Rand.

Gold, Siegel, Kraft sowie Ton-, Mix-, Hilfe- und Laufsteuerung werden während
Kampf und Ergebnis ausgeblendet. Dadurch überlagern sie weder die gegnerische
Lebensleiste noch die Effektbahn, insbesondere nicht in Portrait-Layouts.

## Audio und Effekte

Item-spezifische P1-Klangprofile bleiben erhalten. Gegnerische Einsätze werden
in P2 zusätzlich durch ein Gegnerprofil moduliert: Tonhöhe, Gewicht, zweiter
Klangakzent und Timing unterscheiden zum Beispiel Bastion, Giftlabor, Arkanmagie
und Champion. Die VFX verwenden parallel dazu eine eigene prozedurale
Signature-Form im Cast- und Impact-Moment.

## Quality Gate

- `npm run typecheck`: bestanden
- `npm test -- --run`: 16 Testdateien, 53 Tests bestanden
- `npm run build`: bestanden
- Kampagnensmoke: jede der acht Gegnerdefinitionen erzeugt mit ihrem
  Präsentationsprofil eine vollständige deterministische Kampftimeline
- Browser-QA: Werkstatt, Kauf, Merge, Preparation-Gate, Zischbert,
  Moor-Martha und Schild-Siggi visuell geprüft
- Responsive-QA: Portrait-Breakpoint mit 390 × 844 Pixeln geprüft; ein
  WebGL-Canvas und 101 DOM-Knoten im aktiven Kampfzustand
- Konsole: keine Laufzeitfehler; ausschließlich die bekannte
  `THREE.Clock`-Deprecation-Warnung aus der aktuellen Three.js-Version

## Bewusste Grenze

P2 schließt den Golden-Encounter-Rollout der ersten Kampagne ab. Das
frostgebundene Archiv bleibt funktional und erhält weiterhin ein solides
Frost-Fallback, sein eigener vollständiger Golden-Encounter-Rollout ist ein
separater Folgeschritt.
