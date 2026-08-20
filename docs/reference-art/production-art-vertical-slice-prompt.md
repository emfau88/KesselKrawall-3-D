# KesselKrawall 3D – Production Art Vertical Slice

Für den **jetzigen** Stand von `KesselKrawall-3-D` würde ich den Agenten nicht einfach mit „mach jetzt echte Assets rein“ losschicken. Der nächste Auftrag muss sehr eng geführt sein.

Der aktuelle Build hat die Architekturphase bestanden, verwendet aber laut eigenem Asset-Register noch **keine externen Runtime-Assets**; Werkstatt, Kessel, Props und Effekte entstehen aktuell vollständig aus R3F-/Three.js-Geometrie. Genau deshalb ist jetzt der richtige Zeitpunkt für einen kontrollierten Production-Art-Slice.

Meine Entscheidungen vorab: **Die Mockups solltest du dem Agenten jetzt mitgeben. Blender ist für den ersten Schritt noch kein Muss.** KayKit und Quaternius liefern bereits glTF-Dateien, die Three.js direkt laden kann; Three.js unterstützt glTF 2.0 offiziell über `GLTFLoader`. Blender würde ich erst zum Pflichtwerkzeug machen, wenn der erste Asset-Pass funktioniert und der Hero-Kessel beziehungsweise einzelne Zutaten individualisiert werden müssen. Falls du ihn schon installieren willst, ist **Blender 5.2 LTS** aktuell die passende Produktionsversion; sie wurde am 14. Juli 2026 veröffentlicht und wird bis Juli 2028 unterstützt.

---

# Prompt für den Coding Agent

## Ausgangslage und Ziel

Arbeite im bestehenden Repository:

`emfau88/KesselKrawall-3-D`

Das grundlegende Architektur- und Gameplay-Rebuild ist bereits erfolgt.

**Dies ist ausdrücklich kein weiterer Architektur-Rebuild.**

Behalte insbesondere:

- `src/core/`
- deterministische Simulation
- State-/Shop-/Merge-/Synergy-Regeln
- R3F-/Three.js-Grundarchitektur
- feste orthografische Kamera
- getrennte Workshop-/Arena-Presentation
- bestehende Gameplaytests
- vorhandenen Combat-Presentation-Eventfluss

Das aktuelle Projekt verwendet für einen Großteil der sichtbaren 3D-Welt noch selbst erzeugte Three.js-Primitives beziehungsweise programmatisch erzeugte Geometrie.

Diese Primitive-Geometrie war für Greybox und Vertical Slice richtig.

**Sie darf jetzt aber nicht durch immer komplexere prozedurale Geometrie zum vermeintlichen Production Art ausgebaut werden.**

Das Ziel dieser Phase lautet:

> Einen kleinen Ausschnitt des existierenden Spiels auf echte Production-Art-Qualität bringen und beweisen, dass die aktuelle technische Basis den gewünschten visuellen Qualitätsstandard erreichen kann.

Noch nicht das komplette Spiel umarbeiten.

---

# 1. Visuelle Referenzen

Im Auftrag werden Referenzbilder bereitgestellt.

Ordne sie gedanklich beziehungsweise lokal so ein:

```text
docs/reference-art/
├── current-build.png
├── minimum-production-target.png
└── final-north-star.png
```

Falls die Dateien anders heißen, entsprechend dokumentieren.

## Bedeutung

`current-build.png`

= heutiger Stand beziehungsweise Greybox.

**Nicht Zielqualität.**

`minimum-production-target.png`

= Qualität, die dieser Production-Art-Slice möglichst erreichen soll.

`final-north-star.png`

= langfristiges Idealbild.

Dieses Bild dient für:

- räumliche Komposition
- Art Direction
- Beleuchtung
- Informationshierarchie
- Verhältnis 3D-Welt zu UI
- Materialcharakter
- Stimmung

Es ist **keine Aufforderung, das Bild pixelgenau nachzubauen oder unrealistische Renderqualität zu imitieren.**

### Wichtig

Wenn zwischen Mockup und funktionierendem Gameplay Konflikte entstehen:

> Lesbarkeit und Spielbarkeit haben Vorrang.

---

# 2. Kein neuer Feature-Sprint

