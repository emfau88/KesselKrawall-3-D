import { describe, expect, test } from "vitest";

import type { CombatEvent } from "../../core/types";
import {
  createFloatingCombatNumbers,
  formatFloatingCombatNumber,
  mergeFloatingCombatNumbers,
} from "../../presentation/combat/floatingCombatNumbers";

function event(overrides: Partial<CombatEvent> = {}): CombatEvent {
  return {
    time: 1_000,
    kind: "damage",
    code: "item.damage",
    actor: "player",
    target: "enemy",
    sourceUid: "chili",
    sourceItemId: "chili",
    family: "fire",
    amount: 4,
    playerHp: 100,
    playerShield: 0,
    enemyHp: 20,
    enemyShield: 0,
    ...overrides,
  };
}

describe("floating combat numbers", () => {
  test("bundles rapid equal feedback and preserves the hit count", () => {
    const first = createFloatingCombatNumbers([event()], "one", 1_000);
    const second = createFloatingCombatNumbers([event({ amount: 6 })], "two", 1_220);
    const merged = mergeFloatingCombatNumbers(first, second, 1_220);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ value: 10, hitCount: 2, type: "damage" });
  });

  test("distinguishes applied poison from poison tick damage", () => {
    const applied = createFloatingCombatNumbers([
      event({ kind: "poison", code: "item.poison", amount: 3 }),
    ], "poison", 2_000)[0];
    const tick = createFloatingCombatNumbers([
      event({ kind: "poison", code: "status.poisonTick", amount: 2 }),
    ], "tick", 2_600)[0];
    expect(applied && formatFloatingCombatNumber(applied).value).toBe("+3");
    expect(tick && formatFloatingCombatNumber(tick).value).toBe("−2");
  });

  test("caps feedback to two active numbers per target", () => {
    const numbers = [
      ...createFloatingCombatNumbers([event()], "a", 1_000),
      ...createFloatingCombatNumbers([event({ kind: "heal", code: "item.heal", actor: "enemy", target: "enemy" })], "b", 1_400),
      ...createFloatingCombatNumbers([event({ kind: "shield", code: "item.shield", actor: "enemy", target: "enemy" })], "c", 1_800),
    ];
    const merged = mergeFloatingCombatNumbers([], numbers, 1_800);
    expect(merged.filter((number) => number.target === "enemy")).toHaveLength(2);
  });
});
