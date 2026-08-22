# P1 – Moor-Martha Golden Encounter

Stand: 22. August 2026

P1 baut den Kampf gegen Moor-Martha als verbindliche Referenzbegegnung aus.
Die Erweiterung bleibt vollständig aus dem deterministischen Combat-Eventstream
abgeleitet; sie verändert weder Balance noch Simulationsreihenfolge.

## Umgesetzter Qualitätsrahmen

- Moor-spezifische Arena mit leuchtenden Sumpfpools, schwebenden Sporen,
  Wurzelbögen, Ritualsteinen, Pilzbewuchs, Miasma und eigener Grün-/Warmlicht-
  Dramaturgie.
- Reaktionsfähige Gesichter für Spieler und Moor-Martha mit Blinzeln,
  Cast-Fokus, Trefferreaktion, Sieg und Niederlage.
- Größere Zutatenmodelle und sichtbare, aus realen Aktivierungszeiten
  berechnete Cooldown-Ringe direkt an jedem 3D-Sockel.
- Zusätzliches Spieler-Rack mit Name, Stufe, Restzeit und klarer
  Aktivmarkierung; auf Portrait-Geräten reduziert es sich auf fünf große
  Cooldown-Symbole.
- Eigene Bewegungsprofile für alle 20 Zutaten: Flugzeit, Bogen, Höhe, Spin,
  Projektilsilhouette und Impact-Skalierung sind item-spezifisch.
- Item-spezifische Audioprofile mit Tonhöhe, Gewicht und zeitversetzter
  Akzentschicht; Musik, UI und Combat bleiben über getrennte Busse regelbar.
- Trefferzahlen nennen die auslösende Zutat und heben große Treffer sowie
  Mehrfachtreffer stärker hervor.
- Gestufter Kampfabschluss mit K.-o.- beziehungsweise Zeitablauf-Titel,
  Kesselreaktion, Seelenpartikeln und anschließendem Ergebnis-Reveal.
- Ergebnis-Chronik pro Zutat mit Auslösungen, Schaden, Schild, Heilung, Gift
  und relativem Beitragsbalken.

## Quality Gate

- 50 Tests in 15 Dateien bestanden.
- TypeScript-Check und Produktionsbuild bestanden.
- Kompletter Browserlauf Werkbank → Zischbert → Moor-Martha → Ergebnis →
  nächste Runde bestanden.
- Im Moor-Lauf geprüft: drei unabhängige Cooldowns, Fire-/Guard-/Poison-
  Aktivierungen, Statusbadges, item-spezifische Trefferlabels und
  Zutaten-Chronik.
- Keine JavaScript- oder Asset-Laufzeitfehler; lediglich die bekannte
  Three.js-Clock-Deprecation aus einer Abhängigkeit wird als Warnung gemeldet.
- Der bereits in P0 geprüfte 390×844-Portrait-Rahmen bleibt erhalten. Die neue
  Zutatenleiste besitzt einen dedizierten 390px-Modus mit 44px-nahen,
  überlappungsfreien Cooldown-Symbolen; ein physischer Gerätesmoketest bleibt
  vor einem Store-Release empfohlen.

## Skalierungsregel

Neue Gegner dürfen diesen Encounter nicht als große bedingte Komponente
kopieren. Wiederverwendbar sind Cooldown-Ableitung, Ingredient-Rack,
Item-Motion-/Audio-Profile, Ergebnis-Chronik und Finisher. Arena-Biome,
Kesselface, Requisiten, Farbdramaturgie und Signature-Effekte bleiben
gegnerbezogene Daten beziehungsweise eigene Scene-Komponenten.
