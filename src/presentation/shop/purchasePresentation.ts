import type { Board, ItemInstance, ItemLocation } from "../../core/types";
import type { PurchaseVisual } from "../scene/sceneTypes";

export interface PresentedInventory {
  readonly board: Board;
  readonly reserve: ItemInstance | null;
}

function sameLocation(left: ItemLocation, right: ItemLocation): boolean {
  return left.area === right.area && (
    left.area === "reserve" || (right.area === "board" && left.slot === right.slot)
  );
}

function itemAt(inventory: PresentedInventory, location: ItemLocation): ItemInstance | null {
  return location.area === "board"
    ? (inventory.board[location.slot] ?? null)
    : inventory.reserve;
}

function setAt(
  board: Array<ItemInstance | null>,
  reserve: ItemInstance | null,
  location: ItemLocation,
  item: ItemInstance | null,
): ItemInstance | null {
  if (location.area === "board") board[location.slot] = item;
  return location.area === "reserve" ? item : reserve;
}

function inventoryBeforeMergeStep(purchase: PurchaseVisual, stepIndex: number): PresentedInventory {
  const board = purchase.beforeBoard.map((item) => item ? { ...item } : null);
  let reserve = purchase.beforeReserve ? { ...purchase.beforeReserve } : null;

  for (let index = 0; index < stepIndex; index += 1) {
    const step = purchase.merges[index];
    if (!step) continue;
    const targetItem = itemAt({ board, reserve }, step.target);
    reserve = setAt(board, reserve, step.target, {
      uid: targetItem?.uid ?? `purchase-${purchase.id}-${index}`,
      itemId: step.itemId,
      level: step.toLevel,
    });
    if (step.consumed && !sameLocation(step.target, step.consumed)) {
      reserve = setAt(board, reserve, step.consumed, null);
    }
  }

  return { board, reserve };
}

export function getPresentedInventory(
  purchase: PurchaseVisual | null,
  fallbackBoard: Board,
  fallbackReserve: ItemInstance | null,
): PresentedInventory {
  if (!purchase) return { board: fallbackBoard, reserve: fallbackReserve };
  if (purchase.phase === "reveal") {
    return { board: purchase.afterBoard, reserve: purchase.afterReserve };
  }
  if (purchase.phase === "flight" || purchase.phase === "landing") {
    return { board: purchase.beforeBoard, reserve: purchase.beforeReserve };
  }

  const inventory = inventoryBeforeMergeStep(purchase, purchase.mergeStepIndex);
  const activeStep = purchase.merges[purchase.mergeStepIndex];
  if (!activeStep) return inventory;
  const board = inventory.board.map((item) => item ? { ...item } : null);
  let reserve = inventory.reserve ? { ...inventory.reserve } : null;
  reserve = setAt(board, reserve, activeStep.target, null);
  if (activeStep.consumed && !sameLocation(activeStep.target, activeStep.consumed)) {
    reserve = setAt(board, reserve, activeStep.consumed, null);
  }
  return { board, reserve };
}
