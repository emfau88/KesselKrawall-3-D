export type BattlePlaybackSpeed = 1 | 2 | 4;

export const PLAYBACK_MULTIPLIER: Readonly<Record<BattlePlaybackSpeed, number>> = {
  1: 1, 2: 1.65, 4: 2.45,
};

/** One mutable clock, advanced once per app frame and read by all 3D actors.
 * A stalled/background frame cannot skip whole attacks to catch up with wall time.
 * No React state is written from a Three.js useFrame callback. */
export interface CombatPresentationClock { timeMs: number }
export interface CombatAnimationTime {
  readonly clock: CombatPresentationClock;
  readonly startsAtMs: number;
}

export function advanceCombatTime(timeMs: number, deltaMs: number, speed: BattlePlaybackSpeed, paused = false): number {
  return timeMs + (paused ? 0 : Math.min(100, Math.max(0, deltaMs)) * PLAYBACK_MULTIPLIER[speed]);
}

export function animationElapsed(time: CombatAnimationTime | undefined, fallbackSeconds: number): number {
  return time ? Math.max(0, time.clock.timeMs - time.startsAtMs) / 1_000 : fallbackSeconds;
}
