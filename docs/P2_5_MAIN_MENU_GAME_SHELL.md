# P2.5A — Hauptmenü und Game-Shell

## Ziel

P2.5A gibt dem bereits spielbaren Vertical Slice einen vollständigen Einstieg
und eine verlässliche Navigationshierarchie. Spieler landen nicht mehr direkt
in einer laufenden Werkbank, sondern in einer animierten Titelszene, die das
Spiel, seine Welt und die wichtigsten Sekundärbereiche zusammenführt.

## Umgesetzter Umfang

- lebendige 3D-Titelszene auf Basis der bestehenden, optimierten Werkstatt;
- klare Primäraktion **Spielen** mit bewusster Kampagnenwahl;
- **Fortsetzen** nur für einen tatsächlich gespeicherten Shop-Lauf;
- Zutatengrimoire für alle 20 Zutaten mit echter Portraitdarstellung,
  Familienrolle, Stufenwerten und Cooldowns;
- vierstufige Kurzanleitung für Kaufen, Mischen, Anordnen und Kämpfen;
- zentrale Audioeinstellungen und verständliche Anzeige des automatisch
  gewählten Grafikprofils;
- Credits mit direktem Verweis auf das vollständige Asset-/Lizenzregister;
- Hauptmenü-Rückweg aus Werkbank und Kampfergebnis;
- eigene Desktop-, Portrait- und kurze Landscape-Kompositionen mit mindestens
  44 Pixel hohen Touchzielen und intern scrollenden Inhaltsseiten.

## Speicher- und Laufverhalten

Beim ersten Besuch wird kein künstlicher Lauf als fortsetzbar markiert. Erst
eine bestätigte Kampagnenwahl erzeugt und speichert einen neuen Run. Bereits
gespeicherte Shop-Läufe bleiben beim Aufruf des Hauptmenüs unangetastet und
können mit **Fortsetzen** wieder geöffnet werden. Dadurch ist **Spielen** immer
eine bewusste Neustartentscheidung und **Fortsetzen** eine verlustfreie
Rückkehr.

## Rendering und Performance

Titelszene und Spiel verwenden denselben React-/WebGL-Lebenszyklus. Das Menü
lädt keine zweite Three.js-Welt und erzeugt keinen parallelen Canvas. Die
bestehende automatische Qualitätswahl für Mobile, Schatten und DPR bleibt
deshalb wirksam. Inhaltsseiten wie Grimoire oder Einstellungen sind reine
HTML/CSS-Ebenen über der Szene und verursachen keine zusätzlichen 3D-Drawcalls.

## Quality Gate

- TypeScript-Projektbuild ohne Fehler;
- 53 Core-, Speicher-, Kampagnen- und Audio-Tests grün;
- optimierter Vite-Produktionsbuild erfolgreich;
- Browser-Smoke-Test für Titelszene, alle Inhaltsseiten, Kampagnenstart,
  Werkbank-Rückweg und Save-aware Fortsetzen;
- Layoutgrenzen und Touchhöhen im Desktop-Browser geprüft;
- responsive Regeln für 390-Pixel-Portrait und kurze Landscape-Viewports
  ergänzt; ein physischer Gerätesmoketest bleibt wie bisher empfohlen.
