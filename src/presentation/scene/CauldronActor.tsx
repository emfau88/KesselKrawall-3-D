import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Group,
  MathUtils,
  Mesh,
  Vector2,
  type Vector3Tuple,
} from "three";

import { ProductionAsset, ProductionAssetBoundary } from "./ProductionAsset";
import { assetBakeoffMode } from "./assetBakeoff";

export type CauldronReaction =
  | "idle"
  | "cast"
  | "hit"
  | "guard"
  | "heal"
  | "victory"
  | "defeat";

interface CauldronVisualProfile {
  readonly body: string;
  readonly bodySecondary: string;
  readonly metal: string;
  readonly eye: string;
  readonly liquid: string;
  readonly steam: string;
  readonly personality: "hero" | "moor" | "rival";
}

const HERO_PROFILE: CauldronVisualProfile = {
  body: "#3b3039",
  bodySecondary: "#56414a",
  metal: "#c78c48",
  eye: "#f1a43f",
  liquid: "#dc7041",
  steam: "#f0e0ec",
  personality: "hero",
};

const MOOR_PROFILE: CauldronVisualProfile = {
  body: "#34332b",
  bodySecondary: "#514b36",
  metal: "#80674a",
  eye: "#c9d849",
  liquid: "#91b640",
  steam: "#b9d482",
  personality: "moor",
};

const RIVAL_PROFILE: CauldronVisualProfile = {
  body: "#332c3d",
  bodySecondary: "#51445f",
  metal: "#8b73a5",
  eye: "#c28be7",
  liquid: "#8170cf",
  steam: "#ded3ec",
  personality: "rival",
};

function profileFor(variant: string, accent: string): CauldronVisualProfile {
  if (variant === "player") return { ...HERO_PROFILE, liquid: accent };
  if (variant === "moor-martha") return MOOR_PROFILE;
  return { ...RIVAL_PROFILE, liquid: accent };
}

function CharacterFace({ profile }: { profile: CauldronVisualProfile }) {
  const moor = profile.personality === "moor";
  const hero = profile.personality === "hero";
  return (
    <group position={[0, moor ? -0.02 : 0.02, 0.72]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.31, 0.18, 0]}>
          <mesh castShadow scale={[moor ? 1.05 : 1, moor ? 0.72 : 0.88, 0.45]}>
            <sphereGeometry args={[0.2, 12, 8]} />
            <meshStandardMaterial color="#f5e7cd" roughness={0.54} />
          </mesh>
          <mesh position={[side * 0.025, moor ? -0.015 : 0, 0.095]} scale={[0.62, moor ? 0.8 : 1, 0.45]}>
            <sphereGeometry args={[0.11, 10, 7]} />
            <meshStandardMaterial color={profile.eye} emissive={profile.eye} emissiveIntensity={0.3} roughness={0.28} />
          </mesh>
          <mesh position={[side * 0.035, 0, 0.145]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#17131a" roughness={0.18} />
          </mesh>
          <mesh
            castShadow
            position={[0, 0.23, 0.08]}
            rotation={[0, 0, side * (moor ? -0.28 : hero ? -0.16 : -0.34)]}
          >
            <boxGeometry args={[0.35, moor ? 0.085 : 0.07, 0.08]} />
            <meshStandardMaterial color={profile.bodySecondary} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {moor && (
        <mesh castShadow position={[0, -0.02, 0.11]} rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 1.1, 0.72]}>
          <coneGeometry args={[0.18, 0.42, 8]} />
          <meshStandardMaterial color="#655844" roughness={0.86} />
        </mesh>
      )}
      <mesh position={[0, -0.25, 0.1]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[moor ? 0.25 : 0.29, moor ? 0.045 : 0.055, 7, 20, Math.PI]} />
        <meshStandardMaterial color={moor ? "#30251f" : "#201820"} roughness={0.7} />
      </mesh>
      {hero && (
        <mesh position={[0, -0.2, 0.13]} scale={[0.6, 0.42, 0.3]}>
          <sphereGeometry args={[0.16, 10, 7]} />
          <meshStandardMaterial color="#c75b43" roughness={0.58} />
        </mesh>
      )}
    </group>
  );
}

