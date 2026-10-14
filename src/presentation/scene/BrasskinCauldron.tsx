import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { MathUtils, Mesh, MeshStandardMaterial, type Material, type Group, type Vector3Tuple } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { CauldronReaction } from "./CauldronActor";
import { productionAssetUrl, type ProductionAssetId } from "./ProductionAsset";
import { getRuntimeQualityProfile } from "./runtimeQuality";
import { LivingLiquid, type LiquidPalette } from "./character/LivingLiquid";
import { characterAssetId, type CauldronCharacterId } from "./character/brasskinAssets";
import { createBrasskinPose, updateBrasskinPose } from "./character/brasskinMotion";
import { lightingLook } from "./lightingLook";
import { applyLightingMaterial } from "./lightingMaterials";

function setMorph(body: Mesh, name: string, value: number): void {
  const index = body.morphTargetDictionary?.[name];
  if (index !== undefined && body.morphTargetInfluences) {
    body.morphTargetInfluences[index] = MathUtils.clamp(value, 0, 1);
  }
}

export function BrasskinCauldron({
  position,
  rotation,
  scale = 1,
  reaction = "idle",
  reactionKey = -1,
  asset: suppliedAsset,
  character = "brasskin",
  bodyScale: suppliedBodyScale,
  footOffset: suppliedFootOffset,
  name: suppliedName,
  liquidPalette: suppliedPalette,
}: {
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: number;
  reaction?: CauldronReaction;
  reactionKey?: number;
  asset?: ProductionAssetId;
  character?: CauldronCharacterId;
  bodyScale?: number;
  footOffset?: number;
  name?: string;
  liquidPalette?: LiquidPalette;
}) {
  const quality = getRuntimeQualityProfile();
  const asset = suppliedAsset ?? characterAssetId(character, quality.tier);
  const bodyScale = suppliedBodyScale ?? (character === "brasskin" ? 2.55 : character === "zischbert" ? 2.8 : 3);
  const footOffset = suppliedFootOffset ?? (character === "brasskin" ? -0.91 : -0.99);
  const name = suppliedName ?? (character === "brasskin" ? "PlayerCauldron" : `EnemyCauldron-${character}`);
  const liquidPalette = suppliedPalette ?? (character === "brasskin" ? "jade" : character === "zischbert" ? "fire" : "poison");
  const gltf = useLoader(GLTFLoader, productionAssetUrl(asset));
  // Mesh clone preserves UVs and shared immutable geometry, but owns morph weights.
  const model = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.name = `Character-${asset}`;
    cloned.userData.characterAsset = asset;
    return cloned;
  }, [asset, gltf.scene]);
  const body = useMemo(() => model.getObjectByName("Body") as Mesh | undefined, [model]);
  const animated = useRef<Group>(null);
  const brew = useRef<LivingLiquid | null>(null);
  const charm = useRef<MeshStandardMaterial | null>(null);
  const pose = useRef(createBrasskinPose());
  const lastReaction = useRef({ reaction, key: reactionKey });
  const startedAt = useRef<number | null>(null);
  const reducedMotion = useRef(false);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => { reducedMotion.current = media.matches; };
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useLayoutEffect(() => {
    const ownedMaterials: Material[] = [];
    const originals: Array<{ mesh: Mesh; material: Material | Material[] }> = [];
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      originals.push({ mesh: node, material: node.material });
      const cloneMaterial = (material: Material): Material => {
        const cloned = material.clone();
        applyLightingMaterial(cloned, asset, lightingLook());
        ownedMaterials.push(cloned);
        return cloned;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(cloneMaterial)
        : cloneMaterial(node.material);
      node.castShadow = node.name === "Body";
      node.receiveShadow = node.name === "Body";
      if (node.name === "CharmGlow" && node.material instanceof MeshStandardMaterial) {
        charm.current = node.material;
      }
    });
    const surface = model.getObjectByName("LiquidSurface");
    if (surface instanceof Mesh) {
      brew.current = new LivingLiquid(surface, model, quality.tier, liquidPalette);
    }
    return () => {
      brew.current?.dispose();
      brew.current = null;
      charm.current = null;
      for (const original of originals) original.mesh.material = original.material;
      // Textures/Body geometry belong to the loader cache and stay reusable.
      for (const material of ownedMaterials) material.dispose();
    };
  }, [asset, liquidPalette, model, quality.tier]);

  useFrame(({ clock }) => {
    if (!animated.current || !body) return;
    const time = clock.elapsedTime;
    if (startedAt.current === null || lastReaction.current.key !== reactionKey || lastReaction.current.reaction !== reaction) {
      startedAt.current = time;
      lastReaction.current.key = reactionKey;
      lastReaction.current.reaction = reaction;
    }
    const current = pose.current;
    updateBrasskinPose(current, reaction, time - startedAt.current, time, reducedMotion.current);
    animated.current.position.y = current.offsetY;
    animated.current.rotation.set(current.rotationX, 0, current.rotationZ);
    animated.current.scale.set(current.scaleX, current.scaleY, current.scaleX);
    setMorph(body, "Blink_L", current.blink);
    setMorph(body, "Blink_R", current.blink);
    setMorph(body, "Smile", current.smile);
    setMorph(body, "Surprise", current.surprise);
    setMorph(body, "Hurt", current.hurt);
    setMorph(body, "FaceNeutral", current.neutral);
    setMorph(body, "Look_L", current.lookLeft);
    setMorph(body, "Look_R", current.lookRight);
    brew.current?.update(time, current, reducedMotion.current);
    if (charm.current) charm.current.emissiveIntensity = 0.5 + current.glow * 0.7;
  });

  return (
    <group name={name} position={position} rotation={rotation} scale={scale}>
      <group position={[0, footOffset, 0]}>
        <group ref={animated}>
          <group scale={bodyScale}>
            <primitive object={model} dispose={null} />
          </group>
        </group>
      </group>
      <pointLight color={liquidPalette === "fire" ? "#ffa04d" : liquidPalette === "poison" ? "#b4e655" : "#45dcc0"} intensity={1.1} distance={3.2} position={[0, 1.06, 0]} />
    </group>
  );
}
