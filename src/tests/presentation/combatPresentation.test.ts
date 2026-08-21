import { describe, expect, test } from "vitest";

import type { CombatEvent } from "../../core/types";
import {
  createCombatTimeline,
  getBeatAt,
  getPlaybackElapsedMs,
  getTimelineProgress,
} from "../../presentation/combat/combatPresentation";

function event(overrides: Partial<CombatEvent> = {}): CombatEvent {
  return {
    time: 1_000,
    kind: "damage",
    code: "item.damage",
    actor: "player",
    target: "enemy",
    sourceUid: "chili-1",
    sourceItemId: "chili",
    family: "fire",
    amount: 8,
    playerHp: 100,
    playerShield: 0,
    enemyHp: 92,
    enemyShield: 0,
    ...overrides,
  };
}

describe("combat presentation timeline", () => {
  test("bundles simultaneous effects from one activation", () => {
    const timeline = createCombatTimeline([
      event(),
      event({ kind: "burn", code: "status.burnApplied", amount: 2, enemyHp: 90 }),
      event({ time: 2_000, sourceUid: "chili-2", enemyHp: 82 }),
    ]);

    expect(timeline.beats).toHaveLength(2);
    expect(timeline.beats[0]?.events).toHaveLength(2);
    expect(timeline.beats[0]?.snapshot.enemyHp).toBe(90);
  });

  test("gives boss beats more space than status ticks", () => {
    const timeline = createCombatTimeline([
      event({ kind: "boss", code: "boss.rage", sourceUid: "boss-rage", bossRule: "rageAtHalf" }),
      event({ time: 2_000, kind: "poison", code: "status.poisonTick", sourceUid: "status" }),
    ]);

    expect(timeline.beats[0]?.emphasis).toBe("boss");
    expect(timeline.beats[1]?.emphasis).toBe("ambient");
    expect(timeline.beats[0]!.durationMs).toBeGreaterThan(timeline.beats[1]!.durationMs);
  });

  test("reserves enough presentation time for cast, travel, impact, and reaction", () => {
    const timeline = createCombatTimeline([event()]);

    expect(timeline.beats[0]?.durationMs).toBeGreaterThanOrEqual(1_050);
  });

  test("keeps speed and pause independent from simulation time", () => {
    expect(getPlaybackElapsedMs(500, 1_000, 2_000, 1, false)).toBe(1_500);
    expect(getPlaybackElapsedMs(500, 1_000, 2_000, 2, false)).toBe(2_150);
    expect(getPlaybackElapsedMs(500, 1_000, 2_000, 4, true)).toBe(500);
  });

  test("selects beats and clamps progress", () => {
    const timeline = createCombatTimeline([event()]);
    expect(getBeatAt(timeline, 0)).toBeNull();
    expect(getBeatAt(timeline, 260)?.event.sourceUid).toBe("chili-1");
    expect(getTimelineProgress(timeline, timeline.durationMs * 2)).toBe(1);
  });
});