In dieser Phase NICHT hinzufügen:

- neue Kampagnen
- neue Gegner
- neue Familien
- neue Progressionssysteme
- Achievements
- neue Shopmechaniken
- neue Meta-Systeme
- zusätzliche Spielmodi

Die vorhandene Mechanik reicht vollständig aus.

Der Auftrag ist:

> **Art Production, Composition, Lighting und Asset Integration.**

---

# 3. Scope dieser Phase bewusst klein halten

Bearbeite zunächst nur:

### Workshop

- einen Hero-Kessel
- drei hochwertige Zutaten
- fünf bestehende Ingredient-Positionen
- Shop-Sockel beziehungsweise physische Angebotsdarstellung soweit sinnvoll
- Werkbank
- unmittelbare Umgebung
- wenige Hintergrundprops

### Battle

- Spieler-Kessel
- genau einen vorhandenen Gegnerkessel
- Arena
- Fire-VFX
- Poison- oder Guard-VFX
- Trefferreaktion

Nicht alle Gegner und nicht alle 20 Zutaten gleichzeitig umarbeiten.

---

# 4. Asset-Strategie – keine freie Internetsuche

Du darfst **nicht wahllos kostenlose Assets aus unterschiedlichen Quellen zusammensuchen**.

Verwende zunächst ausschließlich die folgenden freigegebenen Quellen.

## PRIMARY ENVIRONMENT PACK

### KayKit – Dungeon Pack 1.1

Offizielle Seite:

`https://kaylousberg.itch.io/kaykit-dungeon-pack`

Dieses Pack ist die **erste Wahl für die Grundwelt**.

Es enthält in der kostenlosen Fassung rund 200 stilisierte 3D-Assets, darunter Wände, Böden, Treppen, Türen sowie Props wie Tische, Stühle, Kisten, Fässer und Banner. Die Assets sind CC0, für kommerzielle Nutzung freigegeben und werden unter anderem als glTF angeboten. Die Modelle verwenden einen gemeinsamen Gradient-Atlas, was für visuelle Kohärenz und Browser-/Mobile-Performance interessant ist.

Verwende daraus bevorzugt:

- Boden
- Wandsegmente
- Stufen
- einfache Architektur
- Tisch-/Möbelgrundformen
- Kisten/Fässer
- Banner
- wenige Hintergrundprops

### Grundregel

KayKit definiert zunächst die:

> **environment visual language**

Andere Assetquellen müssen daran angepasst werden.

---

# 5. SECONDARY PROP PACK

### Quaternius – Fantasy Props MegaKit

Offizielle Seite:

`https://quaternius.com/packs/fantasypropsmegakit.html`

Nur verwenden, wenn KayKit ein benötigtes Alchemieobjekt nicht sinnvoll abdeckt.

Das Pack enthält über 200 mittelalterliche/Fantasy-Props, unter anderem Bücher, Potions, Möbel, Werkzeuge, Marktobjekte und weitere Props. Es ist CC0 und bietet glTF-Dateien; die Modelle wurden mit wenigen gemeinsamen Texture Sets aufgebaut.

Geeignete Kandidaten:

- Potion bottles
- Bücher
- Alchemie-/Werkzeugprops
- Gemüse/Kräuter als Grundlage
- kleine Marktobjekte
- eventuell Kesselvarianten, **falls das konkret benötigte Modell in der kostenlosen Version enthalten ist**

### WICHTIG

Nicht 30 Quaternius-Props in eine KayKit-Szene kippen.

Für Phase 1 maximal ungefähr:

> **5–10 gezielt ausgewählte Quaternius-Props.**

Danach beurteilen:

- passen Proportionen?
- passen Farben?
- passen Materialantworten?
- passen Silhouetten?

Wenn nein:

> Nicht verwenden.

---

# 6. FALLBACK – nicht zusätzlich mischen

### Kenney Modular Dungeon Kit

Offizielle Seite:

`https://www.kenney.nl/assets/modular-dungeon-kit`

Dieses Pack ist CC0.

Es ist ein **Fallback**, falls der KayKit-Look nach realem Screenshot-Vergleich nicht zu KesselKrawall passt.

Nicht:

> KayKit + Kenney + Quaternius gleichzeitig mischen.

