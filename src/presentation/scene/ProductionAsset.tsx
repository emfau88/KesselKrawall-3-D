import { Component, useLayoutEffect, useMemo, type ReactNode } from "react";
import { useLoader } from "@react-three/fiber";
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  type ColorRepresentation,
  type Euler,
  type Material,
  type Vector3Tuple,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const PRODUCTION_ASSETS = {
  "dungeon-wall": {
    root: "kaykit-dungeon",
    file: "wall.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-wall-arched": {
    root: "kaykit-dungeon",
    file: "wall_arched.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-wall-shelves": {
    root: "kaykit-dungeon",
    file: "wall_shelves.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-wall-cracked": {
    root: "kaykit-dungeon",
    file: "wall_cracked.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-floor-tile": {
    root: "kaykit-dungeon",
    file: "floor_tile_large.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-floor-wood": {
    root: "kaykit-dungeon",
    file: "floor_wood_large.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-pillar": {
    root: "kaykit-dungeon",
    file: "pillar_decorated.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-shelves": {
    root: "kaykit-dungeon",
    file: "shelves.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-candles": {
    root: "kaykit-dungeon",
    file: "candle_triple.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-bottle-green": {
    root: "kaykit-dungeon",
    file: "bottle_A_green.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-bottle-brown": {
    root: "kaykit-dungeon",
    file: "bottle_A_brown.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "arena-banner-blue": {
    root: "kaykit-dungeon",
    file: "banner_patternC_blue.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "arena-banner-red": {
    root: "kaykit-dungeon",
    file: "banner_patternC_red.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-torch-mounted": {
    root: "kaykit-dungeon",
    file: "torch_mounted.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-crates": {
    root: "kaykit-dungeon",
    file: "crates_stacked.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-barrels": {
    root: "kaykit-dungeon",
    file: "barrel_small_stack.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "hero-cauldron-player": {
    root: "hero",
    file: "hero-cauldron-player.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
  "hero-cauldron-moor": {
    root: "hero",
    file: "hero-cauldron-moor.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
  "ingredient-chili": {
    root: "hero",
    file: "ingredient-chili.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
  "ingredient-slime-shroom": {
    root: "hero",
    file: "ingredient-slime-shroom.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
  "ingredient-rune-shell": {
    root: "hero",
    file: "ingredient-rune-shell.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
  "hero-workbench": {
    root: "hero",
    file: "hero-workbench.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
  "hero-arena-dais": {
    root: "hero",
    file: "hero-arena-dais.glb",
    source: "Original KesselKrawall 3D Blender pipeline",
    license: "Project original",
    materialPolicy: "authored",
  },
} as const;

export type ProductionAssetId = keyof typeof PRODUCTION_ASSETS;

export function productionAssetUrl(asset: ProductionAssetId): string {
  const definition = PRODUCTION_ASSETS[asset];
  return `${import.meta.env.BASE_URL}assets/${definition.root}/${definition.file}`;
}

export class ProductionAssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function polishMaterial(
  material: Material,
  tint?: ColorRepresentation,
  authored = false,
  opacity = 1,
): Material {
  const clone = material.clone();
  if (clone instanceof MeshStandardMaterial) {
    if (tint) clone.color.multiply(new Color(tint));
    if (!authored) {
      clone.roughness = Math.max(0.58, clone.roughness);
      clone.metalness = Math.min(0.16, clone.metalness);
      clone.envMapIntensity = 0.34;
    } else {
      clone.envMapIntensity = Math.max(0.7, clone.envMapIntensity);
    }
    if (opacity < 1) {
      clone.transparent = true;
      clone.opacity *= opacity;
      clone.depthWrite = false;
    }
  }
  return clone;
}

export function ProductionAsset({
  asset,
  position,
  rotation,
  scale = 1,
  castShadow = true,
  receiveShadow = true,
  tint,
  opacity = 1,
}: {
  asset: ProductionAssetId;
  position?: Vector3Tuple;
  rotation?: Euler | Vector3Tuple;
  scale?: number | Vector3Tuple;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tint?: ColorRepresentation;
  opacity?: number;
}) {
  const definition = PRODUCTION_ASSETS[asset];
  const authoredMaterial = "materialPolicy" in definition && definition.materialPolicy === "authored";
  const gltf = useLoader(GLTFLoader, productionAssetUrl(asset));
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useLayoutEffect(() => {
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      node.castShadow = castShadow;
      node.receiveShadow = receiveShadow;
      const originalMaterial = node.userData.productionSourceMaterial as Material | Material[] | undefined;
      const sourceMaterial = originalMaterial ?? node.material;
      node.userData.productionSourceMaterial = sourceMaterial;
      node.material = Array.isArray(sourceMaterial)
        ? sourceMaterial.map((material) => polishMaterial(material, tint, authoredMaterial, opacity))
        : polishMaterial(sourceMaterial, tint, authoredMaterial, opacity);
    });
  }, [authoredMaterial, castShadow, model, opacity, receiveShadow, tint]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={model} />
    </group>
  );
}
