export type ArenaMotif =
  | "ember-cellar"
  | "moor-sanctum"
  | "runic-bastion"
  | "storm-forge"
  | "toxic-laboratory"
  | "stone-hearth"
  | "arcane-grandstand"
  | "champion-forge"
  | "frost-archive";

export type OpponentRegalia =
  | "sparks"
  | "roots"
  | "bastion"
  | "lightning"
  | "toxin"
  | "stone"
  | "archmage"
  | "champion"
  | "archive";

export type SignatureVfx =
  | "cinder"
  | "spore"
  | "ward"
  | "storm"
  | "venom"
  | "rubble"
  | "arcane"
  | "rage"
  | "frost";

export interface OpponentPresentation {
  readonly id: string;
  readonly title: string;
  readonly intro: string;
  readonly regalia: OpponentRegalia;
  readonly signature: SignatureVfx;
  readonly arena: ArenaMotif;
  readonly body: string;
  readonly bodySecondary: string;
  readonly metal: string;
  readonly eye: string;
  readonly liquid: string;
  readonly steam: string;
  readonly floor: string;
  readonly trim: string;
  readonly glow: string;
  readonly secondaryGlow: string;
  readonly background: string;
  readonly banner: string;
  readonly scale: number;
}

const GRAND_TOURNAMENT_PRESENTATION: Readonly<Record<string, OpponentPresentation>> = {
  zischbert: {
    id: "zischbert",
    title: "Der zündelnde Auftakt",
    intro: "Ein nervöser Feuerkessel, der jeden Takt in Funken verwandelt.",
    regalia: "sparks",
    signature: "cinder",
    arena: "ember-cellar",
    body: "#3c2927",
    bodySecondary: "#6f3429",
    metal: "#b86b38",
    eye: "#ffcb55",
    liquid: "#ff6c32",
    steam: "#f2c092",
    floor: "#3a2d2b",
    trim: "#8e4d35",
    glow: "#ff7135",
    secondaryGlow: "#ffc35f",
    background: "#1a0d0a",
    banner: "#9b3d2f",
    scale: 0.86,
  },
  "moor-martha": {
    id: "moor-martha",
    title: "Hexe aus dem Tiefmoor",
    intro: "Gift, Sporen und uralte Wurzelmagie kriechen durch ihre Arena.",
    regalia: "roots",
    signature: "spore",
    arena: "moor-sanctum",
    body: "#34332b",
    bodySecondary: "#514b36",
    metal: "#80674a",
    eye: "#c9d849",
    liquid: "#91b640",
    steam: "#b9d482",
    floor: "#30352c",
    trim: "#596044",
    glow: "#9acb4b",
    secondaryGlow: "#d38747",
    background: "#111712",
    banner: "#718e68",
    scale: 0.86,
  },
  "schild-siggi": {
    id: "schild-siggi",
    title: "Wächter der Runenbastion",
    intro: "Ein gepanzerter Taktiker, dessen Schutzwall selbst Treffer beantwortet.",
    regalia: "bastion",
    signature: "ward",
    arena: "runic-bastion",
    body: "#29333a",
    bodySecondary: "#405463",
    metal: "#a6b7bd",
    eye: "#bff5ff",
    liquid: "#55c7df",
    steam: "#d7f4f6",
    floor: "#29343d",
    trim: "#647c89",
    glow: "#69d2e2",
    secondaryGlow: "#e6c87a",
    background: "#0e151a",
    banner: "#496b80",
    scale: 0.92,
  },
  "knister-klara": {
    id: "knister-klara",
    title: "Funkenalchemistin",
    intro: "Ihre überladene Apparatur springt zwischen Glut und giftigem Blitz.",
    regalia: "lightning",
    signature: "storm",
    arena: "storm-forge",
    body: "#3a293d",
    bodySecondary: "#69445f",
    metal: "#b67a54",
    eye: "#fff0a2",
    liquid: "#d45aca",
    steam: "#e8c8ef",
    floor: "#382d3d",
    trim: "#745275",
    glow: "#df72e5",
    secondaryGlow: "#ff9a47",
    background: "#160d18",
    banner: "#80466f",
    scale: 0.91,
  },
  "tox-toni": {
    id: "tox-toni",
    title: "Meister der Gärgifte",
    intro: "Druckventile, Giftblasen und ein Sud, der niemals stillsteht.",
    regalia: "toxin",
    signature: "venom",
    arena: "toxic-laboratory",
    body: "#29342f",
    bodySecondary: "#3f5849",
    metal: "#77835d",
    eye: "#e6ff83",
    liquid: "#6ed63e",
    steam: "#b8e987",
    floor: "#28342d",
    trim: "#4f6b4a",
    glow: "#83d94a",
    secondaryGlow: "#d1b05b",
    background: "#0c160f",
    banner: "#4e744d",
    scale: 0.94,
  },
  "broesel-berta": {
    id: "broesel-berta",
    title: "Hüterin des Steinofens",
    intro: "Schwere Ofenplatten und uralte Küchenrunen machen sie unbeirrbar.",
    regalia: "stone",
    signature: "rubble",
    arena: "stone-hearth",
    body: "#3c332e",
    bodySecondary: "#655044",
    metal: "#a37a54",
    eye: "#ffd37d",
    liquid: "#d78643",
    steam: "#dfc6aa",
    floor: "#3b332f",
    trim: "#78604d",
    glow: "#e49a52",
    secondaryGlow: "#f1d087",
    background: "#17110d",
    banner: "#825d44",
    scale: 0.98,
  },
  "meisterin-mirea": {
    id: "meisterin-mirea",
    title: "Arkanmeisterin des Turniers",
    intro: "Präzise, königlich und von sieben schwebenden Siegeln begleitet.",
    regalia: "archmage",
    signature: "arcane",
    arena: "arcane-grandstand",
    body: "#302b42",
    bodySecondary: "#554674",
    metal: "#d0a45a",
    eye: "#f9e3a5",
    liquid: "#9c6ee1",
    steam: "#ddd0ef",
    floor: "#332e43",
    trim: "#75618f",
    glow: "#ad7ee8",
    secondaryGlow: "#f0c56d",
    background: "#100d19",
    banner: "#6d4d91",
    scale: 1,
  },
  grosskessel: {
    id: "grosskessel",
    title: "Champion des Kesselfeuers",
    intro: "Der Arenaboden bebt, sobald der amtierende Champion seine Wut entfesselt.",
    regalia: "champion",
    signature: "rage",
    arena: "champion-forge",
    body: "#2c2628",
    bodySecondary: "#5b3130",
    metal: "#b88b4f",
    eye: "#ffdb70",
    liquid: "#df432e",
    steam: "#e9b09c",
    floor: "#342526",
    trim: "#8d4336",
    glow: "#ee4e32",
    secondaryGlow: "#ffc35d",
    background: "#150907",
    banner: "#8d2f2c",
    scale: 1.12,
  },
};

const FALLBACK_PRESENTATION: OpponentPresentation = {
  id: "rival",
  title: "Kessel des Archivs",
  intro: "Ein unbekannter Meisterkessel tritt in den Ritualkreis.",
  regalia: "archive",
  signature: "frost",
  arena: "frost-archive",
  body: "#332c3d",
  bodySecondary: "#51445f",
  metal: "#8b73a5",
  eye: "#c28be7",
  liquid: "#8170cf",
  steam: "#ded3ec",
  floor: "#302a37",
  trim: "#55475f",
  glow: "#9b6bd0",
  secondaryGlow: "#80d9ed",
  background: "#100d17",
  banner: "#715b8e",
  scale: 0.9,
};

export function getOpponentPresentation(opponentId: string): OpponentPresentation {
  return GRAND_TOURNAMENT_PRESENTATION[opponentId] ?? { ...FALLBACK_PRESENTATION, id: opponentId };
}

export function isGrandTournamentPresentation(opponentId: string): boolean {
  return opponentId in GRAND_TOURNAMENT_PRESENTATION;
}
