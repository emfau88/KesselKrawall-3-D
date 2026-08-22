import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping, PCFShadowMap } from "three";

import { ArenaGreybox } from "./ArenaGreybox";
import { FixedCamera } from "./FixedCamera";
import { LightingRig } from "./LightingRig";
import { WorkshopGreybox } from "./WorkshopGreybox";
import type { ArenaSceneState, WorkshopSceneState } from "./sceneTypes";

export type GreyboxMode = "workshop" | "arena";

export function GreyboxStage({
  mode,
  workshop,
  arena,
}: {
  mode: GreyboxMode;
  workshop: WorkshopSceneState;
  arena: ArenaSceneState;
}) {
  const moorArena = mode === "arena" && arena.opponent.id === "moor-martha";
  const background = mode === "workshop" ? "#171016" : moorArena ? "#111712" : "#100d17";
  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, 1.35]}
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
      <LightingRig mode={mode} opponentId={mode === "arena" ? arena.opponent.id : undefined} />
      {mode === "workshop" ? (
        <WorkshopGreybox scene={workshop} />
      ) : (
        <ArenaGreybox scene={arena} />
      )}
      <mesh receiveShadow position={[0, -1.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#1d1722" roughness={1} />
      </mesh>
    </Canvas>
  );
}

export default GreyboxStage;
