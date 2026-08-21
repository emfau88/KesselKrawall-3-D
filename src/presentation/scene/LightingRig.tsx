import type { GreyboxMode } from "./GreyboxStage";
import { assetBakeoffMode } from "./assetBakeoff";

export function LightingRig({ mode, opponentId }: { mode: GreyboxMode; opponentId?: string }) {
  const workshop = mode === "workshop";
  const moor = !workshop && opponentId === "moor-martha";
  const productionArt = assetBakeoffMode() !== "legacy";
  return (
    <>
      <ambientLight color={workshop ? "#9f8297" : productionArt ? "#9a7f73" : "#70698d"} intensity={workshop ? 0.48 : productionArt ? 0.52 : 0.42} />
      <hemisphereLight args={[workshop ? "#ffd7a1" : productionArt ? "#f3d3b1" : "#b7afd8", "#1d1325", workshop ? 1.16 : productionArt ? 1.08 : 0.92]} />
      <directionalLight
        castShadow
        color={workshop ? "#ffd59a" : productionArt ? "#ffd0a0" : "#dad3ff"}
        intensity={workshop ? 3.35 : productionArt ? 3.48 : 3.05}
        position={workshop ? [4.5, 10, 7.5] : [5.5, 11, 4.5]}
        shadow-bias={-0.0004}
        shadow-camera-bottom={-7}
        shadow-camera-far={32}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <pointLight color={workshop ? "#d35d32" : moor ? "#6fa23a" : "#7457c2"} intensity={workshop ? 6.4 : 8.8} position={[-4, 3.5, -3]} distance={13} />
      <pointLight color={workshop ? "#8151b5" : moor ? "#d38747" : "#b96ed5"} intensity={4.8} position={[4.5, 2.4, -2.5]} distance={10} />
      {workshop && <pointLight color="#ffc06f" intensity={9} position={[0, 4.8, -2.7]} distance={12} decay={2} />}
    </>
  );
}
