# Generierte Kampf-Performance-Matrix

3 Eingabedateien, 40 vollständige Sitzungsgruppen, 100 Kämpfe, 20 Konfigurationen. Alle Zeitspalten in Millisekunden als **Minimum / Median / Maximum** der unabhängigen Messungen.

rAF-Intervalle sind beobachtete Frameabstände einschließlich Browser-/Treiberwartezeit, keine isolierte GPU-Zeit. Mobile bedeutet Browseremulation auf dem Desktop-GPU-System. Combat enthält Phasengrenzen; Pipeline umfasst zusätzlich den Übergang ab nativem Klick und das Preparation-Gate. Ein blockierter Main Thread kann das tatsächliche Messfenster über die geplante Dauer hinaus verlängern; solche Intervalle werden erhalten.

## Aktiver Kampf

| Build / Format / Zutaten / Szenario | n | Max. Frame | p95 Frame | Max. Long Task | Frames >250 / >1000 | Betroffene Läufe >250 / >1000 |
| --- | --- | --- | --- | --- | --- | --- |
| baseline/desktop/phase3a/cold | 5 | 4733.0 / 5266.4 / 7666.4 | 3949.8 / 4649.8 / 7666.4 | 4739.0 / 5272.0 / 7669.0 | 12 / 12 | 5 / 5 |
| baseline/desktop/phase3a/warm-reload | 5 | 4633.1 / 5783.2 / 9149.6 | 16.8 / 4883.2 / 8916.3 | 4648.0 / 5799.0 / 9145.0 | 14 / 12 | 5 / 5 |
| baseline/desktop/polish/cold | 5 | 5133.2 / 8049.6 / 8733.0 | 5133.2 / 6516.3 / 8566.3 | 5135.0 / 8050.0 / 8744.0 | 10 / 10 | 5 / 5 |
| baseline/desktop/polish/repeat-zischbert | 5 | 883.3 / 3683.2 / 4616.5 | 16.8 / 33.4 / 3966.4 | 886.0 / 3691.0 / 4626.0 | 18 / 13 | 5 / 4 |
| baseline/desktop/polish/second-moor | 5 | 3466.5 / 4116.4 / 9249.7 | 16.8 / 616.7 / 3999.8 | 3477.0 / 4113.0 / 9256.0 | 16 / 10 | 5 / 5 |
| baseline/desktop/polish/warm-reload | 5 | 5849.8 / 7149.7 / 8716.3 | 33.3 / 83.3 / 5349.8 | 5856.0 / 7151.0 / 8726.0 | 13 / 10 | 5 / 5 |
| baseline/landscape/polish/cold | 5 | 5483.0 / 6133.1 / 8633.0 | 5483.0 / 6066.6 / 8633.0 | 5490.0 / 6146.0 / 8631.0 | 10 / 10 | 5 / 5 |
| baseline/landscape/polish/warm-reload | 5 | 5466.5 / 6333.1 / 7183.0 | 16.7 / 50.0 / 5533.1 | 5471.0 / 6341.0 / 7191.0 | 10 / 10 | 5 / 5 |
| baseline/portrait/polish/cold | 5 | 6033.1 / 6333.1 / 6399.7 | 5899.9 / 6016.5 / 6166.4 | 6038.0 / 6340.0 / 6407.0 | 10 / 10 | 5 / 5 |
| baseline/portrait/polish/warm-reload | 5 | 6816.4 / 6899.7 / 8299.6 | 16.8 / 16.8 / 7999.7 | 6832.0 / 6903.0 / 8282.0 | 13 / 10 | 5 / 5 |
| fix/desktop/phase3a/cold | 5 | 133.2 / 166.6 / 366.7 | 16.8 / 33.3 / 50.0 | 0.0 / 0.0 / 299.0 | 2 / 0 | 1 / 0 |
| fix/desktop/phase3a/warm-reload | 5 | 33.4 / 66.7 / 100.0 | 16.7 / 16.8 / 33.3 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |
| fix/desktop/polish/cold | 5 | 116.7 / 133.3 / 133.3 | 16.8 / 16.8 / 16.8 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |
| fix/desktop/polish/repeat-zischbert | 5 | 50.0 / 83.3 / 100.0 | 16.7 / 16.8 / 16.8 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |
| fix/desktop/polish/second-moor | 5 | 50.1 / 66.7 / 166.7 | 16.8 / 33.3 / 66.7 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |
| fix/desktop/polish/warm-reload | 5 | 50.1 / 83.3 / 100.0 | 16.8 / 16.8 / 16.8 | 0.0 / 0.0 / 103.0 | 0 / 0 | 0 / 0 |
| fix/landscape/polish/cold | 5 | 100.1 / 150.0 / 166.6 | 16.7 / 16.7 / 16.8 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |
| fix/landscape/polish/warm-reload | 5 | 16.8 / 16.8 / 33.3 | 16.7 / 16.8 / 16.8 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |
| fix/portrait/polish/cold | 5 | 83.4 / 150.0 / 350.0 | 16.7 / 16.8 / 16.8 | 0.0 / 0.0 / 65.0 | 1 / 0 | 1 / 0 |
| fix/portrait/polish/warm-reload | 5 | 16.8 / 16.8 / 33.4 | 16.7 / 16.7 / 16.8 | 0.0 / 0.0 / 0.0 | 0 / 0 | 0 / 0 |

