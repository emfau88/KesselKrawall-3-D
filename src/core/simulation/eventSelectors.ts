import type { CombatEvent } from "../types";

export function isStatusTick(event: CombatEvent): boolean {
  return (
    event.code === "status.poisonTick" || event.code === "status.burnTick"
  );
}
export function isItemActivationEvent(event: CombatEvent): boolean {
  return event.code.startsWith("item.");
}
