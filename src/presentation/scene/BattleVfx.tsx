import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, type Vector3Tuple } from "three";

import type { CombatFrame } from "./sceneTypes";

const EVENT_COLORS = {
  damage: "#ff8a4a",
  burn: "#ff6a3a",
  poison: "#9fdb55",
  poisonBurst: "#c5ef60",
  shield: "#69d2e2",
  heal: "#74e2b4",
  cleanse: "#d8f6f1",
  synergy: "#f2d985",
  frost: "#8ddff5",
  echo: "#c39af0",
  boss: "#ed5d7d",
} as const;

function ProjectileShape({ itemId, color }: { itemId?: string; color: string }) {
  if (itemId === "chili" || itemId === "cinder-berry") {
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh scale={[0.82, 1.55, 0.82]}>
          <dodecahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#ffbd54" emissive={color} emissiveIntensity={2.2} roughness={0.26} />
        </mesh>
        {[0, 1, 2, 3, 4].map((index) => (
          <mesh
            key={index}
            position={[Math.sin(index * 2.2) * 0.07, 0.22 + index * 0.14, Math.cos(index * 1.7) * 0.06]}
            scale={1 - index * 0.13}
          >
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color={index > 2 ? "#a82f29" : "#ff7542"} emissive={color} emissiveIntensity={1.55} transparent opacity={0.88 - index * 0.13} depthWrite={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "slime-shroom" || itemId === "venom-bulb") {
    return (
      <group>
        <mesh scale={[1.2, 0.9, 1]}>
          <dodecahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial color={color} emissive="#6f9e37" emissiveIntensity={1.25} roughness={0.38} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.17, 0.16, 0]}>
            <sphereGeometry args={[0.07, 7, 5]} />
            <meshStandardMaterial color="#d9f27a" emissive={color} emissiveIntensity={1.1} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "frost-shard" || itemId === "ice-bell") {
    return (
      <mesh scale={[0.72, 1.55, 0.72]} rotation={[0.5, 0.2, 0.2]}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#d8fbff" emissive={color} emissiveIntensity={1.55} roughness={0.18} metalness={0.12} />
      </mesh>
    );
  }
  if (itemId === "echo-bell" || itemId === "mirror-shard") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.04, 7, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
        </mesh>
        <mesh scale={0.58}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#f0d5ff" emissive={color} emissiveIntensity={1.5} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh>
      <octahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.7} />
    </mesh>
  );
}

function ImpactShape({ itemId, kind, color }: {
  itemId?: string;
  kind: keyof typeof EVENT_COLORS;
  color: string;
}) {
  const shield = kind === "shield" || itemId === "egg-shell";
  const fire = itemId === "chili" || itemId === "cinder-berry" || kind === "burn";
  if (fire) {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[0.34, 12, 8]} />
          <meshStandardMaterial color="#ffe29a" emissive={color} emissiveIntensity={2.4} transparent opacity={0.82} depthWrite={false} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const angle = index * Math.PI / 4;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * 0.54, Math.sin(index * 1.9) * 0.28, Math.sin(angle) * 0.54]}
              rotation={[Math.sin(angle) * 0.6, angle, Math.cos(angle) * 0.6]}
              scale={[0.58, 1.45, 0.58]}
            >
              <octahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color={index % 2 ? "#ffb34e" : "#ef5635"} emissive={color} emissiveIntensity={1.7} transparent opacity={0.84} depthWrite={false} />
            </mesh>
          );
        })}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.055, 7, 32]} />
          <meshStandardMaterial color="#ffd377" emissive={color} emissiveIntensity={1.8} transparent opacity={0.78} />
        </mesh>
      </group>
    );
  }
  if (shield) {
    return (
      <group>
        <mesh scale={[1.05, 1.18, 0.68]}>
          <sphereGeometry args={[0.72, 16, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.19} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.055, 7, 6]} />
          <meshStandardMaterial color="#d8fbff" emissive={color} emissiveIntensity={1.3} transparent opacity={0.82} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[Math.cos(index * Math.PI / 2) * 0.58, Math.sin(index * Math.PI / 2) * 0.58, 0]} rotation={[0, 0, index * Math.PI / 2]}>
            <octahedronGeometry args={[0.085, 0]} />
            <meshStandardMaterial color="#e9ffff" emissive={color} emissiveIntensity={1.6} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "poison" || kind === "poisonBurst" || itemId === "slime-shroom") {
    return (
      <group>
        {([
          [-0.35, 0.05, 0, 0.32],
          [0, 0.18, 0, 0.44],
          [0.36, -0.03, 0, 0.29],
          [0.12, 0.48, 0, 0.2],
        ] as const).map(([x, y, z, size], index) => (
          <mesh key={index} position={[x, y, z]} scale={[1, 1.25, 0.72]}>
            <dodecahedronGeometry args={[size, 0]} />
            <meshStandardMaterial color={index % 2 ? "#a9dc50" : "#709f39"} emissive={color} emissiveIntensity={0.72} transparent opacity={0.28} depthWrite={false} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.045, 7, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.35} transparent opacity={0.74} />
      </mesh>
      {(kind === "heal" || kind === "cleanse") && (
        <mesh>
          <sphereGeometry args={[0.72, 12, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} transparent opacity={0.17} depthWrite={false} />
        </mesh>
      )}
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh key={index} position={[Math.cos(index * Math.PI / 3) * 0.56, Math.sin(index * 1.7) * 0.35, Math.sin(index * Math.PI / 3) * 0.3]}>
          <octahedronGeometry args={[0.055 + (index % 2) * 0.025, 0]} />
          <meshStandardMaterial color="#fff0c2" emissive={color} emissiveIntensity={1.25} />
        </mesh>
      ))}
    </group>
  );
}

