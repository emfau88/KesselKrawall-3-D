import { isMockupCompositionEnabled } from "./compositionMode";
import { getRuntimeQualityProfile } from "./runtimeQuality";

export function ingredientArtEnabled(): boolean {
  return isMockupCompositionEnabled() && new URLSearchParams(window.location.search).get("ingredients") !== "before";
}

/** 1539387 remains reproducible; older pre-3A assets still use ingredients=before. */
export function ingredientPolishEnabled(): boolean {
  return ingredientArtEnabled() && new URLSearchParams(window.location.search).get("ingredients") !== "phase3a";
}

export const PHASE3A_ITEMS = ["chili", "slime-shroom", "egg-shell"] as const;
export type Phase3AItem = typeof PHASE3A_ITEMS[number];
export function isPhase3AItem(id: string): id is Phase3AItem {
  return PHASE3A_ITEMS.some(item => item === id);
}

export function ingredientUpgradeLevel(itemId: string | undefined, level: 1 | 2 | 3 | undefined): 2 | 3 | undefined {
  return ingredientPolishEnabled() && isPhase3AItem(itemId ?? "") && (level === 2 || level === 3) ? level : undefined;
}

export const INGREDIENT_ART_ASSETS = {
  "ingredient-polish-chili-desktop": { root: "ingredient-phase3a-polish", file: "chili-desktop.glb", materialPolicy: "authored" },
  "ingredient-polish-chili-mobile": { root: "ingredient-phase3a-polish", file: "chili-mobile.glb", materialPolicy: "authored" },
  "ingredient-polish-slime-shroom-desktop": { root: "ingredient-phase3a-polish", file: "slime-shroom-desktop.glb", materialPolicy: "authored" },
  "ingredient-polish-slime-shroom-mobile": { root: "ingredient-phase3a-polish", file: "slime-shroom-mobile.glb", materialPolicy: "authored" },
  "ingredient-polish-egg-shell-desktop": { root: "ingredient-phase3a-polish", file: "egg-shell-desktop.glb", materialPolicy: "authored" },
  "ingredient-polish-egg-shell-mobile": { root: "ingredient-phase3a-polish", file: "egg-shell-mobile.glb", materialPolicy: "authored" },
  "ingredient-polish-tier-mount-desktop": { root: "ingredient-phase3a-polish", file: "tier-mount-desktop.glb", materialPolicy: "authored" },
  "ingredient-polish-tier-mount-mobile": { root: "ingredient-phase3a-polish", file: "tier-mount-mobile.glb", materialPolicy: "authored" },
  "ingredient-phase3a-pedestal-desktop": { root: "ingredient-phase3a", file: "pedestal-desktop.glb", materialPolicy: "authored" },
  "ingredient-phase3a-pedestal-mobile": { root: "ingredient-phase3a", file: "pedestal-mobile.glb", materialPolicy: "authored" },
  "ingredient-phase3a-chili-desktop": { root: "ingredient-phase3a", file: "chili-desktop.glb", materialPolicy: "authored" },
  "ingredient-phase3a-chili-mobile": { root: "ingredient-phase3a", file: "chili-mobile.glb", materialPolicy: "authored" },
  "ingredient-phase3a-slime-shroom-desktop": { root: "ingredient-phase3a", file: "slime-shroom-desktop.glb", materialPolicy: "authored" },
  "ingredient-phase3a-slime-shroom-mobile": { root: "ingredient-phase3a", file: "slime-shroom-mobile.glb", materialPolicy: "authored" },
  "ingredient-phase3a-egg-shell-desktop": { root: "ingredient-phase3a", file: "egg-shell-desktop.glb", materialPolicy: "authored" },
  "ingredient-phase3a-egg-shell-mobile": { root: "ingredient-phase3a", file: "egg-shell-mobile.glb", materialPolicy: "authored" },
} as const;

export function ingredientArtAsset(id: Phase3AItem | "pedestal", tier = getRuntimeQualityProfile().tier): keyof typeof INGREDIENT_ART_ASSETS {
  if (id !== "pedestal" && ingredientPolishEnabled()) return `ingredient-polish-${id}-${tier === "mobile" ? "mobile" : "desktop"}`;
  return `ingredient-phase3a-${id}-${tier === "mobile" ? "mobile" : "desktop"}`;
}

export function ingredientMountAsset(tier = getRuntimeQualityProfile().tier): keyof typeof INGREDIENT_ART_ASSETS {
  return `ingredient-polish-tier-mount-${tier === "mobile" ? "mobile" : "desktop"}`;
}

/** Keep the foot at the plinth top while the existing level scale/animation remains intact. */
export function ingredientRestHeight(level: number, arena = false, itemId = "egg-shell"): number {
  const bottom = ingredientPolishEnabled() && isPhase3AItem(itemId) ? polishedIngredientBottom(itemId, level)
    : itemId === "chili" ? 0.572 : itemId === "slime-shroom" ? 0.532 : 0.52;
  return (arena ? -0.245 : 0.225) + bottom * 0.98 * (0.78 + level * 0.14);
}

/** Measured Blender morph minima, checked against the exported manifest in tests. */
export function polishedIngredientBottom(itemId: Phase3AItem, level: number, tier = getRuntimeQualityProfile().tier): number {
  if (itemId !== "chili") return 0.52;
  const minima = tier === "mobile" ? [0.62117022, 0.63017434, 0.63917845] : [0.61056137, 0.61916351, 0.62776566];
  return minima[level - 1] ?? minima[0]!;
}
