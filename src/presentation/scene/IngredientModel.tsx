import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Group,
  MathUtils,
  Vector2,
  Vector3,
} from "three";

import { getItemDefinition } from "../../core/data";
import type { ItemLevel } from "../../core/types";

const FAMILY_COLORS = {
  fire: { base: "#c9442f", accent: "#ffb13f", glow: "#e55b2f" },
  poison: { base: "#668f3d", accent: "#b9e85f", glow: "#79bd42" },
  guard: { base: "#e9e1c7", accent: "#72d6df", glow: "#4eb9cb" },
  frost: { base: "#8bcddd", accent: "#d6f5f4", glow: "#73cce8" },
  echo: { base: "#8d6ab8", accent: "#d2a7f0", glow: "#a67ad9" },
} as const;

const CHILI_CURVE = new CatmullRomCurve3([
  new Vector3(-0.08, 0.52, 0),
  new Vector3(-0.18, 0.24, 0.02),
  new Vector3(-0.13, -0.08, 0.04),
  new Vector3(0.08, -0.36, 0.02),
  new Vector3(0.34, -0.49, -0.02),
]);

const MUSHROOM_CAP_PROFILE = [
  new Vector2(0, -0.15),
  new Vector2(0.28, -0.13),
  new Vector2(0.47, -0.06),
  new Vector2(0.55, 0.03),
  new Vector2(0.48, 0.16),
  new Vector2(0.31, 0.27),
  new Vector2(0.09, 0.32),
  new Vector2(0, 0.31),
];

function ActivationAura({ family }: { family: keyof typeof FAMILY_COLORS }) {
  const colors = FAMILY_COLORS[family];
  if (family === "fire") {
    return (
      <group>
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = index * Math.PI * 0.4;
          return (
            <mesh key={index} position={[Math.cos(angle) * 0.5, 0.12 + (index % 3) * 0.22, Math.sin(angle) * 0.34]}>
              <octahedronGeometry args={[0.055 + (index % 2) * 0.025, 0]} />
              <meshStandardMaterial color="#ffd779" emissive={colors.glow} emissiveIntensity={2.1} />
            </mesh>
          );
        })}
        <pointLight color={colors.glow} intensity={2.2} distance={2.2} />
      </group>
    );
  }
  if (family === "poison") {
    return (
      <group>
        {[0, 1, 2, 3].map((index) => (
          <mesh key={index} position={[(index - 1.5) * 0.24, 0.15 + (index % 2) * 0.34, (index % 2 ? 1 : -1) * 0.22]}>
            <sphereGeometry args={[0.09 + index * 0.012, 8, 6]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.9} transparent opacity={0.48} depthWrite={false} />
          </mesh>
        ))}
      </group>
    );
  }
  if (family === "guard") {
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.62, 0.04, 7, 8]} />
          <meshStandardMaterial color="#e9ffff" emissive={colors.glow} emissiveIntensity={1.7} transparent opacity={0.84} />
        </mesh>
        <pointLight color={colors.glow} intensity={1.5} distance={2} />
      </group>
    );
  }
  return null;
}

function LevelDetails({ level, color }: { level: ItemLevel; color: string }) {
  if (level === 1) return null;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <torusGeometry args={[0.37 + level * 0.035, 0.025, 6, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      {level === 3 &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.38, 0.28, 0]}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial color="#fff4ca" emissive={color} emissiveIntensity={1.2} />
          </mesh>
        ))}
    </group>
  );
}

