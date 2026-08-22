import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { ArenaGreybox } from "./ArenaGreybox";
import { getOpponentPresentation } from "../content/opponentPresentation";
import { FixedCamera } from "./FixedCamera";
import { LightingRig } from "./LightingRig";
import { productionAssetUrl, ProductionAssetBoundary, type ProductionAssetId } from "./ProductionAsset";
import { getRuntimeQualityProfile } from "./runtimeQuality";
import { WorkshopGreybox } from "./WorkshopGreybox";
import type { ArenaSceneState, WorkshopSceneState } from "./sceneTypes";

export type GreyboxMode = "workshop" | "arena";

function BattleAssetGate({
  assets,
  readinessKey,
  onReady,
}: {
  assets: readonly ProductionAssetId[];
  readinessKey: string;
  onReady: (readinessKey: string) => void;
}) {
  const urls = useMemo(() => assets.map(productionAssetUrl), [assets]);
  useLoader(GLTFLoader, urls);
  const renderedFrames = useRef(0);
  useFrame(() => {
    renderedFrames.current += 1;
    if (renderedFrames.current !== 2) return;
    onReady(readinessKey);
  });
  return null;
}

export function GreyboxStage({
  mode,
  workshop,
  arena,
  criticalAssets = [],
  readinessKey,
  onSceneReady,
}: {
  mode: GreyboxMode;
  workshop: WorkshopSceneState;
  arena: ArenaSceneState;
  criticalAssets?: readonly ProductionAssetId[];
  readinessKey?: string;
  onSceneReady?: (readinessKey: string) => void;
}) {
  const quality = getRuntimeQualityProfile();
  const arenaPresentation = getOpponentPresentation(arena.opponent.id);
  const background = mode === "workshop" ? "#171016" : arenaPresentation.background;
  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, quality.maxDpr]}
      gl={{
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.02,
      }}
      orthographic
      shadows={{ type: PCFShadowMap }}
    >
      <color attach="background" args={[background]} />
      <fog
        attach="fog"
        args={mode === "arena" ? [background, 25, 46] : [background, 17, 34]}
      />
      <FixedCamera mode={mode} />
      <LightingRig
        mode={mode}
        opponentId={mode === "arena" ? arena.opponent.id : undefined}
        shadowMapSize={quality.shadowMapSize}
      />
      {readinessKey && onSceneReady && criticalAssets.length > 0 && (
        <ProductionAssetBoundary fallback={null}>
          <Suspense fallback={null}>
            <BattleAssetGate assets={criticalAssets} onReady={onSceneReady} readinessKey={readinessKey} />
          </Suspense>
        </ProductionAssetBoundary>
      )}
      {mode === "workshop" ? (
        <WorkshopGreybox scene={workshop} />
      ) : (
        <ArenaGreybox scene={arena} />
      )}
      <mesh receiveShadow position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color={mode === "arena" ? arenaPresentation.floor : "#1d1722"} roughness={1} />
      </mesh>
    </Canvas>
  );
}

export default GreyboxStage;
