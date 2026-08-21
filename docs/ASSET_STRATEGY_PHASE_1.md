# Asset-Strategie – Phase 1: Audit und Beschaffungsentscheidung

Stand: 21. August 2026

Status: **abgeschlossen; noch keine Fremdassets integriert**

## Kurzentscheidung

1. **Quaternius soll die primäre Umgebungssprache werden**, zunächst mit den
   kostenlosen Standard-Versionen von Fantasy Props MegaKit, Medieval Village
   MegaKit und Stylized Nature MegaKit. Die drei Packs kommen vom selben
   Urheber, sind CC0, enthalten glTF und besitzen sichtbar eine wesentlich
   reichere, wärmere und organischere Form- und Materialwelt als die derzeit
   eingesetzte KayKit-Dungeon-Auswahl.
2. **KayKit bleibt nur Übergangsbestand und technischer Fallback.** Die Assets
   sind hervorragend optimiert und sauber lizenziert, treffen aber die
   detailreiche, handwerkliche Mockup-Sprache weniger gut. Quaternius und
   KayKit sollen nicht ungefiltert gleichberechtigt in derselben finalen Szene
   stehen.
3. **Keines der geprüften Packs liefert fertige Kesselcharaktere auf
   North-Star-Niveau.** Selbst gute Pack-Kessel sind nur Basis- oder
   Spendergeometrie. Persönlichkeit, Gesichter, charakteristische Anbauteile,
   Flüssigkeit, Rig, Animation und Familien-VFX müssen als originale
   KesselKrawall-Schicht entstehen.
4. **Der aktuelle eigene Blender-Pass ist ein guter Visual Prototype, aber
   keine Produktionspipeline.** Die beiden Kessel besitzen brauchbare
   Silhouetten, sind mit 45–48 Mesh-Objekten und 8–11 Materialien jedoch zu
   fragmentiert. Der nächste Pass braucht einen modularen
   `Cauldron Character Construction Kit`, nicht sieben weitere unabhängige
   Script-Skulpturen.
5. **Jetzt noch nichts außer den exakt gelisteten ZIPs herunterladen.** Nach
   diesem Dokument endet Phase 1 bewusst. Import, Umbau und Runtime-Integration
   gehören in Phase 2.

## Prüfrahmen und Quellenlage

Geprüft wurden:

- der aktuelle 3D-Rebuild im Workspace,
- das alte 2D-Repository unter
  `C:\Users\madde\Documents\ChatGPT\KesselKrawall-reference`,
- die drei hinterlegten North-Star-/Mockup-Bilder,
- die offiziellen Pack- und Verkaufsseiten der Anbieter,
- die lokal bereits ausgelieferten GLB-/glTF-Dateien mit Blender 5.2 LTS.

Die alten 2D-Bilder bleiben ausschließlich Designreferenz. Ihre Provenienz ist
nicht ausreichend dokumentiert, deshalb werden weder Pixel noch Texturen oder
Meshes daraus übernommen.

Preis-, Lizenz- und Formataussagen beziehen sich auf den Prüfzeitpunkt. Bei
jedem späteren manuellen Download werden die Anbieter-Seite, die enthaltene
Lizenzdatei und die genaue ZIP-Version erneut im Lizenzregister festgehalten.

## 1. Inventar des aktuellen 3D-Rebuilds

### 1.1 Sichtbare Assetquellen

| Quelle | Umfang im Runtime-Build | Sichtbare Verwendung | Qualität/Nutzen | Hauptproblem |
|---|---:|---|---|---|
| KayKit Dungeon Pack 1.1, CC0 | 16 glTF-Modelle, 16 BIN-Dateien, ein 17-KB-Atlas | Wände, Böden, Pfeiler, Regale, Flaschen, Kerzen, Banner, Fackeln, Kisten, Fässer | sehr klein, mobilfreundlich, glTF-nativ, einheitlicher Atlas | blockige Dungeon-Sprache, geringe Oberflächen- und Prop-Dichte, zu generisch für den North Star |
| Eigene Blender-Assets | 7 GLB, zusammen rund 3,13 MB | Spieler, Moor-Martha, drei Zutaten, Werkbank, Arena-Dais | projektspezifische Silhouetten und reproduzierbarer Export | viele Einzelobjekte/Materialien; nicht modular; nur zwei von vielen wichtigen Kesseln |
| Eigene Three.js-/R3F-Geometrie | 133 deklarierte Primitive-Geometrien im Scene-Layer | restliche Zutaten, Gegner-Fallbacks, Publikum, Bücher, Mörser, Podeste, Runen, Braziers, Motes, Projektile, Status-VFX | schnell iterierbar, funktional, ohne externe Lizenzlast | noch klar als Programmer Art lesbar; viele Einzelmeshes; Detail und Materialtiefe schwanken |
| DOM/CSS | Fantasy-HUD, Shop, HP, Navigation | gesamte UI-Schicht | funktional, responsive, leicht zu ändern | noch keine vollständig eigene ornamentale UI-Bibliothek; im Mockup dichter und präziser komponiert |
| Legacy-Repo | 83 Art-PNG, 18 UI-PNG, 5 Hintergründe plus weitere Referenzen | keine Runtime-Nutzung | starke Charakter- und Farbreferenz | Lizenz/Provenienz nicht freigegeben; 2D statt echter 3D-Welt |

