import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Object3D, PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { LIGHTING_LOOKS, lightingLook } from "./lightingLook";

/** Neutral reflected room light for the new textured comparison only. */
function ReflectedRoomLight() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const look = lightingLook();
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const previousExposure = gl.toneMappingExposure;
    scene.environment = target.texture;
    scene.environmentIntensity = look === "reference" ? 1 : LIGHTING_LOOKS[look].environment;
    gl.toneMappingExposure = look === "reference" ? 1.02 : LIGHTING_LOOKS[look].exposure;
    room.dispose();
    generator.dispose();
    return () => {
      if (scene.environment === target.texture) scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      gl.toneMappingExposure = previousExposure;
      target.dispose();
    };
  }, [gl, scene, look]);
  return null;
}

export function MockupLighting({ workshop, shadowMapSize }: { workshop: boolean; shadowMapSize: 512 | 1024 }) {
  const look = lightingLook();
  if (look !== "reference") return <DirectedFantasyLighting workshop={workshop} shadowMapSize={shadowMapSize} look={look} />;
  return (
    <>
      <ReflectedRoomLight />
      <ambientLight color="#d7cdbb" intensity={0.36} />
      <hemisphereLight args={["#f5e8d3", "#2e2932", 0.95]} />
      <directionalLight
        castShadow color="#ffe0b5" intensity={2.8}
        position={workshop ? [3.5, 10, 7.5] : [4.4, 11.5, 2.2]}
        shadow-bias={-0.0004} shadow-camera-bottom={-7} shadow-camera-top={7}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-far={32}
        shadow-mapSize-height={shadowMapSize} shadow-mapSize-width={shadowMapSize}
      />
      <pointLight color="#e7d6c2" intensity={7.5} position={[0, 5.6, workshop ? -1.8 : -3.8]} distance={13} decay={2} />
      <pointLight color="#c9d9ed" intensity={4.2} position={[-3.5, 4.8, 4.8]} distance={12} decay={2} />
    </>
  );
}

function DirectedFantasyLighting({ workshop, shadowMapSize, look }: {
  workshop: boolean; shadowMapSize: 512 | 1024; look: Exclude<ReturnType<typeof lightingLook>, "reference">;
}) {
  const profile = LIGHTING_LOOKS[look];
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, workshop ? 0.9 : 0.2, workshop ? 0.3 : 0);
    return object;
  }, [workshop]);
  return <group name={`lighting-look-${look}`} userData={{ lightingLook: look }}>
    <ReflectedRoomLight />
    <ambientLight color="#c7bdcf" intensity={profile.ambient} />
    <hemisphereLight args={[profile.sky, profile.ground, profile.hemisphere]} />
    <primitive object={target} />
    <spotLight name="fantasy-shadow-key" target={target} position={[profile.keyX, workshop ? profile.keyY : profile.keyY + 2, profile.keyZ]}
      color={profile.key} intensity={profile.keyIntensity} angle={profile.angle} penumbra={0.6}
      decay={0} distance={28} castShadow shadow-bias={-0.00015} shadow-normalBias={0.025}
      shadow-camera-near={0.5} shadow-camera-far={28}
      shadow-mapSize-width={shadowMapSize} shadow-mapSize-height={shadowMapSize} />
    <pointLight name="fantasy-rear-accent" color={profile.accent} intensity={workshop ? profile.accentIntensity : profile.accentIntensity * 1.5}
      position={workshop ? [-3.8, 2.6, -2.9] : [0, 3.8, -3.5]} distance={workshop ? 8 : 7.5} decay={2} />
    <pointLight name="fantasy-readable-rim" color={profile.rim} intensity={profile.rimIntensity}
      position={workshop ? [3.5, 3.2, -1.5] : [2.5, 3.4, 4.2]} distance={7} decay={2} />
  </group>;
}