Wenn Kenney für die Architektur eindeutig besser funktioniert:

> KayKit als Grundwelt verwerfen und Kenney konsequent als neue Basis testen.

---

# 7. VFX-ASSETS

Für Partikel darf verwendet werden:

### Kenney Particle Pack

`https://www.kenney.nl/assets/particle-pack`

Es enthält 80 CC0-VFX-/Particle-Grafiken.

Diese Dateien dürfen als Partikeltexturen dienen für:

- Fire Sparks
- Smoke
- Poison Cloud
- Impact
- Magic Burst
- Shield
- Steam

Die eigentliche Bewegung und Komposition bleibt Three.js/R3F.

---

# 8. VFX nicht als fertige „Effektobjekte“ suchen

Fire, Poison, Guard, Frost und Echo sollen **nicht primär durch fertige fremde VFX-Pakete** realisiert werden.

Beispiel Fire:

```text
kleiner emissiver Kern
+
Kenney Particle Sprite
+
Trail
+
Funken
+
kurzer Lichtimpuls
+
Impact Burst
```

Beispiel Poison:

```text
kleiner Projectile Core
+
Smoke Sprites
+
Bubble Particles
+
Trail
+
Poison Impact Cloud
```

Beispiel Guard:

```text
transparente einfache Shield Geometry
+
Rune
+
kurzer expansiver Ring
+
Partikel
```

Dadurch bleibt die visuelle Identität kontrollierbar.

---

# 9. Der Hero-Kessel

Der Spieler-Kessel ist **kein Environment Prop**.

Er ist das wichtigste Hero Asset des Spiels.

Der aktuelle `CauldronActor.tsx` ist eine gute Animation-/Verhaltensreferenz, aber seine Primitive-Geometrie ist **nicht automatisch die finale Modellqualität**.

Behalte aus dem aktuellen Code:

- Idle Reaction
- Cast Reaction
- Hit Reaction
- Guard/Heal
- Victory
- Defeat
- Flüssigkeitsanimation
- Steam
- Reaction Event Interface

Aber löse langfristig:

> Animation/Reaction

von:

> aktueller Primitive-Mesh-Konstruktion.

---

# 10. Hero-Kessel – Phase 1

Bevor Blender eingesetzt wird:

### Schritt A

Prüfe in den freigegebenen kostenlosen Assetquellen, ob ein brauchbares Cauldron-Basismodell vorhanden ist.

Besonders:

- Quaternius Fantasy Props MegaKit

Aber nur verwenden, wenn:

1. das konkrete Modell in der tatsächlich kostenlosen Fassung enthalten ist,
2. Lizenz und Quelldatei dokumentiert wurden,
3. Silhouette zum KesselKrawall-Stil passt.

Nicht aufgrund eines Vorschaubildes davon ausgehen.

---

# 11. Wenn kein guter kostenloser Kessel existiert

Dann **nicht** erneut einen immer komplexeren Kessel direkt aus Three.js-Geometrie bauen.

Stattdessen:

> aktuellen Kessel für diesen Art-Slice als Platzhalter behalten und die Welt zuerst auf Production-Niveau bringen.

Danach wird ein eigener Hero-Kessel separat hergestellt.

Das ist ausdrücklich zulässig.

Ein schlechter übereilter „finaler“ Hero-Kessel wäre schädlicher als ein sauber markierter Placeholder.

---

# 12. Blender ist in Phase 1 noch kein Blocker

Für:

- KayKit
- Quaternius
- Kenney

können vorhandene glTF-Dateien direkt verwendet werden.

Three.js unterstützt glTF 2.0 über `GLTFLoader`.

Deshalb:

> **Verlange Blender nicht als Voraussetzung, bevor die Asset-Komposition getestet wurde.**

---

# 13. Wann Blender eingeführt wird

Blender wird Pflicht, sobald mindestens einer dieser Fälle eintritt:

- Hero-Kessel muss sichtbar individualisiert werden
- vorhandenes Modell hat falsche Proportionen
- Meshteile müssen entfernt oder ergänzt werden
- Ingredient braucht eine eigene Silhouette
- Pivot/Origin ist problematisch
- Materialzuordnung muss strukturell geändert werden
- verschiedene Teile eines Modells sollen getrennt animiert werden
- Geometrie muss vereinfacht werden
- eigenes Decal-/Rune-Mesh wird benötigt