Der Code enthält 51 `ProductionAsset`-JSX-Vorkommen. Das ist nicht
gleichbedeutend mit 51 unterschiedlichen Modellen: dieselben 23 katalogisierten
Runtime-Assets werden mehrfach platziert, teilweise über dynamische Props.

### 1.2 Technisches Profil der eigenen GLBs

Die Werte stammen aus einem reproduzierbaren Blender-Importaudit. „Objekte“
bezeichnet Mesh-Objekte und ist für Draw-Call-/Szenengraphkosten mindestens so
wichtig wie die reine Dreieckzahl.

| Asset | Dateigröße | Mesh-Objekte | Vertices | Dreiecke | Materialien |
|---|---:|---:|---:|---:|---:|
| Spieler-Kessel | 752 KB | 45 | 17.956 | 28.442 | 8 |
| Moor-Martha | 755 KB | 48 | 17.620 | 29.894 | 11 |
| Hero-Werkbank | 641 KB | 49 | 17.448 | 20.228 | 7 |
| Arena-Dais | 595 KB | 53 | 16.167 | 17.768 | 5 |
| Glut-Chili | 110 KB | 8 | 2.421 | 4.028 | 3 |
| Schleimpilz | 175 KB | 13 | 4.008 | 6.680 | 3 |
| Runenschale | 98 KB | 7 | 2.240 | 3.836 | 4 |

Einzelne KayKit-Modelle liegen im Vergleich bei 97 bis 2.010 Dreiecken, einem
Mesh und einem Material. Das erklärt, warum KayKit technisch sehr effizient,
visuell aber weniger reich ist.

### 1.3 Was heute bereits gut funktioniert

- Werkbank und Arena sind echte 3D-Räume mit fester, verständlicher Kamera.
- Spieler und Moor-Martha sind auf Distanz unterscheidbar.
- Die warme Werkbank und die kühlere Moor-Arena bilden bereits einen
  glaubwürdigen Ort statt nur einer Kartenwand.
- Einkauf, Merge, Kampf, VFX und UI sind funktional gekoppelt.
- Die 3D-Fassung ist klein genug für GitHub Pages und besitzt responsive
  Desktop-/Mobile-Kompositionen.
- Asset- und Lizenzregister existieren bereits.

### 1.4 Abstand zum North Star

| Bereich | Aktueller Stand | Zielbild | Konkrete Lücke |
|---|---|---|---|
| Umgebung | sauberer kleiner Dungeonraum | dichtes, bewohntes Alchemistenatelier | zu große ruhige Flächen, zu wenig Schichtung, zu wenige kleine Story-Props, Materialoberflächen zu gleichförmig |
| Werkbank | gute zentrale Bühne, aber geometrisch stark vereinfacht | schweres handwerkliches Möbel mit Werkzeugen, Büchern, Flaschen, Wachs, Kristallen und Spuren der Nutzung | Tischkante, Sockel, Halterungen und Randdeko brauchen bessere Meshes; Kamera/Tisch wirken noch etwas stark gekippt |
| Arena | klare Kampfbahn und erkennbares Publikum | lebende, tiefe Ritualarena mit Architektur, Nischen, Requisiten und kontrollierter Hintergrundbewegung | Publikum, Seitenräume und Dekoration wirken noch symbolisch; keine ausgeprägten Arena-Biome |
| Kessel | zwei erkennbare Modelle | komplette Besetzung mit ikonischer Körperform, Gesicht, Material und Familien-DNA | nur Spieler und Moor-Martha individuell; Fallback-Gegner bleiben prozedural; Gesichter wirken aufgesetzter als im 2D-Design |
| Zutaten | drei eigene Hero-Zutaten | rund 20 klar unterscheidbare Zutaten mit Level-/Merge-Lesbarkeit | die Mehrzahl ist Primitive-Art; Formfamilien und hochwertige Aktivierungsanimation fehlen |
| Animation | Whole-object Squash, Hop, Wobble, Flüssigkeit und Partikel | Antizipation, charaktervolle Körpermechanik, Gesichtsreaktion, Follow-through und Treffergewicht | kein gemeinsames Rig, keine wiederverwendbaren Gesichtskanäle, keine charakterabhängigen Cast-Varianten |
| Kampf-VFX | fünf Familien sind funktional unterscheidbar | hochwertige Trail-, Impact-, Status- und Lichtsysteme mit eigener Bewegungsgrammatik | Effekte bestehen oft aus einfachen Polyedern/Ringen; zu wenig Formvariation, Trail-Textur, Distortion/Flipbook und materialgebundene Reaktion |
| UI | verständliches dunkles Fantasy-CSS | präzise, kompakte Messing-/Pergamentoberfläche aus dem Mockup | Ornamentik, Icons, Zustandsfeedback und Typohierarchie noch nicht auf derselben Produktionsstufe wie der gewünschte Render |

