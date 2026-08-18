import type { Family, GameErrorCode } from "../../core/types";

export interface ItemCopy {
  readonly name: string;
  readonly short: string;
}

export const ITEM_COPY: Readonly<Record<string, ItemCopy>> = {
  chili: { name: "Glut-Chili", short: "Direkter Feuerschaden" },
  "dragon-tooth": { name: "Drachenzahn", short: "Wird mit jedem Einsatz stärker" },
  "ember-core": { name: "Glutkern", short: "Beschleunigt benachbartes Feuer" },
  "cinder-berry": { name: "Aschenbeere", short: "Mehr Schaden gegen Vergiftete" },
  "slime-shroom": { name: "Schleimpilz", short: "Stapelt Gift" },
  nightwing: { name: "Nachtflügel", short: "Beschleunigt seine Nachbarn" },
  "witch-eye": { name: "Hexenauge", short: "Nutzt vorhandenes Gift" },
  "venom-bulb": { name: "Giftknolle", short: "Schaden und Gift zugleich" },
  "egg-shell": { name: "Runenschale", short: "Erzeugt einen Schutzschild" },
  "healing-tuber": { name: "Heilknolle", short: "Heilt im kritischen Moment" },
  "gold-spoon": { name: "Goldlöffel", short: "Heilung, Schild und Nachbarschaftskraft" },
  "moon-salt": { name: "Mondsalz", short: "Kontert nach geschützten Treffern" },
  "frost-shard": { name: "Frostsplitter", short: "Schneller Kälteschaden" },
  "ice-bell": { name: "Eisglocke", short: "Schild und Kälteschaden" },
  "winter-bloom": { name: "Winterblüte", short: "Heilung und Schild" },
  "rime-clock": { name: "Reifuhr", short: "Beschleunigt seine Nachbarn" },
  "mirror-shard": { name: "Spiegelscherbe", short: "Direkter Echoschaden" },
  "echo-bell": { name: "Echoglocke", short: "Beschleunigt Echo-Zutaten" },
  "rune-cup": { name: "Runenbecher", short: "Heilung und Schild" },
  "time-thread": { name: "Zeitfaden", short: "Stärkt benachbarte Echos" },
};

export const FAMILY_COPY: Readonly<
  Record<Family, { readonly name: string; readonly color: string; readonly symbol: string }>
> = {
  fire: { name: "Feuer", color: "#ff7848", symbol: "✦" },
  poison: { name: "Gift", color: "#9ed85b", symbol: "●" },
  guard: { name: "Schutz", color: "#67c9df", symbol: "◆" },
  frost: { name: "Frost", color: "#89d9f1", symbol: "✧" },
  echo: { name: "Echo", color: "#bc91ed", symbol: "◉" },
};

export const OPPONENT_NAMES: Readonly<Record<string, string>> = {
  zischbert: "Zischbert",
  "moor-martha": "Moor-Martha",
  "schild-siggi": "Schild-Siggi",
  "knister-klara": "Knister-Klara",
  "tox-toni": "Tox-Toni",
  "broesel-berta": "Brösel-Berta",
  "meisterin-mirea": "Meisterin Mirea",
  grosskessel: "Der Großkessel",
  "reif-rudi": "Reif-Rudi",
  "hall-hanne": "Hall-Hanne",
  "eis-elsa": "Eis-Elsa",
  "takt-tilda": "Takt-Tilda",
  "splitter-sven": "Splitter-Sven",
  "resonanz-rosa": "Resonanz-Rosa",
  "archivarin-aeva": "Archivarin Aeva",
  chronokessel: "Der Chronokessel",
};

export const ERROR_MESSAGES: Readonly<Record<GameErrorCode, string>> = {
  shopClosed: "Der Laden ist gerade geschlossen.",
  offerUnavailable: "Dieses Angebot ist nicht mehr verfügbar.",
  notEnoughGold: "Dafür fehlt dir Gold.",
  inventoryFull: "Alle Zutatenplätze sind belegt.",
  slotEmpty: "Auf diesem Platz liegt keine Zutat.",
  reserveLocked: "Die Reserve wird ab Runde 5 freigeschaltet.",
  reserveEmpty: "Die Reserve ist leer.",
  battleInventoryLocked: "Im Kampf bleibt die Werkbank gesperrt.",
  notEnoughGoldForReroll: "Für neue Angebote fehlt dir Gold.",
  boardEmpty: "Kaufe zuerst mindestens eine Zutat.",
};

export function itemCopy(itemId: string): ItemCopy {
  return ITEM_COPY[itemId] ?? { name: itemId, short: "Magische Zutat" };
}

export function opponentName(opponentId: string): string {
  return OPPONENT_NAMES[opponentId] ?? opponentId;
}