## Bereitschaft und Kauf

| Konfiguration | Klick → bereit | Klick → erster aktiver rAF | Navigation → Werkbank | Kauf / Merge | Navigation → bereit | Navigation → erster aktiver rAF |
| --- | --- | --- | --- | --- | --- | --- |
| baseline/desktop/phase3a/cold | 4199.5 / 5114.5 / 5816.9 | 4208.7 / 5123.1 / 5824.4 | 4647.3 / 5409.2 / 7565.2 | 7857.1 / 11735.9 / 15590.7 | 18642.4 / 24943.4 / 28940.9 | 18651.6 / 24952.0 / 28947.0 |
| baseline/desktop/phase3a/warm-reload | 1934.3 / 5629.3 / 9076.3 | 1941.2 / 5642.9 / 9082.8 | 2146.2 / 4169.4 / 6035.1 | 2100.7 / 9085.2 / 18150.0 | 6336.4 / 19139.4 / 33791.9 | 6343.3 / 19153.0 / 33798.4 |
| baseline/desktop/polish/cold | 5482.5 / 5812.4 / 10760.0 | 5489.7 / 5823.5 / 10767.3 | 5659.2 / 6587.4 / 9276.6 | 9956.8 / 15006.3 / 26983.7 | 24640.7 / 30892.3 / 45121.9 | 24643.8 / 30903.4 / 45125.5 |
| baseline/desktop/polish/repeat-zischbert | 2870.4 / 2934.0 / 4343.2 | 2875.2 / 2938.4 / 4358.1 | — | — | — | — |
| baseline/desktop/polish/second-moor | 1862.6 / 6197.9 / 11080.8 | 1867.1 / 6206.1 / 11087.8 | — | — | — | — |
| baseline/desktop/polish/warm-reload | 970.2 / 5669.9 / 6948.0 | 975.4 / 5674.2 / 6956.2 | 1165.3 / 8129.6 / 9051.5 | 5339.4 / 11791.7 / 14341.7 | 7625.6 / 25911.1 / 29167.0 | 7630.8 / 25915.4 / 29175.4 |
| baseline/landscape/polish/cold | 5469.1 / 5915.5 / 7654.2 | 5474.9 / 5925.1 / 7675.1 | 5131.0 / 5342.3 / 6729.7 | 12109.3 / 12357.7 / 14537.4 | 23613.5 / 25651.1 / 27732.8 | 23616.1 / 25656.9 / 27753.7 |
| baseline/landscape/polish/warm-reload | 798.5 / 6619.9 / 8184.7 | 806.8 / 6624.6 / 8189.9 | 3401.6 / 4683.9 / 4928.4 | 2068.6 / 11884.5 / 15816.2 | 6477.3 / 23776.3 / 32894.7 | 6485.6 / 23776.8 / 32899.9 |
| baseline/portrait/polish/cold | 5498.0 / 7082.0 / 11028.2 | 5507.6 / 7091.0 / 11039.3 | 5451.7 / 7705.5 / 10402.7 | 9919.0 / 12344.9 / 16354.9 | 24229.3 / 29744.1 / 31999.3 | 24238.9 / 29755.2 / 32005.7 |
| baseline/portrait/polish/warm-reload | 812.3 / 850.7 / 7224.3 | 822.1 / 858.6 / 7225.9 | 1648.5 / 1708.0 / 5016.4 | 1862.9 / 2149.0 / 7928.6 | 4648.0 / 5133.6 / 23801.0 | 4657.8 / 5139.1 / 23802.6 |
| fix/desktop/phase3a/cold | 2645.6 / 3128.2 / 4383.4 | 2658.8 / 3139.1 / 4415.3 | 5224.7 / 7397.8 / 7552.2 | 8649.9 / 13900.1 / 21248.4 | 18867.2 / 28398.6 / 33793.1 | 18880.4 / 28409.5 / 33825.0 |
| fix/desktop/phase3a/warm-reload | 1090.1 / 2845.1 / 2989.2 | 1091.5 / 2853.4 / 2991.6 | 4671.7 / 5807.7 / 8591.8 | 2651.4 / 10630.8 / 26225.7 | 8561.6 / 23382.4 / 38237.0 | 8563.0 / 23397.1 / 38239.4 |
| fix/desktop/polish/cold | 2510.3 / 2852.9 / 2943.0 | 2521.8 / 2856.5 / 2956.4 | 5629.1 / 7192.7 / 8510.5 | 10249.3 / 12229.1 / 14238.5 | 21325.0 / 23511.6 / 31341.1 | 21325.7 / 23526.5 / 31354.5 |
| fix/desktop/polish/repeat-zischbert | 318.4 / 1570.2 / 1982.5 | 323.1 / 1575.1 / 1990.5 | — | — | — | — |
| fix/desktop/polish/second-moor | 2801.7 / 2886.1 / 3234.9 | 2808.5 / 2890.8 / 3239.4 | — | — | — | — |
| fix/desktop/polish/warm-reload | 677.1 / 2679.2 / 2951.9 | 690.2 / 2689.0 / 2956.3 | 1862.3 / 4798.9 / 7906.2 | 2136.2 / 13429.1 / 15211.3 | 4847.9 / 21367.4 / 26468.7 | 4861.0 / 21377.2 / 26478.5 |
| fix/landscape/polish/cold | 2297.3 / 2470.3 / 2610.3 | 2308.0 / 2474.9 / 2623.8 | 5309.0 / 5964.5 / 6730.7 | 8894.2 / 12741.6 / 13117.0 | 18146.5 / 20993.6 / 26232.9 | 18157.2 / 21007.1 / 26243.0 |
| fix/landscape/polish/warm-reload | 532.0 / 866.4 / 2577.9 | 538.8 / 875.0 / 2592.3 | 1354.9 / 1846.3 / 5006.5 | 1850.6 / 2095.8 / 13111.8 | 3983.6 / 5037.2 / 20661.2 | 3990.4 / 5045.8 / 20675.6 |
| fix/portrait/polish/cold | 2373.3 / 2644.3 / 3000.0 | 2375.1 / 2657.8 / 3024.2 | 5521.2 / 6442.4 / 7703.4 | 9363.1 / 13393.1 / 14411.9 | 19235.6 / 23260.6 / 25400.9 | 19249.1 / 23270.9 / 25425.1 |
| fix/portrait/polish/warm-reload | 563.8 / 898.1 / 923.0 | 573.9 / 906.6 / 925.0 | 1342.9 / 1843.0 / 2555.3 | 1859.8 / 2350.0 / 2425.4 | 4376.1 / 5101.4 / 6150.6 | 4379.7 / 5109.8 / 6159.1 |

