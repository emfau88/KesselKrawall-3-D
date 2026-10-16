import { Suspense, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, type Material } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ingredientArtAsset, ingredientMountAsset } from "./ingredientArt";
import { ProductionAssetBoundary, productionAssetUrl } from "./ProductionAsset";

// Bounded shared materials: one copy per source/state, never per frame or instance.
const materials = new WeakMap<Material, Map<string, Material>>();
function inlay(source: Material, color: string, highlighted: boolean): Material {
  if (!(source instanceof MeshStandardMaterial) || !source.name.includes("rune inlay")) return source;
  let variants = materials.get(source);
  if (!variants) { variants = new Map(); materials.set(source, variants); }
  const key = `${color}:${highlighted}`;
  let result = variants.get(key);
  if (!result) {
    const clone = source.clone();
    clone.color.set(color);
    clone.emissive.set(color);
    clone.emissiveIntensity = highlighted ? 0.65 : 0.16;
    variants.set(key, clone); result = clone;
  }
  return result;
}

function LoadedPedestal({ accent, selected, upgradeLevel }: { accent: string; selected: boolean; upgradeLevel?: 2 | 3 }) {
  const asset = upgradeLevel ? ingredientMountAsset() : ingredientArtAsset("pedestal");
  const gltf = useLoader(GLTFLoader, productionAssetUrl(asset));
  const object = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse(node => {
      if (!(node instanceof Mesh)) return;
      node.castShadow = true; node.receiveShadow = true;
      if (upgradeLevel && node.morphTargetInfluences && node.morphTargetDictionary) {
        for (const [name,index] of Object.entries(node.morphTargetDictionary)) node.morphTargetInfluences[index] = name === (upgradeLevel === 3 ? "LevelIII" : "LevelII") ? 1 : 0;
      }
      node.material = Array.isArray(node.material) ? node.material.map(m => inlay(m, accent, selected)) : inlay(node.material, accent, selected);
    });
    return clone;
  }, [gltf.scene, accent, selected, upgradeLevel]);
  return <group userData={{ productionAsset: asset, fantasyPedestal: true }}><primitive object={object} dispose={null} /></group>;
}

export function FantasyPedestal({ accent = "#b3a082", selected = false, arena = false, upgradeLevel }: {
  accent?: string; selected?: boolean; arena?: boolean; upgradeLevel?: 2 | 3;
}) {
  return <group position={[0, arena ? -0.47 : 0, 0]} scale={arena ? [1.18, 1, 1.18] : 1}>
    <ProductionAssetBoundary fallback={null}><Suspense fallback={null}><LoadedPedestal accent={accent} selected={selected} /></Suspense></ProductionAssetBoundary>
    {upgradeLevel && <ProductionAssetBoundary fallback={null}><Suspense fallback={null}><LoadedPedestal accent={accent} selected={selected} upgradeLevel={upgradeLevel} /></Suspense></ProductionAssetBoundary>}
  </group>;
}
