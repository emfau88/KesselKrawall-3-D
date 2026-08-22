import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, type Vector3Tuple } from "three";

import { getItemDefinition } from "../../core/data";
import type { ItemInstance } from "../../core/types";
import { getAllPlacementInfluences } from "../shop/itemInsights";
import { CauldronActor } from "./CauldronActor";
import type { CauldronReaction } from "./CauldronActor";
import { BattleVfx } from "./BattleVfx";
import { IngredientModel } from "./IngredientModel";
import { ProductionAsset, ProductionAssetBoundary } from "./ProductionAsset";
import { getRuntimeQualityProfile } from "./runtimeQuality";
import { assetBakeoffMode } from "./assetBakeoff";
import type { ArenaSceneState } from "./sceneTypes";

const PLAYER_POSITION: Vector3Tuple = [-0.28, 1.25, 4.02];
const ENEMY_POSITION: Vector3Tuple = [0.28, 1.16, -3.7];

const FAMILY_GLOW = {
  fire: "#f06d3e",
  poison: "#96ca4c",
  guard: "#62cad9",
  frost: "#83d7ef",
  echo: "#b785e2",
} as const;

function ingredientPosition(side: "player" | "enemy", index: number): Vector3Tuple {
  const offset = index - 2;
  if (side === "player") {
    return [offset * 1.18 - 0.28, 0.54, 5.02 - Math.abs(offset) * 0.34];
  }
  return [offset * 1.04 + 0.28, 0.5, -4.58 + Math.abs(offset) * 0.42];
}

function reactionFor(
  side: "player" | "enemy",
  scene: ArenaSceneState,
): CauldronReaction {
  const event = scene.combat?.event;
  if (scene.outcome && scene.outcome !== "draw") {
    return scene.outcome === side ? "victory" : "defeat";
  }
  if (!event) return "idle";
  const ownHp = side === "player" ? scene.combat?.playerHp : scene.combat?.enemyHp;
  const otherHp = side === "player" ? scene.combat?.enemyHp : scene.combat?.playerHp;
  if ((ownHp ?? 1) <= 0) return "defeat";
  if ((otherHp ?? 1) <= 0) return "victory";
  if (event.target === side && event.actor !== side) return "hit";
  if (event.actor !== side) return "idle";
  if (event.kind === "shield") return "guard";
  if (event.kind === "heal" || event.kind === "cleanse") return "heal";
  return "cast";
}

function IngredientPedestal({
  item,
  active,
  animationKey,
  side,
  buffed,
}: {
  item: ItemInstance | null;
  active: boolean;
  animationKey: number;
  side: "player" | "enemy";
  buffed: boolean;
}) {
  const dial = useRef<Group>(null);
  const pulse = useRef<Group>(null);
  const family = item ? getItemDefinition(item.itemId).family : null;
  const glow = family ? FAMILY_GLOW[family] : side === "player" ? "#d09b61" : "#8065a8";

  useFrame(({ clock }) => {
    if (dial.current) {
      dial.current.rotation.y = clock.elapsedTime * (side === "player" ? 0.24 : -0.2);
    }
    if (pulse.current) {
      const wave = active ? 1 + Math.sin(clock.elapsedTime * 10) * 0.09 : 1;
      pulse.current.scale.setScalar(wave);
      pulse.current.position.y = active ? 0.05 + Math.sin(clock.elapsedTime * 8) * 0.035 : 0;
    }
  });

  return (
    <group scale={side === "player" ? 0.66 : 0.56}>
      <mesh castShadow receiveShadow position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.68, 0.8, 0.22, 12]} />
        <meshStandardMaterial color={side === "player" ? "#342c31" : "#2c2834"} metalness={0.24} roughness={0.72} />
      </mesh>
      <mesh position={[0, -0.235, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, active ? 0.055 : 0.035, 7, 32]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={active ? 1.8 : item ? 0.64 : 0.2} transparent opacity={item ? 0.9 : 0.34} />
      </mesh>
      <group ref={dial} position={[0, -0.2, 0]}>
        {Array.from({ length: 8 }, (_, index) => {
          const angle = index * Math.PI / 4;
          return (
            <mesh key={index} position={[Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[0.055, 0.025, 0.13]} />
              <meshStandardMaterial color={index === animationKey % 8 && item ? "#fff1bc" : glow} emissive={glow} emissiveIntensity={item ? 0.72 : 0.12} />
            </mesh>
          );
        })}
      </group>
      {buffed && (
        <group rotation={[Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
          <mesh><torusGeometry args={[0.43, 0.022, 6, 22, Math.PI * 1.65]} /><meshStandardMaterial color="#8ce3ec" emissive="#63cbdc" emissiveIntensity={1.1} transparent opacity={0.72} /></mesh>
          <mesh rotation={[0, 0, Math.PI]}><torusGeometry args={[0.48, 0.014, 6, 22, Math.PI * 1.3]} /><meshStandardMaterial color="#efbd70" emissive="#d99048" emissiveIntensity={0.9} transparent opacity={0.58} /></mesh>
        </group>
      )}
      <group ref={pulse}>
        {item ? (
          <IngredientModel
            active={active}
            animationKey={animationKey}
            itemId={item.itemId}
            level={item.level}
          />
        ) : (
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.24, 0.022, 6, 6]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.2} transparent opacity={0.28} />
          </mesh>
        )}
      </group>
      {active && <pointLight color={glow} intensity={1.2} distance={2.2} position={[0, 0.28, 0]} />}
    </group>
  );
}

