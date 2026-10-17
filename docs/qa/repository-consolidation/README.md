# Repository-Konsolidierung und Veröffentlichung

## Bestandsaufnahme

Geprüfte Basis: `d39ab63a09fceafb1496dfb009587ccefc2894f5`.
Der bisherige öffentliche `master` ist `4980b81`; der lokale `master` stand noch
auf `a640541`. Sämtliche lokalen und entfernten Branchspitzen wurden nach
`git fetch --prune --tags` über ihre echte Commit-Abstammung geprüft.
Es gibt keine zusätzlichen, unintegrierten Branch-Commits.

| Integrierte Arbeit | Commit |
| --- | --- |
| Raumarchitektur und Kamerakomposition | `ae4e37e` |
| Licht-/Materialvarianten | `911b53b` |
| Zutaten und Podeste Phase 3A | `1539387` |
| Zutaten-Polish und Upgrades | `353d154` |
| Erstkampf-Performance | `0456d1f` |
| Kauf-/Merge-Performance | `d39ab63` |

Der [maschinenlesbare Nachweis](integration.json) enthält alle ursprünglichen
Branchspitzen und ihre Abstammung. 13 bereits vorhandene, nicht committete
Dateien wurden separat unter `outputs/repository-consolidation/` kopiert und
per SHA-256 unverändert geprüft. Dazu gehören aktive PlayCanvas-Arbeiten,
Unity-Planung und frühere QA-Artefakte. Ihre Inhalte werden nicht mitveröffentlicht.
Der lokale Branch `codex/playcanvas-bakeoff` bleibt wegen dieser Arbeiten erhalten.

## Änderung am Standard

Nur die bisherige Freischaltung wird geändert: Ohne URL-Parameter verwendet der
Browser die vorhandene Mockup-Raumkomposition, Warm Fantasy und Phase-3A.1-Assets.
`art=golden`, `legacy`, `ecosystem`, alle Lichtprofile, `composition=before` und
die beiden älteren Zutatenstände bleiben explizit erreichbar. Keine neuen
Modelle, Materialien, Mechaniken, Balancing- oder Kameraänderungen.
Beide bisherigen Performance-Fixes bleiben inhaltlich unverändert.

## Abschließende Integrationsprüfung

- 184 Unit-/Asset-/Regressionstests in 28 Dateien bestanden.
- TypeScript-Prüfung und Produktionsbuild bestanden.
- Standardaufruf ohne Grafikparameter: Desktop, Portrait und Landscape geprüft.
- Kauf, Flug/Landung, Merge I → II, Kaskade bis III, belegter Platztausch,
  Reservekauf/-tausch und Synergien geprüft.
- Speichern, Fortsetzen und Erhalt des Spielstands nach echtem Browser-Reload geprüft.
- Zischbert und Moor-Martha vollständig nativ abgespielt; keine fehlenden
  Zutatenanimationen oder VFX beobachtet. Deterministische Ergebnisse und
  Cooldown-Geometrie geprüft, Rückkehr aus dem Ergebnis in die Werkbank bestanden.
- Preparation-Abbruch mit ausstehender Shader-Vorbereitung und anschließender
  echter Wiederholung bestanden; kein verbleibendes Polling, Inventar unverändert.
- Sieben vollständige Grafikvarianten-Smoketests bestanden: Reference, Dark,
  Warm, Magical, Golden, Legacy und Ecosystem. Identischer Ergebnis-Hash.
- Keine beobachteten JavaScript-/WebGL-, HTTP- oder unerwarteten Assetfehler.

Mobile bedeutet Browser-/Touch-Emulation auf der Desktop-GPU, keinen physischen
Smartphone-Test. Die bisherigen großen Performance-Reihen wurden nicht erneut
ausgeführt; die frische Funktionsabnahme ergänzt deren archivierte Messdaten.

### Gefundene Testabweichung

Der alte QA-Probe zielte im Portraitmodus auf die Mitte des Reserve-Sockels,
die das offene Zutaten-Infofeld verdeckt. `elementFromPoint` belegte einen
Treffer auf das Infofeld statt auf die Canvas. Der sichtbare Zutatenkörper
19 Pixel höher ist regulär erreichbar. Der QA-Helfer wählt jetzt einen
unverdeckten nativen Mesh-Treffer, mit zusätzlicher Raycast-Prüfung. Der
Reserve-Tausch besteht damit ohne ausgeblendete UI, erzwungene DOM-Ereignisse
oder Änderungen am Spiel. Die Teilüberdeckung bleibt eine bekannte UX-Schwäche.

## Veröffentlichung und Aufräumen

Der bisherige öffentliche Stand wird vor der Integration mit dem annotierten
Tag `archive/master-before-consolidation-2026-10-17-4980b81` gesichert.
Die Integration erfolgt ausschließlich fast-forward, ohne Force-Push und ohne
Verlust der ursprünglichen Commits. Der existierende Pages-Workflow bleibt
zuständig; neu ist nur `build-info.json` mit Commit, Ref und Workflow-Run-ID.

Öffentlicher Einstieg: https://emfau88.github.io/KesselKrawall-3-D/

Ein lokaler Test und ein Branch-Push gelten ausdrücklich nicht als Live-Nachweis.
Nach dem Deployment werden die öffentliche Build-Identität, echter Standardlook,
Modelle/Texturen sowie neue Kampagne, Kauf und Speicherstand geprüft. Erst danach
werden nachweislich integrierte, nicht mehr aktive Entwicklungsbranches gelöscht.
Die tatsächlichen Deployment- und Aufräumergebnisse werden nach der öffentlichen
Abnahme in diesem Bericht ergänzt.

## Verbleibende Grenzen

Initialer Spielstart und erstmalige Materialprogramme können weiterhin stocken.
Nulllichtslots erhöhen die GPU-Dauerlast; die Vorbereitungslatenz im Kampf
schwankt. Die positiven Werkbank-Messungen sind keine generelle Ruckelfreiheits-
oder Smartphone-Garantie. Die Portrait-Infoanzeige verdeckt Teile des Tisches.
Auch die vollständige North-Star-Grafikqualität und die Aufwertung der übrigen
17 Zutaten bleiben spätere Aufgaben, keine Bestandteile dieser Konsolidierung.

Der geprüfte Stand ist als gemeinsame Basis für die nächste Entwicklungsphase
geeignet; nicht als endgültige Performance-/Art-Quality-Freigabe aller Geräte.

## Nachvollziehen

```powershell
node scripts/audit_repository_release.mjs --verify-local
npm test
npm run typecheck
npm run build
node scripts/qa_workshop_interactions.mjs --targets=integration=http://127.0.0.1:5210/ --default
node scripts/qa_combat_performance.mjs --targets=integration=http://127.0.0.1:5210/ --profiles=desktop --skip-frost --default
node scripts/qa_combat_graphics_variants.mjs --url=http://127.0.0.1:5210/
```

Regeln für künftige Arbeiten: [DEVELOPMENT_WORKFLOW.md](../../DEVELOPMENT_WORKFLOW.md).
