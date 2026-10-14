import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Mesh, type Material, type Vector3Tuple } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { mockupAssetId } from "./mockupAssetIds";
import { mockupPassageMode } from "./compositionMode";
import { productionAssetUrl } from "./ProductionAsset";
import { COMPOSITION_REAR_WALL_X, MOCKUP_ROOM_LAYOUT, PASSAGE_DEPTH, doorwayHalfWidthAt, type MockupRoomKind } from "./mockupRoomLayout";
import { ProjectedWallBuilder, wallFrontTriangles, type WallRect } from "./projectedWallGeometry";

type AtlasRect = readonly [number, number, number, number];
// Actual solid-stone islands in the retained to3D wall atlas. Never map the whole
// atlas to a new rectangle: that would expose its UV packing as a false pattern.
const STONE_ISLANDS: readonly AtlasRect[] = [
  [0.28, 0.05, 0.35, 0.1], [0.43, 0.1, 0.56, 0.18], [0.61, 0.13, 0.68, 0.18],
  [0.065, 0.16, 0.21, 0.20], [0.83, 0.16, 0.90, 0.21], [0.47, 0.26, 0.55, 0.30],
];
const WOOD_ISLAND: AtlasRect = [0.06, 0.41, 0.53, 0.69];
const DARK_WOOD_ISLAND: AtlasRect = [0.27, 0.19, 0.48, 0.23];

class AtlasGeometry {
  positions: number[] = [];
  uvs: number[] = [];

  quad(a: Vector3Tuple, b: Vector3Tuple, c: Vector3Tuple, d: Vector3Tuple, uv: AtlasRect) {
    const [u0, v0, u1, v1] = uv;
    for (const p of [a, b, d, b, c, d]) this.positions.push(...p);
    this.uvs.push(u0, v1, u1, v1, u0, v0, u1, v1, u1, v0, u0, v0);
  }

  box(x: number, y: number, z: number, width: number, height: number, depth: number, uv: AtlasRect) {
    const l = x - width / 2, r = x + width / 2;
    const b = y - height / 2, t = y + height / 2;
    const back = z - depth / 2, front = z + depth / 2;
    this.quad([l, b, front], [r, b, front], [r, t, front], [l, t, front], uv);
    this.quad([r, b, back], [l, b, back], [l, t, back], [r, t, back], uv);
    this.quad([l, b, back], [l, b, front], [l, t, front], [l, t, back], uv);
    this.quad([r, b, front], [r, b, back], [r, t, back], [r, t, front], uv);
    this.quad([l, t, front], [r, t, front], [r, t, back], [l, t, back], uv);
    this.quad([l, b, back], [r, b, back], [r, b, front], [l, b, front], uv);
  }

  finish() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }
}

function useAuthoredMaterial(slug: "dungeon-wall-module" | "witch-workbench"): Material {
  const model = useLoader(GLTFLoader, productionAssetUrl(mockupAssetId(slug)));
  return useMemo(() => {
    let material: Material | undefined;
    model.scene.traverse((object) => {
      if (!material && object instanceof Mesh) material = Array.isArray(object.material) ? object.material[0] : object.material;
    });
    if (!material) throw new Error(`Architectural material missing: ${slug}`);
    return material;
  }, [model, slug]);
}