function ArenaIngredients({ scene, side }: {
  scene: ArenaSceneState;
  side: "player" | "enemy";
}) {
  const board = side === "player" ? scene.board : scene.opponent.board;
  const buffedSlots = new Set(
    getAllPlacementInfluences(board)
      .filter((influence) => influence.sourceSlot !== influence.targetSlot)
      .map((influence) => influence.targetSlot),
  );
  return (
    <group>
      {board.map((item, index) => {
        return (
          <group
            key={item?.uid ?? `${side}-empty-${index}`}
            position={ingredientPosition(side, index)}
            rotation={[0, side === "player" ? Math.PI : 0, 0]}
          >
            <IngredientPedestal
              active={Boolean(item && scene.combat?.event?.sourceUid === item.uid)}
              animationKey={scene.combat?.eventIndex ?? -1}
              item={item}
              side={side}
              buffed={buffedSlots.has(index)}
            />
          </group>
        );
      })}
    </group>
  );
}

function RunePillar({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 4.55, 0.6, -0.2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.62, 0.82, 1.3, 10]} />
        <meshStandardMaterial color="#3b303f" roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <dodecahedronGeometry args={[0.46, 0]} />
        <meshStandardMaterial color="#665375" roughness={0.48} />
      </mesh>
      <mesh position={[0, 1.12, 0.37]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.035, 6, 20]} />
        <meshStandardMaterial color="#b88be3" emissive="#8f62c8" emissiveIntensity={1.1} />
      </mesh>
      <pointLight color="#9a69d2" intensity={2.2} distance={4} position={[0, 1.25, 0]} />
    </group>
  );
}

function ArenaBrazier({ position, poison = false }: {
  position: Vector3Tuple;
  poison?: boolean;
}) {
  const flame = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!flame.current) return;
    const flicker = Math.sin(clock.elapsedTime * 8.2 + position[0]) * 0.08;
    flame.current.scale.set(0.72 - flicker * 0.3, 1 + flicker, 0.72 - flicker * 0.3);
    flame.current.rotation.y = clock.elapsedTime * 0.45;
  });
  const color = poison ? "#9fc94e" : "#f3a34f";
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.28, 0.38, 0.56, 10]} />
        <meshStandardMaterial color="#40343f" metalness={0.38} roughness={0.58} />
      </mesh>
      <mesh castShadow position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.055, 7, 20]} />
        <meshStandardMaterial color="#9b7448" metalness={0.52} roughness={0.4} />
      </mesh>
      <mesh ref={flame} position={[0, 0.76, 0]} scale={[0.72, 1, 0.72]}>
        <coneGeometry args={[0.16, 0.48, 8]} />
        <meshBasicMaterial color={poison ? "#a8d747" : "#ff7a24"} toneMapped={false} transparent opacity={0.92} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.72, 0]} scale={[0.7, 1, 0.7]}>
        <coneGeometry args={[0.09, 0.3, 8]} />
        <meshBasicMaterial color={poison ? "#e6f68a" : "#ffd36a"} toneMapped={false} transparent opacity={0.96} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={4.8} distance={5.5} decay={2} position={[0, 0.82, 0]} />
    </group>
  );
}

