import { describe, expect, test } from "vitest";

import type { Board } from "../../core/types";
import { getBattleCriticalAssetIds } from "../../presentation/scene/assetReadiness";

const emptyBoard = [null, null, null, null, null] as Board;
const heroBoard = [
  { uid: "chili-1", itemId: "chili", level: 1 as const },
  { uid: "shell-1", itemId: "rune-shell", level: 1 as const },
  null,
  null,
  null,
] as Board;

describe("battle asset readiness", () => {
  test("includes the golden cauldron kits and visible hero ingredients", () => {
    const assets = getBattleCriticalAssetIds(heroBoard, emptyBoard, "moor-martha", "golden");

    expect(assets).toContain("hero-cauldron-player-kit");
    expect(assets).toContain("hero-cauldron-moor-kit");
    expect(assets).toContain("ingredient-chili");
    expect(assets).toContain("ingredient-rune-shell");
    expect(new Set(assets).size).toBe(assets.length);
  });

  test("keeps the legacy comparison on its dedicated hero assets", () => {
    const assets = getBattleCriticalAssetIds(emptyBoard, emptyBoard, "moor-martha", "legacy");

    expect(assets).toContain("hero-cauldron-player");
    expect(assets).toContain("hero-cauldron-moor");
    expect(assets).not.toContain("quaternius-cauldron-base");
  });
});

