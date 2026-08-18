import {
  getCampaign,
  getCampaignFamilies,
  getItemDefinition,
  getOpeningItemIds,
  ITEMS,
} from "../data";
import {
  FAMILIES,
  type ActionResult,
  type BattleOutcome,
  type Board,
  type CampaignId,
  type CombatResult,
  type DomainEvent,
  type Family,
  type GameState,
  type ItemInstance,
  type ItemLevel,
  type ItemLocation,
  type LegacyFamily,
  type MergeStep,
  type PurchaseMergePreview,
  type ShopOffer,
} from "../types";

export const BOARD_SIZE = 5;
export const SYNERGY_THRESHOLD = 3;
export const RESERVE_UNLOCK_ROUND = 5;
export const DEFEAT_RECOVERY_GOLD = 3;

interface MutableInventory {
  board: Array<ItemInstance | null>;
  reserve: ItemInstance | null;
}

interface InventoryMergeResult extends MutableInventory {
  merges: MergeStep[];
  location: ItemLocation | null;
}

function nextRandom(seed: number): [number, number] {
  const next = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
  return [next / 4_294_967_296, next];
}

function nextId(state: GameState, prefix: string): [string, GameState] {
  const id = `${prefix}-${state.idCounter}`;
  return [id, { ...state, idCounter: state.idCounter + 1 }];
}

function pick<T>(items: readonly T[], random: number): T {
  const selected = items[Math.min(items.length - 1, Math.floor(random * items.length))];
  if (selected === undefined) throw new Error("Cannot select from an empty list.");
  return selected;
}

function opponentVariantCount(campaignId: CampaignId, round: number): number {
  const opponents = getCampaign(campaignId).opponents;
  const opponent = opponents[Math.min(Math.max(0, round - 1), opponents.length - 1)];
  if (!opponent) throw new Error(`Campaign ${campaignId} has no opponents.`);
  return 1 + (opponent.boardVariants?.length ?? 0);
}

function rollOpponentVariant(state: GameState, round: number): GameState {
  const [random, rngState] = nextRandom(state.rngState);
  const count = opponentVariantCount(state.campaignId, round);
  return {
    ...state,
    rngState,
    opponentVariant: Math.min(count - 1, Math.floor(random * count)),
  };
}

