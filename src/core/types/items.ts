export const FAMILIES = [
  "fire",
  "poison",
  "guard",
  "frost",
  "echo",
] as const;

export type Family = (typeof FAMILIES)[number];
export type ItemLevel = 1 | 2 | 3;

export type EffectType =
  | "damage"
  | "poison"
  | "shield"
  | "heal"
  | "hybrid"
  | "conditionalDamage"
  | "poisonDamage"
  | "shieldDamage";

export type PassiveType =
  | "hasteAdjacent"
  | "hasteFamily"
  | "powerAdjacent";

export interface PassiveDefinition {
  readonly type: PassiveType;
  readonly values: readonly [number, number, number];
  readonly family?: Family;
}

export interface ItemDefinition {
  readonly id: string;
  readonly family: Family;
  readonly cost: number;
  readonly cooldown: readonly [number, number, number];
  readonly values: readonly [number, number, number];
  readonly secondaryValues?: readonly [number, number, number];
  readonly effect: EffectType;
  readonly passive?: PassiveDefinition;
  readonly levelThreeBonus?: "burn" | "cleansePoison" | "overhealShield";
  readonly scalesWithFamily?: Family;
  readonly trigger?:
    | { readonly type: "ramp"; readonly growthPerActivation: number }
    | { readonly type: "onGuardedHit" }
    | {
        readonly type: "emergency";
        readonly threshold: number;
        readonly multiplier: number;
      };
}

export interface ItemInstance {
  readonly uid: string;
  readonly itemId: string;
  readonly level: ItemLevel;
}

export type Board = ReadonlyArray<ItemInstance | null>;