function TournamentAudience({ moor, reactionKey, detail = 1 }: { moor: boolean; reactionKey: number; detail?: number }) {
  const crowd = useRef<Group>(null);
  const lastReaction = useRef(reactionKey);
  const reactedAt = useRef(0);
  useFrame(({ clock }) => {
    if (!crowd.current) return;
    if (lastReaction.current !== reactionKey) {
      lastReaction.current = reactionKey;
      reactedAt.current = clock.elapsedTime;
    }
    const reactionPulse = Math.max(0, 1 - (clock.elapsedTime - reactedAt.current) / 0.7);
    crowd.current.children.forEach((member, index) => {
      const baseY = Number(member.userData.baseY ?? member.position.y);
      const phase = Number(member.userData.phase ?? index);
      const cheer = Math.sin(reactionPulse * Math.PI) * (index % 3 === 0 ? 0.18 : 0.09);
      member.position.y = baseY + Math.sin(clock.elapsedTime * (0.9 + (index % 4) * 0.08) + phase) * 0.045 + cheer;
      member.rotation.z = Math.sin(clock.elapsedTime * 0.72 + phase * 1.7) * 0.035 + reactionPulse * (index % 2 ? 0.05 : -0.05);
      member.rotation.y = Math.sin(clock.elapsedTime * 0.38 + phase) * 0.08;
    });
  });
  return (
    <group ref={crowd}>
      {[1.72, 2.62].flatMap((y, row) =>
        Array.from({ length: Math.max(6, Math.round((row === 0 ? 11 : 9) * detail)) }, (_, index) => {
          const count = Math.max(6, Math.round((row === 0 ? 11 : 9) * detail));
          const x = (index - (count - 1) / 2) * (row === 0 ? 0.72 : 0.82);
          const accent = moor && index % 4 === 0 ? "#9aad58" : index % 3 === 0 ? "#87688b" : "#66566e";
          return (
            <group
              key={`${row}-${index}`}
              position={[x, y, -5.55]}
              scale={row === 0 ? 1 : 0.86}
              userData={{ baseY: y, phase: index * 0.73 + row * 1.9 }}
            >
              <mesh castShadow position={[0, -0.2, 0]}>
                <coneGeometry args={[0.2, 0.52, 7]} />
                <meshStandardMaterial color={accent} roughness={0.88} />
              </mesh>
              <mesh castShadow position={[0, 0.13, 0]}>
                <sphereGeometry args={[0.115, 9, 7]} />
                <meshStandardMaterial color={index % 2 ? "#b38b77" : "#927884"} roughness={0.82} />
              </mesh>
              <mesh castShadow position={[0, 0.3, 0]} rotation={[0, 0, (index % 3 - 1) * 0.08]}>
                <coneGeometry args={[0.21, 0.42, 7]} />
                <meshStandardMaterial color={index % 3 === 0 ? "#654070" : "#46394e"} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.16, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.18, 0.025, 5, 16]} />
                <meshStandardMaterial color={moor && index % 4 === 0 ? "#a5c44f" : "#b28b5b"} metalness={0.28} roughness={0.5} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} castShadow position={[side * 0.16, -0.1 + (index % 3 === 0 ? 0.08 : 0), 0]} rotation={[0, 0, side * (index % 3 === 0 ? -0.72 : -0.35)]}>
                  <cylinderGeometry args={[0.035, 0.045, 0.35, 6]} />
                  <meshStandardMaterial color={accent} roughness={0.9} />
                </mesh>
              ))}
              {index % 4 === 0 && (
                <group position={[0.27, -0.03, 0.02]} rotation={[0, 0, -0.08]}>
                  <mesh castShadow><cylinderGeometry args={[0.018, 0.026, 0.82, 6]} /><meshStandardMaterial color="#8b6547" roughness={0.72} /></mesh>
                  <mesh position={[0, 0.43, 0]}><octahedronGeometry args={[0.075, 0]} /><meshStandardMaterial color={moor ? "#c9ef68" : "#d2a2ff"} emissive={moor ? "#8dbd3f" : "#9a67cf"} emissiveIntensity={1.5} /></mesh>
                </group>
              )}
              {index % 5 === 1 && (
                <mesh position={[0, 0.36, 0]} rotation={[0, 0, (index % 2 ? 1 : -1) * 0.05]}>
                  <coneGeometry args={[0.3, 0.38, 7]} />
                  <meshStandardMaterial color={index % 2 ? "#6b4675" : "#4c526c"} roughness={0.88} />
                </mesh>
              )}
            </group>
          );
        }),
      )}
    </group>
  );
}

