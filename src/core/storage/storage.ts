import { getCampaign, ITEM_BY_ID } from "../data";
import {
  FAMILIES,
  type CampaignId,
  type CampaignProgress,
  type CombatEvent,
  type CombatEventCode,
  type CombatEventKind,
  type CombatResult,
  type Family,
  type GamePhase,
  type GameState,
  type ItemCombatStats,
  type ItemInstance,
  type ItemLevel,
  type PlayerProgress,
  type ShopOffer,
} from "../types";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const RUN_STORAGE_KEY = "kessel-krawall-3d-run-v1";
export const PROFILE_STORAGE_KEY = "kessel-krawall-3d-profile-v1";

const VALID_PHASES = new Set<GamePhase>([
  "intro",
  "shop",
  "battle",
  "result",
  "victory",
  "gameover",
]);
const VALID_EVENT_KINDS = new Set<CombatEventKind>([
  "damage",
  "poison",
  "poisonBurst",
  "burn",
  "heal",
  "shield",
  "cleanse",
  "synergy",
  "frost",
  "echo",
  "boss",
]);
const VALID_EVENT_CODES = new Set<CombatEventCode>([
  "item.damage",
  "item.poison",
  "item.shield",
  "item.heal",
  "status.poisonTick",
  "status.poisonBurst",
  "status.burnApplied",
  "status.burnTick",
  "status.poisonCleansed",
  "synergy.guardStart",
  "synergy.frostDelay",
  "synergy.echoRepeat",
  "boss.rage",
  "boss.timeFracture",
]);

export function createEmptyProgress(): PlayerProgress {
  return { version: 1, campaigns: {} };
}

