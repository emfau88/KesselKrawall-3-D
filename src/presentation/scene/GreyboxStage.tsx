import { Canvas } from "@react-three/fiber";

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
  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, 1.35]}
      gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
      orthographic
      shadows="basic"
    >
      <color attach="background" args={[mode === "workshop" ? "#251a29" : "#171322"]} />
      <fog attach="fog" args={[mode === "workshop" ? "#251a29" : "#171322", 15, 30]} />
      <FixedCamera mode={mode} />
      <LightingRig mode={mode} />
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
