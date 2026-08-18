# Golden Slice – Produktionsvertrag

Stand: 18. August 2026

## Ziel

Der erste Production-Quality-Kampf ist der Kampf gegen Moor-Martha. Er dient
als verbindliches Qualitätsmuster für sämtliche späteren Kessel, Zutaten,
Arenen, Animationen, VFX und Audiosysteme.

Die alten 2D-Bilder sind Charakter-, Silhouetten- und Farbreferenz. Sie werden
nicht als flache Laufzeit-Sprites in die 3D-Bühne übernommen. Vor einer direkten
Nutzung als Textur oder Marketinggrafik muss ihre Rechtekette bestätigt werden.

## Enthaltener Referenzumfang

- Spieler-Kessel als ausdrucksfähiger Hero Actor
- Moor-Martha als erster individueller Gegner-Actor
- Glut-Chili, Schleimpilz und Runenschale als Familienreferenzen
- Turnierarena mit Publikum, Bannern, Feuer, Giftlicht und Tiefenstaffelung
- visuelle Combat-Beats mit Antizipation, Cast, Flug, Impact und Reaktion
- 1×-, 2×-, 4×-Wiedergabe und Pause ohne Einfluss auf das Simulationsergebnis
- unterschiedliche Fire-, Poison- und Guard-Silhouetten sowie Audiocues

## Actor-Vertrag

Jeder Kessel unterstützt mindestens:

```text
idle → cast → hit → guard/heal → victory/defeat
```

Gegnerprofile definieren Körperform, Gesicht, Metall, Flüssigkeit, Dampf,
Bewegungsrhythmus und Umgebungsakzent. Ein neues Profil darf keine
Gameplayregel enthalten.

## Combat-Beat-Vertrag

Der Core erzeugt den vollständigen deterministischen Eventstream. Die
Presentation gruppiert nur gleichzeitig auftretende Effekte desselben
Auslösers und weist ihnen eine visuelle Gewichtung zu:

- `ambient`: Status-Ticks und kleine Nachläufe
- `standard`: normale Itemaktivierungen
- `hero`: Synergien, Toxinschock, Frost und Echo
- `boss`: exklusive Bosszustände

Geschwindigkeit und Pause verändern ausschließlich die Präsentationsuhr.

## Qualitätsgates

Der Golden Slice ist erst bestanden, wenn:

1. Spieler-Kessel und Moor-Martha ohne Namen unterscheidbar sind.
2. Glut-Chili, Schleimpilz und Runenschale sichtbar selbst auslösen.
3. Fire, Poison und Guard allein über Form, Bewegung, Licht und Klang lesbar sind.
4. Sieg und Niederlage vor dem Ergebnisdialog körperlich ausgespielt werden.
5. Arena und Kessel dieselbe Material-, Licht- und Maßstabslogik besitzen.
6. Desktop, Mobile Landscape und Mobile Portrait keine Kernaktion verdecken.
7. Typecheck, Tests, Build und Screenshot-QA erfolgreich sind.

## Noch nicht final

Die aktuellen codegenerierten Actor- und Arenaformen beweisen Vertrag,
Komposition und Animation. Nach dem Screenshot-Gate werden sie durch
optimierte GLB-Produktionsmodelle ersetzt oder als präzise Modellvorlage
weiterverarbeitet. Ein vollständiges Roster aus zufälligen Primitives ist
ausdrücklich nicht das Endziel.