Die Navigationszeiten schließen die automatisierten nativen UI-Schritte bis zum Kampf ein. Sie sind keine reine Download- oder GPU-Initialisierungsdauer. Folgekämpfe ohne Reload haben deshalb keine neue Navigationszeit.

## Gesamter Übergang und Messdauer

| Konfiguration | Pipeline max. Frame | Pipeline max. Long Task | Tatsächliches aktives Fenster | Geplantes Fenster |
| --- | --- | --- | --- | --- |
| baseline/desktop/phase3a/cold | 4733.0 / 5266.4 / 7666.4 | 4739.0 / 5272.0 / 7669.0 | 10609.6 / 13061.6 / 14254.8 | 10000 |
| baseline/desktop/phase3a/warm-reload | 4633.1 / 5783.2 / 9149.6 | 4648.0 / 5799.0 / 9145.0 | 10599.1 / 14916.4 / 18507.3 | 10000 |
| baseline/desktop/polish/cold | 5133.2 / 8049.6 / 8733.0 | 5135.0 / 8050.0 / 8744.0 | 10613.8 / 15776.5 / 16828.3 | 10000 |
| baseline/desktop/polish/repeat-zischbert | 2849.8 / 3683.2 / 4616.5 | 2688.0 / 3691.0 / 4626.0 | 9462.5 / 12001.6 / 13653.7 | 10000 |
| baseline/desktop/polish/second-moor | 4099.9 / 6416.5 / 9249.7 | 4101.0 / 6411.0 / 9256.0 | 10008.3 / 11296.8 / 12535.3 | 10000 |
| baseline/desktop/polish/warm-reload | 5849.8 / 7149.7 / 8716.3 | 5856.0 / 7151.0 / 8726.0 | 11602.3 / 14668.9 / 16393.1 | 10000 |
| baseline/landscape/polish/cold | 5483.0 / 6133.1 / 8633.0 | 5490.0 / 6146.0 / 8631.0 | 11226.4 / 12986.4 / 17847.8 | 10000 |
| baseline/landscape/polish/warm-reload | 5466.5 / 6333.1 / 7466.4 | 5471.0 / 6341.0 / 7462.0 | 11070.7 / 14103.0 / 15705.2 | 10000 |
| baseline/portrait/polish/cold | 6033.1 / 6333.1 / 6399.7 | 6038.0 / 6340.0 / 6407.0 | 12690.7 / 13062.7 / 13290.5 | 10000 |
| baseline/portrait/polish/warm-reload | 6816.4 / 6899.7 / 8299.6 | 6832.0 / 6903.0 / 8282.0 | 15312.5 / 15538.9 / 16710.9 | 10000 |
| fix/desktop/phase3a/cold | 150.0 / 283.4 / 816.6 | 154.0 / 277.0 / 747.0 | 9500.1 / 9522.8 / 9549.8 | 10000 |
| fix/desktop/phase3a/warm-reload | 116.6 / 166.7 / 283.4 | 126.0 / 160.0 / 206.0 | 9473.0 / 9516.8 / 9518.4 | 10000 |
| fix/desktop/polish/cold | 133.4 / 166.6 / 250.0 | 137.0 / 153.0 / 190.0 | 9516.9 / 9519.1 / 9531.3 | 10000 |
| fix/desktop/polish/repeat-zischbert | 166.6 / 216.6 / 233.3 | 141.0 / 180.0 / 191.0 | 9465.1 / 9497.6 / 9512.4 | 10000 |
| fix/desktop/polish/second-moor | 150.0 / 166.6 / 166.7 | 155.0 / 178.0 / 185.0 | 10008.1 / 10013.6 / 10019.5 | 10000 |
| fix/desktop/polish/warm-reload | 133.3 / 133.4 / 183.4 | 126.0 / 142.0 / 156.0 | 9466.3 / 9502.5 / 9512.4 | 10000 |
| fix/landscape/polish/cold | 100.1 / 150.0 / 166.6 | 78.0 / 84.0 / 103.0 | 9471.6 / 9476.7 / 9533.2 | 10000 |
| fix/landscape/polish/warm-reload | 66.7 / 83.2 / 83.4 | 73.0 / 75.0 / 79.0 | 9482.6 / 9506.7 / 9514.2 | 10000 |
| fix/portrait/polish/cold | 83.4 / 150.0 / 350.0 | 80.0 / 96.0 / 237.0 | 9480.6 / 9489.1 / 9536.4 | 10000 |
| fix/portrait/polish/warm-reload | 66.7 / 83.3 / 83.4 | 76.0 / 79.0 / 88.0 | 9487.7 / 9512.8 / 9517.9 | 10000 |

