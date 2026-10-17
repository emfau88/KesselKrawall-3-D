import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { ArenaGreybox } from "./ArenaGreybox";
import { CombatLightBudget } from "./CombatLightBudget";
import { WorkshopLightBudget } from "./WorkshopLightBudget";
import { syncCombatLightSlots } from "./combatLightSlots";
import { prepareScenePrograms } from "./prepareScenePrograms";
import { getOpponentPresentation } from "../content/opponentPresentation";
import { FixedCamera } from "./FixedCamera";
import { LightingRig } from "./LightingRig";
import { productionAssetUrl, ProductionAssetBoundary, type ProductionAssetId } from "./ProductionAsset";
import { getRuntimeQualityProfile } from "./runtimeQuality";
import { WorkshopGreybox } from "./WorkshopGreybox";
import { isMockupCompositionEnabled, mockupCameraMode } from "./compositionMode";
import type { ArenaSceneState, WorkshopSceneState } from "./sceneTypes";

export type GreyboxMode = "workshop" | "arena";

function BattleAssetGate({
  assets,
  readinessKey,
  onDecoded,
}: {
  assets: readonly ProductionAssetId[];
  readinessKey: string;
  onDecoded: (readinessKey: string) => void;
}) {
  const urls = useMemo(() => assets.map(productionAssetUrl), [assets]);
  useLoader(GLTFLoader, urls);
  useLayoutEffect(() => onDecoded(readinessKey), [onDecoded, readinessKey]);
  return null;
}

/** Own the normal render call only so preparation can await asynchronous linking.
 * Existing animation callbacks still run. The last workshop frame stays behind
 * the existing preparation overlay until the actual arena is ready to draw.
 */
function PreparedSceneRenderer({ preparing, readinessKey, assets, decoded, onReady }: {
  preparing: boolean; readinessKey?: string; assets: readonly ProductionAssetId[];
  decoded: React.MutableRefObject<string | undefined>;
  onReady?: (key: string) => void;
}) {
  const preparation = useRef<{ key: string; ready: boolean; frames: number; cancel: () => void } | undefined>(undefined);
  useLayoutEffect(() => () => { preparation.current?.cancel(); preparation.current = undefined; }, [preparing, readinessKey]);
  useFrame(({ gl, scene, camera }) => {
    if (!preparing) { preparation.current = undefined; gl.render(scene, camera); return; }
    if (!readinessKey || decoded.current !== readinessKey) return;
    let current = preparation.current;
    if (!current || current.key !== readinessKey) {
      // These actual render nodes must have committed, not just their downloads.
      const required = assets.filter(id => /^(brasskin|zischbert|moor-martha)-/.test(id) || id.startsWith("ingredient-") || id.includes("ritual-platform") || id === "hero-arena-dais");
      const found = new Set<string>();
      scene.traverse(node => {
        if (node.userData.productionAsset) found.add(node.userData.productionAsset);
        if (node.userData.characterAsset) found.add(node.userData.characterAsset);
      });
      if (required.some(id => !found.has(id))) return;
      if (isMockupCompositionEnabled() && !scene.environment) return;
      current = { key: readinessKey, ready: false, frames: 0, cancel: () => {} };
      preparation.current = current;
      syncCombatLightSlots(scene, camera);
      const pending = current;
      const compilation = prepareScenePrograms(gl, scene, camera);
      current.cancel = compilation.cancel;
      void compilation.ready.then(ready => { pending.ready = ready; });
      return;
    }
    if (!current.ready) return;
    gl.render(scene, camera);
    current.frames++;
    if (current.frames === 2) onReady?.(readinessKey);
  }, 1);
  return null;
}

export function GreyboxStage({
  mode,
  workshop,
  arena,
  criticalAssets = [],
  readinessKey,
  onSceneReady,
  preparing = false,
}: {
  mode: GreyboxMode;
  workshop: WorkshopSceneState;
  arena: ArenaSceneState;
  criticalAssets?: readonly ProductionAssetId[];
  readinessKey?: string;
  onSceneReady?: (readinessKey: string) => void;
  preparing?: boolean;
}) {
  const decoded = useRef<string | undefined>(undefined);
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
      orthographic={!isMockupCompositionEnabled() || mockupCameraMode() === "orthographic"}
      shadows={{ type: PCFShadowMap }}
    >
      <CombatLightBudget active={mode === "arena"} />
      <WorkshopLightBudget active={mode === "workshop"} />
      <PreparedSceneRenderer preparing={preparing} readinessKey={readinessKey} assets={criticalAssets} decoded={decoded} onReady={onSceneReady} />
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
            <BattleAssetGate assets={criticalAssets} onDecoded={key => { decoded.current = key; }} readinessKey={readinessKey} />
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
