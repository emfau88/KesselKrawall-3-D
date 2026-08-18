# Art Direction

## North Star

**Stylized low-poly fantasy 3D:** eine warme, humorvolle Alchemiewelt mit
großen lesbaren Formen, klarer Materialsprache und einem charaktervollen
Kessel als Hero Asset. Ein Screenshot soll wie ein kleines bewusst produziertes
Browsergame wirken, nicht wie eine Web-App und nicht wie eine Asset-Pack-Demo.

Kohärenz hat Vorrang vor Detailgrad.

## Visuelle Sprache

- Runde, leicht überzeichnete Silhouetten; gefährliche Formen bleiben weich
  genug für den charmanten Ton.
- Matte, handwerkliche Oberflächen für Holz, Stein und Metall; Magie darf
  leuchten, aber nicht die ganze Szene neonfarben überziehen.
- Begrenzte gemeinsame Palette: warmes dunkles Holz, honigfarbenes Licht,
  gedämpftes Messing, tiefes Kesselmetall und ein ruhiger violettbrauner
  Schattenbereich.
- Familienfarben sind Akzente, keine getrennten Welten: Fire orange/rot,
  Poison gelbgrün, Guard cyan/blau, Frost eisblau, Echo lavendel.
- Gleiche Texeldichte, Größenlogik, Lichtantwort und Schattenweichheit für alle
  Runtime-Assets.

## Kamera

Erste Hypothese für die Greybox:

- Welt auf XZ-Ebene.
- Orthografische Kamera, fest auf die Bühnenmitte ausgerichtet.
- Erhöhter three-quarter view mit ungefähr 55–70° Blick von oben.
- Ausgangsposition sinngemäß bei `(8, 10, 11)`, Blickziel um `(0, 1, 0)`;
  endgültige Werte entstehen aus Screenshot-Vergleichen.
- Kein Orbit, kein freies Drehen, keine CSS-Perspektive.

Nach dem Orthografie-Gate wird dieselbe Komposition einmal mit niedriger
Perspective/FOV geprüft. Gewählt wird die Variante mit besserer räumlicher
Lesbarkeit und stabilerer Mobile-Komposition, nicht die technisch auffälligere.

Review-Notiz nach dem ersten lokalen Greybox (18.08.2026): Die Werkbank soll im
Polishing weniger diagonal und frontaler lesbar werden. Der aktuelle Winkel
bleibt während des Vertical-Slice-Anschlusses stabil, damit Shop-, Slot- und
Kampffunktion nicht gleichzeitig mit dem Framing umgebaut werden.

## Werkbank

Die Werkbank ist ein tatsächlicher Ort:

- Kessel als Zentrum und höchste visuelle Priorität.
- Fünf Ingredient-Positionen als lesbarer Halbkreis auf derselben Tischplatte.
- Drei Shopangebote als kompakter DOM-Streifen am unteren Rand; Angebote dürfen
  durch kleine räumliche Sockel in der Welt gespiegelt werden.
- Hintergrund-Props rahmen die Szene, konkurrieren aber nicht mit kaufbaren
  Objekten.
- Kaufpfad ist räumlich nachvollziehbar: Angebot hebt ab, fliegt in einem
  kontrollierten Bogen zum Ziel, landet und löst Kesselreaktion plus kurze
  UI-Bestätigung aus.

## Arena

- Spieler- und Gegnerkessel stehen physisch auf derselben Bodenfläche.
- Ausreichend negativer Raum zwischen beiden für Projektile und Status-VFX.
- Gemeinsames Licht-Rig und dieselbe Materialwelt wie die Werkbank; Arena darf
  kühler und kontrastreicher sein, aber nicht wie ein anderes Asset-Pack.
- HP bleibt kompakte UI, während Cast, Flugbahn, Treffer und Status am 3D-Objekt
  sichtbar sind.

## Hero-Kessel

Der Kessel braucht eine unverwechselbare Silhouette: breiter Bauch, gut lesbarer
Rand, kurze überzeichnete Füße/Griffe und sichtbare Flüssigkeit. Zustände:

| Zustand | Bewegung und Materialreaktion |
|---|---|
| Idle | langsames Atmen, kleine Blasen, minimale asymmetrische Neigung |
| Boil | schnellere Flüssigkeitswellen, Blasen und etwas Dampf |
| Cast | kurzer Squash, Vorwärtsimpuls, Flüssigkeitslicht zieht zur Angriffsseite |
| Hit | schneller Rückstoß, Metall-Wobble, kontrollierter Impact-Flash |
| Victory | aufrechter Hop, heller Überkoch-Impuls, Funken/Blasen |
| Defeat | Gewicht sackt ab, Flüssigkeit dimmt, Silhouette kippt ohne unlesbar zu werden |

