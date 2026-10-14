/** Architectural dimensions only. Actors, ingredient slots and VFX are not moved. */
export type MockupRoomKind = "workshop" | "arena";

export const MOCKUP_ROOM_LAYOUT = {
  workshop: { floorTop: -0.64, wallBase: -0.66, rearZ: -4.25, archZ: -4.23, wallHeight: 9.2, sideX: 7.48, sideStart: -1.05, floorMinZ: -8, floorMaxZ: 18 },
  arena: { floorTop: -0.16, wallBase: -0.17, rearZ: -6.55, archZ: -6.28, wallHeight: 9.2, sideX: 7.48, sideStart: 0.1, floorMinZ: -10, floorMaxZ: 18 },
} as const;

/** Measured 3.199 m wall width gives at least 59 mm overlap with the 2.8 m arch. */
export const COMPOSITION_REAR_WALL_X = [-6.12, -2.94, 2.94, 6.12] as const;

/** A deliberately wider backing opening is hidden by the original sculpted arch. */
export function doorwayHalfWidthAt(height: number): number {
  const radius = 0.92;
  const spring = 3.0;
  if (height <= spring) return radius;
  if (height >= spring + radius) return 0;
  return Math.sqrt(radius * radius - (height - spring) ** 2);
}

export const ROOM_FLOOR_HALF_WIDTH = 12;
export const PASSAGE_DEPTH = { door: 0.7, corridor: 2.8 } as const;