Dann den Benutzer informieren:

> „Der Production-Slice funktioniert grundsätzlich; für die nächste Hero-Asset-Stufe sollte jetzt Blender installiert werden.“

Falls Blender bereits verfügbar ist, darf es genutzt werden.

Empfohlen ist eine aktuelle LTS-Version.

---

# 14. Blender-Workflow für später

Wenn Blender verfügbar ist:

```text
CC0 Base Model
↓
Blender Import
↓
Scale normalisieren
↓
Origin/Pivot korrigieren
↓
Silhouette verändern
↓
unnötige Teile entfernen
↓
eigene Details ergänzen
↓
Materialslots vereinfachen
↓
UV/Material prüfen
↓
GLB exportieren
↓
Three.js
```

Nicht:

> komplett neues komplexes Hero Asset blind mit Blender-Python generieren.

Blender-Python darf Assistenzwerkzeug sein für:

- Batch Scaling
- Pivot
- Naming
- Materialzuordnung
- einfache Modifier
- Export

Die visuelle Kontrolle muss anhand von Screenshots erfolgen.

---

# 15. Zutaten für den ersten Production Slice

Bearbeite zunächst nur die drei Zutaten, die bereits in `ART_DIRECTION.md` als visuelle Beispiele definiert wurden:

### Fire / Chili

Ziel:

- klar gebogene Chili-Silhouette
- rot/orange
- leicht überzeichnet
- warmer Kern
- beim Aktivieren wenige Funken

### Poison / Schleimpilz

Ziel:

- sofort als Pilz erkennbar
- asymmetrische Kappe
- gelbgrün/grün
- leicht schleimig
- Blasen beziehungsweise kurzer Dampf

### Guard / Eierschale

Ziel:

- helle gebrochene Schalenform
- klare Silhouette
- cyanfarbene Rune beziehungsweise Guard-Akzent
- Shield-Reaktion

Die aktuelle Art Direction definiert genau diese drei bereits als erste visuelle Familie.

---

# 16. Zutaten – Beschaffungsreihenfolge

Für jede der drei Zutaten:

### zuerst

Suche innerhalb der freigegebenen Packs nach einer brauchbaren Basis.

### dann

Falls ein Modell ungefähr passt:

> verwenden und über Material, Skalierung und VFX individualisieren.

### nur wenn nötig

Eigenes Modell beziehungsweise später Blender-Modifikation.

Nicht für jede Zutat sofort ein eigenes Mesh von null bauen.

---

# 17. Asset Wrapper einführen

Produktionsassets dürfen **nicht direkt über die gesamte Szene verteilt geladen werden**.

Baue beispielsweise:

```text
src/presentation/assets/
├── AssetCatalog.ts
├── ModelAsset.tsx
├── materials.ts
└── assetTypes.ts
```

oder eine äquivalent saubere Lösung.

Beispiel:

```ts
assetCatalog.workshop.table
assetCatalog.workshop.wall
assetCatalog.props.potionGreen
assetCatalog.ingredients.chili
```

Dadurch können Modelle später ausgetauscht werden, ohne Gameplay- oder Scene-Code umzuschreiben.

---

# 18. Keine Gameplay-Abhängigkeit von Fremdassets

Wenn beispielsweise `chili.glb` fehlt oder defekt ist:

> Das Gameplay muss weiterhin funktionieren.

Asset Layer benötigt Fallback.

Beispielsweise:

```text
GLB loaded
→ production mesh

GLB unavailable
→ simple fallback placeholder
```

Keine Game Rule darf vom Modell abhängig sein.

---

# 19. Fremdasset-Provenienz zwingend dokumentieren

Aktualisiere für jedes verwendete Asset:

```text
docs/ASSET_LICENSES.md
```

Eintrag mindestens:

| Feld | Inhalt |
|---|---|
| Asset | konkreter Name |
| Datei | lokale Runtime-Datei |
| Creator | Kay Lousberg / Quaternius / Kenney |
| Source | genaue offizielle Seite |
| Pack Version | falls vorhanden |
| License | CC0 |
| Commercial Use | bestätigt |
| Modifications | Scale/Material/etc. |
| Runtime Path | finaler Pfad |

