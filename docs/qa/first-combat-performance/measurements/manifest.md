# Komprimierte Rohmessungen

100 abgeschlossene Kämpfe in 3 Matrizen. 100 Rohdateien: 18.95 MiB JSON → 1.77 MiB gzip.

Die ursprünglichen JSON-Bytes bleiben beim Entpacken vollständig erhalten. SHA-256-Werte prüfen sowohl die entpackte Originaldatei als auch das gespeicherte gzip. Die portablen summary.json-Dateien verweisen direkt auf die komprimierten Dateien und funktionieren mit scripts/summarize_combat_matrix.mjs.

| Matrix | Kämpfe | Rohdateien | Original MiB | gzip MiB |
| --- | ---: | ---: | ---: | ---: |
| [final-matrix-desktop](final-matrix-desktop/summary.json) | 40 | 40 | 7.04 | 0.66 |
| [final-matrix-mobile](final-matrix-mobile/summary.json) | 40 | 40 | 8.00 | 0.74 |
| [final-matrix-old-art](final-matrix-old-art/summary.json) | 20 | 20 | 3.91 | 0.37 |

Vollständige Dateigrößen und SHA-256-Nachweise stehen in [manifest.json](manifest.json). Die Quellverzeichnisse wurden nicht geändert.