function FlightTrail({ color, poison }: { color: string; poison: boolean }) {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} scale={1 - index * 0.075}>
          {poison ? <dodecahedronGeometry args={[0.105, 0]} /> : <octahedronGeometry args={[0.095, 0]} />}
          <meshStandardMaterial
            color={poison && index % 2 ? "#d5f178" : color}
            emissive={color}
            emissiveIntensity={poison ? 1.05 : 1.9}
            transparent
            opacity={0.78 - index * 0.065}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

export function BattleVfx({ frame, sourcePosition }: {
  frame: CombatFrame;
  sourcePosition?: Vector3Tuple;
}) {
  const projectile = useRef<Group>(null);
  const trail = useRef<Group>(null);
  const anticipation = useRef<Group>(null);
  const impact = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const event = frame.event;
  if (!event) return null;

  const color = EVENT_COLORS[event.kind];
  const playerPoint: Vector3Tuple = [0, 2.05, 2.2];
  const enemyPoint: Vector3Tuple = [0, 2.05, -2.1];
  const source = sourcePosition ?? (event.actor === "player" ? playerPoint : enemyPoint);
  const destination = event.target === "player" ? playerPoint : enemyPoint;
  const selfTargeted = event.actor === event.target;

  useFrame(({ clock }) => {
    if (!projectile.current || !trail.current || !anticipation.current || !impact.current) return;
    startedAt.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const flightDuration = event.sourceItemId === "slime-shroom" ? 0.68 : 0.58;
    const progress = MathUtils.clamp(elapsed / flightDuration, 0, 1);
    const sideArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(progress * Math.PI) * 0.72;
    const flightHeight = event.sourceItemId === "slime-shroom" ? 1.35 : 1.02;
    anticipation.current.visible = elapsed < 0.3;
    anticipation.current.position.set(...source);
    const anticipationPulse = MathUtils.clamp(elapsed / 0.3, 0, 1);
    anticipation.current.scale.setScalar(0.5 + Math.sin(anticipationPulse * Math.PI) * 0.62);
    anticipation.current.rotation.z = elapsed * 4.2;
    projectile.current.visible = !selfTargeted && progress < 1;
    projectile.current.position.set(
      MathUtils.lerp(source[0], destination[0], progress) + sideArc,
      MathUtils.lerp(source[1], destination[1], progress) + Math.sin(progress * Math.PI) * flightHeight,
      MathUtils.lerp(source[2], destination[2], progress),
    );
    projectile.current.rotation.x += 0.11;
    projectile.current.rotation.y += event.sourceItemId === "chili" ? 0.26 : 0.16;

    trail.current.visible = !selfTargeted && progress > 0.02 && progress < 1;
    trail.current.children.forEach((particle, index) => {
      const trailingProgress = MathUtils.clamp(progress - 0.038 - index * 0.047, 0, 1);
      particle.visible = trailingProgress > 0 && progress < 1;
      const trailingArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(trailingProgress * Math.PI) * 0.72;
      particle.position.set(
        MathUtils.lerp(source[0], destination[0], trailingProgress) + trailingArc,
        MathUtils.lerp(source[1], destination[1], trailingProgress) + Math.sin(trailingProgress * Math.PI) * flightHeight,
        MathUtils.lerp(source[2], destination[2], trailingProgress),
      );
      const particleScale = Math.max(0.18, 0.92 - index * 0.085) * (0.84 + Math.sin(elapsed * 18 + index) * 0.12);
      particle.scale.setScalar(particleScale);
      particle.rotation.x += 0.08 + index * 0.006;
      particle.rotation.y += 0.11;
    });

    const impactProgress = selfTargeted
      ? MathUtils.clamp(elapsed / 0.72, 0, 1)
      : MathUtils.clamp((elapsed - flightDuration * 0.72) / 0.52, 0, 1);
    impact.current.visible = impactProgress > 0 && impactProgress < 1;
    impact.current.position.set(...destination);
    const impactScale = event.kind === "poisonBurst" ? 2.55 : selfTargeted ? 2.15 : 1.72;
    impact.current.scale.setScalar(0.28 + impactProgress * impactScale);
    impact.current.rotation.y = impactProgress * 2.1;
  });

  return (
    <group>
      <group ref={anticipation} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.045, 7, event.kind === "shield" ? 6 : 28]} />
          <meshStandardMaterial color="#fff0b1" emissive={color} emissiveIntensity={1.75} transparent opacity={0.88} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[Math.cos(index * Math.PI / 2) * 0.48, 0.08, Math.sin(index * Math.PI / 2) * 0.48]}>
            <octahedronGeometry args={[0.065, 0]} />
            <meshStandardMaterial color="#fff4c9" emissive={color} emissiveIntensity={2} />
          </mesh>
        ))}
      </group>
      <group ref={trail} visible={false}>
        <FlightTrail color={color} poison={event.kind === "poison" || event.kind === "poisonBurst" || event.sourceItemId === "slime-shroom"} />
      </group>
      <group ref={projectile}>
        <ProjectileShape color={color} itemId={event.sourceItemId} />
        <pointLight color={color} intensity={1.3} distance={2.4} />
      </group>
      <group ref={impact} visible={false}>
        <ImpactShape color={color} itemId={event.sourceItemId} kind={event.kind} />
        <pointLight color={color} intensity={1.75} distance={3.2} />
      </group>
    </group>
  );
}