Keine Assetdatei ohne Eintrag dauerhaft in den Production-Build übernehmen.

---

# 20. Download-Regel für den Coding Agent

Wenn deine Umgebung externe Dateien direkt herunterladen kann:

> Nur von den oben genannten offiziellen Quellen herunterladen.

Wenn Download aufgrund von Itch.io, Session, CDN oder sonstiger Einschränkung nicht zuverlässig möglich ist:

**Nicht auf irgendeinen Mirror ausweichen.**

Stattdessen anlegen:

```text
docs/ASSET_ACQUISITION.md
```

Dort exakt notieren:

- welches Pack
- offizielle URL
- benötigte Version
- benötigte Datei
- gewünschter Zielordner

Dann den Benutzer auffordern, genau dieses kostenlose Paket manuell herunterzuladen.

---

# 21. Keine kompletten Archive blind committen

Nicht:

```text
public/assets/KayKit-Dungeon-Full/
```

mit sämtlichen 200 Dateien committen, wenn nur zwölf benötigt werden.

Stattdessen:

```text
external-source/
```

nur lokal beziehungsweise gitignored als Quellmaterial.

Danach nur die tatsächlich verwendeten Runtime-Assets nach:

```text
public/assets/models/
```

übernehmen.

---

# 22. Materialvereinheitlichung

Das Ziel ist **nicht**, dass der Spieler erkennt:

> „Das ist KayKit neben einem Quaternius-Modell.“

Baue eine gemeinsame KesselKrawall-Materials-Sprache.

Beispielsweise:

### Holz

- warmer dunkler Braunton
- matt
- moderate Rauigkeit

### Stein

- leicht violett-grau
- matt
- nicht realistisch körnig

### Metall

- dunkles Kesselmetall
- Messingakzente
- kontrollierte Highlights

### Magie

- Familienfarbe
- nur gezieltes Emissive

Wenn externe Assets zu bunt sind:

> Materialien zur Runtime kontrolliert angleichen, sofern technisch und lizenzrechtlich sinnvoll.

---

# 23. Beleuchtung vor Dekoration

Bevor zehn zusätzliche Props platziert werden:

Setze und fixiere:

- Hauptlicht
- Ambient/Hemisphere Light
- Schattenqualität
- Exposure/Tone Mapping
- Hintergrundwert
- Magic Accent Light

Dann Screenshot.

Erst wenn:

- Tisch
- Kessel
- Boden
- Zutaten

klar im selben Raum wirken, zusätzliche Deko hinzufügen.

---

# 24. Props bewusst begrenzen

Die Werkstatt soll zunächst ungefähr bestehen aus:

- Tisch/Werkbank
- Kessel
- 5 Ingredient Slots
- 3 Shop-Angebote
- 1–2 Regale
- 3–6 Flaschen
- 2–4 Bücher
- 2–4 Kerzen
- wenige Werkzeuge
- 1–2 Kisten
- wenige architektonische Rahmenelemente

Nicht:

> jede freie Fläche mit Props füllen.

Negative Fläche ist wichtig.

---

# 25. Shop bleibt hauptsächlich 2D

Nicht anfangen, die komplette Shop-UI als 3D-Mesh nachzubauen.

Behalte:

- drei Angebote
- Preis
- Name
- Merge-Hinweis
- Reroll
- Kampfstart

als kompakte DOM-UI.

Die Angebote dürfen zusätzlich räumlich durch kleine physische Ingredient-Objekte oder Sockel gespiegelt werden.

---

# 26. Purchase Animation

Die bereits vorhandene Purchase Animation beibehalten und auf neue Assets adaptieren.

Gewünschter Eindruck:

```text
Klick Shop
↓
physische Zutat hebt ab
↓
kurzer kontrollierter Bogen
↓
landet auf Slot
↓
Kessel reagiert
↓
optional Merge
↓
kurze UI-Bestätigung
```

Keine lange Animation.

---

# 27. Hero-Kessel nicht überdekorieren

Der Kessel soll individuelle Persönlichkeit besitzen, aber nicht aussehen wie ein Charaktermodell mit 30 angeklebten Objekten.