Wichtig: Kein Environment-Pack löst Kesselanimation, Gesichtsausdruck, VFX,
Spiel-UI oder Encounter-Inszenierung. Fremdassets können die Umgebungslücke
stark reduzieren, aber nicht den Kern der Marke ersetzen.

## 2. Design-DNA der alten Kessel

Die Legacy-Kessel zeigen keine austauschbaren Töpfe, sondern Charaktere. Für
3D müssen die folgenden Merkmale als große, aus der Spielkamera lesbare Formen
übersetzt werden; Mikroornamente allein genügen nicht.

| Kessel | Unverzichtbare DNA | Modularer 3D-Ansatz | Eigene VFX-/Animationssignatur |
|---|---|---|---|
| Spieler | freundlicher breiter Bauch, Messingregalia, große Augen/Mund, Ringgriffe, kräftige Stiefel, zentraler Edelstein | runder Basisrumpf, Messingbrustplatte, Ringgriff-Set, Stiefel-Set, Edelsteinfassung, freundliches Face-Rig | federnder Hop, warme Flüssigkeitsspirale, Edelstein-Puls, offener Triumphausdruck |
| Zischbert | vulkanischer schwarzer Körper, glühende Risse, flammenartige Randspitzen, böses Grinsen | gedrungener Rumpf, Horn-/Flammenrand, Lavakrack-Mask, aggressive Augen-/Zahnplatte, schwere Füße | kurze aggressive Antizipation, Hitze-Flimmern, Funken, Lavaüberlauf und harter Recoil |
| Moor-Martha | alter pockiger Eisenkörper, langer Hexennase, schiefes Grinsen, Moos, Pilze, Wurzelgriffe, gelbgrüne Brühe | asymmetrischer Rumpf, Hexen-Face, Wurzelgriffe, Moos-/Pilz-Sockets, organische Füße, Korrosionsmask | langsames schwappendes Gewicht, Pilzsporen, schwebende Giftblasen, klebriger Nachlauf |
| Schild-Siggi | Kessel als Ritterrüstung, Visieraugen, Schulterpanzer, Brustschild, blaue Flüssigkeit | hoher Panzerrumpf, Visier-Face, Schulter-/Schildplatten, gepanzerte Füße | schweres Einrasten, expandierender Schildbogen, kühler Metall-Rim, blockender Rückstoß |
| Eis-Elsa | elegante Eiskönigin, Kristallkrone, Fell-/Eiskragen, filigrane Füße und Hängekristalle | schlanker Rumpf, feminine Face-Form, Kronenrand, Kragen, Kristallanhänger, gebogene Füße | gleitende Bewegung, scharfer Frostimpuls, Reifaufbau, Kristallsplitter und kontrolliertes Schmelzen |
| Resonanz-Rosa | violetter, selbstbewusster Showcharakter, goldene Krone/Ornamente, große Ringgriffe, leuchtender Mundraum | breiter Show-Rumpf, Kronenrand, Doppelringgriffe, Ornamentplatte, expressive Augen/Mund | doppelte Bewegungsbeats, Afterimage, konzentrische Resonanzringe, verzögerter zweiter Impuls |
| Chronokessel | Uhrengesicht, Zahnräder, Sanduhren, mechanische Beine, kosmische Flüssigkeit | hoher mechanischer Rumpf, Uhr-Face, Zahnradkranz, Sanduhrgriffe, Pendel-/Beinset | Tick-Tock-Antizipation, Zeitstopp, rücklaufende Partikel, violett-cyaner Doppelwirbel |
| Großkessel/Boss | kleine kompakte, aber aggressive Krone/Hörner, monströses Gesicht, dunkle Masse, cyanblaue Flamme | schwerer Bossrumpf, Kronen-/Hornrand, Monster-Face, Klauenfüße, große Flüssigkeitskammer | langsames bedrohliches Atmen, Phasenwechsel, große Flammenkrone, arenaweite Licht- und Bodenantwort |

## 3. Kandidatenprüfung

### 3.1 Verifizierte Anbieterfakten

