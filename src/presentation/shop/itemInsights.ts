import { getItemDefinition } from "../../core/data";
import { getItemCooldownMs } from "../../core/simulation";
import type { Board, PassiveDefinition } from "../../core/types";

export interface PlacementInfluence {
  readonly sourceSlot: number;
  readonly targetSlot: number;
  readonly type: PassiveDefinition["type"];
  readonly value: number;
}

export interface ItemPlacementInsights {
  readonly outgoing: readonly PlacementInfluence[];
  readonly incoming: readonly PlacementInfluence[];
  readonly baseCooldownMs: number;
  readonly effectiveCooldownMs: number;
}

function passiveAffects(
  board: Board,
  sourceSlot: number,
  targetSlot: number,
): PlacementInfluence | null {
  const source = board[sourceSlot];
  const target = board[targetSlot];
  if (!source || !target) return null;
  const passive = getItemDefinition(source.itemId).passive;
  const targetDefinition = getItemDefinition(target.itemId);
  if (!passive || (passive.family && passive.family !== targetDefinition.family)) return null;
  const adjacent = Math.abs(sourceSlot - targetSlot) === 1;
  if (passive.type !== "hasteFamily" && !adjacent) return null;
  const value = passive.values[source.level - 1];
  if (value === undefined) return null;
  return { sourceSlot, targetSlot, type: passive.type, value };
}

export function getAllPlacementInfluences(board: Board): readonly PlacementInfluence[] {
  const influences: PlacementInfluence[] = [];
  for (let sourceSlot = 0; sourceSlot < board.length; sourceSlot += 1) {
    for (let targetSlot = 0; targetSlot < board.length; targetSlot += 1) {
      const influence = passiveAffects(board, sourceSlot, targetSlot);
      if (influence) influences.push(influence);
    }
  }
  return influences;
}

export function getItemPlacementInsights(board: Board, slot: number): ItemPlacementInsights {
  const item = board[slot];
  if (!item) return { outgoing: [], incoming: [], baseCooldownMs: 0, effectiveCooldownMs: 0 };
  const influences = getAllPlacementInfluences(board);
  const definition = getItemDefinition(item.itemId);
  const baseCooldown = definition.cooldown[item.level - 1] ?? 0;
  return {
    outgoing: influences.filter((influence) => influence.sourceSlot === slot && influence.targetSlot !== slot),
    incoming: influences.filter((influence) => influence.targetSlot === slot && influence.sourceSlot !== slot),
    baseCooldownMs: baseCooldown * 1_000,
    effectiveCooldownMs: getItemCooldownMs(board, slot),
  };
}
