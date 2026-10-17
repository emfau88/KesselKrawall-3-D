import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MathUtils, type Material, type PointLight, type Vector3Tuple } from "three";

import { getItemDefinition } from "../../core/data";
import { getOpponentPresentation, type SignatureVfx } from "../content/opponentPresentation";
import type { CombatFrame } from "./sceneTypes";
import { combatMotionPhase, itemMotion } from "../combat/combatMotion";

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
            <meshBasicMaterial color="#d8ffff" toneMapped={false} transparent />
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
        {[0, 1, 2, 3, 4, 5].map((index) => <mesh key={`shard-${index}`} position={[Math.cos(index * Math.PI / 3) * 0.58, Math.sin(index * 1.4) * 0.34, Math.sin(index * Math.PI / 3) * 0.4]}><octahedronGeometry args={[0.08, 0]} /><meshBasicMaterial color="#f4dcff" toneMapped={false} transparent /></mesh>)}
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
          <meshBasicMaterial color="#fff0c2" toneMapped={false} transparent />
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

function OpponentSignatureShape({ signature, color, secondary, phase }: {
  signature: SignatureVfx;
  color: string;
  secondary: string;
  phase: "cast" | "impact";
}) {
  const opacity = phase === "cast" ? 0.86 : 0.72;
  if (signature === "ward") {
    return <group>{[0, 1, 2].map((index) => <mesh key={index} rotation={[Math.PI / 2, index * 0.32, index * 0.5]} scale={0.72 + index * 0.3}><torusGeometry args={[0.46, 0.045, 7, 6]} /><meshBasicMaterial color={index === 1 ? secondary : color} toneMapped={false} transparent opacity={opacity - index * 0.14} depthWrite={false} /></mesh>)}</group>;
  }
  if (signature === "storm") {
    return <group>{[-2, -1, 0, 1, 2].map((index) => <mesh key={index} position={[index * 0.18, Math.abs(index) * -0.09, 0]} rotation={[0, 0, index * 0.22]} scale={[0.44, 1.5 - Math.abs(index) * 0.12, 0.44]}><octahedronGeometry args={[0.19, 0]} /><meshBasicMaterial color={index % 2 ? secondary : color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>)}</group>;
  }
  if (signature === "venom" || signature === "spore") {
    return <group>{Array.from({ length: 7 }, (_, index) => { const angle = index * 2.2; return <mesh key={index} position={[Math.cos(angle) * (0.24 + index * 0.045), Math.sin(index * 1.7) * 0.31, Math.sin(angle) * 0.25]} scale={0.58 + index % 3 * 0.2}>{signature === "spore" ? <dodecahedronGeometry args={[0.12, 0]} /> : <sphereGeometry args={[0.12, 7, 5]} />}<meshBasicMaterial color={index % 2 ? secondary : color} toneMapped={false} transparent opacity={opacity - index * 0.045} depthWrite={false} /></mesh>; })}</group>;
  }
  if (signature === "rubble") {
    return <group>{Array.from({ length: 8 }, (_, index) => { const angle = index / 8 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 0.48, Math.sin(index * 1.5) * 0.28, Math.sin(angle) * 0.48]} rotation={[index * 0.4, index * 0.7, index * 0.3]}><boxGeometry args={[0.19, 0.19, 0.19]} /><meshBasicMaterial color={index % 2 ? secondary : color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>; })}</group>;
  }
  if (signature === "arcane") {
    return <group>{[0, 1, 2, 3].map((index) => <mesh key={index} rotation={[index % 2 ? Math.PI / 2 : 0, index * 0.64, index * 0.8]} scale={0.7 + index * 0.23}><torusGeometry args={[0.42, 0.032, 6, index % 2 ? 7 : 28]} /><meshBasicMaterial color={index % 2 ? secondary : color} toneMapped={false} transparent opacity={opacity - index * 0.11} depthWrite={false} /></mesh>)}</group>;
  }
  if (signature === "rage" || signature === "cinder") {
    const count = signature === "rage" ? 10 : 7;
    return <group>{Array.from({ length: count }, (_, index) => { const angle = index / count * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 0.46, Math.sin(index * 1.8) * 0.19, Math.sin(angle) * 0.46]} rotation={[Math.sin(angle) * 0.55, angle, Math.cos(angle) * 0.55]} scale={[0.52, signature === "rage" ? 1.65 : 1.25, 0.52]}><coneGeometry args={[0.16, 0.55, 6]} /><meshBasicMaterial color={index % 2 ? secondary : color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>; })}</group>;
  }
  return <group>{[0, 1, 2, 3, 4, 5].map((index) => { const angle = index / 6 * Math.PI * 2; return <mesh key={index} position={[Math.cos(angle) * 0.45, 0, Math.sin(angle) * 0.45]} scale={[0.52, 1.35, 0.52]}><octahedronGeometry args={[0.18, 0]} /><meshBasicMaterial color={index % 2 ? secondary : color} toneMapped={false} transparent opacity={opacity} depthWrite={false} /></mesh>; })}</group>;
}

