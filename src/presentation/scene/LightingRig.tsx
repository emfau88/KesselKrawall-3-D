import type { GreyboxMode } from "./GreyboxStage";
import { assetBakeoffMode } from "./assetBakeoff";
import { getOpponentPresentation } from "../content/opponentPresentation";

export function LightingRig({ mode, opponentId, shadowMapSize = 1024 }: { mode: GreyboxMode; opponentId?: string; shadowMapSize?: 512 | 1024 }) {
  const workshop = mode === "workshop";
  const presentation = getOpponentPresentation(opponentId ?? "rival");
  const productionArt = assetBakeoffMode() !== "legacy";
  return (
    <>
      <ambientLight color={workshop ? "#9f8297" : presentation.steam} intensity={workshop ? 0.48 : productionArt ? 0.7 : 0.54} />
      <hemisphereLight args={[workshop ? "#ffd7a1" : productionArt ? "#f7dbc0" : "#b7afd8", workshop ? "#1d1325" : "#28202d", workshop ? 1.16 : productionArt ? 1.24 : 1.02]} />
      <directionalLight
        castShadow
        color={workshop ? "#ffd59a" : productionArt ? "#ffd0a0" : "#dad3ff"}
        intensity={workshop ? 3.35 : productionArt ? 3.48 : 3.05}
        position={workshop ? [4.5, 10, 7.5] : [4.4, 11.5, 2.2]}
        shadow-bias={-0.0004}
        shadow-camera-bottom={-7}
        shadow-camera-far={32}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-mapSize-height={shadowMapSize}
        shadow-mapSize-width={shadowMapSize}
      />
      <pointLight color={workshop ? "#d35d32" : presentation.glow} intensity={workshop ? 6.4 : 8.8} position={[-4, 3.5, -3]} distance={13} />
      <pointLight color={workshop ? "#8151b5" : presentation.secondaryGlow} intensity={4.8} position={[4.5, 2.4, -2.5]} distance={10} />
      {workshop && <pointLight color="#ffc06f" intensity={9} position={[0, 4.8, -2.7]} distance={12} decay={2} />}
      {!workshop && (
        <>
          <pointLight color={presentation.steam} intensity={8.2} position={[0.4, 4.8, -3.45]} distance={9.5} decay={2} />
          <pointLight color={presentation.secondaryGlow} intensity={3.4} position={[-1.2, 3.3, 4.15]} distance={7.5} decay={2} />
          <pointLight color={presentation.glow} intensity={3.1} position={[0, 5.1, -5.7]} distance={8.5} decay={2} />
          <pointLight color={presentation.glow} intensity={6.2} position={[0, 2.15, -3.35]} distance={6.5} decay={2} />
          <pointLight color={presentation.glow} intensity={3.8} position={[-4.4, 1.1, -2.25]} distance={7.2} decay={2} />
          <pointLight color={presentation.secondaryGlow} intensity={3.4} position={[4.5, 1.5, -1.85]} distance={6.8} decay={2} />
        </>
      )}
    </>
  );
}
