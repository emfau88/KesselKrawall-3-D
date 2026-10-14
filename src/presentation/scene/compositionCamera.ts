import { OrthographicCamera, PerspectiveCamera, Vector3, type Vector3Tuple } from "three";

export type CompositionScene = "workshop" | "arena";
export type CompositionProfile = "desktop" | "portrait" | "landscape";

function boxPoints(min: Vector3Tuple, max: Vector3Tuple): Vector3[] {
  return [min[0], max[0]].flatMap((x) => [min[1], max[1]].flatMap((y) =>
    [min[2], max[2]].map((z) => new Vector3(x, y, z)),
  ));
}

/** Only interactive/critical objects are fitted. Room surfaces extend past the frame. */
export function compositionFocusPoints(mode: CompositionScene): Vector3[] {
  if (mode === "workshop") {
    return [
      ...boxPoints([-1.4, 0.48, -1.1], [1.4, 3.05, 1.05]),
      ...[-2.75, -1.48, 0, 1.48, 2.75].flatMap((x, index) => {
        const z = [1.45, 2.28, 2.62, 2.28, 1.45][index]!;
        return boxPoints([x - 0.7, 0.55, z - 0.7], [x + 0.7, 2.45, z + 0.7]);
      }),
      // The unlocked reserve must fit too, not just the opening three ingredients.
      ...boxPoints([2.72, 0.55, 2.15], [4.12, 2.45, 3.55]),
    ];
  }
  return [
    ...boxPoints([-1.65, 0.03, 2.7], [1.1, 2.85, 5.2]),
    ...boxPoints([-1.2, 0.0, -5.0], [1.7, 3.15, -2.45]),
    ...boxPoints([-3.35, 0.13, 4.1], [2.8, 1.85, 5.65]),
    ...boxPoints([-2.35, 0.15, -5.2], [2.9, 1.8, -3.6]),
  ];
}

export function compositionSafeArea(mode: CompositionScene, width: number, height: number) {
  const profile: CompositionProfile = height > width ? "portrait" : width <= 900 || height <= 580 ? "landscape" : "desktop";
  const top = mode === "workshop"
    ? profile === "desktop" ? 155 : profile === "portrait" ? 125 : 100
    : profile === "desktop" ? 125 : profile === "portrait" ? 125 : 84;
  const bottom = mode === "workshop"
    ? profile === "desktop" ? 130 : profile === "portrait" ? 155 : 100
    : profile === "desktop" ? 100 : profile === "portrait" ? 118 : 66;
  // Compact windows retain a usable central area; no negative frusta on resize.
  const scale = Math.min(1, height * 0.64 / (top + bottom));
  return { profile, top: top * scale, bottom: bottom * scale, side: width < 650 ? 14 : 30 };
}

/** Deterministic fit, never per-frame work. Compare both projections with the same subjects. */
export function composeMockupCamera(
  camera: PerspectiveCamera | OrthographicCamera,
  mode: CompositionScene,
  width: number,
  height: number,
) {
  const safe = compositionSafeArea(mode, width, height);
  const points = compositionFocusPoints(mode);
  const target = new Vector3(0, mode === "workshop" ? 1.25 : 1.05, mode === "workshop" ? 0.85 : 0.15);
  const direction = new Vector3(0.025, mode === "workshop" ? 0.51 : safe.profile === "portrait" ? 0.67 : 0.46, 1).normalize();
  const availableWidth = 1 - safe.side * 2 / width;
  const availableHeight = 1 - (safe.top + safe.bottom) / height;
  const desiredCentre = (safe.bottom - safe.top) / height;
  let shift = 0;
  let distance = mode === "workshop" ? 8 : 12;
  let extent = 1;
  camera.near = 0.1;
  camera.far = 90;
  if (camera instanceof PerspectiveCamera) {
    // Portrait expands the vertical field instead of backing out into the fog.
    camera.fov = safe.profile === "portrait" ? mode === "workshop" ? 80 : 75 : mode === "workshop" ? 43 : 45;
    camera.aspect = width / height;
  } else {
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
  }
  for (let step = 0; step < 100; step++) {
    camera.clearViewOffset();
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    if (camera instanceof OrthographicCamera) camera.zoom = height / (extent * 2);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const projected = points.map((point) => point.clone().project(camera));
    const minY = Math.min(...projected.map((point) => point.y));
    const maxY = Math.max(...projected.map((point) => point.y));
    const maxX = Math.max(...projected.map((point) => Math.abs(point.x)));
    shift = desiredCentre - (minY + maxY) / 2;
    if (maxX <= availableWidth && maxY - minY <= availableHeight * 2) break;
    if (camera instanceof PerspectiveCamera) distance *= 1.025;
    else extent *= 1.045;
  }
  // Asymmetric frustum centres the play area between existing HUD regions.
  camera.setViewOffset(width, height, 0, shift * height / 2, width, height);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.userData.compositionTarget = target.toArray();
  camera.userData.compositionProfile = safe.profile;
  camera.userData.compositionSafeArea = safe;
  camera.userData.compositionPhase = 1;
}
