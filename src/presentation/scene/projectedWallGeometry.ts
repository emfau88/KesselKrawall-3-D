import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3, type Object3D } from "three";

type Vertex = { x: number; y: number; u: number; v: number };
export type WallRect = readonly [number, number, number, number];

function clip(vertices: Vertex[], axis: "x" | "y", boundary: number, greater: boolean): Vertex[] {
  const result: Vertex[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    const insideA = greater ? a[axis] >= boundary : a[axis] <= boundary;
    const insideB = greater ? b[axis] >= boundary : b[axis] <= boundary;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
        u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t });
    }
  }
  return result;
}

/** Reuses front triangles and their authored UVs, never arbitrary packed-atlas rectangles. */
export function wallFrontTriangles(root: Object3D): Vertex[][] {
  root.updateMatrixWorld(true);
  const result: Vertex[][] = [];
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    const index = geometry.index;
    for (let i = 0; i < (index?.count ?? position.count); i += 3) {
      const ids = [0, 1, 2].map((offset) => index ? index.getX(i + offset) : i + offset);
      const points = ids.map((id) => new Vector3().fromBufferAttribute(position, id).applyMatrix4(object.matrixWorld));
      const normal = points[1]!.clone().sub(points[0]!).cross(points[2]!.clone().sub(points[0]!));
      if (normal.z <= 1e-8 || (points[0]!.z + points[1]!.z + points[2]!.z) / 3 < 0) continue;
      result.push(points.map((p, k) => ({ x: p.x * 1.003, y: p.y * 1.375, u: uv.getX(ids[k]!), v: uv.getY(ids[k]!) })));
    }
  });
  return result;
}

export class ProjectedWallBuilder {
  private positions: number[] = [];
  private uvs: number[] = [];

  patch(triangles: Vertex[][], offsetX: number, offsetY: number, rectangles: readonly WallRect[],
    transform: (x: number, y: number) => [number, number, number]) {
    for (const triangle of triangles) {
      const shifted = triangle.map((vertex) => ({ ...vertex, x: vertex.x + offsetX, y: vertex.y + offsetY }));
      const minX = Math.min(...shifted.map((v) => v.x)), maxX = Math.max(...shifted.map((v) => v.x));
      const minY = Math.min(...shifted.map((v) => v.y)), maxY = Math.max(...shifted.map((v) => v.y));
      for (const [left, bottom, right, top] of rectangles) {
        if (maxX < left || minX > right || maxY < bottom || minY > top) continue;
        let polygon = clip(shifted, "x", left, true);
        polygon = clip(polygon, "x", right, false);
        polygon = clip(polygon, "y", bottom, true);
        polygon = clip(polygon, "y", top, false);
        for (let i = 1; i + 1 < polygon.length; i++) {
          for (const vertex of [polygon[0]!, polygon[i]!, polygon[i + 1]!]) {
            this.positions.push(...transform(vertex.x, vertex.y));
            this.uvs.push(vertex.u, vertex.v);
          }
        }
      }
    }
  }

  finish(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(this.uvs, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }
}
