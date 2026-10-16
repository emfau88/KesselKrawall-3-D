import { isMockupCompositionEnabled } from "./compositionMode";
import { getRuntimeQualityProfile } from "./runtimeQuality";

export function ingredientArtEnabled(): boolean {
  return isMockupCompositionEnabled() && new URLSearchParams(window.location.search).get("ingredients") !== "before";
}

export const PHASE3A_ITEMS = ["chili", "slime-shroom", "egg-shell"] as const;
export type Phase3AItem = typeof PHASE3A_ITEMS[number];
export function isPhase3AItem(id: string): id is Phase3AItem {
  return PHASE3A_ITEMS.some(item => item === id);
}

export const INGREDIENT_ART_ASSETS = {
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
  return `ingredient-phase3a-${id}-${tier === "mobile" ? "mobile" : "desktop"}`;
}

/** Keep the foot at the plinth top while the existing level scale/animation remains intact. */
export function ingredientRestHeight(level: number, arena = false, itemId = "egg-shell"): number {
  const bottom = itemId === "chili" ? 0.572 : itemId === "slime-shroom" ? 0.532 : 0.52;
  return (arena ? -0.245 : 0.225) + bottom * 0.98 * (0.78 + level * 0.14);
}
