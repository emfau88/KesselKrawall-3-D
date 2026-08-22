import type { CombatEvent, Side } from "../../core/types";
import { itemCopy } from "../content/gameText";

export type FloatingCombatNumberType =
  | "damage"
  | "heal"
  | "shield"
  | "poison"
  | "burn"
  | "cleanse"
  | "frost"
  | "boss";

export interface FloatingCombatNumber {
  readonly id: string;
  readonly target: Side;
  readonly type: FloatingCombatNumberType;
  readonly value: number;
  readonly positive: boolean;
  readonly sourceItemId?: string;
  readonly hitCount: number;
  readonly createdAt: number;
  readonly lastHitAt: number;
  readonly expiresAt: number;
}

export const FLOATING_NUMBER_LIFETIME_MS = 1_150;
const STANDARD_BUNDLE_WINDOW_MS = 300;
const STATUS_BUNDLE_WINDOW_MS = 450;
const MAX_PER_SIDE = 2;

function numberType(event: CombatEvent): FloatingCombatNumberType | null {
  if (event.code === "status.poisonTick" || event.code === "status.poisonBurst" || event.code === "item.poison") return "poison";
  if (event.code === "status.burnApplied" || event.code === "status.burnTick") return "burn";
  if (event.code === "status.poisonCleansed") return "cleanse";
  if (event.code === "synergy.frostDelay") return "frost";
  if (event.kind === "heal") return "heal";
  if (event.kind === "shield" || event.kind === "synergy") return "shield";
  if (event.kind === "boss") return "boss";
  if (event.kind === "damage") return "damage";
  return null;
}

export function createFloatingCombatNumbers(
  events: readonly CombatEvent[],
  idPrefix: string,
  now: number,
): FloatingCombatNumber[] {
  return events.flatMap((event, index) => {
    const type = numberType(event);
    if (!type || event.amount <= 0 || event.kind === "echo") return [];
    return [{
      id: `${idPrefix}-${index}-${type}`,
      target: event.target,
      type,
      value: event.amount,
      positive: event.code === "item.poison" || event.code === "status.burnApplied" || event.kind === "heal" || event.kind === "shield" || event.kind === "synergy" || event.kind === "frost" || event.kind === "boss",
      sourceItemId: event.code.startsWith("item.") ? event.sourceItemId : undefined,
      hitCount: 1,
      createdAt: now,
      lastHitAt: now,
      expiresAt: now + FLOATING_NUMBER_LIFETIME_MS,
    }];
  });
}

function bundleWindow(type: FloatingCombatNumberType): number {
  return type === "poison" || type === "burn" ? STATUS_BUNDLE_WINDOW_MS : STANDARD_BUNDLE_WINDOW_MS;
}

function capped(numbers: readonly FloatingCombatNumber[]): FloatingCombatNumber[] {
  const ids = new Set(
    (["player", "enemy"] as const).flatMap((target) =>
      numbers.filter((number) => number.target === target).slice(-MAX_PER_SIDE).map((number) => number.id),
    ),
  );
  return numbers.filter((number) => ids.has(number.id));
}

export function mergeFloatingCombatNumbers(
  current: readonly FloatingCombatNumber[],
  incoming: readonly FloatingCombatNumber[],
  now: number,
): FloatingCombatNumber[] {
  let merged = current.filter((number) => number.expiresAt > now);
  for (const number of incoming) {
    const matches = merged.filter((candidate) =>
      candidate.target === number.target &&
      candidate.type === number.type &&
      candidate.positive === number.positive &&
      number.lastHitAt - candidate.lastHitAt <= bundleWindow(number.type),
    );
    if (matches.length > 0) {
      const ids = new Set(matches.map((match) => match.id));
      merged = merged.filter((candidate) => !ids.has(candidate.id));
      merged.push({
        ...number,
        id: `${number.id}-bundle-${matches.length}`,
        value: number.value + matches.reduce((sum, match) => sum + match.value, 0),
        hitCount: number.hitCount + matches.reduce((sum, match) => sum + match.hitCount, 0),
      });
    } else {
      merged.push(number);
    }
    merged = capped(merged);
  }
  return merged;
}

export function formatFloatingCombatNumber(number: FloatingCombatNumber): { value: string; label: string } {
  const source = number.sourceItemId ? `${itemCopy(number.sourceItemId).name} · ` : "";
  if (number.type === "heal") return { value: `+${number.value}`, label: `${source}Heilung` };
  if (number.type === "shield") return { value: `+${number.value}`, label: `${source}Schild` };
  if (number.type === "cleanse") return { value: `−${number.value}`, label: "Gift gereinigt" };
  if (number.type === "frost") return { value: `+${(number.value / 1_000).toFixed(2).replace(".", ",")} s`, label: "Verzögert" };
  if (number.type === "boss") return { value: `+${number.value}%`, label: "Bossmacht" };
  if (number.type === "poison") {
    return { value: `${number.positive ? "+" : "−"}${number.value}`, label: `${source}Gift` };
  }
  if (number.type === "burn") return { value: `${number.positive ? "+" : "−"}${number.value}`, label: "Brand" };
  return { value: `−${number.value}`, label: `${source}Schaden` };
}