function PlayerRegalia({ metal }: { metal: string }) {
  return (
    <group>
      <mesh castShadow position={[0, -0.45, 0.82]} scale={[0.7, 1, 0.3]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.35, 0.35, 0.12]} />
        <meshStandardMaterial color={metal} metalness={0.58} roughness={0.34} />
      </mesh>
      <mesh position={[0, -0.44, 0.9]}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color="#6fd4da" emissive="#3d9ca8" emissiveIntensity={0.52} metalness={0.18} roughness={0.28} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} castShadow position={[side * 0.5, -0.48, 0.7]} rotation={[0, 0, side * 0.52]}>
          <torusGeometry args={[0.22, 0.05, 7, 18, Math.PI * 1.18]} />
          <meshStandardMaterial color={metal} metalness={0.55} roughness={0.38} />
        </mesh>
      ))}
    </group>
  );
}

function MoorDetails() {
  return (
    <group>
      <ProductionAssetBoundary fallback={null}>
        <Suspense fallback={null}>
          <ProductionAsset asset="quaternius-mushroom-shelf" position={[-0.98, 0.16, 0.16]} rotation={[0.08, 0, 0.35]} scale={0.38} />
          <ProductionAsset asset="quaternius-mushroom" position={[0.9, -0.3, 0.32]} rotation={[-0.12, 0, -0.38]} scale={0.62} />
          <ProductionAsset asset="quaternius-mushroom" position={[-0.66, -0.66, 0.56]} rotation={[0.16, 0, 0.22]} scale={0.46} />
        </Suspense>
      </ProductionAssetBoundary>
      {([
        [-0.56, 0.52, 0.73, 0.18],
        [0.5, 0.42, 0.77, 0.15],
        [0.72, -0.46, 0.58, 0.12],
      ] as const).map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} scale={[1.5, 0.55, 0.28]} rotation={[0, 0, index * 0.8]}>
          <dodecahedronGeometry args={[size, 0]} />
          <meshStandardMaterial color={index === 1 ? "#70824a" : "#596a3e"} roughness={0.96} />
        </mesh>
      ))}
    </group>
  );
}

function CauldronAssetFallback({ profile }: { profile: CauldronVisualProfile }) {
  return (
    <group position={[0, 0.22, 0]}>
      <mesh castShadow receiveShadow scale={[1.1, 0.92, 1.05]}>
        <sphereGeometry args={[0.96, 24, 16]} />
        <meshStandardMaterial color={profile.body} metalness={0.38} roughness={0.58} />
      </mesh>
      <mesh castShadow position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.84, 0.13, 10, 28]} />
        <meshStandardMaterial color={profile.metal} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.77, 0]}>
        <cylinderGeometry args={[0.74, 0.77, 0.08, 28]} />
        <meshStandardMaterial color={profile.liquid} emissive={profile.liquid} emissiveIntensity={0.42} roughness={0.24} />
      </mesh>
    </group>
  );
}

