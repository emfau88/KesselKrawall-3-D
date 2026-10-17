# Entwicklungs- und Veröffentlichungsworkflow

- `master` ist der neueste freigegebene, öffentlich spielbare Stand. Ein Push
  startet den vorhandenen Pages-Workflow mit Unit-Tests und Produktionsbuild.
- Kleine, risikoarme Korrekturen dürfen nach passenden Tests direkt auf `master`.
- Größere Features, riskante Änderungen und Engine-/Grafikexperimente erhalten
  einen temporären `codex/…`-Branch bis zur erfolgreichen Abnahme.
- Fertige Arbeiten zeitnah per Pull Request oder geeignetem Fast-Forward
  integrieren. Historie erhalten, keine destruktiven Force-Pushes. Bei kritischen
  Fehlern oder unklaren Änderungen vor der Veröffentlichung stoppen.
- Vor größeren Konsolidierungen den veröffentlichten Stand eindeutig taggen und
  lokale, nicht committete Arbeiten separat schützen.
- Nach dem Deployment öffentliche URL, `build-info.json`, Assets und relevante
  Spielfunktionen prüfen. Branch-Push und lokaler Testlink sind kein Live-Nachweis.
- Vollständig integrierte, inaktive Branches nach Prüfung löschen. Offene oder
  unklare Arbeiten erhalten und dokumentieren.
- README und QA-Berichte aktuell halten; Browseremulation nie als echten
  Smartphone-Test ausgeben. Performance-Grenzen ausdrücklich benennen.

Grafik-/Zutatenvergleiche bleiben über URL-Parameter erreichbar. Dafür werden
keine dauerhaften abgeschlossenen Feature-Branches benötigt.