function useDisposedGeometry(factory: () => BufferGeometry, dependencies: readonly unknown[]) {
  // Factories are pure, depend only on the stable room kind, and allocate no GPU resources until rendered.
  const geometry = useMemo(factory, dependencies);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function ArchSpandrels({ room }: { room: MockupRoomKind }) {
  const layout = MOCKUP_ROOM_LAYOUT[room];
  const model = useLoader(GLTFLoader, productionAssetUrl(mockupAssetId("dungeon-wall-module")));
  const material = useAuthoredMaterial("dungeon-wall-module");
  const geometry = useDisposedGeometry(() => {
    const builder = new ProjectedWallBuilder();
    const triangles = wallFrontTriangles(model.scene);
    const regions: WallRect[] = [[-1.61, 0, -0.92, 3], [0.92, 0, 1.61, 3], [-1.61, 3.92, 1.61, layout.wallHeight]];
    for (let y = 3; y < 3.92 - 0.001; y += 0.115) {
      const half = doorwayHalfWidthAt(y);
      regions.push([-1.61, y, -half, y + 0.115], [half, y, 1.61, y + 0.115]);
    }
    for (const y of [0, 4.35, 8.7]) builder.patch(triangles, 0, y, regions, (x, h) => [x, h, 0]);
    return builder.finish();
  }, [room, model]);
  return <mesh name="composition-arched-masonry-infill" position={[0, layout.wallBase, layout.rearZ + 0.21]} geometry={geometry} material={material} receiveShadow userData={{ compositionArchitecture: true, compositionRole: "wall-fill", bounds: geometry.boundingBox }} />;
}

function SideWallContinuations({ room }: { room: MockupRoomKind }) {
  const layout = MOCKUP_ROOM_LAYOUT[room];
  const model = useLoader(GLTFLoader, productionAssetUrl(mockupAssetId("dungeon-wall-module")));
  const material = useAuthoredMaterial("dungeon-wall-module");
  const geometries = useMemo(() => {
    const builder = new ProjectedWallBuilder();
    const triangles = wallFrontTriangles(model.scene);
    // Upper faces extend existing modules without stretching their stone courses.
    for (const x of COMPOSITION_REAR_WALL_X) {
      for (const y of [4.35, 8.7]) builder.patch(triangles, x, y, [[x - 1.61, y, x + 1.61, layout.wallHeight]],
        (px, py) => [px, py, layout.rearZ + 0.21]);
    }
    const result = [builder.finish()];
    for (const side of [-1, 1]) {
      for (let z = layout.rearZ + 1.6; z < 15; z += 3.18) {
        const segment = new ProjectedWallBuilder();
        for (const y of [0, 4.35, 8.7]) {
          const zMin = y === 0 ? layout.sideStart - 0.05 : layout.rearZ;
          const left = side > 0 ? Math.max(-1.61, zMin - z) : Math.max(-1.61, z - 15);
          const right = side > 0 ? Math.min(1.61, 15 - z) : Math.min(1.61, z - zMin);
          if (left >= right) continue;
          segment.patch(triangles, 0, y, [[left, y, right, layout.wallHeight]],
            (px, py) => [side * (layout.sideX - 0.24), py, z + side * px]);
        }
        result.push(segment.finish());
      }
    }
    return result;
  }, [room, model]);
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  // Separate strips allow the renderer to cull the walls beside/behind the camera.
  return <group name="composition-room-continuation" position={[0, layout.wallBase, 0]}>
    {geometries.map((geometry, index) => <mesh key={index} name={`composition-room-strip-${index}`} geometry={geometry} material={material} receiveShadow userData={{ compositionArchitecture: true, compositionRole: "side-wall", bounds: geometry.boundingBox }} />)}
  </group>;
}

function RecessedPassage({ room }: { room: MockupRoomKind }) {
  const layout = MOCKUP_ROOM_LAYOUT[room];
  const mode = mockupPassageMode(room === "arena" ? "corridor" : "door");
  const stone = useAuthoredMaterial("dungeon-wall-module");
  const wood = useAuthoredMaterial("witch-workbench");
  const depth = PASSAGE_DEPTH[mode];
  const stoneGeometry = useDisposedGeometry(() => {
    const builder = new AtlasGeometry();
    // Real reveals, a ceiling and a terminal wall: no line of sight to world void.
    builder.box(-1.04, 1.95, -depth / 2, 0.24, 3.9, depth, STONE_ISLANDS[1]!);
    builder.box(1.04, 1.95, -depth / 2, 0.24, 3.9, depth, STONE_ISLANDS[4]!);
    builder.box(0, 3.96, -depth / 2, 2.3, 0.24, depth, STONE_ISLANDS[2]!);
    builder.box(0, 2.0, -depth - 0.12, 2.3, 4.0, 0.24, STONE_ISLANDS[0]!);
    return builder.finish();
  }, [room, mode]);
  const doorGeometry = useDisposedGeometry(() => {
    const builder = new AtlasGeometry();
    for (let plank = 0; plank < 6; plank += 1) {
      builder.box((plank - 2.5) * 0.27, 1.9, -depth + 0.055, 0.266, 3.8, 0.09, WOOD_ISLAND);
    }
    for (const y of [0.72, 2.84]) builder.box(0, y, -depth + 0.12, 1.63, 0.15, 0.075, DARK_WOOD_ISLAND);
    return builder.finish();
  }, [room, mode]);
  return (
    <group name={`composition-${mode}-passage`} position={[0, layout.floorTop, layout.archZ - 0.2]} userData={{ compositionArchitecture: true, compositionRole: `passage-${mode}`, passageDepth: depth }}>
      <mesh geometry={stoneGeometry} material={stone} receiveShadow userData={{ compositionArchitecture: true, compositionRole: "passage-corridor", bounds: stoneGeometry.boundingBox }} />
      <mesh geometry={doorGeometry} material={wood} receiveShadow userData={{ compositionArchitecture: true, compositionRole: "passage-door", bounds: doorGeometry.boundingBox }} />
    </group>
  );
}

/** A low-poly enclosing shell. Original to3D models remain the visible hero architecture. */
export function MockupRoomArchitecture({ room }: { room: MockupRoomKind }) {
  return <group name={`composition-${room}-architecture`} userData={{ compositionArchitecture: true, compositionRole: "room-shell" }}>
    <ArchSpandrels room={room} />
    <SideWallContinuations room={room} />
    <RecessedPassage room={room} />
  </group>;
}
