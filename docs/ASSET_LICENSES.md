# Asset- und Lizenzregister

Stand: 18. August 2026

## Shipping-Status

**Der neue Rebuild enthält keine externen oder aus dem Legacy-Repo
übernommenen Runtime-Assets.** Sämtliche sichtbaren Formen, Materialien,
Animationen und Effekte entstehen aus eigenem Three.js-/R3F-Code. UI-Sounds
und Kessel-Ambience werden zur Laufzeit mit der Web Audio API synthetisiert;
es wird keine Audiodatei ausgeliefert.

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

## Legacy-Audio – noch nicht übernommene Kandidaten

Die folgende Provenienz ist im Legacy-Repo unter
`public/assets/audio/ATTRIBUTION.md` dokumentiert. Sie wurde in Phase A noch
nicht unabhängig verifiziert und keine Datei wurde kopiert.

| Werk / Pack | Urheber | Dokumentierte Quelle | Dokumentierte Lizenz | Legacy-Nutzung | Rebuild-Status |
|---|---|---|---|---|---|
| A Welcome Haunting | Fablefly Music | https://fablefly-music.itch.io/a-welcome-haunting | CC BY 4.0 | Menü-/Shopmusik | Kandidat, nicht übernommen; Attribution erforderlich |
| Daydream of a Deity | Fablefly Music | https://fablefly-music.itch.io/daydream-of-a-deity | CC BY 4.0 | Bossmusik | Kandidat, nicht übernommen; Attribution erforderlich |
| Fairy Battles | MintoDog | https://opengameart.org/content/fairy-battles | CC0 1.0 | Kampfmusik | Kandidat, nicht übernommen |
| Interface SFX Pack 1 | ObsydianX | https://obsydianx.itch.io/interface-sfx-pack-1 | CC0 1.0 | UI, Reroll, Fehler | Kandidat, nicht übernommen |
| Free SFX Pack Vol. 3 | HZSMITH | https://hzsmith.itch.io/free-sfx-pack-vol-3 | CC0 1.0 | Kauf-/Verkaufscoins | Kandidat, nicht übernommen |
| Retro Magic Sound Effects | NSFRL | https://nsfrl.itch.io/retro-magic-sound-effects | CC0 1.0 | Merge, Result, Echo | Kandidat, nicht übernommen |
| Bubble Sound Effects | BMacZero / Brian MacIntosh | https://opengameart.org/content/bubble-sound-effects | CC0 1.0 | Kessel-Ambience | Kandidat, nicht übernommen |
| Basic Spell Impacts | Lentikula | https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx | CC0 1.0 | Fire, Poison, Guard, Hit, Frost | Kandidat, nicht übernommen |
| Healing Spell Impacts | Lentikula | https://lentikula.itch.io/healing-spell-impacts | CC0 1.0 | Heilung | Kandidat, nicht übernommen |

Die Legacy-Dateien sind bearbeitete OGG-Derivate (unter anderem getrimmt,
loop-vorbereitet und pegelangepasst). Vor Übernahme ist zusätzlich zu klären,
ob die Bearbeitungskette und Zuordnung jeder einzelnen Datei ausreichend
dokumentiert ist.

## Legacy-Bilder – nur Referenz

| Gruppe | Umfang | Status | Grund |
|---|---:|---|---|
| `public/assets/art` | 83 PNG | REFERENCE ONLY | Keine separate Bild-Provenienz/Lizenz im Referenz-Repo gefunden; außerdem 2D-Stickerarchitektur. |
| `public/assets/ui` | 18 PNG | REFERENCE ONLY | Als Icon-/Farb-Referenz lesbar, nicht für Runtime freigegeben. |
| `public/assets/backgrounds` | 5 WebP | REFERENCE ONLY | Alte 2D-Bühnen, keine Grundlage für echte 3D-Räume. |
| weitere WebP-Art-Dateien | 2 WebP | REFERENCE ONLY | Keine dokumentierte Provenienz im Referenz-Repo. |

## Eigenassets im aktuellen Build

Folgende Gruppen werden vollständig im Projektcode erzeugt:

- Boden/Tischfläche,
- zwei animierte Hero-Kessel mit Flüssigkeit, Blasen und Dampf,
- fünf Ingredient-Podeste,
- Shop-Sockel,
- Werkstattregale, Flaschen, Kerzen, Holzdetails und Hintergrundarchitektur,
- Arena-Ring, Runensteine, Pfeiler, Treppen und Hintergrundarchitektur,
- fünf Familien-VFX und strukturierte Audio-Cues,
- App-Symbol und Manifest.

Diese Assets sind Eigenleistung innerhalb dieses Repositories und benötigen
keine Drittanbieter-Attribution.

## Vorlage für neue Einträge

| Datei | Urheber | Quelle/Version | Lizenz | Kommerziell/Bearbeitung geprüft | Attribution | Änderungen | Zielpfad |
|---|---|---|---|---|---|---|---|
| _noch keine_ |  |  |  |  |  |  |  |
