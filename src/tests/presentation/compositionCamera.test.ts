import { describe, expect, it } from "vitest";
import { OrthographicCamera, PerspectiveCamera } from "three";
import { composeMockupCamera, compositionFocusPoints, compositionSafeArea } from "../../presentation/scene/compositionCamera";

describe("Phase-1 composition camera", () => {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [320, 568], [568, 320], [1920, 1080], [1024, 768]]) {
    for (const mode of ["workshop", "arena"] as const) {
      for (const projection of ["perspective", "orthographic"] as const) {
        it(`${mode}, ${projection}: fits all subjects including reserve at ${width}×${height}`, () => {
          const camera = projection === "perspective" ? new PerspectiveCamera() : new OrthographicCamera();
          composeMockupCamera(camera, mode, width!, height!);
          const safe = compositionSafeArea(mode, width!, height!);
          for (const point of compositionFocusPoints(mode)) {
            const ndc = point.clone().project(camera);
            const x = (ndc.x + 1) * width! / 2;
            const y = (1 - ndc.y) * height! / 2;
            expect(x).toBeGreaterThanOrEqual(safe.side - 0.1);
            expect(x).toBeLessThanOrEqual(width! - safe.side + 0.1);
            expect(y).toBeGreaterThanOrEqual(safe.top - 0.1);
            expect(y).toBeLessThanOrEqual(height! - safe.bottom + 0.1);
            expect(ndc.z).toBeGreaterThan(-1);
            expect(ndc.z).toBeLessThan(1);
          }
        });
      }
    }
  }
  it("reframes the same camera on orientation change without stale view offsets", () => {
    const camera = new PerspectiveCamera();
    composeMockupCamera(camera, "workshop", 390, 844);
    composeMockupCamera(camera, "arena", 844, 390);
    expect(camera.aspect).toBeCloseTo(844 / 390);
    expect(camera.userData.compositionProfile).toBe("landscape");
    expect(camera.userData.compositionTarget).toEqual([0, 1.05, 0.15]);
  });
});
