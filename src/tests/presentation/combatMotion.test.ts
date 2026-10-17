import { describe, expect, it } from "vitest";
import { ITEMS } from "../../core/data";
import type { CombatEvent } from "../../core/types";
import { advanceCombatTime, animationElapsed, type BattlePlaybackSpeed } from "../../presentation/combat/combatClock";
import { combatMotionPhase, combatMotionTiming } from "../../presentation/combat/combatMotion";
import { createCombatTimeline, getBeatAt, getPresentedBeatState } from "../../presentation/combat/combatPresentation";

function event(itemId = "chili", overrides: Partial<CombatEvent> = {}): CombatEvent {
  return { time: 1000, kind: "damage", code: "item.damage", actor: "player", target: "enemy", sourceUid: "item-1", sourceItemId: itemId, family: "fire", amount: 8,
    playerHp: 100, playerShield: 0, enemyHp: 92, enemyShield: 0, ...overrides };
}

describe("shared combat timing (2D original's protected visual window)", () => {
  it.each([1, 2, 4] as BattlePlaybackSpeed[])("finishes every ingredient's projectile and impact before the next beat at speed %s", speed => {
    for (const fps of [30, 60]) for (const item of ITEMS) {
      const attack = event(item.id);
      const timeline = createCombatTimeline([attack, event("chili", { time: 2000, sourceUid: "item-2", enemyHp: 84 })]);
      const beat = timeline.beats[0]!;
      let time = 0, sawFlight = false, sawImpact = false, sawCompletedFlight = false, previousProgress = 0;
      while (time < timeline.beats[1]!.startsAtMs) {
        const phase = combatMotionPhase(attack, Math.max(0, time - beat.startsAtMs));
        if (time >= beat.startsAtMs) {
          expect(phase.flightProgress).toBeGreaterThanOrEqual(previousProgress);
          previousProgress = phase.flightProgress;
          sawFlight ||= phase.flightProgress > 0 && phase.flightProgress < 1;
          sawCompletedFlight ||= phase.flightProgress === 1;
          sawImpact ||= phase.impactProgress > 0 && phase.impactProgress < 1;
          if (phase.landed) expect(phase.flightProgress).toBe(1);
        }
        time = advanceCombatTime(time, 1000 / fps, speed);
      }
      expect({ sawFlight, sawImpact, sawCompletedFlight }).toEqual({ sawFlight: true, sawImpact: true, sawCompletedFlight: true });
      expect(beat.durationMs).toBeGreaterThanOrEqual(beat.motion.visibleMs + 180);
    }
  });

  it("updates HP, shield and statuses at contact, not at cast start", () => {
    const first = event("slime-shroom", { kind: "poison", code: "item.poison", family: "poison", amount: 4 });
    const second = event("egg-shell", { time: 2000, sourceUid: "shell", kind: "shield", code: "item.shield", actor: "player", target: "player", playerShield: 8 });
    const timeline = createCombatTimeline([first, second]);
    const beat = timeline.beats[0]!;
    const cast = getPresentedBeatState(beat, beat.startsAtMs + 1);
    expect(cast.landed).toBe(false);
    expect(cast.snapshot).toBeNull();
    expect(cast.statuses.enemy.poison.stacks).toBe(0);
    const landed = getPresentedBeatState(beat, beat.startsAtMs + beat.motion.impactAtMs);
    expect(landed.snapshot).toBe(first);
    expect(landed.statuses.enemy.poison.stacks).toBe(4);
    const next = timeline.beats[1]!;
    expect(getPresentedBeatState(next, next.startsAtMs).snapshot).toBe(first);
    expect(getPresentedBeatState(next, next.startsAtMs + next.motion.impactAtMs).snapshot?.playerShield).toBe(8);
  });

  it("freezes flight/impact/actor time during pause and changes speed without resetting progress", () => {
    const clock = { timeMs: 500 };
    const time = { clock, startsAtMs: 260 };
    const elapsed = animationElapsed(time, 99);
    const before = combatMotionPhase(event(), clock.timeMs);
    clock.timeMs = advanceCombatTime(clock.timeMs, 5000, 4, true);
    expect(combatMotionPhase(event(), clock.timeMs)).toEqual(before);
    expect(animationElapsed(time, 104)).toBe(elapsed);
    clock.timeMs = advanceCombatTime(clock.timeMs, 16, 4);
    expect(animationElapsed(time, 0)).toBeGreaterThan(elapsed);
    expect(clock.timeMs).toBeCloseTo(539.2);
  });

  it("does not jump several beats after a long/background frame", () => {
    const timeline = createCombatTimeline(Array.from({ length: 4 }, (_, i) => event("chili", { time: i * 1000, sourceUid: `item-${i}` })));
    const start = timeline.beats[0]!.startsAtMs;
    const after = advanceCombatTime(start, 3500, 4);
    expect(after - start).toBe(245);
    expect(getBeatAt(timeline, after)).toBe(timeline.beats[0]);
    expect(advanceCombatTime(after, -100, 1)).toBe(after);
  });

  it.each(["status.poisonTick", "status.burnTick"] as const)("shows %s locally, with no fake travelling projectile", code => {
    const tick = event("chili", { code });
    expect(combatMotionTiming(tick).travels).toBe(false);
    expect(combatMotionTiming(tick).flightMs).toBe(0);
  });

  it("keeps all simulated events and final values intact", () => {
    const events = [event(), event("chili", { kind: "burn", code: "status.burnApplied", amount: 2 }), event("slime-shroom", { time: 2200, sourceUid: "shroom", enemyHp: 84 })];
    const before = JSON.stringify(events);
    const timeline = createCombatTimeline(events);
    expect(timeline.beats.flatMap(beat => beat.events)).toEqual(events);
    expect(timeline.beats.at(-1)?.snapshot).toBe(events.at(-1));
    expect(JSON.stringify(events)).toBe(before);
  });
});