export function CauldronActor({
  accent,
  position,
  variant = "rival",
  scale = 1,
  reaction = "idle",
  reactionKey = -1,
}: {
  accent: string;
  position: Vector3Tuple;
  variant?: string;
  scale?: number;
  reaction?: CauldronReaction;
  reactionKey?: number;
}) {
  const animated = useRef<Group>(null);
  const liquid = useRef<Mesh>(null);
  const steam = useRef<Group>(null);
  const aura = useRef<Group>(null);
  const lastKey = useRef(reactionKey);
  const startedAt = useRef(0);
  const profile = profileFor(variant, accent);
  const bakeoff = assetBakeoffMode();
  const quaterniusBody = bakeoff !== "legacy";
  const goldenCharacter = bakeoff === "golden";
  const moor = profile.personality === "moor";
  const hero = profile.personality === "hero";
  const bodyProfile = useMemo(
    () => [
      new Vector2(moor ? 0.78 : 0.72, 0.8),
      new Vector2(moor ? 1.08 : 1.03, 0.6),
      new Vector2(moor ? 1.23 : 1.18, 0.12),
      new Vector2(moor ? 1.1 : 1.05, -0.5),
      new Vector2(moor ? 0.75 : 0.72, -0.82),
      new Vector2(0.28, -0.9),
    ],
    [moor],
  );

  useFrame(({ clock }) => {
    if (!animated.current) return;
    if (lastKey.current !== reactionKey) {
      lastKey.current = reactionKey;
      startedAt.current = clock.elapsedTime;
    }
    const elapsed = clock.elapsedTime - startedAt.current;
    const pulse = Math.max(0, 1 - elapsed / 0.62);
    const actionWave = Math.sin(MathUtils.clamp(elapsed / 0.62, 0, 1) * Math.PI);
    const idleRate = moor ? 1.05 : hero ? 1.65 : 1.35;
    const idle = Math.sin(clock.elapsedTime * idleRate) * (moor ? 0.018 : 0.012);
    let rotationX = idle;
    let rotationZ = moor ? -0.025 : 0;
    let scaleX = 1;
    let scaleY = 1;
    let offsetY = Math.sin(clock.elapsedTime * idleRate) * (moor ? 0.018 : 0.025);

    if (reaction === "cast") {
      rotationX += actionWave * -0.19;
      scaleX += actionWave * 0.08;
      scaleY -= actionWave * 0.08;
    } else if (reaction === "hit") {
      rotationZ += Math.sin(elapsed * 44) * pulse * 0.13;
      scaleX += pulse * 0.055;
    } else if (reaction === "guard" || reaction === "heal") {
      scaleX += actionWave * 0.065;
      scaleY += actionWave * 0.1;
      offsetY += actionWave * 0.08;
    } else if (reaction === "victory") {
      offsetY += Math.abs(Math.sin(elapsed * 5.4)) * Math.max(0, 1 - elapsed / 1.35) * 0.38;
      rotationZ += Math.sin(elapsed * 6.5) * Math.max(0, 1 - elapsed / 1.4) * 0.08;
    } else if (reaction === "defeat") {
      const fall = MathUtils.smoothstep(Math.min(1, elapsed / 0.78), 0, 1);
      rotationZ += (moor ? -0.27 : 0.3) * fall;
      scaleY -= 0.18 * fall;
      offsetY -= 0.17 * fall;
    }

    animated.current.position.y = offsetY;
    animated.current.rotation.x = rotationX;
    animated.current.rotation.z = rotationZ;
    animated.current.scale.set(
      MathUtils.clamp(scaleX, 0.78, 1.24),
      MathUtils.clamp(scaleY, 0.72, 1.22),
      MathUtils.clamp(scaleX, 0.78, 1.24),
    );
    if (liquid.current) {
      liquid.current.rotation.y = clock.elapsedTime * (moor ? 0.1 : 0.19);
      liquid.current.scale.y = 1 + Math.sin(clock.elapsedTime * (moor ? 1.5 : 2.5)) * 0.09;
      liquid.current.position.y = 0.765 + actionWave * 0.035;
    }
    if (steam.current) {
      steam.current.position.y = (clock.elapsedTime * (moor ? 0.1 : 0.16)) % 0.34;
      steam.current.rotation.y = clock.elapsedTime * (moor ? -0.06 : 0.08);
    }
    if (aura.current) {
      const reactionBoost = reaction === "cast" || reaction === "guard" || reaction === "heal" ? actionWave * 0.45 : 0;
      aura.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.7) * 0.035 + reactionBoost);
      aura.current.rotation.z = clock.elapsedTime * (moor ? -0.08 : 0.1);
    }
  });

  return (
    <group position={position} scale={scale}>
      <group ref={animated}>
        {quaterniusBody ? (
          <>
            <ProductionAssetBoundary fallback={<CauldronAssetFallback profile={profile} />}>
              <Suspense fallback={<CauldronAssetFallback profile={profile} />}>
                <ProductionAsset
                  asset="quaternius-cauldron-base"
                  position={[0, -1.1, 0]}
                  scale={2.35}
                  tint={moor ? "#a5b184" : hero ? "#b7a0a6" : "#a79bb7"}
                />
              </Suspense>
            </ProductionAssetBoundary>
            <mesh ref={liquid} position={[0, 0.79, 0]} receiveShadow>
              <cylinderGeometry args={[0.73, 0.76, 0.075, 32]} />
              <meshStandardMaterial color={profile.liquid} emissive={profile.liquid} emissiveIntensity={moor ? 0.46 : 0.58} metalness={0.04} roughness={0.2} />
            </mesh>
            <pointLight color={profile.liquid} intensity={moor ? 1.55 : 1.9} distance={3.8} position={[0, 1.18, 0]} />
            {([[-0.32, 0.88, 0.14, 0.065], [0.18, 0.92, -0.18, 0.085], [0.4, 0.86, 0.12, 0.05]] as const)
              .map(([x, y, z, radius], index) => (
                <mesh key={index} position={[x, y, z]}>
                  <sphereGeometry args={[radius, 8, 5]} />
                  <meshStandardMaterial color={moor ? "#e1ef7c" : "#fff0bd"} emissive={profile.liquid} emissiveIntensity={0.95} roughness={0.22} />
                </mesh>
              ))}
            <group ref={steam}>
              {([[-0.32, 1.32, 0.04, 0.16], [0.18, 1.6, -0.05, 0.19], [0.42, 1.88, 0.02, 0.13]] as const)
                .map(([x, y, z, radius], index) => (
                  <mesh key={index} position={[x, y, z]} scale={[1, moor ? 1.75 : 1.45, 1]}>
                    <sphereGeometry args={[radius, 9, 6]} />
                    <meshStandardMaterial color={profile.steam} transparent opacity={moor ? 0.2 : 0.14} depthWrite={false} roughness={1} />
                  </mesh>
                ))}
            </group>
            {goldenCharacter && (
              <>
                {hero || moor ? (
                  <ProductionAssetBoundary fallback={null}>
                    <Suspense fallback={null}>
                      <ProductionAsset
                        asset={moor ? "hero-cauldron-moor-kit" : "hero-cauldron-player-kit"}
                        position={[0, 0.24, 0]}
                      />
                    </Suspense>
                  </ProductionAssetBoundary>
                ) : (
                  <group position={[0, 0, 0.48]}>
                    <CharacterFace profile={profile} />
                  </group>
                )}
                {moor && <MoorDetails />}
              </>
            )}
            <group ref={aura} position={[0, -1.02, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh>
                <torusGeometry args={[moor ? 1.16 : 1.1, 0.032, 7, 42]} />
                <meshStandardMaterial color={profile.liquid} emissive={profile.liquid} emissiveIntensity={0.9} transparent opacity={0.58} />
              </mesh>
            </group>
          </>
        ) : hero || moor ? (
          <>
            <ProductionAssetBoundary fallback={<CauldronAssetFallback profile={profile} />}>
              <Suspense fallback={<CauldronAssetFallback profile={profile} />}>
                <ProductionAsset
                  asset={moor ? "hero-cauldron-moor" : "hero-cauldron-player"}
                  position={[0, 0.24, 0]}
                />
              </Suspense>
            </ProductionAssetBoundary>
            <pointLight color={profile.liquid} intensity={moor ? 1.55 : 1.9} distance={3.8} position={[0, 1.18, 0]} />
            {([[-0.32, 1.08, 0.14, 0.065], [0.18, 1.12, -0.18, 0.085], [0.4, 1.06, 0.12, 0.05]] as const)
              .map(([x, y, z, radius], index) => (
                <mesh key={index} position={[x, y, z]}>
                  <sphereGeometry args={[radius, 8, 5]} />
                  <meshStandardMaterial color={moor ? "#e1ef7c" : "#fff0bd"} emissive={profile.liquid} emissiveIntensity={0.95} roughness={0.22} />
                </mesh>
              ))}
            <group ref={steam}>
              {([[-0.32, 1.46, 0.04, 0.16], [0.18, 1.74, -0.05, 0.19], [0.42, 2.02, 0.02, 0.13]] as const)
                .map(([x, y, z, radius], index) => (
                  <mesh key={index} position={[x, y, z]} scale={[1, moor ? 1.75 : 1.45, 1]}>
                    <sphereGeometry args={[radius, 9, 6]} />
                    <meshStandardMaterial color={profile.steam} transparent opacity={moor ? 0.2 : 0.14} depthWrite={false} roughness={1} />
                  </mesh>
                ))}
            </group>
            <group ref={aura} position={[0, -0.7, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh>
                <torusGeometry args={[moor ? 1.16 : 1.1, 0.032, 7, 42]} />
                <meshStandardMaterial color={profile.liquid} emissive={profile.liquid} emissiveIntensity={0.9} transparent opacity={0.58} />
              </mesh>
            </group>
          </>
        ) : (
          <>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[bodyProfile, 32]} />
          <meshStandardMaterial color={profile.body} metalness={moor ? 0.28 : 0.5} roughness={moor ? 0.68 : 0.46} />
        </mesh>
        <mesh castShadow position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[moor ? 0.9 : 0.86, moor ? 0.15 : 0.12, 10, 32]} />
          <meshStandardMaterial color={profile.metal} metalness={moor ? 0.22 : 0.62} roughness={moor ? 0.68 : 0.34} />
        </mesh>
        <mesh ref={liquid} position={[0, 0.765, 0]} receiveShadow>
          <cylinderGeometry args={[moor ? 0.78 : 0.74, moor ? 0.8 : 0.76, 0.075, 32]} />
          <meshStandardMaterial color={profile.liquid} emissive={profile.liquid} emissiveIntensity={moor ? 0.36 : 0.48} metalness={0.04} roughness={0.24} />
        </mesh>
        <pointLight color={profile.liquid} intensity={moor ? 1.25 : 1.65} distance={3.2} position={[0, 1, 0]} />
        {([
          [-0.34, 0.84, 0.16, 0.08],
          [0.2, 0.86, -0.24, 0.1],
          [0.4, 0.83, 0.18, 0.055],
        ] as const).map(([x, y, z, radius], index) => (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[radius, 8, 5]} />
            <meshStandardMaterial color={moor ? "#d6de73" : "#ffe5ae"} emissive={profile.liquid} emissiveIntensity={0.85} roughness={0.25} />
          </mesh>
        ))}
        <group ref={steam}>
          {([
            [-0.3, 1.28, 0.05, 0.17],
            [0.18, 1.55, -0.06, 0.2],
            [0.42, 1.82, 0.02, 0.14],
          ] as const).map(([x, y, z, radius], index) => (
            <mesh key={index} position={[x, y, z]} scale={[1, moor ? 1.6 : 1.35, 1]}>
              <sphereGeometry args={[radius, 8, 5]} />
              <meshStandardMaterial color={profile.steam} transparent opacity={moor ? 0.17 : 0.12} depthWrite={false} roughness={1} />
            </mesh>
          ))}
        </group>
        {[-0.62, 0.62].map((x) => (
          <mesh key={x} castShadow position={[x, -0.86, 0.2]} rotation={[0.15, 0, -x * 0.16]}>
            <cylinderGeometry args={[0.16, 0.22, 0.62, 8]} />
            <meshStandardMaterial color={profile.bodySecondary} metalness={moor ? 0.24 : 0.48} roughness={moor ? 0.72 : 0.52} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={side} castShadow position={[side * (moor ? 1.12 : 1.08), 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[moor ? 0.42 : 0.38, moor ? 0.11 : 0.09, 8, 18, Math.PI * 1.45]} />
            <meshStandardMaterial color={profile.metal} metalness={moor ? 0.24 : 0.58} roughness={moor ? 0.7 : 0.42} />
          </mesh>
        ))}
        <CharacterFace profile={profile} />
        {hero ? <PlayerRegalia metal={profile.metal} /> : null}
        {moor ? <MoorDetails /> : null}
        <group ref={aura} position={[0, -0.82, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <torusGeometry args={[moor ? 1.08 : 1.02, 0.028, 6, 36]} />
            <meshStandardMaterial color={profile.liquid} emissive={profile.liquid} emissiveIntensity={0.75} transparent opacity={0.52} />
          </mesh>
        </group>
          </>
        )}
      </group>
    </group>
  );
}
