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
  influence = null,
  onSelect,
}: {
  index: number;
  position: Vector3Tuple;
  item?: ItemInstance | null;
  selected?: boolean;
  influence?: "source" | "target" | null;
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
          color={selected ? "#73566f" : influence ? "#5c4656" : "#4a3944"}
          metalness={0.08}
          roughness={0.78}
        />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.035, 7, 24]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={selected ? 1.35 : influence ? 1.12 : item ? 0.68 : 0.22}
        />
      </mesh>
      {influence && (
        <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[influence === "target" ? 0.5 : 0.47, 0.025, 6, 28]} />
          <meshStandardMaterial
            color={influence === "target" ? "#7be3ed" : "#f0bd73"}
            emissive={influence === "target" ? "#55c6dd" : "#d99548"}
            emissiveIntensity={1.5}
          />
        </mesh>
      )}
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
