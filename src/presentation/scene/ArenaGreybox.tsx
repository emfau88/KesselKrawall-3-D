import { CauldronGreybox } from "./CauldronGreybox";
import type { CauldronReaction } from "./CauldronGreybox";
import { BattleVfx } from "./BattleVfx";
import { IngredientModel } from "./IngredientModel";
import type { ArenaSceneState } from "./sceneTypes";

function reactionFor(
  side: "player" | "enemy",
  scene: ArenaSceneState,
): CauldronReaction {
  const event = scene.combat?.event;
  if (!event) return "idle";
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
            <IngredientModel itemId={item.itemId} level={item.level} />
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

export function ArenaGreybox({ scene }: { scene: ArenaSceneState }) {
  const eventKey = scene.combat?.eventIndex ?? -1;
  return (
    <group>
      <mesh receiveShadow position={[0, 2.6, -6.1]}>
        <boxGeometry args={[13.5, 8, 0.35]} />
        <meshStandardMaterial color="#242034" roughness={0.98} />
      </mesh>
      {[-4.5, -1.5, 1.5, 4.5].map((x) => (
        <mesh key={x} castShadow position={[x, 2.6, -5.85]}>
          <cylinderGeometry args={[0.34, 0.48, 6.6, 10]} />
          <meshStandardMaterial color="#3b3348" roughness={0.9} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[5.2, 5.55, 0.42, 32]} />
        <meshStandardMaterial color="#514552" roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[0, 0.29, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.75, 0.07, 8, 72]} />
        <meshStandardMaterial color="#6e6070" metalness={0.18} roughness={0.58} />
      </mesh>
      <mesh receiveShadow position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.85, 0.08, 8, 64]} />
        <meshStandardMaterial color="#b89462" emissive="#805f3b" emissiveIntensity={0.25} />
      </mesh>
      {Array.from({ length: 16 }, (_, index) => {
        const angle = (index / 16) * Math.PI * 2;
        return (
          <group key={index} position={[Math.cos(angle) * 4.3, 0.35, Math.sin(angle) * 4.3]} rotation={[0, -angle, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.52, 0.11, 0.28]} />
              <meshStandardMaterial color="#67596a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.075, 0.11, 6]} />
              <meshStandardMaterial color="#b485d8" emissive="#8a5cc0" emissiveIntensity={0.55} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.56, 8]} />
        <meshStandardMaterial color="#d1a768" emissive="#96673b" emissiveIntensity={0.35} />
      </mesh>
      <CauldronGreybox
        accent="#d87442"
        position={[0, 1.28, 2.25]}
        reaction={reactionFor("player", scene)}
        reactionKey={eventKey}
      />
      <CauldronGreybox
        accent="#7f71ce"
        position={[0, 1.28, -2.15]}
        reaction={reactionFor("enemy", scene)}
        reactionKey={eventKey}
        scale={1.08}
      />
      <ArenaIngredients scene={scene} side="player" />
      <ArenaIngredients scene={scene} side="enemy" />
      {scene.combat?.event && (
        <BattleVfx key={scene.combat.eventIndex} frame={scene.combat} />
      )}
      <RunePillar side={-1} />
      <RunePillar side={1} />
      {[0, 1, 2].map((step) => (
        <mesh key={step} castShadow receiveShadow position={[0, -0.18 - step * 0.14, 5.1 + step * 0.42]}>
          <boxGeometry args={[4.2 + step * 0.55, 0.22, 0.78]} />
          <meshStandardMaterial color="#403745" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}