function chooseWeightedItem(
  state: GameState,
  random: number,
  duplicateCounts: Readonly<Record<string, number>>,
): string {
  const inventoryItems = [...state.board, state.reserve].filter(
    (item): item is ItemInstance => item !== null,
  );
  const familyWeights = getFamilyWeights(state.board);
  const ownedIds = new Set(inventoryItems.map((item) => item.itemId));
  const weighted = ITEMS.filter((item) =>
    state.activeFamilies.includes(item.family),
  ).map((item) => {
    let weight = 1 + familyWeights[item.family] * 0.16;
    if (ownedIds.has(item.id)) weight += 0.42;
    if ((duplicateCounts[item.id] ?? 0) >= 2) weight = 0;
    return { id: item.id, weight };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.id;
  }
  const fallback = weighted.at(-1);
  if (!fallback) throw new Error("Active families produced an empty shop pool.");
  return fallback.id;
}

function rollOffers(
  input: GameState,
  opening: boolean,
): { state: GameState; offers: ShopOffer[] } {
  let state = input;
  const offers: ShopOffer[] = [];
  const duplicateCounts: Record<string, number> = {};
  const owned = state.board.filter(
    (item): item is ItemInstance => item !== null,
  );
  const openingItems = getOpeningItemIds(state.campaignId, state.activeFamilies);

  for (let index = 0; index < 3; index += 1) {
    const [random, rngState] = nextRandom(state.rngState);
    state = { ...state, rngState };
    const openingItem = openingItems[index];
    const itemId = opening
      ? openingItem
      : index === 0 && state.round <= 3 && owned.length > 0
        ? pick(owned, random).itemId
        : chooseWeightedItem(state, random, duplicateCounts);
    if (!itemId) throw new Error("A campaign must define three opening items.");

    duplicateCounts[itemId] = (duplicateCounts[itemId] ?? 0) + 1;
    let uid: string;
    [uid, state] = nextId(state, "offer");
    offers.push({ uid, itemId, bought: false });
  }
  return { state, offers };
}

export function createInitialState(
  seed = 0x4b4b2026,
  campaignId: CampaignId = "grand-tournament",
  activeFamilies = getCampaignFamilies(campaignId),
): GameState {
  const base: GameState = {
    version: 1,
    campaignId,
    activeFamilies: [...activeFamilies],
    phase: "intro",
    round: 1,
    gold: 7,
    seals: 3,
    victories: 0,
    board: Array.from({ length: BOARD_SIZE }, () => null),
    reserve: null,
    offers: [],
    rerollsUsed: 0,
    selectedSlot: null,
    rngState: seed >>> 0,
    idCounter: 1,
    opponentVariant: (seed >>> 0) % opponentVariantCount(campaignId, 1),
    openingProtectionUsed: false,
    pendingBattle: null,
  };
  const rolled = rollOffers(base, true);
  return { ...rolled.state, offers: rolled.offers };
}

export function getFamilyWeights(board: Board): Record<Family, number> {
  const weights: Record<Family, number> = {
    fire: 0,
    poison: 0,
    guard: 0,
    frost: 0,
    echo: 0,
  };
  for (const instance of board) {
    if (!instance) continue;
    const family = getItemDefinition(instance.itemId).family;
    weights[family] = (weights[family] ?? 0) + 2 ** (instance.level - 1);
  }
  return weights;
}

export function isSynergyActive(board: Board, family: Family): boolean {
  return getFamilyWeights(board)[family] >= SYNERGY_THRESHOLD;
}

export function getPowerBreakdown(board: Board): {
  itemValue: number;
  synergyCount: number;
  synergyBonus: number;
  total: number;
} {
  const weights = getFamilyWeights(board);
  const rawItemValue = board.reduce((sum, instance) => {
    if (!instance) return sum;
    const definition = getItemDefinition(instance.itemId);
    const levelIndex = (instance.level - 1) as 0 | 1 | 2;
    const raw =
      definition.values[levelIndex] +
      (definition.secondaryValues?.[levelIndex] ?? 0) * 0.65;
    const cooldown = definition.cooldown[levelIndex];
    if (cooldown === undefined) throw new Error("Item cooldown level is missing.");
    return sum + raw * (4 / cooldown) + definition.cost * instance.level;
  }, 0);
  const synergyCount = FAMILIES.filter(
    (family) => weights[family] >= SYNERGY_THRESHOLD,
  ).length;
  const total = Math.round(rawItemValue * 1.12 ** synergyCount);
  const itemValue = Math.round(rawItemValue);
  return {
    itemValue,
    synergyCount,
    synergyBonus: Math.max(0, total - itemValue),
    total,
  };
}

export function getPowerValue(board: Board): number {
  return getPowerBreakdown(board).total;
}

function itemAt(
  inventory: MutableInventory,
  location: ItemLocation,
): ItemInstance | null {
  return location.area === "board"
    ? inventory.board[location.slot] ?? null
    : inventory.reserve;
}

function setItemAt(
  inventory: MutableInventory,
  location: ItemLocation,
  item: ItemInstance | null,
): void {
  if (location.area === "board") inventory.board[location.slot] = item;
  else inventory.reserve = item;
}

function sameLocation(left: ItemLocation, right: ItemLocation): boolean {
  return (
    left.area === right.area &&
    (left.area === "reserve" ||
      (right.area === "board" && left.slot === right.slot))
  );
}

function matchingLocations(
  inventory: MutableInventory,
  itemId: string,
  level: ItemLevel,
): ItemLocation[] {
  const locations: ItemLocation[] = [];
  inventory.board.forEach((item, slot) => {
    if (item?.itemId === itemId && item.level === level) {
      locations.push({ area: "board", slot });
    }
  });
  if (
    inventory.reserve?.itemId === itemId &&
    inventory.reserve.level === level
  ) {
    locations.push({ area: "reserve" });
  }
  return locations;
}

function chooseMergeSurvivor(
  upgraded: ItemLocation,
  other: ItemLocation,
): [ItemLocation, ItemLocation] {
  return upgraded.area === "reserve" && other.area === "board"
    ? [other, upgraded]
    : [upgraded, other];
}

function mergePurchasedItem(
  board: Board,
  reserve: ItemInstance | null,
  itemId: string,
  purchasedUid: string,
  allowReserve: boolean,
): InventoryMergeResult {
  const inventory: MutableInventory = {
    board: board.map((item) => (item ? { ...item } : null)),
    reserve: reserve ? { ...reserve } : null,
  };
  const merges: MergeStep[] = [];
  let currentLocation: ItemLocation | null =
    matchingLocations(inventory, itemId, 1)[0] ?? null;

  if (!currentLocation) {
    const emptySlot = inventory.board.findIndex((item) => item === null);
    currentLocation =
      emptySlot >= 0
        ? { area: "board", slot: emptySlot }
        : allowReserve && !inventory.reserve
          ? { area: "reserve" }
          : null;
    if (currentLocation) {
      setItemAt(inventory, currentLocation, {
        uid: purchasedUid,
        itemId,
        level: 1,
      });
    }
    return { ...inventory, merges, location: currentLocation };
  }

  const levelOne = itemAt(inventory, currentLocation);
  if (!levelOne) throw new Error("Merge target unexpectedly disappeared.");
  setItemAt(inventory, currentLocation, { ...levelOne, level: 2 });
  merges.push({
    itemId,
    fromLevel: 1,
    toLevel: 2,
    target: currentLocation,
    consumed: null,
  });

  while (true) {
    const mergeLocation = currentLocation;
    const current = itemAt(inventory, mergeLocation);
    if (!current || current.level >= 3) break;
    const otherLocation = matchingLocations(
      inventory,
      itemId,
      current.level,
    ).find((location) => !sameLocation(location, mergeLocation));
    if (!otherLocation) break;

    const [survivor, consumed] = chooseMergeSurvivor(
      mergeLocation,
      otherLocation,
    );
    const survivorItem = itemAt(inventory, survivor);
    if (!survivorItem) throw new Error("Merge survivor unexpectedly disappeared.");
    const fromLevel = survivorItem.level;
    const toLevel = (fromLevel + 1) as ItemLevel;
    setItemAt(inventory, survivor, { ...survivorItem, level: toLevel });
    setItemAt(inventory, consumed, null);
    currentLocation = survivor;
    merges.push({ itemId, fromLevel, toLevel, target: survivor, consumed });
  }

  return { ...inventory, merges, location: currentLocation };
}

export function getPurchaseMergePreview(
  board: Board,
  itemId: string,
  reserve: ItemInstance | null = null,
  allowReserve = false,
): PurchaseMergePreview | null {
  const merged = mergePurchasedItem(
    board,
    reserve,
    itemId,
    "preview",
    allowReserve,
  );
  const last = merged.merges.at(-1);
  return last
    ? {
        target: last.target,
        resultLevel: last.toLevel,
        mergeCount: merged.merges.length,
      }
    : null;
}

function synergyChangedEvents(before: Board, after: Board): DomainEvent[] {
  const beforeWeights = getFamilyWeights(before);
  const afterWeights = getFamilyWeights(after);
  return FAMILIES.flatMap((family) => {
    const wasActive = beforeWeights[family] >= SYNERGY_THRESHOLD;
    const active = afterWeights[family] >= SYNERGY_THRESHOLD;
    return wasActive === active
      ? []
      : [{ type: "synergyChanged", family, active, weight: afterWeights[family] }];
  });
}

function failure(state: GameState, error: ActionResult["error"]): ActionResult {
  return { state, events: [], error };
}

export function buyOffer(state: GameState, offerUid: string): ActionResult {
  if (state.phase !== "shop") return failure(state, "shopClosed");
  const offer = state.offers.find((entry) => entry.uid === offerUid);
  if (!offer || offer.bought) return failure(state, "offerUnavailable");
  const definition = getItemDefinition(offer.itemId);
  if (state.gold < definition.cost) return failure(state, "notEnoughGold");

  let working: GameState = { ...state, gold: state.gold - definition.cost };
  let purchasedUid: string;
  [purchasedUid, working] = nextId(working, "item");
  const merged = mergePurchasedItem(
    working.board,
    working.reserve,
    offer.itemId,
    purchasedUid,
    working.round >= RESERVE_UNLOCK_ROUND,
  );
  if (!merged.location) return failure(state, "inventoryFull");

  const nextState: GameState = {
    ...working,
    board: merged.board,
    reserve: merged.reserve,
    offers: working.offers.map((entry) =>
      entry.uid === offerUid ? { ...entry, bought: true } : entry,
    ),
    selectedSlot: null,
  };
  return {
    state: nextState,
    events: [
      {
        type: "purchaseCommitted",
        offerUid,
        itemUid: purchasedUid,
        itemId: offer.itemId,
        cost: definition.cost,
        destination: merged.location,
      },
      ...merged.merges.map(
        (step): DomainEvent => ({ type: "mergeResolved", step }),
      ),
      ...synergyChangedEvents(state.board, nextState.board),
    ],
  };
}

export function getSellValue(instance: ItemInstance): number {
  const definition = getItemDefinition(instance.itemId);
  const investedCopies = 2 ** (instance.level - 1);
  return Math.max(1, Math.floor((definition.cost * investedCopies) / 2));
}

export function sellSlot(state: GameState, slot: number): ActionResult {
  if (state.phase !== "shop") return failure(state, "battleInventoryLocked");
  const instance = state.board[slot];
  if (!instance) return failure(state, "slotEmpty");
  const value = getSellValue(instance);
  const board = [...state.board];
  board[slot] = null;
  const nextState: GameState = {
    ...state,
    board,
    gold: state.gold + value,
    selectedSlot: null,
  };
  return {
    state: nextState,
    events: [
      {
        type: "itemSold",
        itemUid: instance.uid,
        location: { area: "board", slot },
        gold: value,
      },
      ...synergyChangedEvents(state.board, nextState.board),
    ],
  };
}

export function sellReserve(state: GameState): ActionResult {
  if (state.phase !== "shop") return failure(state, "battleInventoryLocked");
  if (state.round < RESERVE_UNLOCK_ROUND) return failure(state, "reserveLocked");
  if (!state.reserve) return failure(state, "reserveEmpty");
  const value = getSellValue(state.reserve);
  return {
    state: {
      ...state,
      reserve: null,
      selectedSlot: null,
      gold: state.gold + value,
    },
    events: [
      {
        type: "itemSold",
        itemUid: state.reserve.uid,
        location: { area: "reserve" },
        gold: value,
      },
    ],
  };
}

export function swapSlotWithReserve(
  state: GameState,
  slot: number,
): ActionResult {
  if (state.phase !== "shop") return failure(state, "battleInventoryLocked");
  if (state.round < RESERVE_UNLOCK_ROUND) return failure(state, "reserveLocked");
  if (slot < 0 || slot >= BOARD_SIZE) return { state, events: [] };
  const board = [...state.board];
  const boardItem = board[slot] ?? null;
  board[slot] = state.reserve;
  const nextState: GameState = {
    ...state,
    board,
    reserve: boardItem,
    selectedSlot: null,
  };
  return {
    state: nextState,
    events: [
      {
        type: "inventorySwapped",
        first: { area: "board", slot },
        second: { area: "reserve" },
      },
      ...synergyChangedEvents(state.board, nextState.board),
    ],
  };
}

export function selectOrSwapSlot(state: GameState, slot: number): ActionResult {
  if (state.phase !== "shop" || slot < 0 || slot >= BOARD_SIZE) {
    return { state, events: [] };
  }
  if (state.selectedSlot === null) {
    return state.board[slot]
      ? { state: { ...state, selectedSlot: slot }, events: [] }
      : { state, events: [] };
  }
  if (state.selectedSlot === slot) {
    return { state: { ...state, selectedSlot: null }, events: [] };
  }
  const firstSlot = state.selectedSlot;
  const board = [...state.board];
  [board[firstSlot], board[slot]] = [board[slot] ?? null, board[firstSlot] ?? null];
  return {
    state: { ...state, board, selectedSlot: null },
    events: [
      {
        type: "inventorySwapped",
        first: { area: "board", slot: firstSlot },
        second: { area: "board", slot },
      },
    ],
  };
}

export function rerollShop(state: GameState): ActionResult {
  if (state.phase !== "shop") return failure(state, "shopClosed");
  const cost = state.rerollsUsed === 0 ? 0 : 1;
  if (state.gold < cost) return failure(state, "notEnoughGoldForReroll");
  const charged: GameState = {
    ...state,
    gold: state.gold - cost,
    rerollsUsed: state.rerollsUsed + 1,
  };
  const rolled = rollOffers(charged, false);
  return {
    state: { ...rolled.state, offers: rolled.offers },
    events: [{ type: "shopRerolled", cost }],
  };
}

export function beginBattle(state: GameState): ActionResult {
  if (state.phase !== "shop") return { state, events: [] };
  if (!state.board.some(Boolean)) return failure(state, "boardEmpty");
  return {
    state: { ...state, phase: "battle", selectedSlot: null },
    events: [{ type: "battleStarted" }],
  };
}

export function enterOpeningShop(state: GameState): GameState {
  return state.phase === "intro" ? { ...state, phase: "shop" } : state;
}

export function recordBattleResult(
  state: GameState,
  result: CombatResult,
): GameState {
  return state.phase === "battle" ? { ...state, pendingBattle: result } : state;
}

export function showBattleResult(state: GameState): GameState {
  return state.phase === "battle" && state.pendingBattle
    ? { ...state, phase: "result" }
    : state;
}

export function getCurrentOpponent(state: GameState) {
  const opponents = getCampaign(state.campaignId).opponents;
  const opponent = opponents[
    Math.min(Math.max(0, state.round - 1), opponents.length - 1)
  ];
  if (!opponent) throw new Error(`Campaign ${state.campaignId} has no opponent.`);
  const boards = [opponent.board, ...(opponent.boardVariants ?? [])];
  return {
    ...opponent,
    board: boards[Math.min(state.opponentVariant, boards.length - 1)] ?? opponent.board,
  };
}

export function getRoundReward(state: GameState, playerWon: boolean): number {
  const opponent = getCurrentOpponent(state);
  return (
    5 +
    Math.floor(state.round / 2) +
    (playerWon ? 1 : 0) +
    (playerWon ? (opponent.rewardBonus ?? 0) : 0)
  );
}

export function isOpeningDefeatProtected(
  state: GameState,
  outcome: BattleOutcome = "enemy",
): boolean {
  return outcome === "enemy" && state.round === 1 && !state.openingProtectionUsed;
}

export function getBattleReward(
  state: GameState,
  outcome: BattleOutcome,
): number {
  if (outcome === "player") {
    return state.round >= getCampaign(state.campaignId).opponents.length
      ? 0
      : getRoundReward(state, true);
  }
  if (outcome === "enemy") {
    const protectedLoss = isOpeningDefeatProtected(state, outcome);
    const sealsAfterLoss = protectedLoss ? state.seals : state.seals - 1;
    return sealsAfterLoss > 0 ? DEFEAT_RECOVERY_GOLD : 0;
  }
  return 0;
}

export function advanceAfterBattle(
  state: GameState,
  outcome: BattleOutcome,
): ActionResult {
  const maxRounds = getCampaign(state.campaignId).opponents.length;
  const playerWon = outcome === "player";
  const playerLost = outcome === "enemy";
  const openingLossProtected = isOpeningDefeatProtected(state, outcome);
  const seals = playerLost && !openingLossProtected ? state.seals - 1 : state.seals;
  const victories = state.victories + (playerWon ? 1 : 0);
  const openingProtectionUsed = state.openingProtectionUsed || openingLossProtected;
  const reward = getBattleReward(state, outcome);

  if (playerWon && state.round >= maxRounds) {
    return {
      state: {
        ...state,
        openingProtectionUsed,
        victories,
        phase: "victory",
        pendingBattle: null,
      },
      events: [{ type: "battleAdvanced", outcome, reward: 0 }],
    };
  }
  if (playerLost && seals <= 0) {
    return {
      state: {
        ...state,
        seals: 0,
        openingProtectionUsed,
        victories,
        phase: "gameover",
        pendingBattle: null,
      },
      events: [{ type: "battleAdvanced", outcome, reward: 0 }],
    };
  }

  const nextRound = playerWon ? state.round + 1 : state.round;
  const base: GameState = {
    ...state,
    phase: "shop",
    round: nextRound,
    seals,
    victories,
    gold: state.gold + reward,
    rerollsUsed: 0,
    selectedSlot: null,
    openingProtectionUsed,
    pendingBattle: null,
  };
  const opponentState = playerWon ? rollOpponentVariant(base, nextRound) : base;
  const rolled = rollOffers(opponentState, false);
  return {
    state: { ...rolled.state, offers: rolled.offers },
    events: [{ type: "battleAdvanced", outcome, reward }],
  };
}

export function resetRun(
  seed = Date.now() >>> 0,
  campaignId: CampaignId = "grand-tournament",
  legacyFamily?: LegacyFamily,
): GameState {
  return createInitialState(
    seed,
    campaignId,
    getCampaignFamilies(campaignId, legacyFamily),
  );
}
