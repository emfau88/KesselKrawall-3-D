# Asset- und Lizenzregister

Stand: 22. August 2026

## Shipping-Status

Der Golden Slice verwendet eine kuratierte, mobil optimierte Auswahl aus drei
offiziellen Quaternius-Standard-Paketen als gemeinsame visuelle Muttersprache.
KayKit Dungeon Pack 1.1 bleibt ausschließlich als reproduzierbarer
`?art=legacy`-Vergleich und technischer Fallback enthalten. Die beiden
Hero-Kessel kombinieren den texturierten Quaternius-Kesselkörper mit originalen,
reproduzierbar in Blender modularisierten Gesichts- und Charakterteilen. Drei
Referenzzutaten und der Arena-Dais bleiben originale Projektassets.
Animationen, Ambient-Leben und Effekte entstehen weiterhin aus eigenem
Three.js-/R3F-Code. Musik, Kessel-Ambience, UI- und Kampfsounds werden als
kuratierte Ogg-Derivate ausgeliefert und über einen eigenen Web-Audio-Mixer
abgespielt. Die vollständige Attribution liegt unter
`public/assets/audio/ATTRIBUTION.md`; `public/assets/audio/manifest.json`
dokumentiert Größe und SHA-256 jeder ausgelieferten Audiodatei.

Das App-Symbol `public/kessel-mark.svg` ist eine für dieses Repository neu
erstellte Eigenleistung. Vite erzeugt beim Produktionsbuild zusätzlich
`dist/third-party-licenses.md` aus den Lizenzen der gebündelten NPM-Pakete.

## Aufnahmeprozess

Vor jeder dauerhaften Asset-Aufnahme müssen dokumentiert sein:

1. konkrete Datei und Version,
2. Urheber/Publisher,
3. direkte Quellseite,
4. konkrete Lizenz mit Link oder Lizenzdatei,
5. kommerzielle Nutzung und Bearbeitungsrecht,
6. nötige Attribution,
7. vorgenommene Bearbeitung/Optimierung,
8. Zielpfad im neuen Repository.

Ein Download oder eine Erwähnung in diesem Dokument gilt nicht als Freigabe.

## Übernommenes Audio aus dem Referenzprojekt

Die Quellen und Lizenzen wurden am 22.08.2026 gegen die angegebenen
Primärseiten geprüft. Übernommen wurden ausschließlich die bereits für das
Gameplay geschnittenen, loop-vorbereiteten und pegelangepassten Ogg-Derivate
aus dem auditierten Referenz-Commit
`5c4ec098b36d44d6dde4de31cba422de8b4f2b24`. Der Hash jedes Derivats ist im
Runtime-Manifest festgeschrieben.

| Werk / Pack | Urheber | Dokumentierte Quelle | Dokumentierte Lizenz | Legacy-Nutzung | Rebuild-Status |
|---|---|---|---|---|---|
| A Welcome Haunting | Fablefly Music | https://fablefly-music.itch.io/a-welcome-haunting | CC BY 4.0 | Menü-/Shopmusik | übernommen; Namensnennung und Bearbeitungshinweis ausgeliefert |
| Daydream of a Deity | Fablefly Music | https://fablefly-music.itch.io/daydream-of-a-deity | CC BY 4.0 | Bossmusik | übernommen; Namensnennung und Bearbeitungshinweis ausgeliefert |
| Fairy Battles | MintoDog | https://opengameart.org/content/fairy-battles | CC0 1.0 | Kampfmusik | übernommen |
| Interface SFX Pack 1 | ObsydianX | https://obsydianx.itch.io/interface-sfx-pack-1 | CC0 1.0 | UI, Reroll, Fehler | übernommen |
| Free SFX Pack Vol. 3 | HZSMITH | https://hzsmith.itch.io/free-sfx-pack-vol-3 | CC0 1.0 | Kauf-/Verkaufscoins | übernommen |
| Retro Magic Sound Effects | NSFRL | https://nsfrl.itch.io/retro-magic-sound-effects | CC0 1.0 | Merge, Result, Echo | übernommen |
| Bubble Sound Effects | BMacZero / Brian MacIntosh | https://opengameart.org/content/bubble-sound-effects | CC0 1.0 | Kessel-Ambience | übernommen |
| Basic Spell Impacts | Lentikula | https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx | CC0 1.0 | Fire, Poison, Guard, Hit, Frost | übernommen |
| Healing Spell Impacts | Lentikula | https://lentikula.itch.io/healing-spell-impacts | CC0 1.0 | Heilung | übernommen |

