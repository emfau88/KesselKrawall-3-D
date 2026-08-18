import { describe, expect, test } from "vitest";

import { simulateBattle } from "../../core/simulation";
import {
  advanceAfterBattle,
  beginBattle,
  buyOffer,
  createInitialState,
  enterOpeningShop,
  getCurrentOpponent,
  recordBattleResult,
  rerollShop,
  showBattleResult,
} from "../../core/state";

describe("playable vertical slice", () => {
  test("runs shop, merge, battle, result and return as one deterministic flow", () => {
    const shop = enterOpeningShop(createInitialState(0x4b4b2026));
    const firstChili = shop.offers.find((offer) => offer.itemId === "chili");
    expect(firstChili).toBeDefined();

    const firstPurchase = buyOffer(shop, firstChili?.uid ?? "missing");
    const rerolled = rerollShop(firstPurchase.state);
    const secondChili = rerolled.state.offers.find(
      (offer) => offer.itemId === "chili",
    );
    expect(secondChili).toBeDefined();

    const merged = buyOffer(rerolled.state, secondChili?.uid ?? "missing");
    expect(merged.state.board[0]).toMatchObject({ itemId: "chili", level: 2 });
    expect(merged.events.some((event) => event.type === "mergeResolved")).toBe(true);

    const started = beginBattle(merged.state);
    expect(started.state.phase).toBe("battle");
    const combat = simulateBattle(
      started.state.board,
      getCurrentOpponent(started.state),
    );
    expect(combat.events.length).toBeGreaterThan(0);

    const recorded = recordBattleResult(started.state, combat);
    const result = showBattleResult(recorded);
    expect(result.phase).toBe("result");
    expect(result.pendingBattle).toEqual(combat);

    const advanced = advanceAfterBattle(result, combat.winner);
    expect(["shop", "victory", "gameover"]).toContain(advanced.state.phase);
    expect(advanced.state.pendingBattle).toBeNull();
  });
});