export function loadStoredGame(storage: KeyValueStorage): GameState | null {
  try {
    const saved = storage.getItem(RUN_STORAGE_KEY);
    if (!saved) return null;
    return sanitizeStoredState(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function persistGame(
  storage: KeyValueStorage,
  game: GameState,
): boolean {
  try {
    storage.setItem(RUN_STORAGE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}

export function loadPlayerProgress(storage: KeyValueStorage): PlayerProgress {
  try {
    const saved = storage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) return createEmptyProgress();
    return sanitizePlayerProgress(JSON.parse(saved)) ?? createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

export function persistPlayerProgress(
  storage: KeyValueStorage,
  progress: PlayerProgress,
): boolean {
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function recordCampaignVictory(
  progress: PlayerProgress,
  campaignId: CampaignId,
  seals: number,
  power: number,
): PlayerProgress {
  const previous = progress.campaigns[campaignId];
  return {
    version: 1,
    campaigns: {
      ...progress.campaigns,
      [campaignId]: {
        wins: (previous?.wins ?? 0) + 1,
        bestSeals: Math.max(previous?.bestSeals ?? 0, seals),
        bestPower: Math.max(previous?.bestPower ?? 0, power),
      },
    },
  };
}

export function hasCompletedCampaign(
  progress: PlayerProgress,
  campaignId: CampaignId,
): boolean {
  return (progress.campaigns[campaignId]?.wins ?? 0) > 0;
}

export function sanitizeStoredState(value: unknown): GameState | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const campaignId = sanitizeCampaignId(value.campaignId);
  if (!campaignId) return null;
  const activeFamilies = sanitizeActiveFamilies(value.activeFamilies, campaignId);
  const board = sanitizeBoard(value.board);
  const reserve = value.reserve === null ? null : sanitizeItemInstance(value.reserve);
  const offers = sanitizeOffers(value.offers);
  const phase = sanitizePhase(value.phase);
  if (
    !activeFamilies ||
    !board ||
    (value.reserve !== null && !reserve) ||
    !offers ||
    !phase
  ) {
    return null;
  }

  const maxRounds = getCampaign(campaignId).opponents.length;
  const round = safeInteger(value.round, 1, maxRounds);
  const gold = safeInteger(value.gold, 0, 999);
  const seals = safeInteger(value.seals, 0, 3);
  const victories = safeInteger(value.victories, 0, maxRounds);
  const rerollsUsed = safeInteger(value.rerollsUsed, 0, 99);
  const rngState = safeInteger(value.rngState, 0, 0xffff_ffff);
  const idCounter = safeInteger(value.idCounter, 1, Number.MAX_SAFE_INTEGER);
  const selectedSlot =
    value.selectedSlot === null
      ? null
      : safeInteger(value.selectedSlot, 0, board.length - 1);
  const opponentVariant = safeInteger(value.opponentVariant, 0, 2);
  const openingProtectionUsed =
    typeof value.openingProtectionUsed === "boolean"
      ? value.openingProtectionUsed
      : null;
  if (
    round === null ||
    gold === null ||
    seals === null ||
    victories === null ||
    rerollsUsed === null ||
    rngState === null ||
    idCounter === null ||
    (value.selectedSlot !== null && selectedSlot === null) ||
    opponentVariant === null ||
    openingProtectionUsed === null
  ) {
    return null;
  }

  const opponent = getCampaign(campaignId).opponents[round - 1];
  const variantCount = 1 + (opponent?.boardVariants?.length ?? 0);
  if (opponentVariant >= variantCount) return null;

  const pendingBattle =
    value.pendingBattle === null
      ? null
      : sanitizeCombatResult(value.pendingBattle);
  if (
    (value.pendingBattle !== null && !pendingBattle) ||
    ((phase === "battle" || phase === "result") && !pendingBattle)
  ) {
    return null;
  }

  const uids = [
    ...board.flatMap((item) => (item ? [item.uid] : [])),
    ...(reserve ? [reserve.uid] : []),
    ...offers.map((offer) => offer.uid),
  ];
  if (new Set(uids).size !== uids.length) return null;

  return {
    version: 1,
    campaignId,
    activeFamilies,
    phase,
    round,
    gold,
    seals,
    victories,
    board,
    reserve,
    offers,
    rerollsUsed,
    selectedSlot,
    rngState,
    idCounter,
    opponentVariant,
    openingProtectionUsed,
    pendingBattle,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
    ? (value as number)
    : null;
}

function safeText(value: unknown, maximum = 160): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum
    ? value
    : null;
}

function sanitizeCampaignId(value: unknown): CampaignId | null {
  return value === "grand-tournament" || value === "frostbound-vault"
    ? value
    : null;
}

function sanitizePhase(value: unknown): GamePhase | null {
  return VALID_PHASES.has(value as GamePhase) ? (value as GamePhase) : null;
}

function sanitizeFamily(value: unknown): Family | null {
  return FAMILIES.includes(value as Family) ? (value as Family) : null;
}

function sanitizeActiveFamilies(
  value: unknown,
  campaignId: CampaignId,
): Family[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const families = value.map(sanitizeFamily);
  if (families.some((family) => !family)) return null;
  const typedFamilies = families as Family[];
  if (new Set(typedFamilies).size !== typedFamilies.length) return null;
  const campaign = getCampaign(campaignId);
  if (
    campaign.fixedFamilies.some((family) => !typedFamilies.includes(family)) ||
    (!campaign.selectableLegacyFamily &&
      typedFamilies.some((family) => !campaign.defaultFamilies.includes(family)))
  ) {
    return null;
  }
  return typedFamilies;
}

function sanitizeBoard(value: unknown): Array<ItemInstance | null> | null {
  if (!Array.isArray(value) || value.length !== 5) return null;
  const board: Array<ItemInstance | null> = [];
  for (const entry of value) {
    if (entry === null) board.push(null);
    else {
      const item = sanitizeItemInstance(entry);
      if (!item) return null;
      board.push(item);
    }
  }
  return board;
}

function sanitizeItemInstance(value: unknown): ItemInstance | null {
  if (!isRecord(value)) return null;
  const uid = safeText(value.uid, 80);
  const itemId = safeText(value.itemId, 80);
  const level = safeInteger(value.level, 1, 3);
  if (!uid || !itemId || !ITEM_BY_ID[itemId] || level === null) return null;
  return { uid, itemId, level: level as ItemLevel };
}

function sanitizeOffers(value: unknown): ShopOffer[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const offers: ShopOffer[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const uid = safeText(entry.uid, 80);
    const itemId = safeText(entry.itemId, 80);
    if (
      !uid ||
      !itemId ||
      !ITEM_BY_ID[itemId] ||
      typeof entry.bought !== "boolean"
    ) {
      return null;
    }
    offers.push({ uid, itemId, bought: entry.bought });
  }
  return offers;
}

function sanitizeCombatResult(value: unknown): CombatResult | null {
  if (!isRecord(value)) return null;
  const winner =
    value.winner === "player" ||
    value.winner === "enemy" ||
    value.winner === "draw"
      ? value.winner
      : null;
  const reason =
    value.reason === "knockout" || value.reason === "timeout"
      ? value.reason
      : null;
  const duration = safeInteger(value.duration, 0, 120_000);
  const playerMaxHp = safeInteger(value.playerMaxHp, 1, 10_000);
  const enemyMaxHp = safeInteger(value.enemyMaxHp, 1, 10_000);
  const finalPlayerHp = safeInteger(value.finalPlayerHp, 0, 10_000);
  const finalPlayerShield = safeInteger(value.finalPlayerShield, 0, 10_000);
  const finalEnemyHp = safeInteger(value.finalEnemyHp, 0, 10_000);
  const finalEnemyShield = safeInteger(value.finalEnemyShield, 0, 10_000);
  if (
    !winner ||
    !reason ||
    duration === null ||
    playerMaxHp === null ||
    enemyMaxHp === null ||
    finalPlayerHp === null ||
    finalPlayerShield === null ||
    finalEnemyHp === null ||
    finalEnemyShield === null ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.playerStats) ||
    !Array.isArray(value.enemyStats)
  ) {
    return null;
  }

  const events = value.events.map(sanitizeCombatEvent);
  const playerStats = value.playerStats.map(sanitizeCombatStats);
  const enemyStats = value.enemyStats.map(sanitizeCombatStats);
  if (
    events.some((event) => !event) ||
    playerStats.some((stats) => !stats) ||
    enemyStats.some((stats) => !stats)
  ) {
    return null;
  }
  return {
    winner,
    reason,
    duration,
    events: events as CombatEvent[],
    playerStats: playerStats as ItemCombatStats[],
    enemyStats: enemyStats as ItemCombatStats[],
    finalPlayerHp,
    finalPlayerShield,
    finalEnemyHp,
    finalEnemyShield,
    playerMaxHp,
    enemyMaxHp,
  };
}

function sanitizeCombatEvent(value: unknown): CombatEvent | null {
  if (!isRecord(value)) return null;
  const time = safeInteger(value.time, 0, 120_000);
  const amount = safeInteger(value.amount, 1, 1_000_000);
  const playerHp = safeInteger(value.playerHp, 0, 10_000);
  const playerShield = safeInteger(value.playerShield, 0, 10_000);
  const enemyHp = safeInteger(value.enemyHp, 0, 10_000);
  const enemyShield = safeInteger(value.enemyShield, 0, 10_000);
  const sourceUid = safeText(value.sourceUid, 100);
  const sourceItemId =
    value.sourceItemId === undefined
      ? undefined
      : safeText(value.sourceItemId, 80);
  const family =
    value.family === undefined ? undefined : sanitizeFamily(value.family);
  const bossRule =
    value.bossRule === undefined
      ? undefined
      : value.bossRule === "rageAtHalf" ||
          value.bossRule === "timeFractureAtHalf"
        ? value.bossRule
        : null;
  if (
    time === null ||
    amount === null ||
    playerHp === null ||
    playerShield === null ||
    enemyHp === null ||
    enemyShield === null ||
    !sourceUid ||
    !VALID_EVENT_KINDS.has(value.kind as CombatEventKind) ||
    !VALID_EVENT_CODES.has(value.code as CombatEventCode) ||
    (value.actor !== "player" && value.actor !== "enemy") ||
    (value.target !== "player" && value.target !== "enemy") ||
    (value.sourceItemId !== undefined &&
      (!sourceItemId || !ITEM_BY_ID[sourceItemId])) ||
    (value.family !== undefined && !family) ||
    (value.bossRule !== undefined && !bossRule)
  ) {
    return null;
  }
  return {
    time,
    kind: value.kind as CombatEventKind,
    code: value.code as CombatEventCode,
    actor: value.actor,
    target: value.target,
    sourceUid,
    ...(sourceItemId ? { sourceItemId } : {}),
    ...(family ? { family } : {}),
    ...(bossRule ? { bossRule } : {}),
    amount,
    playerHp,
    playerShield,
    enemyHp,
    enemyShield,
  };
}

function sanitizeCombatStats(value: unknown): ItemCombatStats | null {
  if (!isRecord(value)) return null;
  const uid = safeText(value.uid, 100);
  const itemId = safeText(value.itemId, 80);
  const level = safeInteger(value.level, 1, 3);
  const numericKeys = [
    "triggers",
    "hpDamage",
    "shieldDamage",
    "totalDamage",
    "healing",
    "shield",
    "poisonApplied",
  ] as const;
  if (
    !uid ||
    !itemId ||
    !ITEM_BY_ID[itemId] ||
    level === null ||
    numericKeys.some((key) => safeInteger(value[key], 0, 1_000_000) === null)
  ) {
    return null;
  }
  return {
    uid,
    itemId,
    level: level as ItemLevel,
    triggers: value.triggers as number,
    hpDamage: value.hpDamage as number,
    shieldDamage: value.shieldDamage as number,
    totalDamage: value.totalDamage as number,
    healing: value.healing as number,
    shield: value.shield as number,
    poisonApplied: value.poisonApplied as number,
  };
}

function sanitizePlayerProgress(value: unknown): PlayerProgress | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.campaigns)) {
    return null;
  }
  const campaigns: PlayerProgress["campaigns"] = {};
  for (const campaignId of [
    "grand-tournament",
    "frostbound-vault",
  ] as const) {
    const entry = value.campaigns[campaignId];
    if (entry === undefined) continue;
    const sanitized = sanitizeCampaignProgress(entry);
    if (!sanitized) return null;
    campaigns[campaignId] = sanitized;
  }
  return { version: 1, campaigns };
}

function sanitizeCampaignProgress(value: unknown): CampaignProgress | null {
  if (!isRecord(value)) return null;
  const wins = safeInteger(value.wins, 0, 9_999);
  const bestSeals = safeInteger(value.bestSeals, 0, 3);
  const bestPower = safeInteger(value.bestPower, 0, 100_000);
  return wins === null || bestSeals === null || bestPower === null
    ? null
    : { wins, bestSeals, bestPower };
}
