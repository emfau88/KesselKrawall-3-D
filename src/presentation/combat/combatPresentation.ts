import type { CombatEvent } from "../../core/types";

export type BattlePlaybackSpeed = 1 | 2 | 4;

export interface CombatBeat {
  readonly id: string;
  readonly eventIndex: number;
  readonly event: CombatEvent;
  readonly snapshot: CombatEvent;
  readonly events: readonly CombatEvent[];
  readonly startsAtMs: number;
  readonly durationMs: number;
  readonly emphasis: "ambient" | "standard" | "hero" | "boss";
}

export interface CombatTimeline {
  readonly beats: readonly CombatBeat[];
  readonly durationMs: number;
}

const SPEED_MULTIPLIER: Readonly<Record<BattlePlaybackSpeed, number>> = {
  1: 1,
  2: 1.65,
  4: 2.45,
};

function emphasisFor(event: CombatEvent): CombatBeat["emphasis"] {
  if (event.kind === "boss") return "boss";
  if (
    event.kind === "synergy" ||
    event.kind === "frost" ||
    event.kind === "echo" ||
    event.kind === "poisonBurst"
  ) {
    return "hero";
  }
  if (event.code === "status.poisonTick" || event.code === "status.burnTick") {
    return "ambient";
  }
  return "standard";
}

function durationFor(emphasis: CombatBeat["emphasis"], eventCount: number): number {
  const base =
    emphasis === "boss"
      ? 1_420
      : emphasis === "hero"
        ? 1_220
        : emphasis === "standard"
          ? 1_050
          : 400;
  return base + Math.min(2, Math.max(0, eventCount - 1)) * 90;
}

function eventPriority(event: CombatEvent): number {
  if (event.kind === "boss") return 100;
  if (event.kind === "poisonBurst") return 90;
  if (event.kind === "synergy" || event.kind === "frost" || event.kind === "echo") return 80;
  if (event.kind === "damage") return 70 + event.amount;
  if (event.kind === "poison" || event.kind === "burn") return 60 + event.amount;
  if (event.kind === "shield" || event.kind === "heal" || event.kind === "cleanse") return 50 + event.amount;
  return event.amount;
}

function primaryEvent(events: readonly CombatEvent[]): CombatEvent {
  return events.reduce((selected, candidate) =>
    eventPriority(candidate) > eventPriority(selected) ? candidate : selected,
  );
}

function belongsToBeat(first: CombatEvent, candidate: CombatEvent): boolean {
  if (candidate.time !== first.time) return false;
  const firstStatusTick = first.code === "status.poisonTick" || first.code === "status.burnTick";
  const candidateStatusTick = candidate.code === "status.poisonTick" || candidate.code === "status.burnTick";
  if (firstStatusTick || candidateStatusTick) {
    return firstStatusTick && candidateStatusTick && first.target === candidate.target;
  }
  return first.actor === candidate.actor && first.sourceUid === candidate.sourceUid;
}

export function createCombatTimeline(events: readonly CombatEvent[]): CombatTimeline {
  const beats: CombatBeat[] = [];
  let startsAtMs = 260;

  for (let index = 0; index < events.length; ) {
    const first = events[index];
    if (!first) break;
    const grouped = [first];
    let cursor = index + 1;
    while (cursor < events.length) {
      const candidate = events[cursor];
      if (!candidate || !belongsToBeat(first, candidate)) break;
      grouped.push(candidate);
      cursor += 1;
    }

    const event = primaryEvent(grouped);
    const emphasis = emphasisFor(event);
    const durationMs = durationFor(emphasis, grouped.length);
    const snapshot = grouped[grouped.length - 1] ?? event;
    beats.push({
      id: `${first.time}:${first.actor}:${first.sourceUid}:${index}`,
      eventIndex: cursor - 1,
      event,
      snapshot,
      events: grouped,
      startsAtMs,
      durationMs,
      emphasis,
    });
    startsAtMs += durationMs;
    index = cursor;
  }

  return {
    beats,
    durationMs: beats.length === 0 ? 650 : startsAtMs + 440,
  };
}

export function getPlaybackElapsedMs(
  offsetMs: number,
  startedAt: number,
  now: number,
  speed: BattlePlaybackSpeed,
  paused: boolean,
): number {
  if (paused) return offsetMs;
  return offsetMs + Math.max(0, now - startedAt) * SPEED_MULTIPLIER[speed];
}

export function getBeatAt(
  timeline: CombatTimeline,
  elapsedMs: number,
): CombatBeat | null {
  let selected: CombatBeat | null = null;
  for (const beat of timeline.beats) {
    if (beat.startsAtMs > elapsedMs) break;
    selected = beat;
  }
  return selected;
}

export function getTimelineProgress(timeline: CombatTimeline, elapsedMs: number): number {
  return Math.max(0, Math.min(1, elapsedMs / Math.max(1, timeline.durationMs)));
}