Ziel:

- starke Silhouette
- sichtbare Flüssigkeit
- 2–3 charakteristische Details
- klare Augen/Gesicht nur wenn Art Direction weiterhin überzeugt
- Regalia beziehungsweise Rune
- Material
- Animation
- VFX

Weniger Einzelteile, stärkere Form.

---

# 28. Gegner für Phase 1

Nur einen vorhandenen Gegner auf dieselbe visuelle Qualität bringen.

Nicht alle Gegner.

Der Gegner darf denselben technischen Kessel-Basisaufbau verwenden, aber braucht:

- andere Silhouette oder Accessoires
- andere Flüssigkeit
- andere Farb-/Materialakzente
- eindeutige Persönlichkeit

Der Spieler muss beide ohne Namenslabel unterscheiden können.

---

# 29. Mockup-Vergleich als fester Prozess

Nach dem ersten Asset-Pass:

Erstelle Screenshots mindestens:

```text
1280×720 workshop
1280×720 battle
844×390 workshop
844×390 battle
```

Vergleiche daneben:

```text
current-build
minimum-production-target
final-north-star
```

Bewerte explizit:

- Kamera
- Kesselgröße
- Slot-Lesbarkeit
- Werkbanktiefe
- Propdichte
- Licht
- Materialkohärenz
- UI-Anteil
- negative Fläche
- visueller Fokus
- Mobile

---

# 30. Art Gate

Phase darf **nicht** als erfolgreich bezeichnet werden, nur weil:

- GLBs laden
- schöne Assets vorhanden sind
- keine Fehler auftreten

Der Gate-Test lautet:

> Wirkt die Szene erkennbar wie ein zusammenhängender produzierter Ort und deutlich hochwertiger als der bisherigen Primitive-Slice?

Zusätzlich:

> Wirkt sie eher in Richtung `minimum-production-target.png` als in Richtung einer Asset-Pack-Demo?

Wenn nein:

**nicht mehr Content hinzufügen.**

Ursache bestimmen.

---

# 31. Nicht während dieser Phase `App.tsx` weiter aufblasen

`App.tsx` ist bereits ein größerer zentraler Orchestrator.

Bevor in dieser Phase weiterer State beziehungsweise komplexe Assetlogik dort landet, extrahiere bei Bedarf:

```text
src/app/
├── useGameRun.ts
├── useBattlePlayback.ts
├── usePersistence.ts
└── useAudio.ts
```

oder eine vergleichbare Struktur.

Keine Asset-Loading-Logik in `App.tsx`.

Keine GLTF-spezifischen Details in `App.tsx`.

---

# 32. Was der Agent nicht tun darf

Insbesondere NICHT:

- komplette Primitive-Welt weiter ausmodellieren
- 20 Ingredients gleichzeitig produzieren
- alle Gegner gleichzeitig produzieren
- freie Asset-Websites durchsuchen
- Sketchfab-/Poly-Pizza-/Marketplace-Assets ungeprüft übernehmen
- mehrere Assetfamilien wahllos kombinieren
- unbekannte Lizenzen verwenden
- Renderqualität durch extremen Bloom vortäuschen
- zehn dynamische Lichter hinzufügen
- High-Poly-Modelle verwenden, die im Spiel winzig erscheinen
- gesamte Shop-UI in 3D umbauen
- Gameplay ändern, um ein Asset leichter darstellen zu können
- Blender zum Blocker machen, bevor der externe-GLTF-Pass getestet wurde

---

# 33. Reihenfolge dieser Phase

Arbeite strikt in folgender Reihenfolge:

1. Referenzbilder einlesen und Art-Direction-Dokument dagegen prüfen.
2. Bestehende Szene fotografisch/screenshotbasiert als Baseline dokumentieren.
3. KayKit Dungeon Pack evaluieren.
4. Nur notwendige Grundarchitektur daraus integrieren.
5. Kamera unverändert beziehungsweise nur begründet minimal korrigieren.
6. Lighting Lock durchführen.
7. Werkbank auf Production Asset umstellen.
8. wenige Background Props integrieren.
9. maximal gezielte Quaternius-Alchemieprops ergänzen.
10. drei Ingredients auf Production-Qualität bringen.
11. Hero-Kessel prüfen, aber noch keinen Blender-Rebuild erzwingen.
12. Fire- und Poison/Guard-VFX polieren.
13. Screenshots Desktop + Mobile.
14. Art-Gate dokumentieren.
15. Erst danach entscheiden, ob Blender für Hero Assets eingeführt wird.

