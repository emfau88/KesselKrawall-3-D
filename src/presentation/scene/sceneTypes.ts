import type {
  BattleOutcome,
  Board,
  CombatEvent,
  ItemInstance,
  ItemLevel,
  MergeStep,
  OpponentDefinition,
} from "../../core/types";
import type { CombatBeat, CombatStatusSnapshot } from "../combat/combatPresentation";

export interface PurchaseVisual {
  readonly id: number;
  readonly itemId: string;
  readonly offerIndex: number;
  readonly destinationSlot: number | "reserve";
  readonly resultLevel: ItemLevel;
  readonly merged: boolean;
  readonly merges: readonly MergeStep[];
  readonly beforeBoard: Board;
  readonly beforeReserve: ItemInstance | null;
  readonly afterBoard: Board;
  readonly afterReserve: ItemInstance | null;
  readonly phase: "flight" | "landing" | "merge" | "reveal";
  readonly mergeStepIndex: number;
}

export interface CombatFrame {
  readonly beatId: string | null;
  readonly eventIndex: number;
  readonly event: CombatEvent | null;
  readonly events: readonly CombatEvent[];
  readonly emphasis: CombatBeat["emphasis"] | null;
  readonly statuses: CombatStatusSnapshot;
  readonly elapsedMs: number;
  readonly playbackProgress: number;
  readonly playerHp: number;
  readonly playerShield: number;
  readonly enemyHp: number;
  readonly enemyShield: number;
}

export interface WorkshopSceneState {
  readonly board: Board;
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
  readonly events: readonly CombatEvent[];
  readonly outcome: BattleOutcome | null;
}
