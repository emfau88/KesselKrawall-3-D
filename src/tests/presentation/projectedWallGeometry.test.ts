import { describe, expect, it } from "vitest";
import { ProjectedWallBuilder } from "../../presentation/scene/projectedWallGeometry";

const triangles = [[{ x: 0, y: 0, u: 0, v: 0 }, { x: 2, y: 0, u: 1, v: 0 }, { x: 0, y: 2, u: 0, v: 1 }]];

describe("authored wall UV clipping", () => {
  it("clips geometry to the infill region and interpolates the original UVs", () => {
    const builder = new ProjectedWallBuilder();
    builder.patch(triangles, 0, 0, [[0.25, 0.25, 0.75, 0.75]], (x, y) => [x, y, 0]);
    const geometry = builder.finish();
    const position = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    expect(position.count).toBe(6);
    for (let i = 0; i < position.count; i++) {
      expect(position.getX(i)).toBeGreaterThanOrEqual(0.25);
      expect(position.getX(i)).toBeLessThanOrEqual(0.75);
      expect(position.getY(i)).toBeGreaterThanOrEqual(0.25);
      expect(position.getY(i)).toBeLessThanOrEqual(0.75);
      expect(uv.getX(i)).toBeCloseTo(position.getX(i) / 2);
      expect(uv.getY(i)).toBeCloseTo(position.getY(i) / 2);
    }
    geometry.dispose();
  });

  it("omits triangles outside the requested wall region", () => {
    const builder = new ProjectedWallBuilder();
    builder.patch(triangles, 0, 0, [[3, 3, 4, 4]], (x, y) => [x, y, 0]);
    const geometry = builder.finish();
    expect(geometry.getAttribute("position").count).toBe(0);
    geometry.dispose();
  });
});
