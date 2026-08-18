# Bewusste Verhaltensunterschiede

Stand: 18. August 2026

Dieses Dokument unterscheidet tatsächliche Änderungen von noch nicht
umgesetztem Vertical-Slice-Umfang und bewusst nicht portierten Legacy-Fehlern.

## INTENTIONAL CHANGE

### Strukturierte Core-Events und Fehlercodes

Der Legacy-Core erzeugte deutsche Combat-Labels und deutsche Action-
Fehlermeldungen. Der neue Core erzeugt stabile Codes und numerische Daten, zum
Beispiel `status.poisonBurst`, `synergy.frostDelay` oder `notEnoughGold`.
Lokalisierung und VFX-Zuordnung erfolgen außerhalb des Core.

Gameplaywerte, Reihenfolge und Ergebnis werden dadurch nicht verändert.

### Neues Save-Namespace

Der Rebuild speichert Runs unter `kessel-krawall-3d-run-v1` und Profilfortschritt
unter `kessel-krawall-3d-profile-v1`. Er überschreibt keine Legacy-Stände.
Das neue Schema validiert den strukturierten Combat-Eventstream atomar.

## NOT YET IMPLEMENTED

- Automatischer, expliziter Import eines Legacy-v2–v6-Spielstands. Wegen des
  neuen Namespaces gehen alte Stände nicht verloren; sie werden derzeit nur
  nicht in den Rebuild eingelesen.
- Der 8–12-Sekunden-Zielwert für den ersten Vertical-Slice-Kampf. Bis ein
  eigener Balance-Test dokumentiert ist, bleibt das Legacy-Limit von 30
  Sekunden einschließlich Kesselhitze unverändert.

## REBUILD-ERWEITERUNGEN

- Kampagnenwahl, klassische Zusatzfamilie für Kapitel II, Reservebedienung ab
  Runde 5 und Kampagnen-Siegstatistik sind jetzt über die neue Oberfläche
  erreichbar.
- Audio besteht aus selbst synthetisierten Web-Audio-Cues statt übernommenen
  Musik- und SFX-Dateien. Dadurch ist die Klangästhetik bewusst minimalistischer,
  aber vollständig lizenzklar und offlinefähig.
- Der Run wird in Shopphasen automatisch fortgesetzt. Ein beim Neuladen
  unterbrochener Kampf startet bewusst nicht mitten im Eventstream neu; in
  diesem Fall beginnt ein sicherer neuer Lauf.

## LEGACY BUG NOT PORTED

### Ungültiges Save-JSON

Der Legacy-Ladepfad konnte bei syntaktisch ungültigem JSON vor der Validierung
werfen. Der neue `loadStoredGame`-Pfad fängt Parse- und Storage-Fehler ab und
liefert sicher `null`, ohne den Client abstürzen zu lassen.

## Unveränderte mechanische Baseline

Boardgröße, Merge-Gewichte, Synergieschwelle, Economy, Reserve-Runde,
Kampagnenroster, Itemwerte, Bossregeln, 100-ms-Simulationsschritt, Gift/Brand,
Schildcap und Timeout-Tiebreak entsprechen weiterhin der auditierten Referenz.