export function IngredientModel({ itemId, level, faded = false, active = false, animationKey = -1 }: {
  itemId: string;
  level: ItemLevel;
  faded?: boolean;
  active?: boolean;
  animationKey?: number;
}) {
  const actor = useRef<Group>(null);
  const lastKey = useRef(animationKey);
  const startedAt = useRef(0);
  const definition = getItemDefinition(itemId);
  const colors = FAMILY_COLORS[definition.family];
  const scale = (0.78 + level * 0.1) * (faded ? 0.78 : 1);
  const materialProps = { transparent: faded, opacity: faded ? 0.55 : 1 };

  useFrame(({ clock }) => {
    if (!actor.current) return;
    if (lastKey.current !== animationKey) {
      lastKey.current = animationKey;
      startedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - startedAt.current;
    const action = active
      ? Math.sin(MathUtils.clamp(elapsed / 0.58, 0, 1) * Math.PI)
      : 0;
    const idle = Math.sin(clock.elapsedTime * 1.9 + itemId.length) * 0.025;
    let scaleX = 1;
    let scaleY = 1;
    let scaleZ = 1;
    let rotationX = 0;
    let rotationY = Math.sin(clock.elapsedTime * 0.45 + itemId.length) * 0.08;
    let rotationZ = 0;
    let offsetY = idle;
    let offsetZ = 0;

    if (itemId === "chili" || itemId === "cinder-berry") {
      rotationX = action * -0.48;
      rotationZ = action * 0.22;
      offsetZ = action * -0.24;
      scaleY += action * 0.12;
    } else if (itemId === "slime-shroom") {
      scaleX += action * 0.24;
      scaleZ += action * 0.24;
      scaleY -= action * 0.3;
      offsetY -= action * 0.08;
    } else if (itemId === "egg-shell") {
      rotationY += action * Math.PI * 1.2;
      scaleX += action * 0.16;
      scaleZ += action * 0.16;
      offsetY += action * 0.18;
    } else if (definition.family === "frost") {
      rotationY += action * Math.PI * 0.85;
      offsetY += action * 0.16;
    } else if (definition.family === "echo") {
      scaleX += action * 0.13;
      scaleZ += action * 0.13;
      rotationY += action * Math.PI * 0.7;
    } else {
      offsetY += action * 0.12;
      rotationZ = action * 0.18;
    }

    actor.current.position.set(0, offsetY, offsetZ);
    actor.current.rotation.set(rotationX, rotationY, rotationZ);
    actor.current.scale.set(scaleX, scaleY, scaleZ);
  });

  let model;
  switch (itemId) {
    case "chili":
    case "cinder-berry":
      model = (
        <group rotation={[0.08, -0.18, -0.28]}>
          <mesh castShadow>
            <tubeGeometry args={[CHILI_CURVE, 28, 0.17, 9, false]} />
            <meshStandardMaterial color={colors.base} emissive="#6f1717" emissiveIntensity={0.16} roughness={0.46} {...materialProps} />
          </mesh>
          <mesh castShadow position={[-0.1, 0.66, 0]} rotation={[0.18, 0, -0.22]}>
            <coneGeometry args={[0.12, 0.38, 7]} />
            <meshStandardMaterial color="#62733c" roughness={0.8} {...materialProps} />
          </mesh>
          <mesh position={[-0.16, 0.21, 0.14]} scale={[0.16, 0.62, 0.12]} rotation={[0, 0, -0.2]}>
            <sphereGeometry args={[0.5, 8, 6]} />
            <meshStandardMaterial color="#ff8c55" emissive={colors.glow} emissiveIntensity={0.38} transparent opacity={faded ? 0.25 : 0.42} />
          </mesh>
          {itemId === "cinder-berry" && (
            <mesh position={[-0.22, -0.15, 0.3]}>
              <sphereGeometry args={[0.13, 8, 6]} />
              <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.5} {...materialProps} />
            </mesh>
          )}
        </group>
      );
      break;
    case "dragon-tooth":
      model = (
        <group rotation={[0.08, 0, -0.2]}>
          <mesh castShadow position={[0, 0.08, 0]}>
            <coneGeometry args={[0.36, 1.12, 7]} />
            <meshStandardMaterial color="#efe0bd" roughness={0.62} {...materialProps} />
          </mesh>
          <mesh position={[0, -0.42, 0]}>
            <torusGeometry args={[0.32, 0.06, 6, 18]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.45} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "ember-core":
      model = (
        <group>
          <mesh castShadow rotation={[0.2, 0.4, 0.15]}>
            <dodecahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial color="#4a3334" roughness={0.64} {...materialProps} />
          </mesh>
          <mesh scale={0.62} rotation={[-0.2, 0.25, 0.1]}>
            <octahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={1.1} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "slime-shroom":
      model = (
        <group>
          <mesh castShadow position={[0, -0.2, 0]} scale={[1, 1, 0.94]}>
            <cylinderGeometry args={[0.16, 0.27, 0.64, 10]} />
            <meshStandardMaterial color="#c9bd91" roughness={0.9} {...materialProps} />
          </mesh>
          <mesh castShadow position={[0, 0.18, 0]} scale={[1, 0.92, 1]}>
            <latheGeometry args={[MUSHROOM_CAP_PROFILE, 20]} />
            <meshStandardMaterial color={colors.base} emissive="#314d24" emissiveIntensity={0.14} roughness={0.62} {...materialProps} />
          </mesh>
          {[[-0.24, 0.36, 0.24], [0.17, 0.42, 0.18], [0.32, 0.25, -0.12]].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]}>
              <sphereGeometry args={[0.06 + index * 0.012, 7, 5]} />
              <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.5} {...materialProps} />
            </mesh>
          ))}
        </group>
      );
      break;
    case "nightwing":
      model = (
        <group rotation={[0.18, 0.25, 0]}>
          {[-1, 1].map((side) => (
            <mesh key={side} castShadow position={[side * 0.28, 0, 0]} rotation={[0, side * -0.45, side * 0.62]} scale={[0.8, 1.45, 0.24]}>
              <tetrahedronGeometry args={[0.44, 0]} />
              <meshStandardMaterial color={colors.base} roughness={0.76} side={2} {...materialProps} />
            </mesh>
          ))}
          <mesh castShadow scale={[0.24, 0.7, 0.24]}>
            <sphereGeometry args={[0.42, 9, 7]} />
            <meshStandardMaterial color="#3f3344" roughness={0.62} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "witch-eye":
      model = (
        <group>
          <mesh castShadow scale={[1, 0.78, 0.8]}>
            <sphereGeometry args={[0.5, 14, 9]} />
            <meshStandardMaterial color="#dfd4ac" roughness={0.55} {...materialProps} />
          </mesh>
          <mesh position={[0, 0, 0.38]}>
            <sphereGeometry args={[0.19, 10, 7]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.7} {...materialProps} />
          </mesh>
          <mesh position={[0, 0, 0.54]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color="#202025" roughness={0.2} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "venom-bulb":
    case "healing-tuber":
      model = (
        <group>
          <mesh castShadow position={[0, -0.05, 0]} scale={[0.82, 1, 0.82]}>
            <dodecahedronGeometry args={[0.48, 1]} />
            <meshStandardMaterial color={itemId === "healing-tuber" ? "#c9a16d" : colors.base} roughness={0.82} {...materialProps} />
          </mesh>
          {[-1, 0, 1].map((side) => (
            <mesh key={side} position={[side * 0.16, 0.42, 0]} rotation={[0, 0, side * 0.45]}>
              <coneGeometry args={[0.08, 0.38, 6]} />
              <meshStandardMaterial color={itemId === "healing-tuber" ? "#78a35b" : colors.accent} roughness={0.72} {...materialProps} />
            </mesh>
          ))}
        </group>
      );
      break;
    case "egg-shell":
      model = (
        <group rotation={[0.02, 0.15, 0]}>
          <mesh castShadow scale={[0.82, 1.06, 0.82]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.52, 20, 12, 0, Math.PI * 2, 0.16, Math.PI * 0.62]} />
            <meshStandardMaterial color={colors.base} roughness={0.64} side={2} {...materialProps} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angle = index * Math.PI / 3;
            return (
              <mesh key={index} castShadow position={[Math.cos(angle) * 0.39, 0.24 + (index % 2) * 0.05, Math.sin(angle) * 0.39]} rotation={[0.2, -angle, index % 2 ? -0.28 : 0.24]} scale={[0.7, 1, 0.46]}>
                <tetrahedronGeometry args={[0.16, 0]} />
                <meshStandardMaterial color={colors.base} roughness={0.68} {...materialProps} />
              </mesh>
            );
          })}
          <mesh position={[0, -0.02, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.035, 6, 20]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.9} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "gold-spoon":
      model = (
        <group rotation={[0.15, 0, -0.55]}>
          <mesh castShadow position={[0, -0.15, 0]}>
            <cylinderGeometry args={[0.055, 0.07, 0.92, 8]} />
            <meshStandardMaterial color="#d7aa55" metalness={0.55} roughness={0.3} {...materialProps} />
          </mesh>
          <mesh castShadow position={[0, 0.37, 0]} scale={[0.62, 0.85, 0.3]}>
            <sphereGeometry args={[0.34, 12, 8]} />
            <meshStandardMaterial color="#e5bd6d" metalness={0.5} roughness={0.28} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "moon-salt":
    case "frost-shard":
    case "mirror-shard":
      model = (
        <group rotation={[0.05, 0.35, -0.12]}>
          <mesh castShadow scale={[0.62, 1.2, 0.45]}>
            <octahedronGeometry args={[0.48, 0]} />
            <meshStandardMaterial color={colors.base} emissive={colors.glow} emissiveIntensity={0.24} roughness={0.36} metalness={itemId === "mirror-shard" ? 0.45 : 0.05} {...materialProps} />
          </mesh>
          <mesh position={[0.25, -0.18, -0.06]} scale={[0.28, 0.65, 0.25]} rotation={[0, 0, 0.3]}>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color={colors.accent} roughness={0.32} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "ice-bell":
    case "echo-bell":
      model = (
        <group>
          <mesh castShadow position={[0, 0.06, 0]}>
            <coneGeometry args={[0.48, 0.78, 12, 1, true]} />
            <meshStandardMaterial color={colors.base} roughness={0.42} metalness={0.18} side={2} {...materialProps} />
          </mesh>
          <mesh position={[0, -0.38, 0]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.7} {...materialProps} />
          </mesh>
          <mesh position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.035, 6, 16]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "winter-bloom":
      model = (
        <group>
          {[0, 1, 2, 3, 4, 5].map((petal) => (
            <mesh key={petal} castShadow position={[Math.cos(petal * Math.PI / 3) * 0.28, 0, Math.sin(petal * Math.PI / 3) * 0.28]} rotation={[0, -petal * Math.PI / 3, 0.6]} scale={[0.38, 0.78, 0.24]}>
              <sphereGeometry args={[0.38, 8, 6]} />
              <meshStandardMaterial color={colors.base} roughness={0.55} {...materialProps} />
            </mesh>
          ))}
          <mesh position={[0, 0.08, 0]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.65} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "rime-clock":
      model = (
        <group rotation={[0.05, 0, 0.05]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.38, 0.1, 8, 24]} />
            <meshStandardMaterial color={colors.base} metalness={0.22} roughness={0.38} {...materialProps} />
          </mesh>
          <mesh position={[0, 0, 0.04]} scale={[0.055, 0.34, 0.055]} rotation={[0, 0, -0.58]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.6} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "rune-cup":
      model = (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[0.36, 0.25, 0.68, 10, 1, true]} />
            <meshStandardMaterial color={colors.base} roughness={0.5} metalness={0.18} side={2} {...materialProps} />
          </mesh>
          <mesh position={[0.4, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.2, 0.06, 7, 18, Math.PI * 1.55]} />
            <meshStandardMaterial color={colors.accent} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    case "time-thread":
      model = (
        <group rotation={[0.35, 0.15, 0.1]}>
          <mesh castShadow>
            <torusKnotGeometry args={[0.3, 0.065, 48, 7, 2, 3]} />
            <meshStandardMaterial color={colors.base} emissive={colors.glow} emissiveIntensity={0.34} roughness={0.48} {...materialProps} />
          </mesh>
          <mesh scale={0.35}>
            <dodecahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color={colors.accent} emissive={colors.glow} emissiveIntensity={0.8} {...materialProps} />
          </mesh>
        </group>
      );
      break;
    default:
      model = (
        <mesh castShadow rotation={[0.2, 0.4, 0.1]}>
          <dodecahedronGeometry args={[0.46, 0]} />
          <meshStandardMaterial color={colors.base} roughness={0.5} {...materialProps} />
        </mesh>
      );
  }

  return (
    <group scale={scale}>
      <group ref={actor}>
        {model}
        {active ? <ActivationAura family={definition.family} /> : null}
        <LevelDetails level={level} color={colors.accent} />
      </group>
    </group>
  );
}
