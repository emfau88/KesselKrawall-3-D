import type { Board, Family, ItemLevel } from "./items";
import type { BossRule, OpponentDefinition, Side } from "./game";

export type BattleOutcome = Side | "draw";

export type CombatEventKind =
  | "damage"
  | "poison"
  | "poisonBurst"
  | "burn"
  | "heal"
  | "shield"
  | "cleanse"
  | "synergy"
  | "frost"
  | "echo"
  | "boss";

export type CombatEventCode =
  | "item.damage"
  | "item.poison"
  | "item.shield"
  | "item.heal"
  | "status.poisonTick"
  | "status.poisonBurst"
  | "status.burnApplied"
  | "status.burnTick"
  | "status.poisonCleansed"
  | "synergy.guardStart"
  | "synergy.frostDelay"
  | "synergy.echoRepeat"
  | "boss.rage"
  | "boss.timeFracture";

export interface CombatEvent {
  readonly time: number;
  readonly kind: CombatEventKind;
  readonly code: CombatEventCode;
  readonly actor: Side;
  readonly target: Side;
  readonly sourceUid: string;
  readonly sourceItemId?: string;
  readonly family?: Family;
  readonly bossRule?: BossRule;
  readonly amount: number;
  readonly playerHp: number;
  readonly playerShield: number;
  readonly enemyHp: number;
  readonly enemyShield: number;
}

export interface ItemCombatStats {
  readonly uid: string;
  readonly itemId: string;
  readonly level: ItemLevel;
  readonly triggers: number;
  readonly hpDamage: number;
  readonly shieldDamage: number;
  readonly totalDamage: number;
  readonly healing: number;
  readonly shield: number;
  readonly poisonApplied: number;
}

export interface CombatResult {
  readonly winner: BattleOutcome;
  readonly reason: "knockout" | "timeout";
  readonly duration: number;
  readonly events: readonly CombatEvent[];
  readonly playerStats: readonly ItemCombatStats[];
  readonly enemyStats: readonly ItemCombatStats[];
  readonly finalPlayerHp: number;
  readonly finalPlayerShield: number;
  readonly finalEnemyHp: number;
  readonly finalEnemyShield: number;
  readonly playerMaxHp: number;
  readonly enemyMaxHp: number;
}

export interface BattleSimulationOptions {
  readonly combatLimitMs?: number;
  readonly enableKesselHeat?: boolean;
}

export type BattleInput = {
  readonly playerBoard: Board;
  readonly opponent: OpponentDefinition;
  readonly options?: BattleSimulationOptions;
};
