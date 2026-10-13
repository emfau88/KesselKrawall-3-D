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
  test("includes the actual desktop player and visible opponent/ingredient assets", () => {
    const assets = getBattleCriticalAssetIds(heroBoard, emptyBoard, "moor-martha", "golden", "balanced");

    expect(assets).toContain("brasskin-desktop");
    expect(assets).not.toContain("brasskin-mobile");
    expect(assets).not.toContain("hero-cauldron-player-kit");
    expect(assets).toContain("moor-martha-desktop");
    expect(assets).not.toContain("hero-cauldron-moor-kit");
    expect(assets).toContain("ingredient-chili");
    expect(assets).toContain("ingredient-rune-shell");
    expect(new Set(assets).size).toBe(assets.length);
  });

  test("also uses Brasskin in the legacy environment comparison", () => {
    const assets = getBattleCriticalAssetIds(emptyBoard, emptyBoard, "moor-martha", "legacy", "balanced");

    expect(assets).toContain("brasskin-desktop");
    expect(assets).not.toContain("hero-cauldron-player");
    expect(assets).toContain("moor-martha-desktop");
    expect(assets).not.toContain("hero-cauldron-moor");
    expect(assets).not.toContain("quaternius-cauldron-base");
  });

  test("warms only the mobile player variant for constrained hardware", () => {
    const assets = getBattleCriticalAssetIds(emptyBoard, emptyBoard, "zischbert", "ecosystem", "mobile");

    expect(assets).toContain("brasskin-mobile");
    expect(assets).toContain("zischbert-mobile");
    expect(assets).not.toContain("brasskin-desktop");
    expect(assets).not.toContain("zischbert-desktop");
  });

  test("keeps donor bodies critical for opponents not converted yet", () => {
    const assets = getBattleCriticalAssetIds(emptyBoard, emptyBoard, "schild-siggi", "golden", "balanced");
    expect(assets).toContain("quaternius-cauldron-base");
    expect(assets).not.toContain("zischbert-desktop");
    expect(assets).not.toContain("moor-martha-desktop");
  });

  test("gates every visible new environment model in the opt-in mockup mode", () => {
    const assets = getBattleCriticalAssetIds(heroBoard, emptyBoard, "zischbert", "mockup", "balanced");
    expect(assets).toContain("mockup-ritual-platform-desktop");
    expect(assets).toContain("mockup-wall-candle-sconce-desktop");
    expect(assets).toContain("mockup-triple-candleholder-desktop");
    expect(assets).toContain("mockup-dungeon-stone-arch-desktop");
    expect(assets).toContain("mockup-alchemy-shelf-desktop");
    expect(assets).toContain("mockup-dungeon-stone-pillar-desktop");
    expect(assets).toContain("mockup-open-grimoire-desktop");
    expect(assets).toContain("mockup-dungeon-wall-module-desktop");
    expect(assets).toContain("mockup-dungeon-floor-module-desktop");
    expect(assets).not.toContain("quaternius-floor-brick");
    expect(assets).toContain("brasskin-desktop");
    expect(assets).toContain("zischbert-desktop");
    expect(assets).not.toContain("hero-arena-dais");
    expect(assets).not.toContain("mockup-witch-workbench-desktop");
    expect(assets).not.toContain("quaternius-wall-brick");
    expect(new Set(assets).size).toBe(assets.length);
  });

  test("mockup gate loads only mobile environment LODs on constrained devices", () => {
    const assets = getBattleCriticalAssetIds(emptyBoard, emptyBoard, "moor-martha", "mockup", "mobile");
    expect(assets).toContain("mockup-ritual-platform-mobile");
    expect(assets).toContain("mockup-dungeon-wall-module-mobile");
    expect(assets.some(asset => asset.startsWith("mockup-") && asset.endsWith("desktop"))).toBe(false);
    expect(assets).toContain("moor-martha-mobile");
  });
});

