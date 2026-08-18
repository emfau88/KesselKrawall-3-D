import type {
  BattleOutcome,
  Board,
  CombatEvent,
  ItemLevel,
  OpponentDefinition,
  ShopOffer,
} from "../../core/types";

export interface PurchaseVisual {
  readonly id: number;
  readonly itemId: string;
  readonly offerIndex: number;
  readonly destinationSlot: number | "reserve";
  readonly resultLevel: ItemLevel;
  readonly merged: boolean;
}

export interface CombatFrame {
  readonly eventIndex: number;
  readonly event: CombatEvent | null;
  readonly elapsedMs: number;
  readonly playbackProgress: number;
  readonly playerHp: number;
  readonly playerShield: number;
  readonly enemyHp: number;
  readonly enemyShield: number;
}

export interface WorkshopSceneState {
  readonly board: Board;
  readonly offers: readonly ShopOffer[];
  readonly selectedSlot: number | null;
  readonly reserve: import("../../core/types").ItemInstance | null;
  readonly reserveUnlocked: boolean;
  readonly reserveSelected: boolean;
  readonly purchase: PurchaseVisual | null;
  readonly onSelectSlot: (slot: number) => void;
  readonly onSelectReserve: () => void;
}

export interface ArenaSceneState {
  readonly board: Board;
  readonly opponent: OpponentDefinition;
  readonly combat: CombatFrame | null;
  readonly outcome: BattleOutcome | null;
}
