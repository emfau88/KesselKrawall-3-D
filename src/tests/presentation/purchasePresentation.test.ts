import { describe, expect, test } from "vitest";

import type { Board, ItemInstance } from "../../core/types";
import { getPresentedInventory } from "../../presentation/shop/purchasePresentation";
import type { PurchaseVisual } from "../../presentation/scene/sceneTypes";

const chili = (uid: string, level: 1 | 2 | 3): ItemInstance => ({ uid, itemId: "chili", level });
const before: Board = [chili("one", 1), chili("two", 2), null, null, null];
const after: Board = [null, chili("two", 3), null, null, null];

function purchase(phase: PurchaseVisual["phase"], mergeStepIndex = 0): PurchaseVisual {
  return {
    id: 7,
    itemId: "chili",
    offerIndex: 0,
    destinationSlot: 1,
    resultLevel: 3,
    merged: true,
    merges: [
      { itemId: "chili", fromLevel: 1, toLevel: 2, target: { area: "board", slot: 0 }, consumed: null },
      { itemId: "chili", fromLevel: 2, toLevel: 3, target: { area: "board", slot: 1 }, consumed: { area: "board", slot: 0 } },
    ],
    beforeBoard: before,
    beforeReserve: null,
    afterBoard: after,
    afterReserve: null,
    phase,
    mergeStepIndex,
  };
}

describe("purchase presentation inventory", () => {
  test("keeps the pre-purchase board visible throughout flight and landing", () => {
    expect(getPresentedInventory(purchase("flight"), after, null).board).toEqual(before);
    expect(getPresentedInventory(purchase("landing"), after, null).board).toEqual(before);
  });

  test("hides only the ingredients participating in the active merge step", () => {
    const first = getPresentedInventory(purchase("merge"), after, null);
    expect(first.board[0]).toBeNull();
    expect(first.board[1]).toMatchObject({ level: 2 });

    const second = getPresentedInventory(purchase("merge", 1), after, null);
    expect(second.board[0]).toBeNull();
    expect(second.board[1]).toBeNull();
  });

  test("reveals the committed end state only in the reveal phase", () => {
    expect(getPresentedInventory(purchase("reveal"), before, null).board).toEqual(after);
  });
});
