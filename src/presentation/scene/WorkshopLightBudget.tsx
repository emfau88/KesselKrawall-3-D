import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { installWorkshopLightBudget } from "./workshopLightSlots";
import { assetBakeoffMode } from "./assetBakeoff";

export function WorkshopLightBudget({ active }: { active: boolean }) {
  const scene = useThree(state => state.scene);
  useLayoutEffect(() => {
    if (!active) return;
    // LightingRig + cauldron + existing candles, including the temporary
    // backdrop candle while an environment Suspense boundary is loading.
    const art = assetBakeoffMode();
    const budget = installWorkshopLightBudget(scene, art === "mockup" ? 6 : art === "legacy" ? 8 : 7);
    return () => budget.dispose();
  }, [scene, active]);
  return null;
}
