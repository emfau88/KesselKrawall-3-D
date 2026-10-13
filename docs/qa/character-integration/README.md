# Kesselcharaktere im tatsächlichen Spiel

Am 13.10.2026 bestanden alle 15 Browserfälle und es gab keine fehlgeschlagenen
Asset-Anfragen oder Laufzeitfehler. Die Prüfung lief über das Hauptmenü und
eine echte Kauftransaktion in beide ersten Kämpfe, einschließlich Ergebnis
und Rückkehr zur Werkbank nach Zischbert. Der zweite Gegner wurde mit einem
definierten lokalen Testinventar geladen; damit wird kein vollständiger
natürlicher Kampagnendurchlauf behauptet.

Desktop (1440×900), Mobile Portrait (390×844) und Mobile Landscape (844×390)
laden jeweils die richtige Desktop-/Mobile-Datei. Die read-only Szenenprüfung
bestätigt pro Kessel einen Körper und eine getrennte Flüssigkeit, die angewandten
Gesichtsmorphs und sinnvolle Weltmaße. In der Werkbank zeigt Brasskin sein
Gesicht, im Kampf seine Rückseite zum Betrachter und seine Vorderseite zum
Gegner. Zwischen den Kesseln bleiben mehr als sieben Welteinheiten Abstand.
Vor dem Kampf verschwindet das Preparation-Gate erst nach dem Laden.

## Nachweis und Wiederholung

Der vollständige Bericht liegt in [`report.json`](report.json). Neun Szenenbilder
und ein Hauptmenübild wurden aus dem echten Spiel aufgenommen. Es gibt keine
zusätzlichen Zutatenmodelle: Käufe, Stufen, Cooldowns und Kampfschaden verwenden
die vorhandenen Modelle und Spielregeln.

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
node scripts/qa_characters.mjs http://127.0.0.1:5173/
```

Der Test nutzt Playwright, lokal oder aus dem gebündelten Codex-Runtimepfad.
Unter Windows wird Direct3D11 verwendet. Für Software-Rendering kann
`QA_SOFTWARE_RENDERER=1` gesetzt werden; die aufwendige Arena kann damit
Screenshot-Zeitlimits überschreiten. Die Szenenprüfung liest die bereits
geladene R3F-Instanz aus, ohne einen Produktions-Testglobal einzubauen.

Der erfolgreiche Lauf verwendete laut WebGL tatsächlich AMD Radeon Graphics
mit ANGLE/Direct3D11. Die mobilen Layouts sind Browseremulation, keine Messung
auf einem physischen Android-/iPhone-Gerät. Daraus werden keine Telefon-FPS
abgeleitet. Die bestehende Arena besitzt weiterhin viele Renderaufrufe;
Draw-Call- und Materialoptimierung bleiben ein eigener Performance-Schritt.

## Ergänzende Tests

Die 60 Vitest-Spieltests, neun binären Asset-Tests aller sechs Charakterdateien,
18 Brasskin-Vorschau-Browserfälle, Root-/Preview-Typechecks und beide
Produktions-Builds bestanden. Der Root-Build weist weiterhin auf den großen
Three-Vendor-Chunk hin (etwa 768 kB minifiziert, 197 kB gzip); dies wurde nicht
durch eine höhere Warnschwelle verdeckt.

Zu verbleibenden Textur- und Gesichtsrig-Grenzen siehe
[`CHARACTER_RECONSTRUCTION.md`](../../CHARACTER_RECONSTRUCTION.md).
