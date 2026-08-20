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
    file: "wall.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-wall-arched": {
    file: "wall_arched.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-wall-shelves": {
    file: "wall_shelves.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-wall-cracked": {
    file: "wall_cracked.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-floor-tile": {
    file: "floor_tile_large.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-floor-wood": {
    file: "floor_wood_large.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-pillar": {
    file: "pillar_decorated.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-shelves": {
    file: "shelves.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-candles": {
    file: "candle_triple.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-bottle-green": {
    file: "bottle_A_green.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "workshop-bottle-brown": {
    file: "bottle_A_brown.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "arena-banner-blue": {
    file: "banner_patternC_blue.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "arena-banner-red": {
    file: "banner_patternC_red.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-torch-mounted": {
    file: "torch_mounted.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-crates": {
    file: "crates_stacked.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
  "dungeon-barrels": {
    file: "barrel_small_stack.gltf",
    source: "KayKit Dungeon Pack 1.1",
    license: "CC0-1.0",
  },
} as const;

export type ProductionAssetId = keyof typeof PRODUCTION_ASSETS;

export function productionAssetUrl(asset: ProductionAssetId): string {
  return `${import.meta.env.BASE_URL}assets/kaykit-dungeon/${PRODUCTION_ASSETS[asset].file}`;
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

function polishMaterial(material: Material, tint?: ColorRepresentation): Material {
  const clone = material.clone();
  if (clone instanceof MeshStandardMaterial) {
    if (tint) clone.color.multiply(new Color(tint));
    clone.roughness = Math.max(0.58, clone.roughness);
    clone.metalness = Math.min(0.16, clone.metalness);
    clone.envMapIntensity = 0.34;
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
}: {
  asset: ProductionAssetId;
  position?: Vector3Tuple;
  rotation?: Euler | Vector3Tuple;
  scale?: number | Vector3Tuple;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tint?: ColorRepresentation;
}) {
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
        ? sourceMaterial.map((material) => polishMaterial(material, tint))
        : polishMaterial(sourceMaterial, tint);
    });
  }, [castShadow, model, receiveShadow, tint]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={model} />
    </group>
  );
}