---

# 34. Ergebnis dieser Phase

Erstelle anschließend:

```text
docs/PRODUCTION_ART_SLICE_REVIEW.md
```

mit:

### Was wurde ersetzt?

### Welche externen Assets werden tatsächlich verwendet?

### Welche Lizenzen gelten?

### Welche Assets wurden verworfen und warum?

### Wie weit liegt der Slice visuell vom Zielmockup entfernt?

### Reicht die aktuelle Assetqualität grundsätzlich?

### Muss Blender jetzt eingeführt werden?

### Welcher Hero-Kessel-Workflow wird empfohlen?

### Welche drei nächsten Assets hätten den größten sichtbaren Qualitätsgewinn?

### Ist eine vollständige Art-Migration jetzt gerechtfertigt?

---

# 35. Definition of Done

Diese Phase ist fertig, wenn:

- externe glTF-Assets sauber im bestehenden R3F-Renderer funktionieren
- keine Core-Architektur dafür verändert wurde
- eine kohärente Werkstatt entstanden ist
- mindestens drei Ingredients Production-Qualität erreicht haben
- Spieler-Kessel visuell sinnvoll integriert ist
- ein Gegner sinnvoll integriert ist
- Fire plus mindestens ein zweites Family-VFX überzeugend funktionieren
- Desktop funktioniert
- Mobile Landscape funktioniert
- Lizenzregister vollständig ist
- Screenshotvergleich erstellt wurde
- klar beantwortet ist, ob Blender für die nächste Phase nötig wird

---

# Entscheidender Qualitätsgrundsatz

> **Nicht möglichst viele Assets integrieren. Möglichst wenige Assets so integrieren, dass sie wie eine gemeinsame Spielwelt wirken.**

Und:

> **Primitive Geometry war die richtige Methode zum Beweisen der Architektur. Sie ist nicht automatisch die richtige Methode für die finale Art Production.**

---

# Was du persönlich jetzt tun solltest

**Die Mockups würde ich tatsächlich mitgeben.** Am sinnvollsten sind das mittlere und das optimale Bild, die wir gerade erstellt haben. Das frühe Produktionsbild kannst du ebenfalls beilegen, aber deutlich als **„kein Ziel, nur Entwicklungsstufe“** kennzeichnen.

Der Agent hat in seinem `ART_DIRECTION.md` bereits sehr gute verbale Vorgaben, aber bei Kamera, Raumtiefe, Propdichte und Kesselgröße ist ein Bild wesentlich weniger missverständlich.

**Blender musst du für diesen Auftrag noch nicht installieren.** Gerade KayKit liefert die kostenlose Version bereits in glTF, und Quaternius liefert ebenfalls glTF; damit kann der Agent zunächst beweisen, dass echte Assets das Projekt tatsächlich aufwerten.

Wenn dieser Test positiv ist, würde ich Blender installieren und **erst dann den individuellen Hero-Kessel und einzelne Spezialzutaten bearbeiten**. Das vermeidet, dass du jetzt zusätzlich Blender-/Modelling-Probleme löst, obwohl wir noch gar nicht wissen, ob Welt, Kamera und Assetstil gemeinsam funktionieren.

Für VFX braucht ihr dagegen praktisch kein Blender: Das aktuelle Three.js-System kann Geometrie, Trails und Animation übernehmen; Kenneys Particle Pack liefert bei Bedarf 80 CC0-Partikeltexturen für Feuer, Rauch, Magie und Impacts.

**Mein konkreter nächster Schritt wäre daher:**

> Mockups an Codex hängen → obigen Prompt geben → KayKit-Production-Slice bauen lassen → Screenshots ansehen. **Erst danach Blender/Hero-Kessel.**

Das ist die risikoärmste Reihenfolge und verhindert ziemlich genau, dass aus dem jetzigen guten Fundament wieder ein technisch beeindruckender, aber optisch zusammengewürfelter Prototyp wird.