Animationen dürfen sich über Rotation, Scale, Translation, Flüssigkeitsmaterial
und begrenzte Partikel ausdrücken. Ein komplexes Rig ist für den Slice nicht
erforderlich.

## Ingredient-Sprache

Für die erste visuelle Familie genügen wenige starke Objekte:

- Fire/Chili: rote gebogene Schote, warmer Kern, kleine Funken beim Aktivieren.
- Poison/Schleimpilz: grüne Kappe, unregelmäßige Blasen, dichter kurzer Dampf.
- Guard/Eierschale: helle Schalenform, cyanfarbene Rune, Schildbogen beim Cast.

Level werden durch klar wachsende Formdetails und Sockel-/Auraqualität gezeigt,
nicht nur durch eine kleine Zahl. Beim Merge ziehen sich beide Objekte sichtbar
zusammen, verschwinden in einem kurzen magischen Impuls und ergeben ein
größeres, eindeutig aufgewertetes Objekt.

## Familien-VFX

| Familie | Primäre Form | Bewegung | Lichtreaktion |
|---|---|---|---|
| Fire | Funken, kompakter Feuerkern | schnell, ballistisch | kurzer warmer Key-Light-Impuls |
| Poison | Blasen, Wolke, Tropfen | schwebend, nachlaufend | gedämpft grüne Flüssigkeit/Statusdampf |
| Guard | Rune, Bogen, Facetten | expandierend, stabil | kühler Randglanz am geschützten Kessel |
| Frost | Splitter, Reif, kalter Dampf | knackig, verlangsamender Nachlauf | kalter Rim-Flash |
| Echo | Ring, Doppelimpuls, Afterimage | erste Aktion plus versetzter Nachhall | kurzer lavendelfarbener Doppel-Puls |

Effekte bleiben kurz, gerichtet und mengenbegrenzt. Große Texte erklären keine
Wirkung, die Objektreaktion, Flugbahn und Statusform bereits zeigen können.

## Licht und Materialien

- Ein warmes gerichtetes Hauptlicht, weiches Umgebungslicht und sehr sparsame
  magische Effektlichter.
- Kontakt- und Schlagschatten verankern Kessel, Zutaten und Props auf derselben
  Ebene.
- Materialanzahl klein halten; Farbvarianten möglichst über Parameter derselben
  Materialfamilie.
- Flüssigkeit stilisiert und performant, ohne notwendige Transmission oder
  teure Screen-Space-Effekte.

## UI

Die Bühne bleibt Hauptdarsteller. DOM-UI beschränkt sich auf:

- Gold, Runde und kompakte Synergieanzeige,
- drei kaufbare Shopangebote,
- HP/Status im Kampf,
- einen kurzen Onboarding-Hinweis,
- Ergebnis und klare nächste Aktion.

Keine Vollbild-Panelwand, keine Kaskade aus Karten in Karten und keine großen
freigestellten Character-Render über der 3D-Szene.

## Responsive Komposition

Mobile Landscape erhält eine eigene Kamera-Framing- und HUD-Anordnung. Props
dürfen am Rand aus dem Frame fallen; Kessel, fünf Slots, Shopaktionen, HP und
Projektile nicht. Safe Areas werden als Layoutgrenzen behandelt.

Pflichtgrößen: 1280×720, 1920×1080, 907×510, 844×390, 915×412 und 800×450.

## Greybox- und Screenshot-Gates

Ein Greybox-Screenshot besteht nur, wenn:

1. Kessel und fünf Plätze ohne Labels erkennbar sind,
2. alle Objekte dieselbe Bodenebene und Perspektive teilen,
3. der Shop höchstens den unteren kompakten Bereich beansprucht,
4. Spieler und Gegner in der Arena mit Raum für VFX lesbar sind,
5. Mobile keine zentrale Interaktion abschneidet,
6. Licht und Schatten den Ort zusammenbinden.

Erst nach diesem Gate werden Production-Assets ausgewählt oder gebaut.

## Verbotene Abkürzungen

- Keine pseudo-isometrischen PNG-Layer.
- Keine alte Panel-/Card-Komposition mit 3D-Hintergrund.
- Keine Mischung mehrerer Asset-Packs ohne gemeinsame Überarbeitung.
- Keine zufällige Primitive-Welt als endgültige Art Direction.
- Keine Animation, deren Trefferzeitpunkt Gameplay berechnet.
- Keine undokumentierten Assets.
