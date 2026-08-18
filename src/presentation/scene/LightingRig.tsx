import type { GreyboxMode } from "./GreyboxStage";

export function LightingRig({ mode, opponentId }: { mode: GreyboxMode; opponentId?: string }) {
  const workshop = mode === "workshop";
  const moor = !workshop && opponentId === "moor-martha";
  return (
    <>
      <ambientLight color={workshop ? "#9e88b1" : "#756f9b"} intensity={workshop ? 0.72 : 0.6} />
      <hemisphereLight args={[workshop ? "#ffdfaf" : "#b7b3df", "#261a31", workshop ? 1.35 : 1.15]} />
      <directionalLight
        castShadow
        color={workshop ? "#ffd59a" : "#dad3ff"}
        intensity={workshop ? 3.05 : 2.7}
        position={workshop ? [4.5, 10, 7.5] : [5.5, 11, 4.5]}
        shadow-bias={-0.0004}
        shadow-camera-bottom={-7}
        shadow-camera-far={32}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-mapSize-height={768}
        shadow-mapSize-width={768}
      />
      <pointLight color={workshop ? "#d36a3c" : moor ? "#789e3e" : "#7a63cb"} intensity={workshop ? 5.5 : 8} position={[-4, 3.5, -3]} distance={13} />
      <pointLight color={workshop ? "#8d5bbd" : moor ? "#d29055" : "#bc7bd7"} intensity={4.2} position={[4.5, 2.4, -2.5]} distance={10} />
    </>
  );
}
