import { describe, expect, test } from "vitest";

import { GRAND_TOURNAMENT_OPPONENTS } from "../../core/data";
import { simulateBattle } from "../../core/simulation";
import {
  createEmptyProgress,
  hasCompletedCampaign,
  loadPlayerProgress,
  loadStoredGame,
  persistGame,
  persistPlayerProgress,
  recordCampaignVictory,
  RUN_STORAGE_KEY,
  sanitizeStoredState,
  type KeyValueStorage,
} from "../../core/storage";
import { createInitialState, enterOpeningShop, recordBattleResult } from "../../core/state";
import type { GameState } from "../../core/types";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("browser-neutral storage", () => {
  test("round-trips a valid shop state", () => {
    const storage = new MemoryStorage();
    const state = enterOpeningShop(createInitialState(321));
    expect(persistGame(storage, state)).toBe(true);
    expect(loadStoredGame(storage)).toEqual(state);
  });

  test("round-trips an atomic battle with its structured event stream", () => {
    const storage = new MemoryStorage();
    const base = createInitialState(77);
    const battleState: GameState = {
      ...base,
      phase: "battle",
      board: [
        { uid: "player-chili", itemId: "chili", level: 2 },
        null,
        null,
        null,
        null,
      ],
    };
    const result = simulateBattle(
      battleState.board,
      GRAND_TOURNAMENT_OPPONENTS[0],
    );
    const atomic = recordBattleResult(battleState, result);
    expect(persistGame(storage, atomic)).toBe(true);
    expect(loadStoredGame(storage)).toEqual(atomic);
  });

  test("rejects malformed json and deeply invalid ids", () => {
    const storage = new MemoryStorage();
    storage.values.set(RUN_STORAGE_KEY, "{not-json");
    expect(loadStoredGame(storage)).toBeNull();

    const state = createInitialState();
    expect(
      sanitizeStoredState({
        ...state,
        board: [
          { uid: "bad", itemId: "not-an-item", level: 1 },
          null,
          null,
          null,
          null,
        ],
      }),
    ).toBeNull();
  });

  test("rejects resumable combat phases without an atomic result", () => {
    expect(
      sanitizeStoredState({ ...createInitialState(), phase: "battle" }),
    ).toBeNull();
  });

  test("reports unavailable storage without throwing", () => {
    const blocked: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => undefined,
    };
    expect(persistGame(blocked, createInitialState())).toBe(false);
    expect(persistPlayerProgress(blocked, createEmptyProgress())).toBe(false);
  });

  test("stores campaign unlock progress without combat bonuses", () => {
    const storage = new MemoryStorage();
    const progress = recordCampaignVictory(
      createEmptyProgress(),
      "grand-tournament",
      2,
      87,
    );
    expect(hasCompletedCampaign(progress, "grand-tournament")).toBe(true);
    expect(persistPlayerProgress(storage, progress)).toBe(true);
    expect(loadPlayerProgress(storage)).toEqual(progress);
    expect(progress).not.toHaveProperty("damageBonus");
  });
});
