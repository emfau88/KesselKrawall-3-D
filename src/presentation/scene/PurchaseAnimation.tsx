import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, type Vector3Tuple } from "three";

import { getItemDefinition } from "../../core/data";
import type { ItemLocation } from "../../core/types";
import { IngredientModel } from "./IngredientModel";
import type { PurchaseVisual } from "./sceneTypes";
import { RESERVE_POSITION, SLOT_POSITIONS } from "./workshopLayout";

const FAMILY_COLORS = {
  fire: "#ff7545",
  poison: "#9bd758",
  guard: "#68cfdf",
  frost: "#8fdff1",
  echo: "#bd92ee",
} as const;

function destinationPosition(destination: number | "reserve"): Vector3Tuple {
  return destination === "reserve"
    ? RESERVE_POSITION
    : (SLOT_POSITIONS[destination] ?? SLOT_POSITIONS[0]!);
}

function locationPosition(location: ItemLocation): Vector3Tuple {
  return destinationPosition(location.area === "reserve" ? "reserve" : location.slot);
}

function MagicBurst({ color, strong = false }: { color: string; strong?: boolean }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, strong ? 0.075 : 0.038, 7, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.65} transparent opacity={0.82} />
      </mesh>
      {strong && Array.from({ length: 8 }, (_, index) => (
        <mesh
          key={index}
          position={[
            Math.cos(index * Math.PI / 4) * 0.52,
            Math.sin(index * 1.7) * 0.17,
            Math.sin(index * Math.PI / 4) * 0.52,
          ]}
        >
          <octahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color="#fff0b5" emissive={color} emissiveIntensity={1.25} />
        </mesh>
      ))}
    </group>
  );
}

function FlightVisual({ purchase, color }: { purchase: PurchaseVisual; color: string }) {
  const moving = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const sourceX = (purchase.offerIndex - 1) * 1.45;
  const target = destinationPosition(purchase.destinationSlot);

  useFrame(({ clock }) => {
    if (!moving.current) return;
    startedAt.current ??= clock.elapsedTime;
    const travel = MathUtils.clamp((clock.elapsedTime - startedAt.current) / 0.68, 0, 1);
    const eased = 1 - (1 - travel) ** 3;
    moving.current.position.set(
      MathUtils.lerp(sourceX, target[0] + (purchase.merged ? 0.42 : 0), eased),
      MathUtils.lerp(0.88, target[1] + 0.72, eased) + Math.sin(travel * Math.PI) * 1.55,
      MathUtils.lerp(3.55, target[2], eased),
    );
    moving.current.rotation.y = travel * Math.PI * 2.2;
    moving.current.rotation.z = Math.sin(travel * Math.PI) * -0.18;
    moving.current.scale.setScalar(0.78 + Math.sin(travel * Math.PI) * 0.22);
  });

  return (
    <group ref={moving}>
      <IngredientModel itemId={purchase.itemId} level={1} />
      <pointLight color={color} intensity={1.8} distance={2.5} />
    </group>
  );
}

function LandingVisual({ purchase, color }: { purchase: PurchaseVisual; color: string }) {
  const actor = useRef<Group>(null);
  const burst = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const target = destinationPosition(purchase.destinationSlot);

  useFrame(({ clock }) => {
    startedAt.current ??= clock.elapsedTime;
    const progress = MathUtils.clamp((clock.elapsedTime - (startedAt.current ?? 0)) / 0.18, 0, 1);
    if (actor.current) {
      actor.current.position.set(target[0] + (purchase.merged ? 0.42 : 0), target[1] + 0.72, target[2]);
      actor.current.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.18);
    }
    if (burst.current) {
      burst.current.position.set(target[0], target[1] + 0.24, target[2]);
      burst.current.scale.setScalar(0.35 + progress * 1.15);
      burst.current.rotation.z = progress * 0.8;
    }
  });

  return (
    <group>
      <group ref={actor}><IngredientModel itemId={purchase.itemId} level={1} /></group>
      <group ref={burst}><MagicBurst color={color} /></group>
    </group>
  );
}

