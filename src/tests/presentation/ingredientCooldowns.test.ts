import { describe, expect, it } from "vitest";

import type { Board, CombatEvent } from "../../core/types";
import { getIngredientCooldownStates } from "../../presentation/combat/ingredientCooldowns";

const board: Board = [{ uid: "player-chili", itemId: "chili", level: 1 }, null, null, null, null];
const events: CombatEvent[] = [3_200, 6_400].map((time) => ({
  time,
  kind: "damage",
  code: "item.damage",
  actor: "player",
  target: "enemy",
  sourceUid: "player-chili",
  sourceItemId: "chili",
  family: "fire",
  amount: 4,
  playerHp: 100,
  playerShield: 0,
  enemyHp: 80,
  enemyShield: 0,
}));

describe("ingredient cooldown presentation", () => {
  it("fills toward the first activation and resets after the trigger", () => {
    expect(getIngredientCooldownStates(board, events, "player", 1_600)[0]?.progress).toBeCloseTo(0.5);
    expect(getIngredientCooldownStates(board, events, "player", 3_200)[0]?.progress).toBe(0);
    expect(getIngredientCooldownStates(board, events, "player", 4_800)[0]?.progress).toBeCloseTo(0.5);
  });

  it("ignores status ticks that retain a source uid", () => {
    const statusTick: CombatEvent = { ...events[0]!, time: 4_000, code: "status.burnTick", kind: "burn" };
    expect(getIngredientCooldownStates(board, [...events, statusTick], "player", 4_800)[0]?.remainingMs).toBe(1_600);
  });
});
