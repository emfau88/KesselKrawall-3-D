import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils } from "three";

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

export function BattleVfx({ frame }: { frame: CombatFrame }) {
  const projectile = useRef<Group>(null);
  const impact = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const event = frame.event;
  if (!event) return null;

  const color = EVENT_COLORS[event.kind];
  const playerPoint: [number, number, number] = [0, 2.05, 2.2];
  const enemyPoint: [number, number, number] = [0, 2.05, -2.1];
  const source = event.actor === "player" ? playerPoint : enemyPoint;
  const destination = event.target === "player" ? playerPoint : enemyPoint;
  const selfTargeted = event.actor === event.target;

  useFrame(({ clock }) => {
    if (!projectile.current || !impact.current) return;
    startedAt.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const progress = MathUtils.clamp(elapsed / 0.42, 0, 1);
    const sideArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(progress * Math.PI) * 0.9;
    projectile.current.visible = !selfTargeted && progress < 1;
    projectile.current.position.set(
      MathUtils.lerp(source[0], destination[0], progress) + sideArc,
      MathUtils.lerp(source[1], destination[1], progress) + Math.sin(progress * Math.PI) * 1.05,
      MathUtils.lerp(source[2], destination[2], progress),
    );
    projectile.current.rotation.x += 0.12;
    projectile.current.rotation.y += 0.18;

    const impactProgress = selfTargeted
      ? MathUtils.clamp(elapsed / 0.6, 0, 1)
      : MathUtils.clamp((elapsed - 0.32) / 0.45, 0, 1);
    impact.current.visible = impactProgress > 0 && impactProgress < 1;
    impact.current.position.set(...destination);
    impact.current.scale.setScalar(0.35 + impactProgress * (selfTargeted ? 2.4 : 1.7));
    impact.current.rotation.y = impactProgress * 2.1;
  });

  return (
    <group>
      <group ref={projectile}>
        <mesh>
          {event.kind === "poison" || event.kind === "heal" ? (
            <sphereGeometry args={[0.18, 9, 7]} />
          ) : (
            <octahedronGeometry args={[0.22, 0]} />
          )}
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.7} />
        </mesh>
        <pointLight color={color} intensity={1.1} distance={2.2} />
      </group>
      <group ref={impact} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.55, 0.045, 7, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.35} transparent opacity={0.74} />
        </mesh>
        {(event.kind === "shield" || event.kind === "heal") && (
          <mesh>
            <sphereGeometry args={[0.72, 12, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} transparent opacity={0.17} depthWrite={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}