Die CC-BY-Attribution wird bewusst auch im gebauten `public`-Artefakt
ausgeliefert. Die übrigen CC0-Credits bleiben aus Transparenzgründen erhalten,
obwohl sie lizenzrechtlich nicht verlangt werden.

## Legacy-Bilder – nur Referenz

| Gruppe | Umfang | Status | Grund |
|---|---:|---|---|
| `public/assets/art` | 83 PNG | REFERENCE ONLY | Keine separate Bild-Provenienz/Lizenz im Referenz-Repo gefunden; außerdem 2D-Stickerarchitektur. |
| `public/assets/ui` | 18 PNG | REFERENCE ONLY | Als Icon-/Farb-Referenz lesbar, nicht für Runtime freigegeben. |
| `public/assets/backgrounds` | 5 WebP | REFERENCE ONLY | Alte 2D-Bühnen, keine Grundlage für echte 3D-Räume. |
| weitere WebP-Art-Dateien | 2 WebP | REFERENCE ONLY | Keine dokumentierte Provenienz im Referenz-Repo. |

## Externe Runtime-Assets

| Datei | Urheber | Quelle/Version | Lizenz | Kommerziell/Bearbeitung geprüft | Attribution | Änderungen | Zielpfad |
|---|---|---|---|---|---|---|---|
| 13 Modelle: `Banner_1`, `Barrel`, `Bookcase_2`, `BookStand`, `CandleStick_Triple`, `Cauldron`, `Chest_Wood`, `Lantern_Wall`, `Potion_1`, `Potion_2`, `Shelf_Small_Bottles`, `Torch_Metal`, `Workbench` | Quaternius | [Fantasy Props MegaKit, Standard](https://quaternius.itch.io/fantasy-props-megakit), lokal bereitgestellt 21.08.2026 | CC0 1.0; enthaltene `License_Standard.txt` | ja | nicht erforderlich | kuratierte glTF-Auswahl; referenzierte Texturen auf maximal 512 px verkleinert und PNG-optimiert | `public/assets/quaternius/fantasy/` |
| 4 Modelle: `DoorFrame_Round_Brick`, `Floor_UnevenBrick`, `Prop_Vine5`, `Wall_UnevenBrick_Straight` | Quaternius | [Medieval Village MegaKit, Standard](https://quaternius.itch.io/medieval-village-megakit), lokal bereitgestellt 21.08.2026 | CC0 1.0; enthaltene `License_Standard.txt` | ja | nicht erforderlich | kuratierte glTF-Auswahl; referenzierte Texturen auf maximal 512 px verkleinert und PNG-optimiert | `public/assets/quaternius/village/` |
| 5 Modelle: `DeadTree_3`, `Mushroom_Common`, `Mushroom_Laetiporus`, `Plant_7_Big`, `Rock_Medium_2` | Quaternius | [Stylized Nature MegaKit, Standard](https://quaternius.itch.io/stylized-nature-megakit), lokal bereitgestellt 21.08.2026 | CC0 1.0; enthaltene `License_Standard.txt` | ja | nicht erforderlich | kuratierte glTF-Auswahl; referenzierte Texturen auf maximal 512 px verkleinert und PNG-optimiert | `public/assets/quaternius/nature/` |
| `wall`, `wall_arched`, `wall_shelves`, `wall_cracked` (`.gltf` + `.bin`) | Kay Lousberg | [KayKit Dungeon Pack 1.1](https://kaylousberg.itch.io/kaykit-dungeon-pack), 16.07.2026 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | ja | nicht erforderlich | kuratierte Auswahl; Runtime-Materialnormalisierung und Schatten | `public/assets/kaykit-dungeon/` |
| `floor_tile_large`, `floor_wood_large`, `pillar_decorated` (`.gltf` + `.bin`) | Kay Lousberg | KayKit Dungeon Pack 1.1 | CC0 1.0 | ja | nicht erforderlich | kuratierte Architekturbauteile | `public/assets/kaykit-dungeon/` |
| `shelves`, `candle_triple`, `bottle_A_green`, `bottle_A_brown` (`.gltf` + `.bin`) | Kay Lousberg | KayKit Dungeon Pack 1.1 | CC0 1.0 | ja | nicht erforderlich | kuratierte Werkstatt-Props | `public/assets/kaykit-dungeon/` |
| `banner_patternC_blue`, `banner_patternC_red`, `torch_mounted` (`.gltf` + `.bin`) | Kay Lousberg | KayKit Dungeon Pack 1.1 | CC0 1.0 | ja | nicht erforderlich | kuratierte Arena-Props | `public/assets/kaykit-dungeon/` |
| `crates_stacked`, `barrel_small_stack` (`.gltf` + `.bin`) | Kay Lousberg | KayKit Dungeon Pack 1.1 | CC0 1.0 | ja | nicht erforderlich | kuratierte Szenen-Props | `public/assets/kaykit-dungeon/` |
| `dungeon_texture.png` | Kay Lousberg | KayKit Dungeon Pack 1.1 | CC0 1.0 | ja | nicht erforderlich | unveränderter gemeinsamer Texturatlas | `public/assets/kaykit-dungeon/dungeon_texture.png` |

Die originalen Lizenzdateien werden in jedem Quaternius-Unterordner als
`LICENSE.txt` sowie als `public/assets/kaykit-dungeon/License.txt` mit
ausgeliefert. `public/assets/quaternius/manifest.json` dokumentiert Modelle,
Texturauflösungen und Größen der reproduzierbaren Aufbereitung. Nicht
verwendete Modelle und alle Downloadarchive werden nicht in das Repository
aufgenommen. Die Erzeugung erfolgt über
`scripts/prepare_quaternius_assets.py` aus den lokal bereitgestellten ZIPs.

## Originale Blender-Runtime-Assets

| Dateien | Urheber | Quelle | Lizenzstatus | Erzeugung/Bearbeitung | Zielpfad |
|---|---|---|---|---|---|
| `hero-cauldron-player.glb`, `hero-cauldron-moor.glb` | KesselKrawall-3-D Projekt | originale Geometrie und Materialien dieses Repositories | Project original | reproduzierbarer Blender-5.2-Export; Silhouette, Gesicht, Regalia, Moor-Bewuchs und Flüssigkeit projektspezifisch | `public/assets/hero/` |
| `hero-cauldron-player-kit.glb`, `hero-cauldron-moor-kit.glb` | KesselKrawall-3-D Projekt | modularisierte Charakterteile der beiden originalen Hero-GLBs | Project original; Laufzeit-Kitbash mit CC0-Donor | reproduzierbarer Blender-5.2-Export; alte prozedurale Kesselkörper/Ränder entfernt, Gesichter, Schuhe, Runen, Wurzeln und Moos als austauschbare Module erhalten | `public/assets/hero/` |
| `ingredient-chili.glb`, `ingredient-slime-shroom.glb`, `ingredient-rune-shell.glb` | KesselKrawall-3-D Projekt | originale Geometrie und Materialien dieses Repositories | Project original | reproduzierbarer Blender-5.2-Export; drei Familienreferenzen Fire, Poison und Guard | `public/assets/hero/` |
| `hero-workbench.glb`, `hero-arena-dais.glb` | KesselKrawall-3-D Projekt | originale Geometrie und Materialien dieses Repositories | Project original | reproduzierbarer Blender-5.2-Export; dunkles Holz, Messing, Ritualringe und Runen | `public/assets/hero/` |

Die vollständige Erzeugung ist in `art/blender/build_hero_assets.py` und die
darauf aufbauende Modularisierung in
`art/blender/build_cauldron_kits.py` dokumentiert. Die drei alten
2D-Mockup-/Legacy-Bilder dienen ausschließlich als Art-Direction-Referenz;
ihre Pixel oder Texturen wurden nicht in die GLBs übernommen.

## Eigenassets im aktuellen Build

Folgende Gruppen werden zusätzlich vollständig im Projektcode erzeugt:

- fünf Ingredient-Podeste,
- Shop-Sockel,
- Bücher, Mörser und ergänzende magische Werkstattdetails,
- Kessel-Reaktionsanimationen, Blasen, Dampf und Auren um die GLB-Modelle,
- Runensteine, animiertes Publikum, Ambient-Motes und Braziers,
- fünf Familien-VFX und strukturierte Audio-Cues,
- App-Symbol und Manifest.

Diese Assets sind Eigenleistung innerhalb dieses Repositories und benötigen
keine Drittanbieter-Attribution.

Die drei unter `docs/reference-art/` abgelegten Mockups sind ausschließlich
user-provided Qualitätsreferenzen und keine Runtime- oder Marketingassets.

## Vorlage für neue Einträge

| Datei | Urheber | Quelle/Version | Lizenz | Kommerziell/Bearbeitung geprüft | Attribution | Änderungen | Zielpfad |
|---|---|---|---|---|---|---|---|
| _noch keine_ |  |  |  |  |  |  |  |
