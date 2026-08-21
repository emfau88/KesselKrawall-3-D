import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, type Vector3Tuple } from "three";

import { CauldronActor } from "./CauldronActor";
import type { CauldronReaction } from "./CauldronActor";
import { BattleVfx } from "./BattleVfx";
import { IngredientModel } from "./IngredientModel";
import { ProductionAsset, ProductionAssetBoundary } from "./ProductionAsset";
import type { ArenaSceneState } from "./sceneTypes";

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

function ArenaIngredients({ scene, side }: {
  scene: ArenaSceneState;
  side: "player" | "enemy";
}) {
  const board = side === "player" ? scene.board : scene.opponent.board;
  const z = side === "player" ? 3.65 : -3.55;
  return (
    <group>
      {board.map((item, index) => {
        if (!item) return null;
        return (
          <group
            key={item.uid}
            position={[(index - 2) * 0.82, 0.68, z]}
            scale={0.55}
            rotation={[0, side === "player" ? 0 : Math.PI, 0]}
          >
            <IngredientModel
              active={scene.combat?.event?.sourceUid === item.uid}
              animationKey={scene.combat?.eventIndex ?? -1}
              itemId={item.itemId}
              level={item.level}
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
      <mesh ref={flame} position={[0, 0.68, 0]} scale={[0.72, 1, 0.72]}>
        <octahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial color="#ffd073" emissive={color} emissiveIntensity={2.15} transparent opacity={0.9} />
      </mesh>
      <pointLight color={color} intensity={4.8} distance={5.5} decay={2} position={[0, 0.82, 0]} />
    </group>
  );
}

function TournamentAudience({ moor }: { moor: boolean }) {
  const crowd = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!crowd.current) return;
    crowd.current.children.forEach((member, index) => {
      const baseY = Number(member.userData.baseY ?? member.position.y);
      const phase = Number(member.userData.phase ?? index);
      member.position.y = baseY + Math.sin(clock.elapsedTime * (0.9 + (index % 4) * 0.08) + phase) * 0.045;
      member.rotation.z = Math.sin(clock.elapsedTime * 0.72 + phase * 1.7) * 0.035;
      member.rotation.y = Math.sin(clock.elapsedTime * 0.38 + phase) * 0.08;
    });
  });
  return (
    <group ref={crowd}>
      {[1.72, 2.62].flatMap((y, row) =>
        Array.from({ length: row === 0 ? 11 : 9 }, (_, index) => {
          const count = row === 0 ? 11 : 9;
          const x = (index - (count - 1) / 2) * (row === 0 ? 0.72 : 0.82);
          const accent = moor && index % 4 === 0 ? "#829344" : index % 3 === 0 ? "#6e4f72" : "#4b3c52";
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
                <meshStandardMaterial color={index % 2 ? "#9b7869" : "#75606b"} roughness={0.82} />
              </mesh>
              <mesh castShadow position={[0, 0.3, 0]} rotation={[0, 0, (index % 3 - 1) * 0.08]}>
                <coneGeometry args={[0.21, 0.42, 7]} />
                <meshStandardMaterial color={index % 3 === 0 ? "#4c3158" : "#30283d"} roughness={0.9} />
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
    <group ref={cloud} position={[0, 0.45, -3.9]}>
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

function ArenaAmbientLife({ moor }: { moor: boolean }) {
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
        {Array.from({ length: 15 }, (_, index) => {
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

export function ArenaGreybox({ scene }: { scene: ArenaSceneState }) {
  const moor = scene.opponent.id === "moor-martha";
  const eventKey = scene.combat?.eventIndex ?? -1;
  const activeEvent = scene.combat?.event;
  const activeBoard = activeEvent?.actor === "enemy" ? scene.opponent.board : scene.board;
  const activeSlot = activeEvent
    ? activeBoard.findIndex((item) => item?.uid === activeEvent.sourceUid)
    : -1;
  const sourcePosition = activeSlot >= 0
    ? ([(activeSlot - 2) * 0.82, 1.02, activeEvent?.actor === "enemy" ? -3.55 : 3.65] as [number, number, number])
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
        </Suspense>
        <pointLight color="#ffad5b" intensity={4.1} distance={6.5} position={[-5.1, 2.86, -5.34]} />
        <pointLight color="#ffad5b" intensity={4.1} distance={6.5} position={[5.1, 2.86, -5.34]} />
      </ProductionAssetBoundary>
      {[1.35, 2.25].map((y, index) => (
        <mesh key={y} castShadow receiveShadow position={[0, y, -5.72]}>
          <boxGeometry args={[10.2 - index * 0.9, 0.22, 0.72]} />
          <meshStandardMaterial color={index === 0 ? "#443848" : "#392f40"} roughness={0.9} />
        </mesh>
      ))}
      <TournamentAudience moor={moor} />
      <ArenaAmbientLife moor={moor} />
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
        position={[0, 1.28, 2.25]}
        reaction={reactionFor("player", scene)}
        reactionKey={eventKey}
        variant="player"
      />
      <CauldronActor
        accent={scene.opponent.id === "moor-martha" ? "#91b640" : "#7f71ce"}
        position={[0, 1.28, -2.15]}
        reaction={reactionFor("enemy", scene)}
        reactionKey={eventKey}
        scale={1.08}
        variant={scene.opponent.id}
      />
      <ArenaIngredients scene={scene} side="player" />
      <ArenaIngredients scene={scene} side="enemy" />
      {scene.combat?.event && (
        <BattleVfx key={scene.combat.eventIndex} frame={scene.combat} sourcePosition={sourcePosition} />
      )}
      <RunePillar side={-1} />
      <RunePillar side={1} />
      <ArenaBrazier poison={moor} position={[-3.4, 0.6, -4.25]} />
      <ArenaBrazier position={[3.4, 0.6, -4.25]} />
      {moor && <MoorMiasma />}
    </group>
  );
}
