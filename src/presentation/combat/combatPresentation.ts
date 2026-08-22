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
  readonly statuses: CombatStatusSnapshot;
}

export interface TimedCombatStatus {
  readonly stacks: number;
  readonly nextTickAt: number;
  readonly expiresAt: number;
  readonly interval: number;
}

export interface CombatSideStatus {
  readonly poison: TimedCombatStatus;
  readonly burn: TimedCombatStatus;
  readonly rage: boolean;
  readonly timeFracture: boolean;
  readonly delayedUntil: number;
}

export interface CombatStatusSnapshot {
  readonly player: CombatSideStatus;
  readonly enemy: CombatSideStatus;
}

interface MutableCombatStatus {
  poison: number;
  burn: Map<string, number>;
  rage: boolean;
  timeFracture: boolean;
  delayedUntil: number;
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

const POISON_INTERVAL_MS = 2_000;
const BURN_INTERVAL_MS = 1_000;
const POISON_DECAY_PER_TICK = 2;

function emptyTimedStatus(): TimedCombatStatus {
  return { stacks: 0, nextTickAt: 0, expiresAt: 0, interval: 0 };
}

function emptySideStatus(): CombatSideStatus {
  return {
    poison: emptyTimedStatus(),
    burn: emptyTimedStatus(),
    rage: false,
    timeFracture: false,
    delayedUntil: 0,
  };
}

export function createEmptyCombatStatuses(): CombatStatusSnapshot {
  return { player: emptySideStatus(), enemy: emptySideStatus() };
}

function timedPoison(stacks: number, time: number): TimedCombatStatus {
  if (stacks <= 0) return emptyTimedStatus();
  const nextTickAt = Math.floor(time / POISON_INTERVAL_MS) * POISON_INTERVAL_MS + POISON_INTERVAL_MS;
  const remainingTicks = Math.ceil(stacks / POISON_DECAY_PER_TICK);
  return {
    stacks,
    nextTickAt,
    expiresAt: nextTickAt + (remainingTicks - 1) * POISON_INTERVAL_MS,
    interval: POISON_INTERVAL_MS,
  };
}

function timedBurn(sources: Map<string, number>, time: number): TimedCombatStatus {
  const values = [...sources.values()].filter((value) => value > 0);
  if (values.length === 0) return emptyTimedStatus();
  const nextTickAt = Math.floor(time / BURN_INTERVAL_MS) * BURN_INTERVAL_MS + BURN_INTERVAL_MS;
  return {
    stacks: values.reduce((sum, value) => sum + value, 0),
    nextTickAt,
    expiresAt: nextTickAt + (Math.max(...values) - 1) * BURN_INTERVAL_MS,
    interval: BURN_INTERVAL_MS,
  };
}

function applyStatusEvent(statuses: Record<"player" | "enemy", MutableCombatStatus>, event: CombatEvent): void {
  const target = statuses[event.target];
  if (event.code === "item.poison") target.poison += event.amount;
  else if (event.code === "status.poisonTick") target.poison = Math.max(0, target.poison - POISON_DECAY_PER_TICK);
  else if (event.code === "status.poisonBurst" || event.code === "status.poisonCleansed") target.poison = 0;
  else if (event.code === "status.burnApplied") {
    target.burn.set(event.sourceUid, (target.burn.get(event.sourceUid) ?? 0) + event.amount);
  } else if (event.code === "status.burnTick") {
    const remaining = (target.burn.get(event.sourceUid) ?? 0) - 1;
    if (remaining > 0) target.burn.set(event.sourceUid, remaining);
    else target.burn.delete(event.sourceUid);
  } else if (event.code === "synergy.frostDelay") {
    target.delayedUntil = Math.max(target.delayedUntil, event.time + event.amount);
  } else if (event.code === "boss.rage") {
    statuses[event.actor].rage = true;
  } else if (event.code === "boss.timeFracture") {
    statuses[event.actor].timeFracture = true;
    target.delayedUntil = Math.max(target.delayedUntil, event.time + 900);
  }
}

function snapshotStatuses(
  statuses: Record<"player" | "enemy", MutableCombatStatus>,
  time: number,
): CombatStatusSnapshot {
  const snapshot = (side: "player" | "enemy"): CombatSideStatus => ({
    poison: timedPoison(statuses[side].poison, time),
    burn: timedBurn(statuses[side].burn, time),
    rage: statuses[side].rage,
    timeFracture: statuses[side].timeFracture,
    delayedUntil: statuses[side].delayedUntil,
  });
  return { player: snapshot("player"), enemy: snapshot("enemy") };
}

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
  const statuses: Record<"player" | "enemy", MutableCombatStatus> = {
    player: { poison: 0, burn: new Map(), rage: false, timeFracture: false, delayedUntil: 0 },
    enemy: { poison: 0, burn: new Map(), rage: false, timeFracture: false, delayedUntil: 0 },
  };

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
    grouped.forEach((groupedEvent) => applyStatusEvent(statuses, groupedEvent));
    beats.push({
      id: `${first.time}:${first.actor}:${first.sourceUid}:${index}`,
      eventIndex: cursor - 1,
      event,
      snapshot,
      events: grouped,
      startsAtMs,
      durationMs,
      emphasis,
      statuses: snapshotStatuses(statuses, snapshot.time),
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