## Offline-Prüfung

Ergebnis-Hashes: 2 Fixture-/Gegner-Schlüssel, 0 Widersprüche. 100 Rohdateien geprüft (all); 0 Prüffehler. 0 unvollständige Gruppen, 0 Einträge in der Fehlerhistorie, 0 Messungen mit Laufzeitfehlern. 87 separat protokollierte, gezielt abgebrochene Musikstreams.

| Format | Aktueller Drawing Buffer / DPR | Geprüfte Rohdateien | Builds |
| --- | --- | --- | --- |
| desktop | {"width":1440,"height":900,"dpr":1} | 60 | baseline, fix |
| portrait | {"width":390,"height":844,"dpr":1} | 20 | baseline, fix |
| landscape | {"width":844,"height":390,"dpr":1} | 20 | baseline, fix |

Fehlende aktuelle Bufferdaten werden als historische Einschränkung ausgewiesen und nicht durch den beim Rendererstart erfassten Wert ersetzt. JSON enthält Hashnachweise, einzelne Rohdateiprüfungen, Browser-/GPU-Vergleich, Fehlerhistorie und Warnungen.

## Eingaben

- C:\Users\madde\Documents\ChatGPT\KesselKrawall3D\docs\qa\first-combat-performance\measurements\final-matrix-desktop\summary.json
- C:\Users\madde\Documents\ChatGPT\KesselKrawall3D\docs\qa\first-combat-performance\measurements\final-matrix-mobile\summary.json
- C:\Users\madde\Documents\ChatGPT\KesselKrawall3D\docs\qa\first-combat-performance\measurements\final-matrix-old-art\summary.json
