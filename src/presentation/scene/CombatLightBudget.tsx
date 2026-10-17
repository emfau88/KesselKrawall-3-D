import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { installCombatLightBudget } from "./combatLightSlots";

export function CombatLightBudget({ active }: { active: boolean }) {
  const scene = useThree(state => state.scene);
  useLayoutEffect(() => {
    if (!active) return;
    const budget = installCombatLightBudget(scene);
    return () => budget.dispose();
  }, [scene, active]);
  return null;
}
