import { describe, expect, test } from "vitest";

import {
  advanceAfterBattle,
  buyOffer,
  createInitialState,
  enterOpeningShop,
  getFamilyWeights,
  getPurchaseMergePreview,
  isSynergyActive,
  rerollShop,
  RESERVE_UNLOCK_ROUND,
  sellReserve,
  swapSlotWithReserve,
} from "../../core/state";
import type { GameState, ItemInstance } from "../../core/types";

function item(
  uid: string,
  itemId: string,
  level: 1 | 2 | 3 = 1,
): ItemInstance {
  return { uid, itemId, level };
}

function shopState(seed = 123): GameState {
  return enterOpeningShop(createInitialState(seed));
}

describe("shop and inventory state", () => {
  test("opens a curated deterministic three-offer shop", () => {
    const first = createInitialState(42);
    const second = createInitialState(42);
    expect(first.phase).toBe("intro");
    expect(first.gold).toBe(7);
    expect(first.offers.map((offer) => offer.itemId)).toEqual([
      "chili",
      "slime-shroom",
      "egg-shell",
    ]);
    expect(first).toEqual(second);
    expect(enterOpeningShop(first).phase).toBe("shop");
  });

  test("a full-board purchase performs a visible merge cascade", () => {
    const base = shopState();
    const chiliOffer = base.offers.find((offer) => offer.itemId === "chili");
    expect(chiliOffer).toBeDefined();
    const state: GameState = {
      ...base,
      board: [
        item("existing-one", "chili", 1),
        item("existing-two", "chili", 2),
        item("guard", "egg-shell"),
        item("poison", "slime-shroom"),
        item("frost", "frost-shard"),
      ],
    };

    expect(getPurchaseMergePreview(state.board, "chili")).toEqual({
      target: { area: "board", slot: 0 },
      resultLevel: 3,
      mergeCount: 2,
    });
    const result = buyOffer(state, chiliOffer?.uid ?? "missing");

    expect(result.error).toBeUndefined();
    expect(result.state.board[0]).toEqual(item("existing-one", "chili", 3));
    expect(result.state.board[1]).toBeNull();
    expect(result.events.map((event) => event.type)).toEqual([
      "purchaseCommitted",
      "mergeResolved",
      "mergeResolved",
    ]);
    expect(result.events.at(-1)).toMatchObject({
      type: "mergeResolved",
      step: { fromLevel: 2, toLevel: 3 },
    });
  });

  test("emits a synergy event only when a purchase crosses the threshold", () => {
    const base = shopState();
    const state: GameState = {
      ...base,
      board: [item("fire-two", "chili", 2), null, null, null, null],
      offers: [
        { uid: "offer-fire", itemId: "cinder-berry", bought: false },
        ...base.offers.slice(1),
      ],
    };
    const result = buyOffer(state, "offer-fire");
    expect(result.events.at(-1)).toEqual({
      type: "synergyChanged",
      family: "fire",
      active: true,
      weight: 3,
    });
  });

  test("uses stable error codes instead of localized core copy", () => {
    const closed = createInitialState();
    expect(buyOffer(closed, closed.offers[0]?.uid ?? "missing").error).toBe(
      "shopClosed",
    );

    const poor = { ...shopState(), gold: 0 };
    expect(buyOffer(poor, poor.offers[0]?.uid ?? "missing").error).toBe(
      "notEnoughGold",
    );
  });

  test("unlocks a passive reserve in round five", () => {
    const base = shopState();
    const state: GameState = {
      ...base,
      round: RESERVE_UNLOCK_ROUND,
      board: [
        item("a", "dragon-tooth"),
        item("b", "slime-shroom"),
        item("c", "egg-shell"),
        item("d", "frost-shard"),
        item("e", "mirror-shard"),
      ],
      offers: [
        { uid: "offer-new", itemId: "chili", bought: false },
        ...base.offers.slice(1),
      ],
    };
    const bought = buyOffer(state, "offer-new");
    expect(bought.state.reserve?.itemId).toBe("chili");
    expect(bought.events[0]).toMatchObject({
      type: "purchaseCommitted",
      destination: { area: "reserve" },
    });

    const swapped = swapSlotWithReserve(bought.state, 2);
    expect(swapped.state.board[2]?.itemId).toBe("chili");
    expect(swapped.state.reserve?.itemId).toBe("egg-shell");
    const sold = sellReserve(swapped.state);
    expect(sold.state.reserve).toBeNull();
    expect(sold.state.gold).toBe(swapped.state.gold + 1);
  });

  test("preserves family investment through merge levels", () => {
    const board = [
      item("fire-one", "chili", 1),
      item("fire-two", "dragon-tooth", 2),
      item("guard", "egg-shell", 3),
      null,
      null,
    ];
    expect(getFamilyWeights(board)).toEqual({
      fire: 3,
      poison: 0,
      guard: 4,
      frost: 0,
      echo: 0,
    });
    expect(isSynergyActive(board, "fire")).toBe(true);
    expect(isSynergyActive(board, "guard")).toBe(true);
  });

  test("keeps rerolls and post-battle rewards deterministic", () => {
    const state = shopState(999);
    const firstReroll = rerollShop(state);
    expect(firstReroll.state.gold).toBe(state.gold);
    expect(firstReroll.events).toEqual([{ type: "shopRerolled", cost: 0 }]);

    const win = advanceAfterBattle(state, "player");
    expect(win.state.phase).toBe("shop");
    expect(win.state.round).toBe(2);
    expect(win.state.gold).toBe(13);
    expect(win.events).toEqual([
      { type: "battleAdvanced", outcome: "player", reward: 6 },
    ]);

    const protectedLoss = advanceAfterBattle(state, "enemy");
    expect(protectedLoss.state.round).toBe(1);
    expect(protectedLoss.state.seals).toBe(3);
    expect(protectedLoss.state.openingProtectionUsed).toBe(true);
    expect(protectedLoss.state.gold).toBe(10);
  });
});
