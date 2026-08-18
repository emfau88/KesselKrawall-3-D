# KesselKrawall 3D

Eigenständiger 3D-Rebuild von **KesselKrawall / Cauldron Rumble** als statisch
deploybares Browsergame mit TypeScript, Vite, React, Three.js und
`@react-three/fiber`.

## Aktueller Stand

Legacy-Audit, renderer-neutraler Core, 3D-Greybox und der erste spielbare
Vertical Slice sowie Mobile-/UX-Polish sind umgesetzt. Der lokale Lauf führt vom Drei-Angebote-Shop
über Kauf, sichtbaren Merge, Synergieanzeige und Slot-Tausch in einen
deterministisch simulierten 3D-Kampf mit HP, VFX, Ergebnis und Rückkehr zur
Werkbank. Kein Legacy-Presentation-Code und kein Legacy-Asset wurde in den
Runtime-Build übernommen.

Zusätzlich enthalten sind Kampagnenwahl, Reservebedienung, gespeicherter
Shop-Run und Kampagnenfortschritt, Kurzeinführung, synthetisierte Web-Audio-SFX,
Portrait-/Landscape-Layouts, Touchsteuerung und ein installierbares Web-App-
Manifest.

- Neues Arbeitsrepository: dieses Repository
- Nur lesbare Referenz während der Migration: separates lokales
  `KesselKrawall-reference`-Repository
- Auditierter Referenz-Commit: `5c4ec098b36d44d6dde4de31cba422de8b4f2b24`

Die Referenz ist Quelle für Regeln, Content und Balance, nicht für die neue
Presentation-Architektur. Insbesondere werden `Game.tsx`, die alte CSS-Struktur
und die 2D-Sprite-Komposition nicht portiert.

## Dokumentation

- [Legacy-Migrationsaudit](docs/LEGACY_MIGRATION_AUDIT.md)
- [Zielarchitektur](docs/ARCHITECTURE.md)
- [Art Direction](docs/ART_DIRECTION.md)
- [Asset- und Lizenzregister](docs/ASSET_LICENSES.md)
- [Bewusste Verhaltensunterschiede](docs/BEHAVIOR_DIFFERENCES.md)
- [Mobile- und Performance-QA](docs/MOBILE_AND_PERFORMANCE_QA.md)

## Lokale Checks

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Für einen Test auf einem Smartphone im selben WLAN:

```bash
npm run dev -- --host 0.0.0.0
```

Anschließend die vom Terminal angezeigte Netzwerkadresse auf dem Smartphone
öffnen. Für echten Außenzugriff muss der `dist`-Ordner statisch gehostet werden.

## Arbeitsphasen

1. Audit und Migrationsgrenzen
2. Renderer-neutralen Core bewusst extrahieren und testen
3. 3D-Greybox für Kamera, Licht, Werkbank und Arena *(umgesetzt)*
4. Shop, Merge, Synergie und deterministischen Kampf anbinden *(umgesetzt)*
5. Visuellen Vertical Slice mit Kampf-VFX ausarbeiten *(erste Fassung umgesetzt)*
6. Audio, Onboarding und Reaktionsqualität *(umgesetzt)*
7. Responsive- und Performance-QA *(umgesetzt; physischer Gerätesmoketest empfohlen)*

Jede Phase muss ihren eigenen Quality Gate bestehen, bevor die nächste beginnt.
