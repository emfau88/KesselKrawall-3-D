import type { BattleOutcome, CombatResult } from "./combat";
import type { Board, Family, ItemInstance, ItemLevel } from "./items";

export type LegacyFamily = "fire" | "poison" | "guard";
export type CampaignId = "grand-tournament" | "frostbound-vault";
export type GamePhase =
  | "intro"
  | "shop"
  | "battle"
  | "result"
  | "victory"
  | "gameover";
export type Side = "player" | "enemy";
export type OpponentRank = "regular" | "elite" | "boss";
export type BossRule = "rageAtHalf" | "timeFractureAtHalf";

export interface OpponentDefinition {
  readonly id: string;
  readonly rank: OpponentRank;
  readonly baseHp: number;
  readonly board: Board;
  readonly boardVariants?: readonly Board[];
  readonly rewardBonus?: number;
  readonly bossRule?: BossRule;
}

export interface CampaignDefinition {
  readonly id: CampaignId;
  readonly number: number;
  readonly opponents: readonly OpponentDefinition[];
  readonly fixedFamilies: readonly Family[];
  readonly selectableLegacyFamily: boolean;
  readonly defaultFamilies: readonly Family[];
  readonly openingItemByFamily: Readonly<Partial<Record<Family, string>>>;
}

export interface ShopOffer {
  readonly uid: string;
  readonly itemId: string;
  readonly bought: boolean;
}

export type ItemLocation =
  | { readonly area: "board"; readonly slot: number }
  | { readonly area: "reserve" };

export interface MergeStep {
  readonly itemId: string;
  readonly fromLevel: ItemLevel;
  readonly toLevel: ItemLevel;
  readonly target: ItemLocation;
  readonly consumed: ItemLocation | null;
}

export interface GameState {
  readonly version: 1;
  readonly campaignId: CampaignId;
  readonly activeFamilies: readonly Family[];
  readonly phase: GamePhase;
  readonly round: number;
  readonly gold: number;
  readonly seals: number;
  readonly victories: number;
  readonly board: Board;
  readonly reserve: ItemInstance | null;
  readonly offers: readonly ShopOffer[];
  readonly rerollsUsed: number;
  readonly selectedSlot: number | null;
  readonly rngState: number;
  readonly idCounter: number;
  readonly opponentVariant: number;
  readonly openingProtectionUsed: boolean;
  readonly pendingBattle: CombatResult | null;
}

export interface CampaignProgress {
  readonly wins: number;
  readonly bestSeals: number;
  readonly bestPower: number;
}

export interface PlayerProgress {
  readonly version: 1;
  readonly campaigns: Partial<Record<CampaignId, CampaignProgress>>;
}

export type GameErrorCode =
  | "shopClosed"
  | "offerUnavailable"
  | "notEnoughGold"
  | "inventoryFull"
  | "slotEmpty"
  | "reserveLocked"
  | "reserveEmpty"
  | "battleInventoryLocked"
  | "notEnoughGoldForReroll"
  | "boardEmpty";

export type DomainEvent =
  | {
      readonly type: "purchaseCommitted";
      readonly offerUid: string;
      readonly itemUid: string;
      readonly itemId: string;
      readonly cost: number;
      readonly destination: ItemLocation;
    }
  | { readonly type: "mergeResolved"; readonly step: MergeStep }
  | {
      readonly type: "synergyChanged";
      readonly family: Family;
      readonly active: boolean;
      readonly weight: number;
    }
  | { readonly type: "shopRerolled"; readonly cost: number }
  | {
      readonly type: "itemSold";
      readonly itemUid: string;
      readonly location: ItemLocation;
      readonly gold: number;
    }
  | {
      readonly type: "inventorySwapped";
      readonly first: ItemLocation;
      readonly second: ItemLocation;
    }
  | { readonly type: "battleStarted" }
  | {
      readonly type: "battleAdvanced";
      readonly outcome: BattleOutcome;
      readonly reward: number;
    };

export interface ActionResult {
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
  readonly error?: GameErrorCode;
}

export interface PurchaseMergePreview {
  readonly target: ItemLocation;
  readonly resultLevel: ItemLevel;
  readonly mergeCount: number;
}
