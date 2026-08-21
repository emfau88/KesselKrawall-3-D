import { Suspense } from "react";
import type { Vector3Tuple } from "three";

import { CauldronActor } from "./CauldronActor";
import { IngredientModel } from "./IngredientModel";
import { IngredientSlotGreybox } from "./IngredientSlotGreybox";
import { PurchaseAnimation } from "./PurchaseAnimation";
import { ProductionAsset, ProductionAssetBoundary } from "./ProductionAsset";
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

function WorkshopProductionEnvironment() {
  return (
    <group>
      <ProductionAssetBoundary fallback={<WorkshopBackdrop />}>
        <Suspense fallback={<WorkshopBackdrop />}>
          <ProductionAsset asset="dungeon-wall-shelves" position={[-4, -0.66, -4.22]} />
          <ProductionAsset asset="dungeon-wall-arched" position={[0, -0.66, -4.22]} />
          <ProductionAsset asset="dungeon-wall-shelves" position={[4, -0.66, -4.22]} />
          <ProductionAsset asset="dungeon-wall-cracked" position={[-5.72, -0.66, -2.38]} rotation={[0, Math.PI / 2, 0]} />
          <ProductionAsset asset="dungeon-wall" position={[5.72, -0.66, -2.38]} rotation={[0, -Math.PI / 2, 0]} />
          <ProductionAsset asset="dungeon-pillar" position={[-5.08, -0.66, -3.88]} scale={0.78} />
          <ProductionAsset asset="dungeon-pillar" position={[5.08, -0.66, -3.88]} scale={0.78} />
          <ProductionAsset asset="dungeon-floor-tile" position={[-2, -0.64, -2.15]} />
          <ProductionAsset asset="dungeon-floor-tile" position={[2, -0.64, -2.15]} />
        </Suspense>
      </ProductionAssetBoundary>
      <mesh receiveShadow position={[0, -0.66, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.7, 40]} />
        <meshStandardMaterial color="#342a31" roughness={0.96} />
      </mesh>
    </group>
  );
}

function BookStack({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position} rotation={[0.04, -0.2, -0.03]}>
      {[
        [0, 0, "#4e2638", 1.22],
        [0.08, 0.16, "#70513a", 1.05],
        [-0.03, 0.31, "#3d3658", 1.14],
      ].map(([x, y, color, width], index) => (
        <group key={index} position={[Number(x), Number(y), 0]}>
          <mesh castShadow>
            <boxGeometry args={[Number(width), 0.14, 0.75]} />
            <meshStandardMaterial color={String(color)} roughness={0.86} />
          </mesh>
          <mesh position={[Number(width) * 0.49, 0, 0]}>
            <boxGeometry args={[0.035, 0.1, 0.63]} />
            <meshStandardMaterial color="#d1b77b" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function MortarAndPestle({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh castShadow scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.42, 14, 9, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
        <meshStandardMaterial color="#5b5152" metalness={0.08} roughness={0.86} side={2} />
      </mesh>
      <mesh castShadow position={[0.18, 0.37, 0]} rotation={[0, 0.25, -0.72]}>
        <cylinderGeometry args={[0.09, 0.13, 0.92, 10]} />
        <meshStandardMaterial color="#75655d" roughness={0.78} />
      </mesh>
    </group>
  );
}

function WorkshopProductionProps() {
  return (
    <ProductionAssetBoundary fallback={null}>
      <Suspense fallback={null}>
        <ProductionAsset asset="workshop-shelves" position={[-3.65, -0.45, -3.66]} scale={0.88} />
        <ProductionAsset asset="workshop-shelves" position={[3.65, -0.45, -3.66]} scale={0.88} />
        <ProductionAsset asset="workshop-bottle-green" position={[-4.05, 0.57, -3.08]} scale={0.72} />
        <ProductionAsset asset="workshop-bottle-brown" position={[-3.46, 0.57, -3.08]} scale={0.64} />
        <ProductionAsset asset="workshop-bottle-green" position={[3.43, 1.42, -3.08]} scale={0.66} />
        <ProductionAsset asset="workshop-bottle-brown" position={[4.02, 0.57, -3.08]} scale={0.72} />
        <ProductionAsset asset="workshop-candles" position={[-2.1, 0.67, -1.74]} scale={0.72} />
        <ProductionAsset asset="workshop-candles" position={[2.18, 0.67, -1.78]} scale={0.68} />
        <ProductionAsset asset="dungeon-crates" position={[-5.25, -0.63, -1.52]} rotation={[0, 0.28, 0]} scale={0.58} />
        <ProductionAsset asset="dungeon-barrels" position={[5.02, -0.63, -1.7]} rotation={[0, -0.2, 0]} scale={0.62} />
        <ProductionAsset asset="dungeon-torch-mounted" position={[-1.5, 2.46, -3.78]} scale={0.9} />
        <ProductionAsset asset="dungeon-torch-mounted" position={[1.5, 2.46, -3.78]} scale={0.9} />
      </Suspense>
      <pointLight color="#ffad5b" intensity={3.2} distance={5.5} position={[-1.5, 2.85, -3.32]} />
      <pointLight color="#ffad5b" intensity={3.2} distance={5.5} position={[1.5, 2.85, -3.32]} />
      <BookStack position={[-3.15, 0.94, -0.98]} />
      <MortarAndPestle position={[3.12, 1.02, -0.95]} />
      <mesh castShadow position={[2.88, 0.96, 0.25]} rotation={[0.22, 0.48, 0.08]}>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#6d47a2" emissive="#7e51bd" emissiveIntensity={0.8} roughness={0.3} />
      </mesh>
    </ProductionAssetBoundary>
  );
}

function WorkbenchFallback() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.26, 0.5]}>
        <boxGeometry args={[8.1, 0.52, 6]} />
        <meshStandardMaterial color="#704a31" roughness={0.82} />
      </mesh>
      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh key={`${xSide}-${zSide}`} castShadow position={[xSide * 3.25, -0.85, zSide * 2.05 + 0.35]}>
          <boxGeometry args={[0.55, 2.25, 0.55]} />
          <meshStandardMaterial color="#3e2b24" roughness={0.9} />
        </mesh>
      )))}
    </group>
  );
}

export function WorkshopGreybox({ scene }: { scene: WorkshopSceneState }) {
  return (
    <group>
      <WorkshopProductionEnvironment />
      <WorkshopProductionProps />
      <ProductionAssetBoundary fallback={<WorkbenchFallback />}>
        <Suspense fallback={<WorkbenchFallback />}>
          <ProductionAsset asset="hero-workbench" position={[0, 0.28, 0.5]} />
        </Suspense>
      </ProductionAssetBoundary>
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
      <ProductionAssetBoundary fallback={null}>
        <Suspense fallback={null}>
          <ProductionAsset asset="workshop-bottle-green" position={[-3.25, 0.67, -1.55]} scale={0.86} />
          <ProductionAsset asset="workshop-candles" position={[3.1, 0.67, -1.72]} scale={0.78} />
        </Suspense>
      </ProductionAssetBoundary>
      <pointLight color="#ffb15d" intensity={2.4} distance={4.4} position={[3.1, 1.36, -1.72]} />
      <mesh castShadow position={[3.1, 1.03, -0.92]} rotation={[0.2, 0.35, 0.1]}>
        <dodecahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial color="#9a7044" roughness={0.8} />
      </mesh>
    </group>
  );
}
