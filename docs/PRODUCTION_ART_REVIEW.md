# Production-Art Vertical Slice – Review

Stand: 20. August 2026

## Ergebnis

Der erste Production-Art-Vertical-Slice ersetzt die reine Greybox-Anmutung
durch eine zusammenhängende, spielbare Alchemie-Werkstatt und Turnierarena. Die
bestehende Core- und UI-Architektur blieb unverändert. Der Slice erfüllt das
Minimum-Production-Ziel; das Final-North-Star-Mockup bleibt die Richtung für
weitere individuelle Hero-Assets und zusätzliche Art-Polish-Runden.

## Umgesetzter Umfang

- offizielles, CC0-lizenziertes KayKit Dungeon Pack 1.1 als glTF-Umgebung,
- Asset-Katalog, Runtime-Wrapper, Schatten-/Materialnormalisierung und
  prozeduraler Fallback,
- frontalere Werkbankkamera mit eigener Mobile-Komposition,
- belebte Werkstatt mit Regalen, Flaschen, Büchern, Kerzen, Mörser und
  magischen Akzenten,
- charakteristischere Silhouetten für Glut-Chili, Schleimpilz und Runenschale,
- individuelle Spieler- und Gegnerkessel inklusive Moor-Martha-Profil,
- überarbeitete Fire-, Poison- und Guard-Aktivierungs- und Impact-Sprache,
- geschlossene Arena mit Bodenstaffelung, Bannern, Publikum, Braziers und
  Moor-Miasma,
- GitHub-Pages-Build und responsive UI für Desktop, Landscape und Portrait.

## Asset-Entscheidung

Das im Produktionsprompt bevorzugte KayKit Dungeon Pack 1.1 bildet die alleinige
externe Architektur- und Prop-Basis. Der zwischenzeitlich geprüfte
Kenney-Fallback wurde vollständig entfernt; Architekturpakete werden nicht
gemischt. Quaternius bleibt ein Kandidat für einen späteren, streng kuratierten
Prop-Pass und ist nicht Bestandteil des aktuellen Builds.

Ausgeliefert werden nur die tatsächlich verwendeten modularen Modelle, deren
Binärdaten, der gemeinsame Texturatlas und die Originallizenz. Das vollständige
Downloadarchiv und nicht verwendete Modelle befinden sich nicht im Repository.

## Blender-Entscheidung

Blender ist für diesen Slice kein Blocker: Kessel, Zutaten und Kampfreaktionen
sind eigenständige, optimierte Runtime-Modelle. Für den nächsten North-Star-Pass
ist Blender dennoch sinnvoll, vor allem für einen noch stärker modellierten
Hero-Kessel, ein vollständig individuelles Moor-Martha-Modell und gebackene
Materialdetails. Die Entscheidung wird nach dem öffentlichen Screenshotreview
getroffen, nicht vor der spielbaren Integration.

## Qualitätsgates

| Gate | Status |
|---|---|
| Spieler- und Moor-Martha-Kessel unterscheidbar | bestanden |
| Drei Referenzzutaten mit eigener Silhouette | bestanden |
| Fire, Poison und Guard visuell unterscheidbar | bestanden |
| Desktop 1280×720 | bestanden |
| Mobile Landscape 844×390 | bestanden |
| Mobile Portrait 390×844 | bestanden |
| Typecheck, Unit-Tests und Produktionsbuild | bestanden |
| Externe Runtime-Assets dokumentiert | bestanden |

## Bewusste Restpunkte

- Das North-Star-Mockup besitzt eine höhere Zahl individueller Meshes und
  gebackener Oberflächendetails als dieser Web-Slice.
- Ein physischer Gerätesmoketest bleibt zusätzlich zum emulierten Mobile-Gate
  empfehlenswert.
- Weitere Gegnerarenen werden erst nach Review dieses Golden Slice ausgebaut.