export function BattleVfx({ frame, sourcePosition, opponentId }: {
  frame: CombatFrame & { event: NonNullable<CombatFrame["event"]> };
  sourcePosition?: Vector3Tuple;
  opponentId?: string;
}) {
  const projectile = useRef<Group>(null);
  const trail = useRef<Group>(null);
  const anticipation = useRef<Group>(null);
  const impact = useRef<Group>(null);
  const root = useRef<Group>(null);
  const impactLight = useRef<PointLight>(null);
  const fadingMaterials = useRef<Array<{ material: Material; opacity: number }>>([]);
  const event = frame.event;
  const timing = combatMotionPhase(event, 0);
  const telemetry = useRef({ combatVfx: true, eventIndex: frame.eventIndex, itemId: event.sourceItemId,
    travels: timing.travels, progress: 0, landed: false, elapsedMs: 0, impactProgress: 0 });
  useLayoutEffect(() => {
    const owned: Array<{ material: Material; opacity: number }> = [];
    impact.current?.traverse(node => {
      if (!(node instanceof Mesh)) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material.transparent) owned.push({ material, opacity: material.opacity });
      }
    });
    fadingMaterials.current = owned;
  }, []);
  const opponentPresentation = getOpponentPresentation(opponentId ?? "rival");
  const enemySignature = event.actor === "enemy";
  const color = eventColor(frame);
  const motion = itemMotion(event.sourceItemId);
  const playerPoint: Vector3Tuple = [-0.28, 2.05, 4.02];
  const enemyPoint: Vector3Tuple = [0.28, 1.92, -3.7];
  const destination = event.target === "player" ? playerPoint : enemyPoint;
  const source = timing.travels ? sourcePosition ?? (event.actor === "player" ? playerPoint : enemyPoint) : destination;
  const selfTargeted = !timing.travels;

  useFrame(() => {
    if (!projectile.current || !trail.current || !anticipation.current || !impact.current) return;
    const elapsedMs = Math.max(0, frame.clock.timeMs - frame.beatStartsAtMs);
    const elapsed = elapsedMs / 1_000;
    const phase = combatMotionPhase(event, elapsedMs);
    const progress = phase.flightProgress;
    if (root.current) {
      root.current.userData.progress = progress;
      root.current.userData.landed = phase.landed;
      root.current.userData.elapsedMs = elapsedMs;
      root.current.userData.impactProgress = phase.impactProgress;
    }
    const sideArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(progress * Math.PI) * motion.arc;
    const flightHeight = motion.height;
    anticipation.current.visible = elapsedMs < phase.chargeMs;
    anticipation.current.position.set(...source);
    const anticipationPulse = MathUtils.clamp(elapsedMs / phase.chargeMs, 0, 1);
    anticipation.current.scale.setScalar(0.5 + Math.sin(anticipationPulse * Math.PI) * 0.62);
    anticipation.current.rotation.z = elapsed * 4.2;
    projectile.current.visible = !selfTargeted && elapsedMs >= phase.chargeMs && !phase.landed;
    projectile.current.position.set(
      MathUtils.lerp(source[0], destination[0], progress) + sideArc,
      MathUtils.lerp(source[1], destination[1], progress) + Math.sin(progress * Math.PI) * flightHeight,
      MathUtils.lerp(source[2], destination[2], progress),
    );
    projectile.current.rotation.x = elapsed * 0.8;
    projectile.current.rotation.y = elapsed * motion.spin * 4;

    trail.current.visible = !selfTargeted && elapsedMs >= phase.chargeMs && elapsedMs < phase.visibleMs;
    trail.current.children.forEach((particle, index) => {
      const rawProgress = (elapsedMs - phase.chargeMs) / Math.max(1, phase.flightMs) - 0.038 - index * 0.047;
      const trailingProgress = MathUtils.clamp(rawProgress, 0, 1);
      particle.visible = rawProgress > 0 && rawProgress < 1;
      const trailingArc = (frame.eventIndex % 2 === 0 ? 1 : -1) * Math.sin(trailingProgress * Math.PI) * motion.arc;
      particle.position.set(
        MathUtils.lerp(source[0], destination[0], trailingProgress) + trailingArc,
        MathUtils.lerp(source[1], destination[1], trailingProgress) + Math.sin(trailingProgress * Math.PI) * flightHeight,
        MathUtils.lerp(source[2], destination[2], trailingProgress),
      );
      const particleScale = Math.max(0.18, 0.92 - index * 0.085) * (0.84 + Math.sin(elapsed * 18 + index) * 0.12);
      particle.scale.setScalar(particleScale * (1 - MathUtils.smoothstep(trailingProgress, 0.8, 1)));
      particle.rotation.x = elapsed * (4.8 + index * 0.36);
      particle.rotation.y = elapsed * 6.6;
    });

    const impactProgress = phase.impactProgress;
    impact.current.visible = phase.landed && impactProgress < 1;
    impact.current.position.set(...destination);
    const impactScale = event.kind === "poisonBurst" ? 2.55 : selfTargeted ? Math.max(2.15, motion.impact) : motion.impact;
    impact.current.scale.setScalar(0.28 + impactProgress * impactScale);
    impact.current.rotation.y = impactProgress * 2.1;
    const alpha = 1 - MathUtils.smoothstep(impactProgress, 0.25, 1);
    for (const entry of fadingMaterials.current) entry.material.opacity = entry.opacity * alpha;
    if (impactLight.current) impactLight.current.intensity = 1.75 * alpha;
  });

  return (
    <group ref={root} name="combat-vfx" userData={telemetry.current}>
      <group ref={anticipation} visible={false}>
        {enemySignature && <OpponentSignatureShape color={opponentPresentation.glow} phase="cast" secondary={opponentPresentation.secondaryGlow} signature={opponentPresentation.signature} />}
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
        <pointLight userData={{ combatTransientLight: true }} color={color} intensity={1.3} distance={2.4} />
      </group>
      <group ref={impact} visible={false}>
        {enemySignature && <OpponentSignatureShape color={opponentPresentation.glow} phase="impact" secondary={opponentPresentation.secondaryGlow} signature={opponentPresentation.signature} />}
        <ImpactShape color={color} itemId={event.sourceItemId} kind={event.kind} />
        <pointLight ref={impactLight} userData={{ combatTransientLight: true }} color={color} intensity={1.75} distance={3.2} />
      </group>
    </group>
  );
}
