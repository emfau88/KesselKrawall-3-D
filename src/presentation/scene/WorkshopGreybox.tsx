import type { Vector3Tuple } from "three";

import { CauldronActor } from "./CauldronActor";
import { IngredientModel } from "./IngredientModel";
import { IngredientSlotGreybox } from "./IngredientSlotGreybox";
import { PurchaseAnimation } from "./PurchaseAnimation";
import type { WorkshopSceneState } from "./sceneTypes";
import { RESERVE_POSITION, SLOT_POSITIONS } from "./workshopLayout";

const OFFER_POSITIONS: readonly Vector3Tuple[] = [
  [-1.45, 0.47, 3.55],
  [0, 0.47, 3.55],
  [1.45, 0.47, 3.55],
];

function PotionBottle({ position, color, scale = 1 }: {
  position: Vector3Tuple;
  color: string;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.27, 0.48, 9]} />
        <meshStandardMaterial color="#6c6575" metalness={0.1} roughness={0.3} transparent opacity={0.74} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.145, 0.2, 0.24, 9]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.24, 8]} />
        <meshStandardMaterial color="#756c7a" roughness={0.35} transparent opacity={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.49, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.09, 8]} />
        <meshStandardMaterial color="#a37a4e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Candle({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.11, 0.13, 0.55, 9]} />
        <meshStandardMaterial color="#d7c69e" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.36, 0]} scale={[0.55, 1, 0.55]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#ffd46a" emissive="#f08d3c" emissiveIntensity={1.8} />
      </mesh>
      <pointLight color="#ffae55" intensity={1.3} distance={3.5} position={[0, 0.4, 0]} />
    </group>
  );
}

function WorkshopBackdrop() {
  return (
    <group>
      <mesh receiveShadow position={[0, 2.25, -4.2]}>
        <boxGeometry args={[13, 7.4, 0.28]} />
        <meshStandardMaterial color="#3c2c3d" roughness={0.96} />
      </mesh>
      {[-4.8, -2.4, 0, 2.4, 4.8].map((x) => (
        <mesh key={x} position={[x, 2.25, -4.02]}>
          <boxGeometry args={[0.08, 7, 0.05]} />
          <meshStandardMaterial color="#4a3747" roughness={0.95} />
        </mesh>
      ))}
      <mesh castShadow position={[-2.9, 2.8, -3.76]}>
        <boxGeometry args={[3.1, 0.18, 0.7]} />
        <meshStandardMaterial color="#59402f" roughness={0.86} />
      </mesh>
      <PotionBottle color="#83cf59" position={[-3.65, 3.17, -3.65]} scale={0.85} />
      <PotionBottle color="#8e72d1" position={[-2.95, 3.14, -3.66]} scale={0.72} />
      <PotionBottle color="#d66e45" position={[-2.25, 3.15, -3.67]} scale={0.78} />
      <Candle position={[3.2, 2.2, -3.72]} />
      <mesh castShadow position={[0.2, 3.1, -3.94]} rotation={[0, 0, -0.04]}>
        <boxGeometry args={[1.45, 1.9, 0.08]} />
        <meshStandardMaterial color="#6e455f" roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 3.1, -3.87]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.05, 7, 24]} />
        <meshStandardMaterial color="#d5ac6b" emissive="#a56f43" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

export function WorkshopGreybox({ scene }: { scene: WorkshopSceneState }) {
  return (
    <group>
      <WorkshopBackdrop />
      <mesh castShadow receiveShadow position={[0, 0.26, 0.5]}>
        <boxGeometry args={[8.1, 0.52, 6]} />
        <meshStandardMaterial color="#704a31" roughness={0.82} />
      </mesh>
      {[-2.2, -0.75, 0.7, 2.15].map((z, index) => (
        <mesh key={z} receiveShadow position={[0, 0.535, z]}>
          <boxGeometry args={[7.85, 0.018, 0.035]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#9a6841" : "#4d3529"} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${xSide}-${zSide}`} castShadow position={[xSide * 3.25, -0.85, zSide * 2.05 + 0.35]}>
          <boxGeometry args={[0.55, 2.25, 0.55]} />
          <meshStandardMaterial color="#3e2b24" roughness={0.9} />
        </mesh>
      )))}
      <mesh castShadow position={[0, -0.7, -1.7]}>
        <boxGeometry args={[6.7, 0.28, 0.32]} />
        <meshStandardMaterial color="#493126" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, -0.7, 2.35]}>
        <boxGeometry args={[6.7, 0.28, 0.32]} />
        <meshStandardMaterial color="#493126" roughness={0.9} />
      </mesh>
      <CauldronActor accent="#d87442" position={[0, 1.45, -0.05]} scale={1.05} variant="player" />
      {SLOT_POSITIONS.map((position, index) => (
        <IngredientSlotGreybox
          key={index}
          index={index}
          item={scene.board[index]}
          onSelect={() => scene.onSelectSlot(index)}
          position={position}
          selected={scene.selectedSlot === index}
        />
      ))}
      {scene.reserveUnlocked && (
        <group>
          <IngredientSlotGreybox
            index={5}
            item={scene.reserve}
            onSelect={scene.onSelectReserve}
            position={RESERVE_POSITION}
            selected={scene.reserveSelected}
          />
          <mesh position={[RESERVE_POSITION[0], 0.57, RESERVE_POSITION[2] - 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.72, 0.18]} />
            <meshStandardMaterial color="#bba4bd" emissive="#684f70" emissiveIntensity={0.3} />
          </mesh>
        </group>
      )}
      {scene.offers.map((offer, index) => {
        const position = OFFER_POSITIONS[index];
        if (!position || offer.bought) return null;
        return (
          <group key={offer.uid} position={position}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.38, 0.48, 0.13, 12]} />
              <meshStandardMaterial color="#3f303d" roughness={0.76} />
            </mesh>
            <group position={[0, 0.45, 0]} scale={0.55}>
              <IngredientModel itemId={offer.itemId} level={1} faded />
            </group>
          </group>
        );
      })}
      {scene.purchase && (
        <PurchaseAnimation key={scene.purchase.id} purchase={scene.purchase} />
      )}
      <PotionBottle color="#8bc857" position={[-3.25, 1.05, -1.55]} scale={1.15} />
      <Candle position={[3.2, 0.92, -1.72]} />
      <mesh castShadow position={[3.1, 1.03, -0.92]} rotation={[0.2, 0.35, 0.1]}>
        <dodecahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial color="#9a7044" roughness={0.8} />
      </mesh>
    </group>
  );
}
