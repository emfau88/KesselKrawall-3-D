import { describe, expect, it } from "vitest";
import { COMPOSITION_REAR_WALL_X, MOCKUP_ROOM_LAYOUT, PASSAGE_DEPTH, ROOM_FLOOR_HALF_WIDTH, doorwayHalfWidthAt } from "../../presentation/scene/mockupRoomLayout";

describe("phase 1 room architecture", () => {
  it("overlaps rear wall modules with the arch and with neighbouring modules", () => {
    expect(COMPOSITION_REAR_WALL_X[2] - 3.199 / 2).toBeLessThan(1.4 - 0.05);
    expect(COMPOSITION_REAR_WALL_X[3] - COMPOSITION_REAR_WALL_X[2]).toBeLessThan(3.199);
  });

  it("extends the continuous floor beyond every side wall and pillar footing", () => {
    for (const room of Object.values(MOCKUP_ROOM_LAYOUT)) {
      expect(ROOM_FLOOR_HALF_WIDTH).toBeGreaterThan(room.sideX + 1.1);
      expect(room.floorMinZ).toBeLessThan(room.archZ - PASSAGE_DEPTH.corridor);
      expect(room.floorMaxZ).toBeGreaterThan(12);
    }
  });

  it("keeps the passage open below the spring and closes continuously at the crown", () => {
    expect(doorwayHalfWidthAt(0)).toBe(0.92);
    expect(doorwayHalfWidthAt(3.0)).toBe(0.92);
    expect(doorwayHalfWidthAt(4)).toBe(0);
    expect(doorwayHalfWidthAt(3.5)).toBeGreaterThan(0);
    expect(doorwayHalfWidthAt(3.5)).toBeLessThan(0.92);
    expect(doorwayHalfWidthAt(3.92)).toBe(0);
  });
});