| Pack | Preis/Version am Prüfdatum | Inhalt/Formate laut offizieller Seite | Lizenz | Befund |
|---|---|---|---|---|
| [Quaternius Fantasy Props MegaKit](https://quaternius.itch.io/fantasy-props-megakit) | Standard $0; Pro $9,99; Source $14,99 | 211 Modelle im Gesamtkatalog; Standard enthält laut Anbieter 60–70 %; Möbel, Werkzeuge, Waffen, Bücher, Tränke, Gemüse, Breakables; Standard/Pro als FBX, OBJ, glTF; Source zusätzlich Blend und Engine-Projekte; vier Textursets | CC0 1.0 | stärkster gemeinsamer Prop-/Werkstattkandidat; Preview enthält auch eine Kessel-/Wizard-Den-Sprache, aber kein fertiges Charakterkit |
| [Quaternius Medieval Village MegaKit](https://quaternius.itch.io/medieval-village-megakit) | Standard $0; Pro $9,99; Source $14,99 | 304 Teile im Gesamtkatalog, Standard laut Anbieter 60–70 %; modulare Wände mit Innen-/Außenseite, Dächer, Treppen, Türen, Fenster, Ranken; FBX, OBJ, glTF; Source zusätzlich Blend | CC0 1.0 | sehr gute Mutterbasis für Werkstatt-/Arenaarchitektur; benötigt dunklere Palette und gezielte Innenraumkomposition |
| [Quaternius Stylized Nature MegaKit](https://quaternius.itch.io/stylized-nature-megakit) | Standard $0; Pro $9,99; Source $14,99 | 116 Modelle im Gesamtkatalog, Standard laut Anbieter 60–70 %; 40 Bäume, 35 Pflanzen/Blumen, 27 Felsen, Gras, Büsche; FBX, OBJ, glTF; Source zusätzlich Blend und Shader | CC0 1.0 | stark für Moor-Martha, Arena-Biome, Pilze, Wurzeln und organische Silhouetten; Default-Präsentation ist zu hell, deshalb nur kuratiert/recoloriert einsetzen |
| [KayKit Dungeon Pack 1.1](https://kaylousberg.itch.io/kaykit-dungeon-pack) | Free $0; Extra $7,95; Source $11,95 | 200 Free bzw. 275+ Extra; FBX, glTF, OBJ; Source mit Blend; ein Gradient-Atlas | CC0 1.0 | technisch vorbildlich und bereits integriert; Extra/Source lösen die visuelle Kernlücke nicht |
| [Lucaasbre Magic Low Poly Pack](https://lucaasbre.itch.io/magic-low-poly-pack) | $2,99 | Kessel, Tränke, Bücher, Stäbe, Kerzen, Hut u. a.; 30–600 Tris pro Modell; FBX/OBJ; keine Texturen, Basic Materials | als CC BY 4.0 eingetragen | günstiger Spender für mehrere extrem leichte Kessel-Basiskörper; glTF-Konvertierung und komplette Materialüberarbeitung nötig; Attribution sicherheitshalber zwingend behandeln |
| [ejgarner118 Wizard's Workshop](https://ejgarner118.itch.io/wizards-workshop-3d-lowpoly-asset-pack) | Name your own price | Kessel, Flaschen/Regale, Hüte, Buch, Stäbe, Kristalle, Spiegel, Tische/Wände und komplette Demo-Szene; FBX und Blend | **auf der Produktseite nicht angegeben** | inhaltlich interessant, aber ohne belastbare Lizenz nicht verwendbar |
| [Azrael68 Ultimate Alchemy Station](https://azrael68.itch.io/3d-ultimate-alchemy-station-premium-low-poly-pack) | $2,00 | ein Eisenkessel mit Flüssigkeit, Tisch, Buch, Elixiere; FBX, Vertex Colors | **auf der Produktseite nicht angegeben** | Preis attraktiv, Umfang klein, Lizenzblocker; nicht kaufen |
| [Daniel Mistage Stylized Fantasy Alchemy](https://daniel-mistage.itch.io/stylized-fantasy-alchemists-workshops-low-poly-3d-art) | $35,00 | 820+ statische Assets; 602 Alchemy-Props, mehrere Kessel/Flüssigkeiten; FBX, Blend, Asset Browser, ein Atlas | eigene kommerzielle Lizenz | visuell/inhaltlich stark, aber über Budget; Lizenz verlangt eine Distribution, die Rohdaten vor Endnutzern schützt – für öffentliches GitHub-Repo und frei abrufbare WebGL-GLBs ohne schriftliche Freigabe ungeeignet |
| [Kenney Modular Dungeon Kit](https://www.kenney.nl/assets/modular-dungeon-kit) | $0 | 40 Dateien, modulare 3D-Dungeon-Basis | CC0 | sauberer Fallback, aber weniger inhaltliche und stilistische Deckung als Quaternius; kein weiterer Download nötig |
| [Poly Pizza – CC0 Caldron](https://poly.pizza/m/P36cOeZHyX) | $0 | einzelner Caldron, FBX/glTF | CC0 | mögliche Notbasis, aber Einzelfund ohne gemeinsames Ökosystem; kein Vorteil gegenüber Quaternius/Lucaasbre |

### 3.2 Lizenzkritik

- **CC0** bei Quaternius, KayKit und Kenney ist für ein öffentliches
  GitHub-Pages-Projekt ideal: kommerzielle Nutzung und Bearbeitung sind klar,
  Attribution ist nicht erforderlich. Quelle und Version werden trotzdem
  dokumentiert.
- **CC BY 4.0** bei Lucaasbre erlaubt kommerzielle Nutzung und Bearbeitung,
  verlangt aber Attribution. Der Beschreibungssatz, Credit sei „not
  mandatory“, widerspricht dem benannten Lizenztyp. Deshalb gilt für dieses
  Projekt die strengere, rechtssichere Auslegung: Urheber, Pack, Link, CC BY
  4.0 und Änderungen nennen.
- **Keine Lizenzangabe** ist kein implizites Nutzungsrecht. Wizard's Workshop
  und Ultimate Alchemy Station bleiben gesperrt, bis der Urheber schriftlich
  kommerzielle Nutzung, Bearbeitung und Auslieferung in einem öffentlich
  abrufbaren Browsergame bestätigt.
- **Daniel Mistage** beschreibt ein normales Game-Integrationsrecht, verbietet
  aber die Weitergabe von Original- oder geänderten Quelldateien und verlangt,
  dass Endnutzer nicht auf Rohdaten zugreifen können. In WebGL sind GLB- und
  Textur-Requests technisch abrufbar; zusätzlich ist das Repository offen.
  Ohne spezielle schriftliche Erlaubnis ist das für diesen Distributionsweg
  kein tragbares Risiko.

### 3.3 Bewertungsmatrix 0–10

Definition: 10 ist der beste Wert. Bei „Demo-Risiko“ bedeutet 10 ein geringes,
gut kontrollierbares Risiko, wie eine unveränderte Pack-Demo auszusehen.
Editierbarkeit bewertet die jeweils sinnvoll verfügbare Version; bei
Quaternius steht `Standard/Source`.

| Pack | Stil-Fit | Coverage | Editierbarkeit | Lizenzklarheit | Browser-Performance | glTF | Hero-Kessel | Materialsprache | Kitbash | Demo-Risiko | Urteil |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Quaternius Fantasy Props | 8,5 | 9,0 | 7,5/10 | 10 | 9 | 10 | 6 | 9 | 9 | 7,5 | **Primärpack** |
| Quaternius Medieval Village | 8,0 | 8,5 | 7,5/10 | 10 | 8,5 | 10 | 1 | 8,5 | 8,5 | 7 | **Primärarchitektur** |
| Quaternius Stylized Nature | 7,5 | 7,5 | 7,5/10 | 10 | 8 | 10 | 7 als Attachments | 8 | 9 | 7,5 | **Primär für Biome/Organik** |
| KayKit Dungeon 1.1 | 6 | 6 | 7/10 | 10 | 10 | 10 | 2 | 6 | 5,5 | 5,5 | Übergang/Fallback |
| Lucaasbre Magic Low Poly | 6 | 5,5 | 9 | 6,5 | 10 | 2 | 7 als Basis | 4,5 | 8 | 7,5 | günstiger optionaler Mesh-Spender |
| Wizard's Workshop | 7 | 8 | 9 | 0 | 6,5 nicht vermessen | 1 | 6 | 7 | 8 | 4 | **Lizenz unklar** |
| Ultimate Alchemy Station | 6 | 3 | 6 | 0 | 9 | 1 | 6 als Basis | 5 | 5 | 7 | **Lizenz unklar** |
| Daniel Mistage Alchemy | 8,5 | 10 | 10 | 9 klar, aber inkompatibel | 9 laut Anbieter | 1 | 7 als Basis | 9 | 9 | 5 | **nicht für offene Webdistribution** |
| Kenney Modular Dungeon | 5,5 | 4 | 7 | 10 | 10 | 8 | 0 | 5 | 4 | 5 | sauber, aber kein strategischer Gewinn |

## 4. Coverage-Matrix: Was deckt welches Ökosystem ab?

Legende: `●` stark, `◐` teilweise/als Basis, `○` kaum oder nicht.

| Bedarf | Fantasy Props | Medieval Village | Nature | KayKit | Lucaasbre | muss original bleiben |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Werkstatt-Kleinprops | ● | ◐ | ○ | ◐ | ● |  |
| Architektur innen/außen | ◐ | ● | ○ | ● | ○ |  |
| Arena-Bauteile | ◐ | ● | ◐ | ● | ○ | Runen-/Encounter-Landmarks |
| Pflanzen, Pilze, Wurzeln, Felsen | ◐ | ◐ | ● | ○ | ○ | Moor-spezifische Hero-Varianten |
| Bücher, Tränke, Werkzeuge, Möbel | ● | ◐ | ○ | ◐ | ● | Hero-Requisiten/Story-Komposition |
| Kessel-Grundkörper | ◐ | ○ | ○ | ○ | ● | finale Körpertopologie und Silhouette |
| Gesichter und Charakteranbauteile | ○ | ○ | ◐ organisch | ○ | ○ | **●** |
| Flüssigkeit | ◐ statisch | ○ | ○ | ○ | ◐ | **● Runtime-Material** |
| Kessel-Rig/Animation | ○ | ○ | ○ | ○ | ○ | **●** |
| Zutatenfamilien und Levelvarianten | ◐ | ○ | ● organisch | ◐ | ◐ | **● Gameplay-lesbare Hero-Formen** |
| Kampf-VFX/Status | ○ | ○ | ○ | ○ | ○ | **●** |
| Fantasy-UI | ○ | ○ | ○ | ○ | ○ | **● DOM/CSS/SVG** |

Fazit: Die drei Quaternius-Packs decken gemeinsam die Umgebung wesentlich
besser ab als KayKit allein. Der wertvollste Teil des Spiels – die lebenden
Kessel, Zutatenanimationen, Kampf-VFX und UI – bleibt dennoch eine originale
Produktionsaufgabe.

## 5. Empfohlene Asset-Architektur

### 5.1 Eine visuelle Muttersprache statt Pack-Mischung

Empfehlung für Phase 2:

- Quaternius liefert ca. 70–80 % der sichtbaren neutralen Umgebung und Props.
- Originale KesselKrawall-Assets liefern 100 % der Hero-Kessel, Gesichter,
  Zutaten-Heroformen, Familien-VFX und einzigartigen Arena-Landmarks.
- KayKit bleibt während des Umbaus hinter Feature-Flags/Fallbacks verfügbar,
  wird aber aus finalen North-Star-Screenshots schrittweise entfernt.
- Wenn einzelne KayKit-Modelle bleiben, erhalten sie mindestens gemeinsame
  Palette, Roughness, Lichtantwort, Maßstab und gegebenenfalls neue UVs/
  Materialien. Ein sichtbares 50:50-Gemisch ist nicht akzeptabel.

Ein unveränderter Quaternius-Wizard-Den wäre ebenfalls nur eine Asset-Pack-
Demo. Eigenständig wird die Szene durch projektspezifische Raumkomposition,
Kessel, Zutaten, Story-Props, Gebrauchsspuren, Runen, Farbakzente und VFX.

### 5.2 Cauldron Character Construction Kit

Das Kit wird als Blender-Quellprojekt plus reproduzierbarer Exportpipeline
gebaut. Ein einzelner externer Kessel darf als Proportions-/Topology-Spender
dienen, wird aber nicht unverändert zum Hauptcharakter.

#### Modulgruppen

1. **Vier Basisrümpfe:** rund/freundlich, gedrungen/organisch, hoch/gepanzert,
   breit/arkane Bossform.
2. **Drei Rand-/Flüssigkeitsöffnungen:** klassischer Ring, Krone/Hörner,
   mechanischer oder kristalliner Rand.
3. **Gesichtssystem:** Augenlider/Brauen, Augäpfel, Nase/Schnauze, Mund/Kiefer,
   optionale Zahn-/Visier-/Uhrplatte. Gesicht ist in den Rumpf integriert und
   nicht wie aufgeklebte Primitive lesbar.
4. **Griffe:** Ringe, Wurzeln, Panzerbügel, Kristall-/Sanduhrmodule.
5. **Füße:** Stiefel, Wurzeln, Panzerstiefel, elegante Eisfüße, mechanische
   Klauen.
6. **Rumpfplatten/Ornamente:** Messingregalia, Rüstung, Korrosion/Moos,
   Eiskragen, Resonanzornament, Zahnräder/Uhr, Bosskrone.
7. **VFX-Anker:** Flüssigkeitsmitte, Mund, linke/rechte Handgriffseite,
   Cast-Ursprung, Hit-Zentrum, Status-Ring, Bodenaufstand.

#### Gemeinsames Animations-Interface

Jeder Kessel exportiert dieselben benannten Kanäle:

- `idle`, `boil`, `anticipate`, `cast`, `hit`, `status`, `victory`, `defeat`,
- Gesichtsparameter `blink`, `brow`, `lookX`, `lookY`, `mouthOpen`, `smile`,
- Flüssigkeitsparameter `level`, `wave`, `glow`, `familyColor`,
- Eventmarker nur für Bild/Ton/VFX; **Gameplay bestimmt weiterhin den
  Trefferzeitpunkt**, nicht die Animation.

Für den Slice genügt ein kleines Rig mit Root/Bauch, Rand, beiden Griffen,
Gesicht und optionalen Federbeinen. Shape Keys übernehmen Augen- und
Mundausdruck. Das erlaubt Squash, Follow-through und individuelle Persönlichkeit
ohne ein humanoides Vollrig.

#### Produktionsbudgets pro Hero-Kessel

| Budget | Ziel |
|---|---:|
| Dreiecke | 15–25k, Boss maximal 35k |
| sichtbare Mesh-Nodes | höchstens 8 |
| Materialien | 3 Basis + 1 Flüssigkeit, VFX separat |
| Texturen | ein gemeinsamer 1k/2k Atlas pro Materialfamilie; Masken bevorzugt |
| Draw Calls | Ziel 6–10 ohne VFX |
| LOD | Hero-LOD plus vereinfachtes Gegner-/Mobile-LOD |

Der aktuelle Spieler liegt bei 28,4k Dreiecken und Moor-Martha bei 29,9k; das
ist noch vertretbar. Kritisch sind die 45/48 Mesh-Objekte und 8/11 Materialien.
Der Umbau priorisiert daher Join/Atlas/Materialslots vor blindem Decimate.

### 5.3 Zutaten

Die rund 20 Zutaten werden nicht als 20 unabhängige Einzelprojekte gebaut,
sondern aus fünf Familienkits:

- Fire: Schoten, Kohle, Kristall, Samen; gebogene Silhouette und warmer Kern.
- Poison: Pilze, Schoten, Kräuter, Schleim; asymmetrische organische Formen.
- Guard: Schale, Knochen, Erz, Runenstein; geschlossene harte Silhouette.
- Frost: Kristall, Beere, Feder/Eiszapfen; klare Facetten und kalte Kanten.
- Echo: Glocke, Resonanzkern, Uhr-/Spiralobjekt; Kreis, Doppelung, Schwingung.

Jede Familie teilt Material, Sockel-/Aura-Logik und Aktivierungsgrammatik.
Level 2/3 erhalten echte Formzuwächse und nicht nur Skalierung oder UI-Zahlen.

### 5.4 VFX

Kein geprüfter Asset-Pack-Kauf löst die Kampf-VFX. Empfohlen wird ein eigener,
gepoolter GPU-/Instancing-freundlicher Baukasten:

- ein gemeinsamer Trail-Renderer mit fünf Shape-/Noise-Profilen,
- instanzierte Sparks, Droplets, Shards und Glyphen,
- wenige kleine Flipbook-Texturen für Rauch, Flamme, Gift und Impact,
- ein Impact-System mit Bodenmarke, kurzer Lichtantwort, Kesselreaktion und
  family-spezifischem Status-Layer,
- maximal zwei dominante Effektfarben gleichzeitig; Bloom nur als Akzent,
- Low-/High-VFX-Profil für Mobile/Desktop.

Die Qualität entsteht durch Timing: Antizipation → Launch → Trail → Impact →
Follow-through → Status. Mehr Partikel allein machen den Effekt nicht besser.

### 5.5 Browser-Assetpipeline

Nie komplette Downloadpacks in `public/` oder Git committen. Phase 2 soll:

1. ZIP, Kaufbeleg/Version und Lizenz in einem nicht ausgelieferten Intake
   erfassen;
2. nur ausgewählte FBX/glTF/Blend-Dateien nach Blender importieren;
3. Maßstab, Achsen, Pivot, UV, Materialnamen und Schatten vereinheitlichen;
4. Meshes nach Material/Animation sinnvoll zusammenführen;
5. Texturen atlasieren und bei Bedarf KTX2 nutzen;
6. GLB mit Meshopt/geeigneter Kompression exportieren;
7. je Asset Dreiecke, Nodes, Materialien, Texturen und Dateigröße automatisch
   protokollieren;
8. nur die kuratierte, optimierte Runtime-Kopie samt Lizenzhinweis committen.

## 6. Beschaffungspläne

### Free Plan – $0

**Empfehlung für den nächsten manuellen Download.**

| Priorität | Aktion | Begründung |
|---:|---|---|
| 1 – MUST DOWNLOAD | [Fantasy Props MegaKit – Standard, 143 MB](https://quaternius.itch.io/fantasy-props-megakit) | stärkste unmittelbare Werkstatt-/Prop-Abdeckung, glTF, CC0 |
| 2 – MUST DOWNLOAD | [Medieval Village MegaKit – Standard, 153 MB](https://quaternius.itch.io/medieval-village-megakit) | gemeinsame Architektur für Werkstatt und lebendigere Arenen, glTF, CC0 |
| 3 – MUST DOWNLOAD | [Stylized Nature MegaKit – Standard, 99 MB](https://quaternius.itch.io/stylized-nature-megakit) | Moor-/Naturarena, organische Kesselanbauteile und Zutatenbasen, glTF, CC0 |
| vorhanden – KEEP | KayKit Dungeon Pack 1.1 Free | technischer Übergang/Fallback; nicht erneut herunterladen |

Mit diesem Plan lässt sich die Umgebung deutlich aufwerten. Für finale
Charakterkessel reicht er allein nicht; die bleiben Eigenproduktion.

### Best Value Plan – $2,99, Obergrenze $10

Free Plan plus:

| Priorität | Aktion | Begründung |
|---:|---|---|
| OPTIONAL BUY | [Lucaasbre Magic Low Poly Pack – $2,99](https://lucaasbre.itch.io/magic-low-poly-pack) | mehrere extrem leichte Kesselbasen und Magic-Props; schneller Topologie-/Proportions-Bake-off |
| DO NOT BUY | Quaternius Pro für $9,99 | mehr Modelle, aber keine Blend-Quellen; der kostenlose Standardumfang genügt für die erste Stilprobe |
| DO NOT BUY | KayKit Extra für $7,95 | mehr vom bereits als stilistisch zu schwach eingestuften Ökosystem löst das Hauptproblem nicht |

Lucaasbre ist kein fertiger Art-Pass. Wegen FBX/OBJ, fehlenden Texturen und
30–600 Tris braucht jedes verwendete Modell einen deutlichen Umbau. Bei Nutzung
werden `lucaasbre`, Pack-Link, CC BY 4.0 und unsere Änderungen sichtbar
dokumentiert.

### Stretch Plan – $17,98, Obergrenze $20

Free Plan plus:

| Priorität | Aktion | Preis | Begründung |
|---:|---|---:|---|
| MUST BUY im Stretch-Plan | [Fantasy Props MegaKit – Source](https://quaternius.itch.io/fantasy-props-megakit) | $14,99 | 100 % der Modelle, Blend-Quellen, Varianten und maximale Kitbash-/Materialkontrolle |
| OPTIONAL BUY | [Lucaasbre Magic Low Poly Pack](https://lucaasbre.itch.io/magic-low-poly-pack) | $2,99 | zusätzliche sehr leichte Kesselbasen für den Baukastenvergleich |
| **Gesamt** |  | **$17,98** | bleibt unter $20 |

Der Source-Kauf ist sinnvoller als drei Pro-Packs: Der Engpass ist nicht die
absolute Modellzahl, sondern editierbare Quellgeometrie für eine einheitliche,
originale Materialsprache.

## 7. Explizite Sperrliste

### DO NOT BUY YET

- Quaternius Medieval Village Pro/Source und Stylized Nature Pro/Source: Erst
  nach dem kostenlosen Screenshot-Bake-off entscheiden, ob die fehlenden
  30–40 % wirklich benötigt werden.
- KayKit Extra/Source: technisch gut, strategisch derzeit keine Lösung.
- Daniel Mistage Alchemy: über Budget und für offene WebGL-/GitHub-Verteilung
  lizenzkritisch.
- Kenney Modular Dungeon und einzelne Poly-Pizza-Kessel: rechtlich sauber,
  aber kein besseres Gesamtsystem als der gewählte Quaternius-Pfad.

### LICENSE UNCLEAR – NICHT HERUNTERLADEN/INTEGRIEREN

- ejgarner118 Wizard's Workshop 3D Lowpoly Asset Pack,
- Azrael68 Ultimate Alchemy Station.

Vor jeder Neubewertung ist eine schriftliche Erlaubnis erforderlich, die
kommerzielle Nutzung, Bearbeitung, GitHub-Pages-Auslieferung und öffentliche
Abrufbarkeit konvertierter GLBs ausdrücklich einschließt.

## 8. Exakte nächste Benutzeraktion und Stop-Gate

Für den empfohlenen kostenlosen Start bitte ausschließlich diese drei Dateien
manuell laden und **als ZIP, noch ungeöffnet**, in einen lokalen Asset-Inbox-
Ordner im Projekt legen:

1. `Fantasy Props MegaKit[Standard].zip` – 143 MB,
2. `Medieval Village MegaKit[Standard].zip` – 153 MB,
3. `Stylized Nature MegaKit[Standard].zip` – 99 MB.

Optional für den Best-Value-Test:

4. `Magic Low Poly Pack.zip` – 715 KB, $2,99.

Optional statt Punkt 4 für den Stretch-Pfad:

4. `Fantasy Props MegaKit[Source].zip` – 545 MB, $14,99,
5. optional zusätzlich `Magic Low Poly Pack.zip` – Gesamt $17,98.

Bitte keine Demo-Szenen, Unity-/Unreal-Projekte oder kompletten Packs in
`public/` kopieren und keine Lizenz-unklaren ZIPs kaufen. Sobald die gewählten
ZIPs lokal vorhanden sind, beginnt Phase 2 mit Inhaltsmanifest, Lizenz-Gate,
visuellem Bake-off und erst danach der selektiven Integration.

**Stop:** Diese Phase nimmt absichtlich keine Assetintegration und keine
Featureänderung vor.
