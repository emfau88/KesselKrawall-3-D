import type { Vector3Tuple } from "three";

import type { ItemInstance } from "../../core/types";
import { getItemDefinition } from "../../core/data";
import { IngredientModel } from "./IngredientModel";

const FAMILY_ACCENTS = {
  fire: "#ff7545",
  poison: "#9bd758",
  guard: "#68cfdf",
  frost: "#8fdff1",
  echo: "#bd92ee",
} as const;

export function IngredientSlotGreybox({
  index,
  position,
  item,
  selected = false,
  onSelect,
}: {
  index: number;
  position: Vector3Tuple;
  item?: ItemInstance | null;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const accent = item
    ? FAMILY_ACCENTS[getItemDefinition(item.itemId).family]
    : "#8a7787";
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.58, 0.68, 0.16, 16]} />
        <meshStandardMaterial
          color={selected ? "#73566f" : "#4a3944"}
          metalness={0.08}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.035, 7, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={selected ? 1.35 : item ? 0.68 : 0.22}
        />
      </mesh>
      {item ? (
        <group position={[0, 0.72, 0]} rotation={[0, index * 0.12 - 0.24, 0]}>
          <IngredientModel itemId={item.itemId} level={item.level} />
        </group>
      ) : (
        <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 16]} />
          <meshStandardMaterial color="#332a34" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}
