import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, Mesh, Vector2, type Vector3Tuple } from "three";

export type CauldronReaction = "idle" | "cast" | "hit" | "guard" | "heal";

export function CauldronGreybox({
  accent,
  position,
  scale = 1,
  reaction = "idle",
  reactionKey = -1,
}: {
  accent: string;
  position: Vector3Tuple;
  scale?: number;
  reaction?: CauldronReaction;
  reactionKey?: number;
}) {
  const animated = useRef<Group>(null);
  const liquid = useRef<Mesh>(null);
  const steam = useRef<Group>(null);
  const lastKey = useRef(reactionKey);
  const startedAt = useRef(0);
  const profile = useMemo(
    () => [
      new Vector2(0.73, 0.8),
      new Vector2(1.03, 0.6),
      new Vector2(1.18, 0.12),
      new Vector2(1.05, -0.5),
      new Vector2(0.72, -0.82),
      new Vector2(0.28, -0.9),
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!animated.current) return;
    if (lastKey.current !== reactionKey) {
      lastKey.current = reactionKey;
      startedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - startedAt.current;
    const pulse = Math.max(0, 1 - elapsed / 0.48);
    const idle = Math.sin(clock.elapsedTime * 1.65) * 0.012;
    let rotationX = idle;
    let rotationZ = 0;
    let scaleX = 1;
    let scaleY = 1;
    if (reaction === "cast") {
      rotationX += Math.sin(pulse * Math.PI) * -0.16;
      scaleX += pulse * 0.06;
      scaleY -= pulse * 0.06;
    } else if (reaction === "hit") {
      rotationZ = Math.sin(elapsed * 42) * pulse * 0.11;
      scaleX += pulse * 0.04;
    } else if (reaction === "guard" || reaction === "heal") {
      scaleX += Math.sin(pulse * Math.PI) * 0.05;
      scaleY += Math.sin(pulse * Math.PI) * 0.08;
    }
    animated.current.rotation.x = rotationX;
    animated.current.rotation.z = rotationZ;
    animated.current.scale.set(
      MathUtils.clamp(scaleX, 0.8, 1.2),
      MathUtils.clamp(scaleY, 0.8, 1.2),
      MathUtils.clamp(scaleX, 0.8, 1.2),
    );
    if (liquid.current) {
      liquid.current.rotation.y = clock.elapsedTime * 0.18;
      liquid.current.scale.y = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.08;
    }
    if (steam.current) {
      steam.current.position.y = (clock.elapsedTime * 0.16) % 0.34;
      steam.current.rotation.y = clock.elapsedTime * 0.08;
    }
  });

  return (
    <group position={position} scale={scale}>
      <group ref={animated}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[profile, 32]} />
        <meshStandardMaterial color="#2d2934" metalness={0.5} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.86, 0.12, 10, 32]} />
        <meshStandardMaterial color="#4c4451" metalness={0.64} roughness={0.35} />
      </mesh>
      <mesh ref={liquid} position={[0, 0.76, 0]} receiveShadow>
        <cylinderGeometry args={[0.74, 0.76, 0.08, 32]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.42}
          metalness={0.05}
          roughness={0.26}
        />
      </mesh>
      <pointLight color={accent} intensity={1.5} distance={3.2} position={[0, 1, 0]} />
      {([
        [-0.34, 0.84, 0.16, 0.08],
        [0.2, 0.86, -0.24, 0.1],
        [0.4, 0.83, 0.18, 0.055],
      ] as const).map(([x, y, z, radius], index) => (
        <mesh key={index} position={[x, y, z]}>
          <sphereGeometry args={[radius, 8, 5]} />
          <meshStandardMaterial color="#ffe5ae" emissive={accent} emissiveIntensity={0.85} roughness={0.25} />
        </mesh>
      ))}
      <group ref={steam}>
        {([
          [-0.3, 1.28, 0.05, 0.17],
          [0.18, 1.55, -0.06, 0.2],
          [0.42, 1.82, 0.02, 0.14],
        ] as const).map(([x, y, z, radius], index) => (
          <mesh key={index} position={[x, y, z]} scale={[1, 1.35, 1]}>
            <sphereGeometry args={[radius, 8, 5]} />
            <meshStandardMaterial color="#eadff0" transparent opacity={0.12} depthWrite={false} roughness={1} />
          </mesh>
        ))}
      </group>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} castShadow position={[x, -0.86, 0.2]} rotation={[0.15, 0, -x * 0.16]}>
          <cylinderGeometry args={[0.16, 0.22, 0.62, 8]} />
          <meshStandardMaterial color="#27222c" metalness={0.5} roughness={0.55} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          castShadow
          position={[side * 1.08, 0.12, 0]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <torusGeometry args={[0.38, 0.09, 8, 18, Math.PI * 1.45]} />
          <meshStandardMaterial color="#3c3541" metalness={0.58} roughness={0.42} />
        </mesh>
      ))}
      {[-0.65, -0.22, 0.22, 0.65].map((x) => (
        <mesh key={x} castShadow position={[x, 0.58, 0.79]}>
          <sphereGeometry args={[0.055, 7, 5]} />
          <meshStandardMaterial color="#8a7c86" metalness={0.72} roughness={0.28} />
        </mesh>
      ))}
      </group>
    </group>
  );
}
