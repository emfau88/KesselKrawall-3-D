# Production-Art Vertical Slice – Review

Stand: 21. August 2026

## Ergebnis

Der Production-Art-Vertical-Slice ersetzt die reine Greybox-Anmutung durch eine
zusammenhängende, spielbare Alchemie-Werkstatt und Turnierarena. Die bestehende
Core-Architektur blieb unverändert. Nach dem ersten öffentlichen Review wurde
die frühere Einstufung „Minimum-Production-Ziel erfüllt“ bewusst revidiert und
ein eigener Blender-/North-Star-Pass ergänzt. Der Slice liegt jetzt deutlich
näher an der gewünschten Charakter-, Material- und UI-Sprache; das
Final-North-Star-Mockup bleibt dennoch ein langfristiger Qualitätsmaßstab und
keine Behauptung pixelgleicher Renderqualität.

## Umgesetzter Umfang

- offizielles, CC0-lizenziertes KayKit Dungeon Pack 1.1 als glTF-Umgebung,
- Asset-Katalog, Runtime-Wrapper, Schatten-/Materialnormalisierung und
  prozeduraler Fallback,
- sieben originale GLB-Hero-Assets mit reproduzierbarer Blender-5.2-Pipeline,
- frontalere Werkbankkamera mit eigener Mobile-Komposition,
- belebte Werkstatt mit Regalen, Flaschen, Büchern, Kerzen, Mörser und
  magischen Akzenten,
- charakteristische GLB-Silhouetten für Glut-Chili, Schleimpilz und Runenschale,
- eigenständige GLB-Charaktermodelle für Spieler und Moor-Martha, weiterhin
  gesteuert vom bestehenden Reaction-Interface,
- Fire-, Poison- und Guard-Aktivierungen mit Antizipation, Trails, Flugkurven,
  Impacts und Lichtreaktionen,
- geschlossene Arena mit individuellem Ritual-Dais, Bannern, bewegtem
  Alchemistenpublikum, Ambient-Motes, Braziers und Moor-Miasma,
- Fantasy-UI-Pass mit dunklen Schmiedepaneelen, Messingkanten,
  Parchment-Typografie und klarer Touch-Hierarchie,
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

Blender 5.2 LTS ist jetzt Teil des reproduzierbaren Art-Workflows. Die GLBs
werden nicht blind per Script akzeptiert: jeder Export erhält Vorschaurenderings
und anschließend einen In-Game-Screenshot-Gate. Runtime-Animation, VFX und
Fallback bleiben bewusst in R3F; dadurch beeinflusst ein Assetfehler keine
Spielregel.

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