function MoorMiasma() {
  const cloud = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!cloud.current) return;
    cloud.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.18;
    cloud.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.08;
  });
  return (
    <group ref={cloud} position={[0.28, 0.45, -4.15]}>
      {Array.from({ length: 7 }, (_, index) => (
        <mesh
          key={index}
          position={[(index - 3) * 0.74, Math.sin(index * 1.6) * 0.22, Math.cos(index * 1.4) * 0.4]}
          scale={[1.4, 0.55, 0.8]}
        >
          <dodecahedronGeometry args={[0.38 + (index % 2) * 0.1, 0]} />
          <meshStandardMaterial color={index % 2 ? "#78923d" : "#a1bd54"} emissive="#536b2d" emissiveIntensity={0.28} transparent opacity={0.09} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function ArenaAmbientLife({ moor, detail = 1 }: { moor: boolean; detail?: number }) {
  const motes = useRef<Group>(null);
  const astrolabe = useRef<Group>(null);
  useFrame(({ clock }) => {
    motes.current?.children.forEach((mote, index) => {
      const baseY = Number(mote.userData.baseY ?? 1);
      mote.position.y = baseY + Math.sin(clock.elapsedTime * (0.55 + index * 0.025) + index * 1.4) * 0.42;
      const pulse = 0.72 + Math.sin(clock.elapsedTime * 1.7 + index) * 0.24;
      mote.scale.setScalar(pulse);
    });
    if (astrolabe.current) {
      astrolabe.current.rotation.y = clock.elapsedTime * 0.16;
      astrolabe.current.rotation.z = Math.sin(clock.elapsedTime * 0.32) * 0.12;
    }
  });
  const glow = moor ? "#9acb43" : "#9b6bd0";
  return (
    <group>
      <group ref={motes}>
        {Array.from({ length: Math.max(8, Math.round(15 * detail)) }, (_, index) => {
          const x = -6.4 + (index % 8) * 1.82;
          const y = 0.9 + (index % 5) * 0.54;
          const z = -5.1 + (index % 3) * 0.55;
          return (
            <mesh key={index} position={[x, y, z]} userData={{ baseY: y }}>
              <octahedronGeometry args={[0.035 + (index % 3) * 0.012, 0]} />
              <meshStandardMaterial color="#f9e4a2" emissive={glow} emissiveIntensity={2.1} transparent opacity={0.82} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
      <group ref={astrolabe} position={[0, 4.15, -5.25]} rotation={[0.2, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.78, 0.055, 7, 34]} />
          <meshStandardMaterial color="#98704b" metalness={0.55} roughness={0.34} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.58, 0.035, 7, 30]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.72} />
        </mesh>
        <pointLight color={glow} intensity={2.4} distance={5} />
      </group>
    </group>
  );
}

function SwayingBanner({ position, tint, phase }: {
  position: Vector3Tuple;
  tint: string;
  phase: number;
}) {
  const banner = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!banner.current) return;
    banner.current.rotation.z = Math.sin(clock.elapsedTime * 0.65 + phase) * 0.025;
    banner.current.rotation.y = Math.sin(clock.elapsedTime * 0.42 + phase) * 0.018;
  });
  return (
    <group ref={banner} position={position}>
      <ProductionAsset asset="quaternius-banner" scale={1.02} tint={tint} />
    </group>
  );
}

function ArenaCandleCluster({ position, scale = 1, light = false }: {
  position: Vector3Tuple;
  scale?: number;
  light?: boolean;
}) {
  const flames = useRef<Group>(null);
  useFrame(({ clock }) => {
    flames.current?.children.forEach((flame, index) => {
      const flicker = 1 + Math.sin(clock.elapsedTime * (8.4 + index * 0.7) + position[0] * 0.8) * 0.13;
      flame.scale.set(0.74 / flicker, flicker, 0.74 / flicker);
      flame.position.y = 0.77 + index * 0.08 + Math.sin(clock.elapsedTime * 10 + index) * 0.018;
    });
  });
  return (
    <group position={position} scale={scale}>
      <ProductionAssetBoundary fallback={null}>
        <Suspense fallback={null}>
          <ProductionAsset asset="quaternius-candles" scale={0.62} />
        </Suspense>
      </ProductionAssetBoundary>
      <group ref={flames}>
        {[-0.22, 0, 0.21].map((x, index) => (
          <mesh key={x} position={[x, 0.77 + index * 0.08, 0.02]} scale={[0.74, 1, 0.74]}>
            <coneGeometry args={[0.065, 0.23, 7]} />
            <meshBasicMaterial color="#ff8a2e" toneMapped={false} transparent opacity={0.94} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {light && <pointLight color="#ffb15a" intensity={2.2} distance={4.6} decay={2} position={[0, 1.05, 0.2]} />}
    </group>
  );
}

function ArenaRunes({ moor, reactionKey }: { moor: boolean; reactionKey: number }) {
  const runes = useRef<Group>(null);
  const lastReaction = useRef(reactionKey);
  const reactedAt = useRef(0);
  useFrame(({ clock }) => {
    if (!runes.current) return;
    if (lastReaction.current !== reactionKey) {
      lastReaction.current = reactionKey;
      reactedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - reactedAt.current;
    runes.current.children.forEach((rune, index) => {
      const travellingPulse = Math.max(0, 1 - Math.abs(elapsed * 8 - index) * 0.62);
      const ambient = 0.92 + Math.sin(clock.elapsedTime * 1.35 + index * 0.72) * 0.08;
      const runeScale = ambient + travellingPulse * 0.5;
      rune.scale.set(runeScale, runeScale, runeScale * (index % 2 ? 0.82 : 1.15));
      rune.position.y = 0.035 + travellingPulse * 0.08;
    });
  });
  const glow = moor ? "#9acb4b" : "#a979d4";
  return (
    <group ref={runes} position={[0, 0, -0.3]}>
      {Array.from({ length: 14 }, (_, index) => {
        const angle = (index / 14) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 4.72, 0.035, Math.sin(angle) * 4.72]}
            rotation={[0, -angle, 0]}
            scale={[1, 1, index % 2 ? 0.82 : 1.15]}
          >
            <octahedronGeometry args={[0.19, 0]} />
            <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.82} transparent opacity={0.72} />
          </mesh>
        );
      })}
    </group>
  );
}

function ArenaPortal({ moor }: { moor: boolean }) {
  const rings = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!rings.current) return;
    rings.current.rotation.z = Math.sin(clock.elapsedTime * 0.38) * 0.08;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.25) * 0.035;
    rings.current.scale.set(pulse, pulse * 1.18, 1);
  });
  const glow = moor ? "#82b83e" : "#8c63c5";
  return (
    <group position={[0, 2.08, -6.02]}>
      <mesh scale={[1.32, 1.92, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color="#17101c" emissive={glow} emissiveIntensity={0.78} transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <group ref={rings} position={[0, 0, 0.035]}>
        <mesh scale={[1, 1.22, 1]}>
          <torusGeometry args={[0.7, 0.035, 7, 34]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.8} transparent opacity={0.82} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]} scale={[0.44, 0.44, 0.2]}>
          <boxGeometry args={[1, 1, 0.08]} />
          <meshStandardMaterial color="#e7d09c" emissive={glow} emissiveIntensity={0.8} transparent opacity={0.52} />
        </mesh>
      </group>
    </group>
  );
}

