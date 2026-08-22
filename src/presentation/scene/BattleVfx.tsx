import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, type Vector3Tuple } from "three";

import { getItemDefinition } from "../../core/data";
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

interface ItemMotionProfile {
  readonly duration: number;
  readonly height: number;
  readonly arc: number;
  readonly spin: number;
  readonly impact: number;
}

const DEFAULT_MOTION: ItemMotionProfile = { duration: 0.56, height: 1.34, arc: 1.08, spin: 0.16, impact: 1.72 };
const ITEM_MOTION: Readonly<Record<string, ItemMotionProfile>> = {
  chili: { duration: 0.48, height: 1.18, arc: 0.72, spin: 0.28, impact: 1.92 },
  "dragon-tooth": { duration: 0.44, height: 0.72, arc: 0.3, spin: 0.12, impact: 2.15 },
  "ember-core": { duration: 0.58, height: 1.48, arc: 1.25, spin: 0.2, impact: 1.82 },
  "cinder-berry": { duration: 0.52, height: 1.38, arc: 0.86, spin: 0.25, impact: 1.9 },
  "slime-shroom": { duration: 0.68, height: 1.72, arc: 1.34, spin: 0.14, impact: 2.1 },
  nightwing: { duration: 0.46, height: 1.8, arc: 1.55, spin: 0.34, impact: 1.68 },
  "witch-eye": { duration: 0.62, height: 1.26, arc: 0.72, spin: 0.12, impact: 2.05 },
  "venom-bulb": { duration: 0.64, height: 1.56, arc: 1.18, spin: 0.18, impact: 2.25 },
  "egg-shell": { duration: 0.54, height: 1.12, arc: 0.82, spin: 0.16, impact: 2.2 },
  "healing-tuber": { duration: 0.72, height: 1.68, arc: 1.28, spin: 0.12, impact: 2.32 },
  "gold-spoon": { duration: 0.4, height: 0.92, arc: 0.38, spin: 0.42, impact: 1.92 },
  "moon-salt": { duration: 0.5, height: 1.48, arc: 0.9, spin: 0.3, impact: 1.92 },
  "frost-shard": { duration: 0.42, height: 0.9, arc: 0.42, spin: 0.22, impact: 2.02 },
  "ice-bell": { duration: 0.58, height: 1.42, arc: 1.02, spin: 0.18, impact: 2.2 },
  "winter-bloom": { duration: 0.7, height: 1.78, arc: 1.2, spin: 0.14, impact: 2.38 },
  "rime-clock": { duration: 0.52, height: 1.34, arc: 0.78, spin: 0.32, impact: 1.88 },
  "mirror-shard": { duration: 0.44, height: 1.1, arc: 0.55, spin: 0.36, impact: 2.02 },
  "echo-bell": { duration: 0.66, height: 1.62, arc: 1.36, spin: 0.18, impact: 2.3 },
  "rune-cup": { duration: 0.64, height: 1.5, arc: 1.16, spin: 0.16, impact: 2.24 },
  "time-thread": { duration: 0.76, height: 1.92, arc: 1.48, spin: 0.2, impact: 2.45 },
};

const FAMILY_PROJECTILE_COLOR = {
  fire: "#ff7848",
  poison: "#a7df51",
  guard: "#76d7e6",
  frost: "#9be6fa",
  echo: "#c49aef",
} as const;

function eventColor(frame: CombatFrame): string {
  const event = frame.event;
  if (!event) return EVENT_COLORS.damage;
  if (event.sourceItemId && event.code.startsWith("item.")) {
    return FAMILY_PROJECTILE_COLOR[getItemDefinition(event.sourceItemId).family];
  }
  return EVENT_COLORS[event.kind];
}

