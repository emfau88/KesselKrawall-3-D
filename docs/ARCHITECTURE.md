# Zielarchitektur

## Leitprinzip

KesselKrawall 3D besteht aus einem deterministischen Spielmodell und mehreren
reinen Konsumenten dieses Modells. React, Three.js, Audio und DOM dürfen Regeln
nur auslösen oder darstellen, niemals definieren.

```text
Input / UI
    │ Commands
    ▼
Application Controller ───────► Platform Ports (Save, Audio, Fullscreen)
    │
    ▼
Pure Core ── State + Domain/Combat Events
    │                         │
    ├────────► React HUD      ├────────► R3F Scene + Animation
    └────────► Tests          └────────► Audio/VFX Mappers
```

Abhängigkeitsrichtung: Außen darf nach innen importieren. `src/core` importiert
niemals aus `presentation`, `ui`, `audio`, `platform` oder React.

## Geplante Struktur

```text
src/
├── app/
│   ├── GameController.ts
│   └── gameSession.ts
├── core/
│   ├── types/
│   ├── data/
│   ├── state/
│   ├── simulation/
│   ├── progression/
│   ├── storage/
│   └── events/
├── presentation/
│   ├── scene/
│   ├── camera/
│   ├── cauldrons/
│   ├── ingredients/
│   ├── arena/
│   ├── workshop/
│   ├── animation/
│   └── vfx/
├── ui/
│   ├── hud/
│   ├── shop/
│   ├── tooltips/
│   ├── results/
│   └── i18n/
├── audio/
├── assets/
├── platform/
└── tests/
    ├── core/
    ├── integration/
    └── visual/
```

## Core-Verträge

### Commands und State-Transitions

Kauf, Verkauf, Reroll, Umordnung und Phasenwechsel sind synchrone reine
Funktionen. Ein Command liefert immer einen neuen State und strukturierte
Domain Events:

```ts
type Transition<TState, TEvent> = {
  state: TState;
  events: readonly TEvent[];
  error?: GameErrorCode;
};
```

Beispiel Kauf:

```text
BuyOffer
→ PurchaseCommitted (offer, item, gold delta, destination)
→ optional MergeResolved[]
→ optional SynergyChanged[]
```

Die 3D-Schicht darf daraus Flugbahn, Landung, Kesselreaktion und Merge-Impuls
ableiten. Sie darf Gold, Zielslot oder Merge-Level nicht neu berechnen.

Während dieser Präsentation projiziert `getPresentedInventory` den Zustand vor
und nach dem bereits atomar abgeschlossenen Core-Command. In der Flug- und
Landungsphase bleibt der alte Bestand sichtbar; aktive Merge-Teilnehmer werden
während der Verschmelzung ausgeblendet; erst die Reveal-Phase zeigt das
Endergebnis. Eingaben, die eine zweite Inventartransaktion auslösen könnten,
bleiben bis dahin gesperrt.

### Combat Events

`simulateBattle` löst den Kampf vollständig und deterministisch auf. Events
enthalten stabile Codes, UIDs, Zeit, Betrag und den resultierenden Snapshot.
Sie enthalten keine lokalisierten Sätze und keine VFX-Namen.

```text
Simulation: IngredientActivated / DamageApplied / PoisonChanged / ShieldChanged
            / SynergyTriggered / CombatEnded
Presentation: projectile.fire / cauldron.hit / poison.cloud / shield.rune
UI: localized label + number formatting
Audio: sound cue with throttling
```

Ein separater Playback-Controller liest den bereits feststehenden Eventstream.
Pause, Slowdown, Kameraimpulse und Animationsdauer verändern niemals die
Simulationszeit oder das Ergebnis.

Die Combat-Presentation rekonstruiert aus demselben Eventstream pro Beat einen
Status-Snapshot und gebündelte Floating Numbers. Beides ist reine Ableitung:
DOM-HUD, Kesselanimation, Audio und VFX konsumieren identische Events, ohne
Schaden, Schild, Gift oder Buff-Dauern selbst zu simulieren.

### Daten und Texte

Mechanische Definitionen enthalten nur stabile IDs und Werte. Namen,
Beschreibungen, Icons, Farben, VFX-Profile und Übersetzungen referenzieren diese
IDs außerhalb des Core. Dadurch bleibt ein Item wie `chili` dieselbe Regel,
unabhängig davon, wie es dargestellt oder lokalisiert wird.