function ArenaChandelier() {
  const chandelier = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!chandelier.current) return;
    chandelier.current.rotation.z = Math.sin(clock.elapsedTime * 0.38) * 0.025;
    chandelier.current.rotation.x = Math.sin(clock.elapsedTime * 0.31) * 0.018;
  });
  return (
    <group ref={chandelier} position={[0, 4.35, -2.85]}>
      {[-0.46, 0.46].map((x) => (
        <mesh key={x} castShadow position={[x, 0.68, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.35, 6]} />
          <meshStandardMaterial color="#5a4538" metalness={0.58} roughness={0.4} />
        </mesh>
      ))}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.92, 0.09, 8, 28]} />
        <meshStandardMaterial color="#76543b" metalness={0.6} roughness={0.38} />
      </mesh>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = index * Math.PI / 3;
        return (
          <group key={index} position={[Math.cos(angle) * 0.84, 0.02, Math.sin(angle) * 0.84]}>
            <mesh castShadow position={[0, 0.13, 0]}>
              <cylinderGeometry args={[0.055, 0.07, 0.28, 8]} />
              <meshStandardMaterial color="#d6ba83" roughness={0.76} />
            </mesh>
            <mesh position={[0, 0.36, 0]} scale={[0.72, 1, 0.72]}>
              <coneGeometry args={[0.065, 0.22, 7]} />
              <meshBasicMaterial color="#ff8a2e" toneMapped={false} transparent opacity={0.94} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
      <pointLight color="#ffb15a" intensity={2.1} distance={6} decay={2} position={[0, 0.1, 0]} />
    </group>
  );
}

