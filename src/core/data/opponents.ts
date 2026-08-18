import type {
  Board,
  ItemInstance,
  ItemLevel,
  OpponentDefinition,
} from "../types";

function enemyItem(
  opponent: string,
  slot: number,
  itemId: string,
  level: ItemLevel = 1,
): ItemInstance {
  return { uid: `${opponent}-${slot}-${itemId}`, itemId, level };
}

function board(...items: Board): Board {
  if (items.length !== 5) {
    throw new Error("Opponent boards must contain exactly five slots.");
  }
  return items;
}

export const GRAND_TOURNAMENT_OPPONENTS = [
  {
    id: "zischbert",
    rank: "regular",
    baseHp: 20,
    board: board(
      enemyItem("zischbert", 0, "chili"),
      enemyItem("zischbert", 1, "cinder-berry"),
      null,
      null,
      null,
    ),
    boardVariants: [
      board(
        enemyItem("zischbert-a", 0, "chili"),
        enemyItem("zischbert-a", 1, "ember-core"),
        null,
        null,
        null,
      ),
      board(
        enemyItem("zischbert-b", 0, "dragon-tooth"),
        enemyItem("zischbert-b", 1, "nightwing"),
        null,
        null,
        null,
      ),
    ],
  },
  {
    id: "moor-martha",
    rank: "regular",
    baseHp: 86,
    board: board(
      enemyItem("martha", 0, "slime-shroom"),
      enemyItem("martha", 1, "nightwing", 2),
      null,
      null,
      null,
    ),
    boardVariants: [
      board(
        enemyItem("martha-a", 0, "slime-shroom"),
        enemyItem("martha-a", 1, "witch-eye", 2),
        null,
        null,
        null,
      ),
      board(
        enemyItem("martha-b", 0, "venom-bulb", 2),
        enemyItem("martha-b", 1, "nightwing"),
        null,
        null,
        null,
      ),
    ],
  },
  {
    id: "schild-siggi",
    rank: "regular",
    baseHp: 86,
    board: board(
      enemyItem("siggi", 0, "egg-shell"),
      enemyItem("siggi", 1, "gold-spoon"),
      enemyItem("siggi", 2, "moon-salt"),
      enemyItem("siggi", 3, "chili"),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("siggi-a", 0, "egg-shell"),
        enemyItem("siggi-a", 1, "chili"),
        enemyItem("siggi-a", 2, "moon-salt"),
        null,
        null,
      ),
      board(
        enemyItem("siggi-b", 0, "gold-spoon"),
        enemyItem("siggi-b", 1, "moon-salt"),
        enemyItem("siggi-b", 2, "chili"),
        null,
        null,
      ),
    ],
  },
  {
    id: "knister-klara",
    rank: "regular",
    baseHp: 106,
    board: board(
      enemyItem("klara", 0, "slime-shroom"),
      enemyItem("klara", 1, "nightwing"),
      enemyItem("klara", 2, "cinder-berry", 2),
      enemyItem("klara", 3, "chili", 2),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("klara-a", 0, "venom-bulb"),
        enemyItem("klara-a", 1, "cinder-berry", 2),
        enemyItem("klara-a", 2, "chili", 2),
        enemyItem("klara-a", 3, "nightwing"),
        null,
      ),
      board(
        enemyItem("klara-b", 0, "slime-shroom"),
        enemyItem("klara-b", 1, "witch-eye"),
        enemyItem("klara-b", 2, "ember-core", 2),
        enemyItem("klara-b", 3, "cinder-berry", 2),
        null,
      ),
    ],
  },
  {
    id: "tox-toni",
    rank: "regular",
    baseHp: 112,
    board: board(
      enemyItem("toni", 0, "slime-shroom", 2),
      enemyItem("toni", 1, "nightwing"),
      enemyItem("toni", 2, "witch-eye", 2),
      enemyItem("toni", 3, "venom-bulb", 2),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("toni-a", 0, "venom-bulb", 2),
        enemyItem("toni-a", 1, "nightwing", 2),
        enemyItem("toni-a", 2, "slime-shroom"),
        enemyItem("toni-a", 3, "witch-eye", 2),
        null,
      ),
      board(
        enemyItem("toni-b", 0, "nightwing"),
        enemyItem("toni-b", 1, "slime-shroom", 2),
        enemyItem("toni-b", 2, "cinder-berry", 2),
        enemyItem("toni-b", 3, "venom-bulb", 2),
        null,
      ),
    ],
  },
  {
    id: "broesel-berta",
    rank: "regular",
    baseHp: 112,
    board: board(
      enemyItem("berta", 0, "egg-shell", 2),
      enemyItem("berta", 1, "dragon-tooth", 2),
      enemyItem("berta", 2, "chili", 2),
      enemyItem("berta", 3, "moon-salt"),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("berta-a", 0, "moon-salt"),
        enemyItem("berta-a", 1, "gold-spoon"),
        enemyItem("berta-a", 2, "dragon-tooth", 2),
        enemyItem("berta-a", 3, "egg-shell"),
        null,
      ),
      board(
        enemyItem("berta-b", 0, "moon-salt", 2),
        enemyItem("berta-b", 1, "egg-shell"),
        enemyItem("berta-b", 2, "chili", 2),
        enemyItem("berta-b", 3, "ember-core", 2),
        null,
      ),
    ],
  },
  {
    id: "meisterin-mirea",
    rank: "elite",
    rewardBonus: 2,
    baseHp: 126,
    board: board(
      enemyItem("mirea", 0, "dragon-tooth"),
      enemyItem("mirea", 1, "chili", 2),
      enemyItem("mirea", 2, "ember-core", 2),
      enemyItem("mirea", 3, "cinder-berry"),
      enemyItem("mirea", 4, "nightwing"),
    ),
    boardVariants: [
      board(
        enemyItem("mirea-a", 0, "ember-core", 2),
        enemyItem("mirea-a", 1, "dragon-tooth", 2),
        enemyItem("mirea-a", 2, "chili"),
        enemyItem("mirea-a", 3, "nightwing"),
        enemyItem("mirea-a", 4, "cinder-berry"),
      ),
      board(
        enemyItem("mirea-b", 0, "nightwing"),
        enemyItem("mirea-b", 1, "chili", 2),
        enemyItem("mirea-b", 2, "ember-core", 2),
        enemyItem("mirea-b", 3, "dragon-tooth"),
        enemyItem("mirea-b", 4, "witch-eye"),
      ),
    ],
  },
  {
    id: "grosskessel",
    rank: "boss",
    bossRule: "rageAtHalf",
    baseHp: 142,
    board: board(
      enemyItem("boss", 0, "dragon-tooth", 2),
      enemyItem("boss", 1, "chili"),
      enemyItem("boss", 2, "slime-shroom", 2),
      enemyItem("boss", 3, "gold-spoon", 2),
      enemyItem("boss", 4, "egg-shell"),
    ),
    boardVariants: [
      board(
        enemyItem("boss-a", 0, "ember-core", 2),
        enemyItem("boss-a", 1, "dragon-tooth", 2),
        enemyItem("boss-a", 2, "venom-bulb", 2),
        enemyItem("boss-a", 3, "healing-tuber", 2),
        enemyItem("boss-a", 4, "moon-salt"),
      ),
      board(
        enemyItem("boss-b", 0, "nightwing", 2),
        enemyItem("boss-b", 1, "slime-shroom", 2),
        enemyItem("boss-b", 2, "cinder-berry", 2),
        enemyItem("boss-b", 3, "gold-spoon", 2),
        enemyItem("boss-b", 4, "egg-shell"),
      ),
    ],
  },
] as const satisfies readonly OpponentDefinition[];
export const FROSTBOUND_VAULT_OPPONENTS = [
  {
    id: "reif-rudi",
    rank: "regular",
    baseHp: 28,
    board: board(
      enemyItem("rudi", 0, "frost-shard"),
      enemyItem("rudi", 1, "ice-bell"),
      null,
      null,
      null,
    ),
    boardVariants: [
      board(
        enemyItem("rudi-a", 0, "rime-clock"),
        enemyItem("rudi-a", 1, "frost-shard"),
        null,
        null,
        null,
      ),
    ],
  },
  {
    id: "hall-hanne",
    rank: "regular",
    baseHp: 86,
    board: board(
      enemyItem("hanne", 0, "mirror-shard"),
      enemyItem("hanne", 1, "echo-bell", 2),
      null,
      null,
      null,
    ),
    boardVariants: [
      board(
        enemyItem("hanne-a", 0, "rune-cup"),
        enemyItem("hanne-a", 1, "mirror-shard", 2),
        null,
        null,
        null,
      ),
    ],
  },
  {
    id: "eis-elsa",
    rank: "regular",
    baseHp: 94,
    board: board(
      enemyItem("elsa", 0, "winter-bloom"),
      enemyItem("elsa", 1, "ice-bell"),
      enemyItem("elsa", 2, "frost-shard"),
      null,
      null,
    ),
    boardVariants: [
      board(
        enemyItem("elsa-a", 0, "egg-shell"),
        enemyItem("elsa-a", 1, "rime-clock"),
        enemyItem("elsa-a", 2, "ice-bell"),
        null,
        null,
      ),
    ],
  },
  {
    id: "takt-tilda",
    rank: "regular",
    baseHp: 104,
    board: board(
      enemyItem("tilda", 0, "frost-shard"),
      enemyItem("tilda", 1, "rime-clock", 2),
      enemyItem("tilda", 2, "mirror-shard", 2),
      enemyItem("tilda", 3, "time-thread"),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("tilda-a", 0, "rune-cup"),
        enemyItem("tilda-a", 1, "time-thread", 2),
        enemyItem("tilda-a", 2, "ice-bell", 2),
        enemyItem("tilda-a", 3, "rime-clock"),
        null,
      ),
    ],
  },
  {
    id: "splitter-sven",
    rank: "regular",
    baseHp: 112,
    board: board(
      enemyItem("sven", 0, "frost-shard", 2),
      enemyItem("sven", 1, "rime-clock"),
      enemyItem("sven", 2, "ice-bell", 2),
      enemyItem("sven", 3, "winter-bloom"),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("sven-a", 0, "rime-clock", 2),
        enemyItem("sven-a", 1, "frost-shard", 2),
        enemyItem("sven-a", 2, "winter-bloom"),
        enemyItem("sven-a", 3, "ice-bell"),
        null,
      ),
    ],
  },
  {
    id: "resonanz-rosa",
    rank: "regular",
    baseHp: 118,
    board: board(
      enemyItem("rosa", 0, "mirror-shard", 2),
      enemyItem("rosa", 1, "echo-bell"),
      enemyItem("rosa", 2, "rune-cup", 2),
      enemyItem("rosa", 3, "time-thread"),
      null,
    ),
    boardVariants: [
      board(
        enemyItem("rosa-a", 0, "echo-bell", 2),
        enemyItem("rosa-a", 1, "time-thread"),
        enemyItem("rosa-a", 2, "mirror-shard", 2),
        enemyItem("rosa-a", 3, "rune-cup"),
        null,
      ),
    ],
  },
  {
    id: "archivarin-aeva",
    rank: "elite",
    rewardBonus: 2,
    baseHp: 130,
    board: board(
      enemyItem("aeva", 0, "frost-shard", 2),
      enemyItem("aeva", 1, "rime-clock", 2),
      enemyItem("aeva", 2, "mirror-shard", 2),
      enemyItem("aeva", 3, "echo-bell", 2),
      enemyItem("aeva", 4, "time-thread"),
    ),
    boardVariants: [
      board(
        enemyItem("aeva-a", 0, "winter-bloom", 2),
        enemyItem("aeva-a", 1, "ice-bell", 2),
        enemyItem("aeva-a", 2, "time-thread", 2),
        enemyItem("aeva-a", 3, "mirror-shard", 2),
        enemyItem("aeva-a", 4, "echo-bell"),
      ),
    ],
  },
  {
    id: "chronokessel",
    rank: "boss",
    bossRule: "timeFractureAtHalf",
    baseHp: 148,
    board: board(
      enemyItem("chrono", 0, "frost-shard", 2),
      enemyItem("chrono", 1, "rime-clock", 2),
      enemyItem("chrono", 2, "mirror-shard", 2),
      enemyItem("chrono", 3, "rune-cup", 2),
      enemyItem("chrono", 4, "time-thread", 2),
    ),
    boardVariants: [
      board(
        enemyItem("chrono-a", 0, "ice-bell", 2),
        enemyItem("chrono-a", 1, "winter-bloom", 2),
        enemyItem("chrono-a", 2, "echo-bell", 2),
        enemyItem("chrono-a", 3, "mirror-shard", 2),
        enemyItem("chrono-a", 4, "time-thread", 2),
      ),
    ],
  },
] as const satisfies readonly OpponentDefinition[];
