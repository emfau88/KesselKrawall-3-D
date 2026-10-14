import { Color, MeshStandardMaterial, type Material } from "three";
import type { LightingLook } from "./lightingLook";

/** Mutates ONLY an owned clone; source textures, UVs and loaded GLBs stay intact.
 * The three candidates share this conservative material pass so the comparison
 * isolates light direction/palette rather than three unrelated texture grades. */
export function applyLightingMaterial(material: Material, asset: string, look: LightingLook): void {
  if (look === "reference" || !(material instanceof MeshStandardMaterial)) return;
  if (asset.startsWith("mockup-")) {
    const wood = asset.includes("witch-workbench");
    const stone = /dungeon-|ritual-platform/.test(asset);
    const shelf = asset.includes("alchemy-shelf");
    material.color.multiply(new Color(wood ? "#dbb78e" : stone ? "#d4cec4" : shelf ? "#ead5b7" : "#f1dfc7"));
    // Mixed atlases include wood, glass, wax and metal: do not make the entire atlas metallic.
    material.metalness = 0;
    material.roughness = wood ? 0.76 : stone ? 0.94 : Math.max(0.72, material.roughness);
    material.envMapIntensity = stone ? 0.45 : wood ? 0.58 : 0.65;
    // Baked shading already exists in these atlases: no added fake AO / emissive lift.
  } else if (material.name === "Brasskin_PaintedShell") {
    material.roughness = 0.46;
    material.metalness = 0.38;
    material.envMapIntensity = 1.15;
  } else if (material.name.includes("OriginalPaintedSculpt")) {
    material.envMapIntensity = 0.85;
    // Keep painted iron / mossy ceramic distinct; no global metalness override.
  }
}
