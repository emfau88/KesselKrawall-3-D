import type { CombatEvent } from "../../core/types";

export interface ItemMotionProfile {
  readonly duration: number;
  readonly height: number;
  readonly arc: number;
  readonly spin: number;
  readonly impact: number;
}

const DEFAULT_MOTION: ItemMotionProfile = { duration: 0.56, height: 1.34, arc: 1.08, spin: 0.16, impact: 1.72 };
const ITEM_MOTION: Readonly<Record<string, ItemMotionProfile>> = {
  chili: { duration: 0.48, height: 1.18, arc: 0.72, spin: 0.28, impact: 1.92 },
  "dragon-tooth": { duration: 0.44, height: 0.72, arc: 0.3, spin: 0.12, impact: 2.15 },
  "ember-core": { duration: 0.58, height: 1.48, arc: 1.25, spin: 0.2, impact: 1.82 },
  "cinder-berry": { duration: 0.52, height: 1.38, arc: 0.86, spin: 0.25, impact: 1.9 },
  "slime-shroom": { duration: 0.68, height: 1.72, arc: 1.34, spin: 0.14, impact: 2.1 },
  nightwing: { duration: 0.46, height: 1.8, arc: 1.55, spin: 0.34, impact: 1.68 },
  "witch-eye": { duration: 0.62, height: 1.26, arc: 0.72, spin: 0.12, impact: 2.05 },
  "venom-bulb": { duration: 0.64, height: 1.56, arc: 1.18, spin: 0.18, impact: 2.25 },
  "egg-shell": { duration: 0.54, height: 1.12, arc: 0.82, spin: 0.16, impact: 2.2 },
  "healing-tuber": { duration: 0.72, height: 1.68, arc: 1.28, spin: 0.12, impact: 2.32 },
  "gold-spoon": { duration: 0.4, height: 0.92, arc: 0.38, spin: 0.42, impact: 1.92 },
  "moon-salt": { duration: 0.5, height: 1.48, arc: 0.9, spin: 0.3, impact: 1.92 },
  "frost-shard": { duration: 0.42, height: 0.9, arc: 0.42, spin: 0.22, impact: 2.02 },
  "ice-bell": { duration: 0.58, height: 1.42, arc: 1.02, spin: 0.18, impact: 2.2 },
  "winter-bloom": { duration: 0.7, height: 1.78, arc: 1.2, spin: 0.14, impact: 2.38 },
  "rime-clock": { duration: 0.52, height: 1.34, arc: 0.78, spin: 0.32, impact: 1.88 },
  "mirror-shard": { duration: 0.44, height: 1.1, arc: 0.55, spin: 0.36, impact: 2.02 },
  "echo-bell": { duration: 0.66, height: 1.62, arc: 1.36, spin: 0.18, impact: 2.3 },
  "rune-cup": { duration: 0.64, height: 1.5, arc: 1.16, spin: 0.16, impact: 2.24 },
  "time-thread": { duration: 0.76, height: 1.92, arc: 1.48, spin: 0.2, impact: 2.45 },
};

export function itemMotion(itemId?: string): ItemMotionProfile {
  return (itemId && ITEM_MOTION[itemId]) || DEFAULT_MOTION;
}

export function combatMotionTiming(event: CombatEvent) {
  const travels = event.actor !== event.target && event.code !== "status.poisonTick" && event.code !== "status.burnTick";
  const chargeMs = travels ? 260 : 160;
  const flightMs = travels ? Math.round(itemMotion(event.sourceItemId).duration * 1_000) : 0;
  const impactAtMs = chargeMs + flightMs;
  const impactMs = 360;
  return { travels, chargeMs, flightMs, impactAtMs, impactMs, visibleMs: impactAtMs + impactMs };
}

export function combatMotionPhase(event: CombatEvent, elapsedMs: number) {
  const timing = combatMotionTiming(event);
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return {
    ...timing,
    flightProgress: timing.travels ? clamp((elapsedMs - timing.chargeMs) / timing.flightMs) : 1,
    impactProgress: clamp((elapsedMs - timing.impactAtMs) / timing.impactMs),
    landed: elapsedMs >= timing.impactAtMs,
  };
}
