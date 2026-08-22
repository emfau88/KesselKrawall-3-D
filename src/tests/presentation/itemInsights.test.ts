import { describe, expect, test } from "vitest";

import type { Board } from "../../core/types";
import { getItemPlacementInsights } from "../../presentation/shop/itemInsights";

describe("item placement insights", () => {
  test("uses the same adjacent haste relationship as combat", () => {
    const board: Board = [
      { uid: "core", itemId: "ember-core", level: 2 },
      { uid: "chili", itemId: "chili", level: 1 },
      { uid: "shroom", itemId: "slime-shroom", level: 1 },
      null,
      null,
    ];
    const source = getItemPlacementInsights(board, 0);
    const target = getItemPlacementInsights(board, 1);
    expect(source.outgoing.map((entry) => entry.targetSlot)).toEqual([1]);
    expect(target.incoming.map((entry) => entry.sourceSlot)).toEqual([0]);
    expect(target.effectiveCooldownMs).toBeLessThan(target.baseCooldownMs);
  });

  test("shows family haste beyond direct neighbours", () => {
    const board: Board = [
      { uid: "bulb", itemId: "venom-bulb", level: 1 },
      null,
      null,
      { uid: "shroom", itemId: "slime-shroom", level: 1 },
      null,
    ];
    expect(getItemPlacementInsights(board, 0).outgoing.map((entry) => entry.targetSlot)).toContain(3);
  });
});