export function ArenaGreybox({ scene }: { scene: ArenaSceneState }) {
  const quality = getRuntimeQualityProfile();
  const moor = scene.opponent.id === "moor-martha";
  const legacy = assetBakeoffMode() === "legacy";
  const eventKey = scene.combat?.eventIndex ?? -1;
  const activeEvent = scene.combat?.event;
  const activeBoard = activeEvent?.actor === "enemy" ? scene.opponent.board : scene.board;
  const activeSlot = activeEvent
    ? activeBoard.findIndex((item) => item?.uid === activeEvent.sourceUid)
    : -1;
  const sourcePosition = activeSlot >= 0
    ? (() => {
        const [x, y, z] = ingredientPosition(activeEvent?.actor === "enemy" ? "enemy" : "player", activeSlot);
        return [x, y + 0.72, z] as [number, number, number];
      })()
    : undefined;
  return (
    <group>
      <mesh receiveShadow position={[0, -0.34, -0.3]}>
        <cylinderGeometry args={[8.4, 8.8, 0.34, 40]} />
        <meshStandardMaterial color={moor ? "#30352c" : "#302a37"} roughness={0.97} />
      </mesh>
      {[6.05, 7.15].map((radius, index) => (
        <mesh key={radius} receiveShadow position={[0, -0.155 + index * 0.004, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.055, 7, 72]} />
          <meshStandardMaterial color={moor ? "#596044" : "#55475f"} roughness={0.86} />
        </mesh>
      ))}
      <ProductionAssetBoundary fallback={null}>
        <Suspense fallback={null}>
          {legacy ? (
            <>
              <ProductionAsset asset="dungeon-wall-cracked" position={[-8, -0.38, -6.4]} />
              <ProductionAsset asset="dungeon-wall" position={[-4, -0.38, -6.4]} />
              <ProductionAsset asset="dungeon-wall-arched" position={[0, -0.38, -6.4]} />
              <ProductionAsset asset="dungeon-wall" position={[4, -0.38, -6.4]} />
              <ProductionAsset asset="dungeon-wall-cracked" position={[8, -0.38, -6.4]} />
              <ProductionAsset asset="dungeon-wall" position={[-7.65, -0.38, -2.55]} rotation={[0, Math.PI / 2, 0]} />
              <ProductionAsset asset="dungeon-wall" position={[7.65, -0.38, -2.55]} rotation={[0, -Math.PI / 2, 0]} />
              {[-6, -2, 2, 6].map((x) => (
                <ProductionAsset key={`rear-floor-${x}`} asset="dungeon-floor-tile" position={[x, -0.32, -4.1]} />
              ))}
              <ProductionAsset asset="dungeon-pillar" position={[-6.15, -0.38, -5.96]} scale={0.86} />
              <ProductionAsset asset="dungeon-pillar" position={[6.15, -0.38, -5.96]} scale={0.86} />
              <ProductionAsset asset={moor ? "arena-banner-blue" : "arena-banner-red"} position={[-3.55, 0.2, -5.82]} scale={0.92} />
              <ProductionAsset asset="arena-banner-red" position={[3.55, 0.2, -5.82]} scale={0.92} />
              <ProductionAsset asset="dungeon-torch-mounted" position={[-5.1, 2.45, -5.82]} scale={0.9} />
              <ProductionAsset asset="dungeon-torch-mounted" position={[5.1, 2.45, -5.82]} scale={0.9} />
              <ProductionAsset asset="dungeon-crates" position={[-6.2, -0.28, -2.7]} rotation={[0, 0.24, 0]} scale={0.58} />
              <ProductionAsset asset="dungeon-barrels" position={[6.15, -0.28, -2.75]} rotation={[0, -0.2, 0]} scale={0.62} />
            </>
          ) : (
            <>
              {[-7.8, -5.2, -2.6, 2.6, 5.2, 7.8].map((x) => (
                <ProductionAsset
                  key={`quaternius-arena-wall-${x}`}
                  asset="quaternius-wall-brick"
                  position={[x, -0.4, -6.38]}
                  scale={[1.33, 1.58, 1]}
                />
              ))}
              <ProductionAsset asset="quaternius-door-frame" position={[0, -0.38, -6.1]} scale={[1.28, 1.58, 1.2]} />
              {[-6, -2, 2, 6].map((x) => (
                <ProductionAsset key={`quaternius-arena-floor-${x}`} asset="quaternius-floor-brick" position={[x, -0.31, -4.1]} scale={[2.05, 1, 2.05]} />
              ))}
              <SwayingBanner phase={0.4} position={[-3.55, 0.42, -5.96]} tint={moor ? "#718e68" : "#9a6570"} />
              <SwayingBanner phase={2.1} position={[3.55, 0.42, -5.96]} tint={moor ? "#7e657f" : "#846c9f"} />
              <ProductionAsset asset="quaternius-torch" position={[-5.02, 1.85, -5.92]} scale={1.45} />
              <ProductionAsset asset="quaternius-torch" position={[5.02, 1.85, -5.92]} scale={1.45} />
              <ProductionAsset asset="quaternius-chest" position={[-6.3, -0.3, -2.76]} rotation={[0, 0.22, 0]} scale={0.42} />
              <ProductionAsset asset="quaternius-barrel" position={[6.15, -0.29, -2.72]} rotation={[0, -0.2, 0]} scale={1.05} />
              <ProductionAsset asset="quaternius-shelf-bottles" position={[-6.25, 0.9, -5.92]} scale={0.66} />
              <ProductionAsset asset="quaternius-book-stand" position={[5.82, -0.28, -4.72]} rotation={[0, -0.35, 0]} scale={0.44} />
              <ProductionAsset asset="quaternius-potion-round" position={[-5.72, -0.12, -3.25]} scale={0.42} tint={moor ? "#8fb750" : "#9a6dd0"} />
              <ProductionAsset asset="quaternius-potion-tall" position={[5.58, -0.12, -3.18]} scale={0.38} tint="#bc704c" />
              <ProductionAsset asset="quaternius-vine" position={[-6.55, 0.46, -6.02]} scale={0.58} />
              <ProductionAsset asset="quaternius-vine" position={[6.35, 0.34, -6.02]} rotation={[0, Math.PI, 0]} scale={0.48} />
              {moor && (
                <>
                  <ProductionAsset asset="quaternius-dead-tree" position={[-6.55, -0.32, -5.35]} scale={0.34} />
                  <ProductionAsset asset="quaternius-dead-tree" position={[6.42, -0.32, -5.42]} rotation={[0, -0.35, 0]} scale={0.31} />
                  <ProductionAsset asset="quaternius-mushroom-shelf" position={[-5.62, -0.2, -2.75]} rotation={[0, 0.36, 0]} scale={0.68} />
                  <ProductionAsset asset="quaternius-mushroom" position={[5.32, -0.2, -2.55]} rotation={[0, -0.22, 0]} scale={1.05} />
                  <ProductionAsset asset="quaternius-plant" position={[-4.65, -0.22, -4.92]} scale={1.28} />
                  <ProductionAsset asset="quaternius-plant" position={[4.38, -0.22, -5.02]} rotation={[0, 0.72, 0]} scale={1.12} />
                  <ProductionAsset asset="quaternius-rock" position={[5.9, -0.34, -4.35]} scale={0.42} />
                </>
              )}
            </>
          )}
        </Suspense>
        <pointLight color="#ffad5b" intensity={4.1} distance={6.5} position={[-5.1, 2.86, -5.34]} />
        <pointLight color="#ffad5b" intensity={4.1} distance={6.5} position={[5.1, 2.86, -5.34]} />
      </ProductionAssetBoundary>
      {[1.35, 2.25].map((y, index) => (
        <mesh key={y} castShadow receiveShadow position={[0, y, -5.72]}>
          <boxGeometry args={[10.2 - index * 0.9, 0.22, 0.72]} />
          <meshStandardMaterial color={index === 0 ? "#574859" : "#493c4e"} emissive={moor ? "#354124" : "#36243e"} emissiveIntensity={0.12} roughness={0.9} />
        </mesh>
      ))}
      <ArenaPortal moor={moor} />
      <TournamentAudience detail={quality.ambientDetail} moor={moor} reactionKey={eventKey} />
      <ArenaAmbientLife detail={quality.ambientDetail} moor={moor} />
      <ArenaChandelier />
      <mesh castShadow position={[0, 3.85, -5.5]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.16, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#6e5749" metalness={0.35} roughness={0.55} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 5.05, 2.7, -5.55]} rotation={[0, 0, side * -0.08]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 4.8, 10]} />
            <meshStandardMaterial color="#71513d" metalness={0.42} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[side * -0.42, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.42, 0.12, 8, 22, Math.PI]} />
            <meshStandardMaterial color="#71513d" metalness={0.42} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <ProductionAssetBoundary
        fallback={(
          <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
            <cylinderGeometry args={[5.2, 5.55, 0.42, 32]} />
            <meshStandardMaterial color="#514552" roughness={0.86} />
          </mesh>
        )}
      >
        <Suspense fallback={null}>
          <ProductionAsset asset="hero-arena-dais" position={[0, 0, 0]} />
        </Suspense>
      </ProductionAssetBoundary>
      <CauldronActor
        accent="#d87442"
        position={PLAYER_POSITION}
        reaction={reactionFor("player", scene)}
        reactionKey={eventKey}
        rotation={[0, Math.PI, 0]}
        scale={1.04}
        variant="player"
      />
      <CauldronActor
        accent={scene.opponent.id === "moor-martha" ? "#91b640" : "#7f71ce"}
        position={ENEMY_POSITION}
        reaction={reactionFor("enemy", scene)}
        reactionKey={eventKey}
        scale={scene.opponent.id === "moor-martha" ? 0.86 : 0.9}
        variant={scene.opponent.id}
      />
      <ArenaIngredients scene={scene} side="player" />
      <ArenaIngredients scene={scene} side="enemy" />
      {scene.combat?.event && (
        <BattleVfx key={scene.combat.eventIndex} frame={scene.combat} sourcePosition={sourcePosition} />
      )}
      <RunePillar side={-1} />
      <RunePillar side={1} />
      <ArenaRunes moor={moor} reactionKey={eventKey} />
      <ArenaBrazier poison={moor} position={[-4.2, 0.6, -3.62]} />
      <ArenaBrazier position={[4.2, 0.6, -3.62]} />
      <ArenaCandleCluster light position={[-5.45, -0.15, -4.72]} scale={0.82} />
      <ArenaCandleCluster light position={[5.38, -0.15, -4.65]} scale={0.74} />
      <ArenaCandleCluster position={[-6.02, -0.18, -0.42]} scale={0.64} />
      <ArenaCandleCluster position={[6.08, -0.18, 0.2]} scale={0.7} />
      <ArenaCandleCluster position={[-4.62, -0.18, 3.66]} scale={0.56} />
      <ArenaCandleCluster position={[4.72, -0.18, 3.48]} scale={0.62} />
      {moor && <MoorMiasma />}
    </group>
  );
}
