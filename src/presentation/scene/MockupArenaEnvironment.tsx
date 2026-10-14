import { Suspense } from "react";

import { MockupAsset, MockupCandles } from "./MockupAsset";
import { ProductionAssetBoundary } from "./ProductionAsset";
import { MockupFloor } from "./MockupFloor";
import { MockupRoomArchitecture } from "./MockupRoomArchitecture";
import { isMockupCompositionEnabled } from "./compositionMode";
import { COMPOSITION_REAR_WALL_X, MOCKUP_ROOM_LAYOUT } from "./mockupRoomLayout";

/**
 * Isolated assembly of the image-to-3D set. No actor, camera, or combat changes:
 * the room frames the existing duel while leaving its full centre lane open.
 * Models are normalized to Y-up, a ground pivot, and their authored front +Z.
 */
export function MockupArenaEnvironment() {
  const composition = isMockupCompositionEnabled();
  const room = MOCKUP_ROOM_LAYOUT.arena;
  return (
    <group name="mockup-arena-environment">
      <ProductionAssetBoundary fallback={null}>
        <Suspense fallback={null}>
          <MockupFloor arena />

          <MockupAsset asset="ritual-platform" position={[0, -0.29, 0]} />

          {/* A contiguous back wall, deliberately behind both characters. */}
          {(composition ? COMPOSITION_REAR_WALL_X : [-6.2, -3, 3, 6.2]).map((x) => (
            <MockupAsset
              key={`back-wall-${x}`}
              asset="dungeon-wall-module"
              position={[x, -0.17, -6.55]}
              scale={[1, 1.36, 1]}
            />
          ))}
          <MockupAsset asset="dungeon-stone-arch" position={[0, -0.17, -6.28]} />

          {/* Short side returns enclose the set without hiding the foreground. */}
          {[-1, 1].flatMap((side) => [-4.7, -1.5].map((z) => (
            <MockupAsset
              key={`side-wall-${side}-${z}`}
              asset="dungeon-wall-module"
              position={[side * (composition ? room.sideX : 7.7), -0.17, z]}
              rotation={[0, side * -Math.PI / 2, 0]}
              scale={[1, 1.36, 1]}
            />
          )))}

          {[-1, 1].map((side) => (
            <group key={`room-furnishings-${side}`}>
              <MockupAsset
                asset="dungeon-stone-pillar"
                position={[side * 7.3, -0.17, -5.97]}
              />
              <MockupAsset
                asset="dungeon-stone-pillar"
                position={[side * 7.45, -0.17, -0.15]}
                scale={0.91}
              />
              <MockupAsset
                asset="alchemy-shelf"
                position={[side * 4.63, -0.17, -5.85]}
                rotation={[0, side * -0.035, 0]}
              />
              <MockupCandles
                asset="wall-candle-sconce"
                position={[side * 2.04, 2.03, -6.15]}
                scale={1.18}
                light
              />
              <MockupCandles
                asset="wall-candle-sconce"
                position={[side * 7.36, 1.8, -2.9]}
                rotation={[0, side * -Math.PI / 2, 0]}
                scale={1.18}
                light
              />
              <MockupCandles
                position={[side * 5.98, -0.16, -4.77]}
                scale={0.78}
              />
              <MockupCandles
                position={[side * 6.15, -0.16, -0.25]}
                scale={0.57}
              />
              <MockupCandles
                position={[side * 4.68, 0.14, 3.39]}
                scale={0.46}
              />
            </group>
          ))}

          {/* A readable, peripheral prop rather than an upright placeholder. */}
          <MockupAsset
            asset="open-grimoire"
            position={[-5.99, -0.155, 1.66]}
            rotation={[0, 0.28, 0]}
            scale={0.8}
          />
          {composition && <MockupRoomArchitecture room="arena" />}
        </Suspense>
      </ProductionAssetBoundary>
    </group>
  );
}
