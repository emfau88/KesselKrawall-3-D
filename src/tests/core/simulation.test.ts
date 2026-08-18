import { describe, expect, test } from "vitest";

import { GRAND_TOURNAMENT_OPPONENTS } from "../../core/data";
import {
  getKesselHeatDamageMultiplier,
  isStatusTick,
  KESSEL_FINISHER_MAX_MULTIPLIER,
  KESSEL_FINISHER_START_MS,
  KESSEL_HEAT_START_MS,
  SHIELD_CAP_RATIO,
  simulateBattle,
} from "../../core/simulation";
import type { Board, ItemInstance, OpponentDefinition } from "../../core/types";

function item(
  uid: string,
  itemId: string,
  level: 1 | 2 | 3 = 1,
): ItemInstance {
  return { uid, itemId, level };
}

function opponent(
  board: Board,
  baseHp = 100,
  overrides: Partial<OpponentDefinition> = {},
): OpponentDefinition {
  return {
    id: "test-opponent",
    rank: "regular",
    baseHp,
    board,
    ...overrides,
  };
}

describe("deterministic combat simulation", () => {
  test("produces identical structured results and per-item statistics", () => {
    const board: Board = [
      item("fire", "chili", 2),
      item("poison", "slime-shroom", 1),
      item("guard", "egg-shell", 1),
      null,
      null,
    ];
    const target = GRAND_TOURNAMENT_OPPONENTS[1];
    const first = simulateBattle(board, target);
    const second = simulateBattle(board, target);

    expect(first).toEqual(second);
    expect(first.events.length).toBeGreaterThan(0);
    expect(first.playerStats).toHaveLength(3);
    for (const event of first.events) {
      expect(event.code).toMatch(/^(item|status|synergy|boss)\./);
      expect(event).not.toHaveProperty("label");
    }
  });

  test("keeps status ticks explicit and triggers a poison burst", () => {
    const result = simulateBattle(
      [item("toxin", "slime-shroom", 2), null, null, null, null],
      opponent([null, null, null, null, null], 200),
      { combatLimitMs: 12_000, enableKesselHeat: false },
    );
    expect(result.events.some((event) => event.code === "status.poisonTick")).toBe(
      true,
    );
    expect(
      result.events.some((event) => event.code === "status.poisonBurst"),
    ).toBe(true);
    expect(result.events.filter(isStatusTick).every((event) => event.amount > 0)).toBe(
      true,
    );
  });

  test("caps shield at half maximum hp", () => {
    const result = simulateBattle(
      [item("shield", "egg-shell", 3), null, null, null, null],
      opponent([null, null, null, null, null], 100),
      { combatLimitMs: 30_000, enableKesselHeat: false },
    );
    expect(result.finalPlayerShield).toBe(100 * SHIELD_CAP_RATIO);
  });

  test("emits renderer-neutral Frost and Echo signature events", () => {
    const target = opponent([null, null, null, null, null], 500);
    const frost = simulateBattle(
      [
        item("frost-two", "frost-shard", 2),
        item("frost-one", "ice-bell", 1),
        null,
        null,
        null,
      ],
      target,
      { combatLimitMs: 12_000, enableKesselHeat: false },
    );
    const echo = simulateBattle(
      [
        item("echo-two", "mirror-shard", 2),
        item("echo-one", "echo-bell", 1),
        null,
        null,
        null,
      ],
      target,
      { combatLimitMs: 12_000, enableKesselHeat: false },
    );
    expect(frost.events).toContainEqual(
      expect.objectContaining({
        code: "synergy.frostDelay",
        family: "frost",
        amount: 650,
      }),
    );
    expect(echo.events).toContainEqual(
      expect.objectContaining({
        code: "synergy.echoRepeat",
        family: "echo",
        amount: 55,
      }),
    );
  });

  test("keeps both boss rules visible as structured events", () => {
    const attacker: Board = [item("nuke", "chili", 3), null, null, null, null];
    const emptyBossBoard: Board = [null, null, null, null, null];
    const rage = simulateBattle(
      attacker,
      opponent(emptyBossBoard, 100, {
        id: "rage-boss",
        rank: "boss",
        bossRule: "rageAtHalf",
      }),
    );
    const fracture = simulateBattle(
      attacker,
      opponent(emptyBossBoard, 100, {
        id: "fracture-boss",
        rank: "boss",
        bossRule: "timeFractureAtHalf",
      }),
    );
    expect(rage.events).toContainEqual(
      expect.objectContaining({ code: "boss.rage", bossRule: "rageAtHalf" }),
    );
    expect(fracture.events).toContainEqual(
      expect.objectContaining({
        code: "boss.timeFracture",
        bossRule: "timeFractureAtHalf",
      }),
    );
  });

  test("keeps the legacy heat curve until slice balance is documented", () => {
    expect(getKesselHeatDamageMultiplier(KESSEL_HEAT_START_MS - 100)).toBe(1);
    expect(getKesselHeatDamageMultiplier(KESSEL_HEAT_START_MS)).toBe(1.05);
    expect(getKesselHeatDamageMultiplier(KESSEL_FINISHER_START_MS)).toBe(1.4);
    expect(getKesselHeatDamageMultiplier(60_000)).toBe(
      KESSEL_FINISHER_MAX_MULTIPLIER,
    );
  });
});