function MergeVisual({ purchase, color }: { purchase: PurchaseVisual; color: string }) {
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const output = useRef<Group>(null);
  const sigil = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const step = purchase.merges[purchase.mergeStepIndex];
  if (!step) return null;
  const targetBase = locationPosition(step.target);
  const target: Vector3Tuple = [targetBase[0], targetBase[1] + 0.72, targetBase[2]];
  const consumedBase = step.consumed ? locationPosition(step.consumed) : targetBase;
  const firstOrigin: Vector3Tuple = [targetBase[0] - (step.consumed ? 0 : 0.48), targetBase[1] + 0.72, targetBase[2]];
  const secondOrigin: Vector3Tuple = [consumedBase[0] + (step.consumed ? 0 : 0.48), consumedBase[1] + 0.72, consumedBase[2]];

  useFrame(({ clock }) => {
    startedAt.current ??= clock.elapsedTime;
    const progress = MathUtils.clamp((clock.elapsedTime - (startedAt.current ?? 0)) / 0.62, 0, 1);
    const approach = MathUtils.smoothstep(progress, 0.05, 0.7);
    const collapse = MathUtils.smoothstep(progress, 0.58, 0.78);
    const placeInput = (group: Group | null, origin: Vector3Tuple, side: number) => {
      if (!group) return;
      group.position.set(
        MathUtils.lerp(origin[0], target[0] + side * 0.08, approach),
        MathUtils.lerp(origin[1], target[1] + 0.55, approach) + Math.sin(approach * Math.PI) * 0.5,
        MathUtils.lerp(origin[2], target[2], approach),
      );
      group.rotation.y = approach * Math.PI * side;
      group.scale.setScalar(Math.max(0, 1 - collapse));
    };
    placeInput(left.current, firstOrigin, -1);
    placeInput(right.current, secondOrigin, 1);
    if (sigil.current) {
      sigil.current.position.set(target[0], target[1] - 0.35, target[2]);
      sigil.current.rotation.z = progress * Math.PI * 2.4;
      sigil.current.scale.setScalar(0.45 + Math.sin(progress * Math.PI) * 1.25);
    }
    if (output.current) {
      const reveal = MathUtils.smoothstep(progress, 0.68, 0.94);
      output.current.visible = reveal > 0;
      output.current.position.set(target[0], target[1] + Math.sin(reveal * Math.PI) * 0.22, target[2]);
      output.current.rotation.y = (1 - reveal) * -0.8;
      output.current.scale.setScalar(reveal * (1 + Math.sin(reveal * Math.PI) * 0.2));
    }
  });

  return (
    <group>
      <group ref={left}><IngredientModel itemId={step.itemId} level={step.fromLevel} /></group>
      <group ref={right}><IngredientModel itemId={step.itemId} level={step.fromLevel} /></group>
      <group ref={sigil}><MagicBurst color={color} strong /></group>
      <group ref={output} visible={false}><IngredientModel itemId={step.itemId} level={step.toLevel} active animationKey={purchase.mergeStepIndex} /></group>
      <pointLight color={color} intensity={3.4} distance={4} position={[target[0], target[1] + 0.5, target[2]]} />
    </group>
  );
}

function RevealVisual({ purchase, color }: { purchase: PurchaseVisual; color: string }) {
  const burst = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const target = destinationPosition(purchase.destinationSlot);
  useFrame(({ clock }) => {
    if (!burst.current) return;
    startedAt.current ??= clock.elapsedTime;
    const progress = MathUtils.clamp((clock.elapsedTime - startedAt.current) / 0.26, 0, 1);
    burst.current.position.set(target[0], target[1] + 0.3, target[2]);
    burst.current.scale.setScalar(0.45 + progress * (purchase.merged ? 1.9 : 1.25));
    burst.current.rotation.z = progress * 1.6;
  });
  return <group ref={burst}><MagicBurst color={color} strong={purchase.merged} /></group>;
}

export function PurchaseAnimation({ purchase }: { purchase: PurchaseVisual }) {
  const family = getItemDefinition(purchase.itemId).family;
  const color = FAMILY_COLORS[family];
  if (purchase.phase === "flight") return <FlightVisual purchase={purchase} color={color} />;
  if (purchase.phase === "landing") return <LandingVisual purchase={purchase} color={color} />;
  if (purchase.phase === "merge") return <MergeVisual key={purchase.mergeStepIndex} purchase={purchase} color={color} />;
  return <RevealVisual purchase={purchase} color={color} />;
}
