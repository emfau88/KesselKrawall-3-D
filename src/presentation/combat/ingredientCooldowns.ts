import { getItemDefinition } from "../../core/data";
import { isItemActivationEvent } from "../../core/simulation/eventSelectors";
import type { Board, CombatEvent, Side } from "../../core/types";

export interface IngredientCooldownState {
  readonly uid: string;
  readonly itemId: string;
  readonly progress: number;
  readonly remainingMs: number;
  readonly nextActivationAt: number;
  readonly lastActivationAt: number | null;
  readonly ready: boolean;
}

function uniqueActivationTimes(
  events: readonly CombatEvent[],
  side: Side,
  sourceUid: string,
): readonly number[] {
  return [...new Set(
    events
      .filter((event) => event.actor === side && event.sourceUid === sourceUid && isItemActivationEvent(event))
      .map((event) => event.time),
  )].sort((a, b) => a - b);
}

function inferredCycleMs(times: readonly number[], fallbackMs: number): number {
  if (times.length < 2) return fallbackMs;
  const gaps = times.slice(1).map((time, index) => time - (times[index] ?? time)).filter((gap) => gap > 0);
  if (gaps.length === 0) return fallbackMs;
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

export function getIngredientCooldownStates(
  board: Board,
  events: readonly CombatEvent[],
  side: Side,
  elapsedMs: number,
): readonly (IngredientCooldownState | null)[] {
  return board.map((item) => {
    if (!item) return null;
    const activationTimes = uniqueActivationTimes(events, side, item.uid);
    const definition = getItemDefinition(item.itemId);
    const fallbackCycleMs = (definition.cooldown[item.level - 1] ?? definition.cooldown[0]) * 1_000;
    const cycleMs = inferredCycleMs(activationTimes, fallbackCycleMs);
    const previous = [...activationTimes].reverse().find((time) => time <= elapsedMs) ?? null;
    const scheduledNext = activationTimes.find((time) => time > elapsedMs);
    const nextActivationAt = scheduledNext ?? ((previous ?? 0) + cycleMs);
    const cycleStartedAt = previous ?? Math.max(0, nextActivationAt - cycleMs);
    const duration = Math.max(1, nextActivationAt - cycleStartedAt);
    const progress = Math.max(0, Math.min(1, (elapsedMs - cycleStartedAt) / duration));
    const remainingMs = Math.max(0, nextActivationAt - elapsedMs);
    const justActivated = previous !== null && elapsedMs - previous <= 260;

    return {
      uid: item.uid,
      itemId: item.itemId,
      progress: justActivated ? 0 : progress,
      remainingMs,
      nextActivationAt,
      lastActivationAt: previous,
      ready: remainingMs <= 220,
    };
  });
}
