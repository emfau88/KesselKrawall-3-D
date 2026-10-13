import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Neutral reflected room light for the new textured comparison only. */
function ReflectedRoomLight() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    const previous = scene.environment;
    scene.environment = target.texture;
    room.dispose();
    generator.dispose();
    return () => {
      if (scene.environment === target.texture) scene.environment = previous;
      target.dispose();
    };
  }, [gl, scene]);
  return null;
}

export function MockupLighting({ workshop, shadowMapSize }: { workshop: boolean; shadowMapSize: 512 | 1024 }) {
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