### Speicherung

Der Core kennt nur ein minimales Port-Interface:

```ts
interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

Schema-Validierung und Migration bleiben testbar. Die React-Anwendung reicht
`window.localStorage` als konkrete Implementierung des Core-Ports ein; der
Core selbst kennt weiterhin keine Browser-Globals. Laufender Kampf und
Eventstream werden atomar gespeichert, beim Seitenneuladen aber absichtlich
nicht mitten in einer visuellen Wiedergabe fortgesetzt.

## Presentation

- Eine einzige echte WebGL-Bühne pro Phase, keine Sammlung unabhängiger
  freigestellter Bilder.
- R3F besitzt Objektlebenszyklen und Animation, aber keine Gameplayregeln.
- Orthografische fixed three-quarter camera ist die erste geprüfte Variante;
  niedrige Perspective/FOV ist ein kontrollierter Vergleich, kein freies
  Kamerasystem.
- Shop- und Arena-Szene dürfen gemeinsame Materialien, Licht-Rig und Hero-
  Kessel-Komponenten teilen.
- Animationen werden über semantische Zustände (`idle`, `boil`, `cast`, `hit`,
  `victory`, `defeat`) angesteuert.

## UI

DOM bleibt für kompakten Shop, Gold, HP, Tooltips, Ergebnis und Accessibility
zulässig. Die UI überlagert die Bühne sparsam und wird nicht zur primären
Komposition. Touchziele sind mindestens 44 CSS-Pixel groß; Safe Areas und
`prefers-reduced-motion` werden berücksichtigt.

Core-Fehler werden als Codes übersetzt. React-Provider und Browser-
Spracherkennung liegen außerhalb der Übersetzungsdaten.

## Rendering- und Performance-Leitplanken

- WebGL ist Pflichtbaseline; keine WebGPU-Abhängigkeit.
- Wenige Materialien und dynamische Lichter; Schatten nur an visuellen
  Ankerobjekten.
- Wiederholte Props instanzieren, Partikelbudgets pro Effekt begrenzen.
- GLB-Assets vor Aufnahme optimieren; Texturauflösung und Dateigröße im
  Asset-Register dokumentieren.
- Statischer Vite-Build ohne Server oder Next.js.
- Responsive Komposition wird für 1280×720, 1920×1080, 907×510, 844×390,
  915×412 und 800×450 separat geprüft.

## Tests und Quality Gates

### Core

- Determinismus: gleiche Inputs erzeugen bytegleich relevante Ergebnisse.
- Kauf, voller Kessel, Merge-Kaskade, Reserve, Verkauf und Reroll.
- Familiengewicht und alle fünf Synergien.
- Gift, Brand, Schild, Heilung, Trigger, Bossregeln und Win/Loss/Draw.
- Kampagnenfortschritt und Save-Migration.
- Eventstream ist renderer-unabhängig und vollständig.

### Integration

- Shop → Kauf → sichtbare Platzierung → Merge/Synergie → Battle → Result →
  nächster Shop.
- Playback darf den Core-State nicht verändern.
- Browser-Storage und Sprache werden über Adapter getestet.

### Visuell

Ein automatisierter Browserlauf soll mindestens erzeugen:

```text
shop-desktop.png
shop-mobile.png
battle-desktop.png
battle-mobile.png
merge-effect.png
fire-activation.png
```

Screenshots werden nicht nur erzeugt, sondern auf Kamera, Silhouette, Kontrast,
Überlagerung und Kohärenz geprüft.

## Phasengates

1. **Core Extraction:** keine React-/Three-/DOM-Imports in `src/core`, alle
   migrierten Regeltests grün.
2. **Greybox:** Boden, Licht, feste Kamera, zwei Kessel und fünf Slots sind auf
   Desktop und Mobile lesbar.
3. **Visual Slice:** Werkbank und Arena wirken wie derselbe produzierte Ort.
4. **Gameplay Binding:** kompletter Loop läuft allein über Core-Transitions und
   Events.
5. **Juice:** mindestens Fire plus Poison oder Guard besitzen klar getrennte
   VFX/Audio-Reaktionen.
6. **QA:** Build, Core, Integration, responsive Screenshots und Asset-Lizenzen
   sind vollständig.