function ProjectileShape({ itemId, color }: { itemId?: string; color: string }) {
  if (itemId === "chili" || itemId === "cinder-berry") {
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh scale={[0.82, 1.55, 0.82]}>
          <dodecahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color="#ffb02f" toneMapped={false} />
        </mesh>
        {[0, 1, 2, 3, 4].map((index) => (
          <mesh
            key={index}
            position={[Math.sin(index * 2.2) * 0.07, 0.22 + index * 0.14, Math.cos(index * 1.7) * 0.06]}
            scale={1 - index * 0.13}
          >
            <octahedronGeometry args={[0.13, 0]} />
            <meshBasicMaterial color={index > 2 ? "#c93624" : "#ff642f"} toneMapped={false} transparent opacity={0.88 - index * 0.13} depthWrite={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "dragon-tooth") {
    return (
      <group rotation={[0, 0, -Math.PI / 2]}>
        <mesh scale={[0.72, 1.9, 0.72]}>
          <coneGeometry args={[0.2, 0.72, 7]} />
          <meshBasicMaterial color="#fff0c6" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.19, 0.045, 6, 18]} />
          <meshBasicMaterial color="#ff6236" toneMapped={false} />
        </mesh>
      </group>
    );
  }
  if (itemId === "ember-core") {
    return (
      <group>
        <mesh><icosahedronGeometry args={[0.23, 1]} /><meshBasicMaterial color="#ff522e" toneMapped={false} /></mesh>
        {[0, 1, 2].map((index) => (
          <mesh key={index} rotation={[index * Math.PI / 3, index * 0.7, index * 0.5]}>
            <torusGeometry args={[0.31 + index * 0.035, 0.026, 6, 22]} />
            <meshBasicMaterial color={index === 1 ? "#ffd05a" : color} toneMapped={false} transparent opacity={0.9} />
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
          <meshBasicMaterial color="#87c83e" toneMapped={false} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.17, 0.16, 0]}>
            <sphereGeometry args={[0.07, 7, 5]} />
            <meshBasicMaterial color="#d9f27a" toneMapped={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "nightwing") {
    return (
      <group rotation={[0.18, 0, 0]}>
        <mesh scale={[0.62, 0.82, 0.52]}><dodecahedronGeometry args={[0.16, 0]} /><meshBasicMaterial color="#54366f" toneMapped={false} /></mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.26, 0, 0]} rotation={[0, 0, side * -0.38]} scale={[1.5, 0.72, 0.24]}>
            <tetrahedronGeometry args={[0.2, 0]} />
            <meshBasicMaterial color="#b8e85a" toneMapped={false} transparent opacity={0.88} depthWrite={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "witch-eye") {
    return (
      <group>
        <mesh scale={[1.35, 0.82, 0.55]}><sphereGeometry args={[0.21, 12, 8]} /><meshBasicMaterial color="#d7ef83" toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.12]}><circleGeometry args={[0.095, 12]} /><meshBasicMaterial color="#5b2775" toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.135]}><circleGeometry args={[0.038, 10]} /><meshBasicMaterial color="#f7dc69" toneMapped={false} /></mesh>
      </group>
    );
  }
  if (itemId === "egg-shell") {
    return (
      <group>
        <mesh scale={[1.12, 1.28, 0.82]}><octahedronGeometry args={[0.23, 1]} /><meshBasicMaterial color="#d8f7ff" toneMapped={false} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.29, 0.028, 6, 6]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      </group>
    );
  }
  if (itemId === "healing-tuber") {
    return (
      <group>
        <mesh scale={[0.95, 1.25, 0.82]}><dodecahedronGeometry args={[0.23, 1]} /><meshBasicMaterial color="#98e6b3" toneMapped={false} /></mesh>
        {[0, 1, 2].map((index) => <mesh key={index} position={[(index - 1) * 0.11, 0.28, 0]} rotation={[0, 0, (index - 1) * 0.35]}><coneGeometry args={[0.045, 0.3, 5]} /><meshBasicMaterial color="#d8f17d" toneMapped={false} /></mesh>)}
      </group>
    );
  }
  if (itemId === "gold-spoon") {
    return (
      <group rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[0, 0.2, 0]} scale={[0.58, 1.1, 0.34]}><sphereGeometry args={[0.18, 10, 7]} /><meshBasicMaterial color="#ffe080" toneMapped={false} /></mesh>
        <mesh position={[0, -0.22, 0]}><cylinderGeometry args={[0.035, 0.055, 0.72, 8]} /><meshBasicMaterial color="#eab34f" toneMapped={false} /></mesh>
      </group>
    );
  }
  if (itemId === "moon-salt") {
    return (
      <group>
        {[0, 1, 2, 3, 4].map((index) => (
          <mesh key={index} position={[(index - 2) * 0.08, Math.sin(index * 1.8) * 0.12, Math.cos(index) * 0.08]} scale={0.72 + index % 2 * 0.28}>
            <octahedronGeometry args={[0.12, 0]} /><meshBasicMaterial color={index % 2 ? "#fff4d6" : color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "frost-shard" || itemId === "ice-bell") {
    return (
      <mesh scale={[0.72, 1.55, 0.72]} rotation={[0.5, 0.2, 0.2]}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshBasicMaterial color="#bcefff" toneMapped={false} />
      </mesh>
    );
  }
  if (itemId === "winter-bloom") {
    return (
      <group>
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const angle = index * Math.PI / 3;
          return <mesh key={index} position={[Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0]} rotation={[0, 0, angle - Math.PI / 2]} scale={[0.62, 1.25, 0.38]}><octahedronGeometry args={[0.16, 0]} /><meshBasicMaterial color={index % 2 ? "#d7f7ff" : color} toneMapped={false} transparent opacity={0.92} /></mesh>;
        })}
        <mesh><sphereGeometry args={[0.09, 8, 6]} /><meshBasicMaterial color="#fff4ba" toneMapped={false} /></mesh>
      </group>
    );
  }
  if (itemId === "rime-clock") {
    return (
      <group>
        {[0, 1].map((index) => <mesh key={index} rotation={[index ? Math.PI / 2 : 0, index * 0.7, 0]}><torusGeometry args={[0.22 + index * 0.06, 0.035, 6, 24]} /><meshBasicMaterial color={index ? "#e6f9ff" : color} toneMapped={false} /></mesh>)}
        <mesh scale={[0.18, 1, 0.18]}><boxGeometry args={[0.08, 0.28, 0.05]} /><meshBasicMaterial color="#fff4c5" toneMapped={false} /></mesh>
      </group>
    );
  }
  if (itemId === "echo-bell" || itemId === "mirror-shard") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.04, 7, 24]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh scale={0.58}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshBasicMaterial color="#e7c2ff" toneMapped={false} />
        </mesh>
      </group>
    );
  }
  if (itemId === "rune-cup") {
    return (
      <group>
        <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.22, 0.3, 10]} /><meshBasicMaterial color="#d4b0f5" toneMapped={false} /></mesh>
        <mesh position={[0, -0.24, 0]}><cylinderGeometry args={[0.045, 0.055, 0.25, 8]} /><meshBasicMaterial color="#f3d891" toneMapped={false} /></mesh>
        <mesh position={[0, -0.38, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.12, 0.03, 6, 18]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      </group>
    );
  }
  if (itemId === "time-thread") {
    return (
      <group>
        {Array.from({ length: 10 }, (_, index) => {
          const angle = index * 0.9;
          return <mesh key={index} position={[Math.cos(angle) * 0.18, (index - 4.5) * 0.075, Math.sin(angle) * 0.18]} scale={1 - Math.abs(index - 4.5) * 0.055}><sphereGeometry args={[0.055, 6, 5]} /><meshBasicMaterial color={index % 2 ? "#f3d9ff" : color} toneMapped={false} transparent opacity={0.92} /></mesh>;
        })}
      </group>
    );
  }
  return (
    <mesh>
      <octahedronGeometry args={[0.22, 0]} />
      <meshBasicMaterial color={color} toneMapped={false} />
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
          <meshBasicMaterial color="#ffb238" toneMapped={false} transparent opacity={0.76} depthWrite={false} />
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
              <meshBasicMaterial color={index % 2 ? "#ffad32" : "#ff4d29"} toneMapped={false} transparent opacity={0.88} depthWrite={false} />
            </mesh>
          );
        })}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.055, 7, 32]} />
          <meshBasicMaterial color="#ff7b24" toneMapped={false} transparent opacity={0.86} depthWrite={false} />
        </mesh>
      </group>
    );
  }
  if (shield) {
    return (
      <group>
        <mesh scale={[1.05, 1.18, 0.68]}>
          <sphereGeometry args={[0.72, 16, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.2} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.055, 7, 6]} />
          <meshBasicMaterial color="#aeeeff" toneMapped={false} transparent opacity={0.88} depthWrite={false} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[Math.cos(index * Math.PI / 2) * 0.58, Math.sin(index * Math.PI / 2) * 0.58, 0]} rotation={[0, 0, index * Math.PI / 2]}>
            <octahedronGeometry args={[0.085, 0]} />
            <meshBasicMaterial color="#d8ffff" toneMapped={false} />
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
            <meshBasicMaterial color={index % 2 ? "#b9e94f" : "#68a938"} toneMapped={false} transparent opacity={0.34} depthWrite={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (itemId === "nightwing" || itemId === "witch-eye" || itemId === "venom-bulb") {
    return (
      <group>
        <mesh scale={[1.45, 0.9, 0.55]}><sphereGeometry args={[0.48, 14, 8]} /><meshBasicMaterial color="#94c947" toneMapped={false} transparent opacity={0.22} depthWrite={false} /></mesh>
        <mesh position={[0, 0, 0.28]}><torusGeometry args={[0.3, 0.045, 7, itemId === "witch-eye" ? 24 : 9]} /><meshBasicMaterial color="#d8f476" toneMapped={false} transparent opacity={0.9} depthWrite={false} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const angle = index * Math.PI / 3;
          return <mesh key={index} position={[Math.cos(angle) * 0.56, Math.sin(angle) * 0.42, Math.sin(index * 1.2) * 0.26]} rotation={[0, 0, angle]} scale={[0.42, 1.3, 0.36]}><tetrahedronGeometry args={[0.16, 0]} /><meshBasicMaterial color={index % 2 ? "#c8ef69" : "#684383"} toneMapped={false} transparent opacity={0.84} depthWrite={false} /></mesh>;
        })}
      </group>
    );
  }
  if (kind === "frost" || itemId === "frost-shard" || itemId === "ice-bell" || itemId === "rime-clock") {
    return (
      <group>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const angle = index * Math.PI / 4;
          return <mesh key={index} position={[Math.cos(angle) * 0.54, Math.sin(index * 1.6) * 0.24, Math.sin(angle) * 0.54]} rotation={[Math.sin(angle) * 0.5, angle, Math.cos(angle) * 0.45]} scale={[0.54, 1.55, 0.54]}><octahedronGeometry args={[0.18, 0]} /><meshBasicMaterial color={index % 2 ? "#d9f8ff" : color} toneMapped={false} transparent opacity={0.88} depthWrite={false} /></mesh>;
        })}
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.7, 0.045, 7, 8]} /><meshBasicMaterial color="#9eeaff" toneMapped={false} transparent opacity={0.9} depthWrite={false} /></mesh>
      </group>
    );
  }
  if (kind === "echo" || itemId === "mirror-shard" || itemId === "echo-bell" || itemId === "time-thread") {
    return (
      <group>
        {[0, 1, 2].map((index) => <mesh key={index} rotation={[Math.PI / 2, index * 0.45, index * 0.78]} scale={1 + index * 0.28}><torusGeometry args={[0.34, 0.032, 6, 30]} /><meshBasicMaterial color={index === 1 ? "#f0d5ff" : color} toneMapped={false} transparent opacity={0.82 - index * 0.14} depthWrite={false} /></mesh>)}
        {[0, 1, 2, 3, 4, 5].map((index) => <mesh key={`shard-${index}`} position={[Math.cos(index * Math.PI / 3) * 0.58, Math.sin(index * 1.4) * 0.34, Math.sin(index * Math.PI / 3) * 0.4]}><octahedronGeometry args={[0.08, 0]} /><meshBasicMaterial color="#f4dcff" toneMapped={false} /></mesh>)}
      </group>
    );
  }
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.045, 7, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.82} depthWrite={false} />
      </mesh>
      {(kind === "heal" || kind === "cleanse") && (
        <mesh>
          <sphereGeometry args={[0.72, 12, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh key={index} position={[Math.cos(index * Math.PI / 3) * 0.56, Math.sin(index * 1.7) * 0.35, Math.sin(index * Math.PI / 3) * 0.3]}>
          <octahedronGeometry args={[0.055 + (index % 2) * 0.025, 0]} />
          <meshBasicMaterial color="#fff0c2" toneMapped={false} />
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
          <meshBasicMaterial
            color={poison && index % 2 ? "#d5f178" : color}
            toneMapped={false}
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

  const color = eventColor(frame);
  const motion = event.sourceItemId ? ITEM_MOTION[event.sourceItemId] ?? DEFAULT_MOTION : DEFAULT_MOTION;
  const playerPoint: Vector3Tuple = [-0.28, 2.05, 4.02];
  const enemyPoint: Vector3Tuple = [0.28, 1.92, -3.7];
  const source = sourcePosition ?? (event.actor === "player" ? playerPoint : enemyPoint);
  const destination = event.target === "player" ? playerPoint : enemyPoint;
  const selfTargeted = event.actor === event.target;

  useFrame(({ clock }) => {
    if (!projectile.current || !trail.current || !anticipation.current || !impact.current) return;
    startedAt.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const castDuration = selfTargeted ? 0 : 0.26;
    const flightDuration = motion.duration;
    const flightElapsed = elapsed - castDuration;
    const progress = MathUtils.clamp(flightElapsed / flightDuration, 0, 1);
    const sideArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(progress * Math.PI) * motion.arc;
    const flightHeight = motion.height;
    anticipation.current.visible = selfTargeted ? elapsed < 0.3 : elapsed < castDuration;
    anticipation.current.position.set(...source);
    const anticipationPulse = MathUtils.clamp(elapsed / Math.max(castDuration, 0.3), 0, 1);
    anticipation.current.scale.setScalar(0.5 + Math.sin(anticipationPulse * Math.PI) * 0.62);
    anticipation.current.rotation.z = elapsed * 4.2;
    projectile.current.visible = !selfTargeted && flightElapsed >= 0 && progress < 1;
    projectile.current.position.set(
      MathUtils.lerp(source[0], destination[0], progress) + sideArc,
      MathUtils.lerp(source[1], destination[1], progress) + Math.sin(progress * Math.PI) * flightHeight,
      MathUtils.lerp(source[2], destination[2], progress),
    );
    projectile.current.rotation.x += 0.11;
    projectile.current.rotation.y += motion.spin;

    trail.current.visible = !selfTargeted && flightElapsed >= 0 && progress > 0.02 && progress < 1;
    trail.current.children.forEach((particle, index) => {
      const trailingProgress = MathUtils.clamp(progress - 0.038 - index * 0.047, 0, 1);
      particle.visible = trailingProgress > 0 && progress < 1;
      const trailingArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(trailingProgress * Math.PI) * motion.arc;
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
      : MathUtils.clamp((elapsed - castDuration - flightDuration * 0.78) / 0.3, 0, 1);
    impact.current.visible = impactProgress > 0 && impactProgress < 1;
    impact.current.position.set(...destination);
    const impactScale = event.kind === "poisonBurst" ? 2.55 : selfTargeted ? Math.max(2.15, motion.impact) : motion.impact;
    impact.current.scale.setScalar(0.28 + impactProgress * impactScale);
    impact.current.rotation.y = impactProgress * 2.1;
  });

  return (
    <group>
      <group ref={anticipation} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.045, 7, event.kind === "shield" ? 6 : 28]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} depthWrite={false} />
        </mesh>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[Math.cos(index * Math.PI / 2) * 0.48, 0.08, Math.sin(index * Math.PI / 2) * 0.48]}>
            <octahedronGeometry args={[0.065, 0]} />
            <meshBasicMaterial color="#fff1b0" toneMapped={false} />
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
