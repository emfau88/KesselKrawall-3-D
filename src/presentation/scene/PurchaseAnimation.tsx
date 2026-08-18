import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils } from "three";

import { getItemDefinition } from "../../core/data";
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

export function PurchaseAnimation({ purchase }: { purchase: PurchaseVisual }) {
  const moving = useRef<Group>(null);
  const burst = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const sourceX = (purchase.offerIndex - 1) * 1.45;
  const target = purchase.destinationSlot === "reserve"
    ? RESERVE_POSITION
    : (SLOT_POSITIONS[purchase.destinationSlot] ?? SLOT_POSITIONS[0]);
  const family = getItemDefinition(purchase.itemId).family;
  const color = FAMILY_COLORS[family];

  useFrame(({ clock }) => {
    if (!moving.current || !burst.current || !target) return;
    startedAt.current ??= clock.elapsedTime;
    const elapsed = clock.elapsedTime - startedAt.current;
    const travel = MathUtils.clamp(elapsed / 0.72, 0, 1);
    const eased = 1 - (1 - travel) ** 3;
    moving.current.position.set(
      MathUtils.lerp(sourceX, target[0], eased),
      MathUtils.lerp(0.88, target[1] + 0.7, eased) + Math.sin(travel * Math.PI) * 1.5,
      MathUtils.lerp(3.55, target[2], eased),
    );
    moving.current.rotation.y = travel * Math.PI * 2.2;
    moving.current.scale.setScalar(travel >= 1 ? 0 : 0.78 + Math.sin(travel * Math.PI) * 0.2);

    const burstProgress = MathUtils.clamp((elapsed - 0.58) / 0.7, 0, 1);
    burst.current.visible = burstProgress > 0 && burstProgress < 1;
    burst.current.position.set(target[0], target[1] + 0.5, target[2]);
    burst.current.scale.setScalar(0.3 + burstProgress * (purchase.merged ? 2.1 : 1.3));
    burst.current.rotation.z = burstProgress * 1.4;
  });

  return (
    <group>
      <group ref={moving}>
        <IngredientModel itemId={purchase.itemId} level={purchase.resultLevel} />
      </group>
      <group ref={burst} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, purchase.merged ? 0.07 : 0.035, 7, 28]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.5}
            transparent
            opacity={0.78}
          />
        </mesh>
        {purchase.merged &&
          [0, 1, 2, 3, 4, 5].map((index) => (
            <mesh
              key={index}
              position={[
                Math.cos(index * Math.PI / 3) * 0.48,
                Math.sin(index * 1.7) * 0.16,
                Math.sin(index * Math.PI / 3) * 0.48,
              ]}
            >
              <octahedronGeometry args={[0.07, 0]} />
              <meshStandardMaterial color="#fff0b5" emissive={color} emissiveIntensity={1.1} />
            </mesh>
          ))}
      </group>
    </group>
  );
}
