import { MockupAsset } from "./MockupAsset";

/** Real supplied 2 m tiles. Fully hidden central arena tiles are not duplicated. */
export function MockupFloor({ arena = false }: { arena?: boolean }) {
  const floorTop = arena ? -0.16 : -0.64;
  return (
    <group name="mockup-supplied-stone-floor">
      {[-6, -4, -2, 0, 2, 4, 6].flatMap((x) => (arena ? [-6, -4, -2, 0, 2, 4, 6] : [-3, -1, 1, 3]).flatMap((z) => {
        if (arena && Math.hypot(x, z) < 4.0) return [];
        return [<MockupAsset key={`${x}-${z}`} asset="dungeon-floor-module" position={[x, floorTop - 0.18, z]} castShadow={false} />];
      }))}
    </group>
  );
}
