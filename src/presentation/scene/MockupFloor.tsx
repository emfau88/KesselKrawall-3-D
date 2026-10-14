import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { Float32BufferAttribute, Mesh, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, type Texture } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MockupAsset } from "./MockupAsset";
import { isMockupCompositionEnabled } from "./compositionMode";
import { mockupAssetId } from "./mockupAssetIds";
import { MOCKUP_ROOM_LAYOUT, ROOM_FLOOR_HALF_WIDTH } from "./mockupRoomLayout";
import { productionAssetUrl } from "./ProductionAsset";

/** A two-triangle floor continuation, using the supplied floor's unchanged PBR maps. */
function RoomFloorContinuation({ arena }: { arena: boolean }) {
  const layout = MOCKUP_ROOM_LAYOUT[arena ? "arena" : "workshop"];
  const model = useLoader(GLTFLoader, productionAssetUrl(mockupAssetId("dungeon-floor-module")));
  const resources = useMemo(() => {
    let source: MeshStandardMaterial | undefined;
    model.scene.traverse((object) => {
      if (source || !(object instanceof Mesh)) return;
      const candidate = Array.isArray(object.material) ? object.material[0] : object.material;
      if (candidate instanceof MeshStandardMaterial) source = candidate;
    });
    if (!source) throw new Error("Supplied stone floor material missing");
    const material = source.clone();
    const textures: Texture[] = [];
    // UV wrapping is a geometry concern; colour, normal strength and roughness stay authored.
    for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"] as const) {
      const texture = source[key];
      if (!texture) continue;
      const clone = texture.clone();
      clone.wrapS = clone.wrapT = RepeatWrapping;
      clone.needsUpdate = true;
      textures.push(clone);
      material[key] = clone;
    }
    const width = ROOM_FLOOR_HALF_WIDTH * 2;
    const depth = layout.floorMaxZ - layout.floorMinZ;
    const geometry = new PlaneGeometry(width, depth);
    const uv = geometry.getAttribute("uv");
    for (let index = 0; index < uv.count; index += 1) uv.setXY(index, uv.getX(index) * width / 2, uv.getY(index) * depth / 2);
    geometry.setAttribute("color", new Float32BufferAttribute(new Array(geometry.getAttribute("position").count * 3).fill(1), 3));
    return { geometry, material, textures };
  }, [arena, model, layout]);
  useEffect(() => () => {
    resources.geometry.dispose();
    resources.material.dispose();
    resources.textures.forEach((texture) => texture.dispose());
  }, [resources]);
  return <group>
    <mesh name="composition-continuous-stone-floor" position={[0, layout.floorTop - 0.018, (layout.floorMinZ + layout.floorMaxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} geometry={resources.geometry} material={resources.material} receiveShadow userData={{ compositionArchitecture: true, compositionRole: "room-floor", bounds: [-ROOM_FLOOR_HALF_WIDTH, ROOM_FLOOR_HALF_WIDTH, layout.floorMinZ, layout.floorMaxZ] }} />
    <mesh name="composition-stone-ceiling" position={[0, layout.wallBase + layout.wallHeight - 0.02, (layout.floorMinZ + layout.floorMaxZ) / 2]} rotation={[Math.PI / 2, 0, 0]} geometry={resources.geometry} material={resources.material} userData={{ compositionArchitecture: true, compositionRole: "room-ceiling" }} />
  </group>;
}

/** Real supplied 2 m tiles. Fully hidden central arena tiles are not duplicated. */
export function MockupFloor({ arena = false }: { arena?: boolean }) {
  const floorTop = arena ? -0.16 : -0.64;
  const composition = isMockupCompositionEnabled();
  return (
    <group name="mockup-supplied-stone-floor">
      {composition && <RoomFloorContinuation arena={arena} />}
      {[-6, -4, -2, 0, 2, 4, 6].flatMap((x) => (arena ? [-6, -4, -2, 0, 2, 4, 6] : [-3, -1, 1, 3]).flatMap((z) => {
        if (arena && Math.hypot(x, z) < 4.0) return [];
        return [<MockupAsset key={`${x}-${z}`} asset="dungeon-floor-module" position={[x, floorTop - 0.18, z]} castShadow={false} />];
      }))}
    </group>
  );
}
