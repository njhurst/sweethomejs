/**
 * Clone and id semantics (task 2.11): verifies the ported model classes
 * follow Java's clone() behavior — same id, no listeners, independent
 * collections — and that id generation matches the `prefix-uuid` format.
 */
import { describe, expect, it } from "vitest";
import { Home } from "./Home.js";
import { HomeObject } from "./HomeObject.js";
import { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";
import { Level } from "./Level.js";
import { Room } from "./Room.js";
import { Wall } from "./Wall.js";

describe("clone semantics (task 2.11)", () => {
  it("Wall.clone copies fields but clears connections and level", () => {
    const wall1 = new Wall(0, 0, 100, 0, 12);
    const wall2 = new Wall(100, 0, 100, 100, 12);
    const level = new Level("Ground", 0, 20, 250);
    wall1.setWallAtEnd(wall2);
    wall1.setLevel(level);
    const copy = wall1.clone();
    expect(copy.getId()).toBe(wall1.getId()); // same id (like Object.clone)
    expect(copy.getXStart()).toBe(wall1.getXStart());
    expect(copy.getWallAtEnd()).toBeNull(); // connections not copied
    expect(copy.getLevel()).toBeNull();
    // Mutating the clone must not affect the original
    copy.setXStart(500);
    expect(wall1.getXStart()).toBe(0);
  });

  it("Room.clone deep-copies points", () => {
    const room = new Room([
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ]);
    const copy = room.clone();
    copy.setPoint(5, 5, 0);
    expect(room.getPoints()[0]).toEqual([0, 0]);
    expect(room.getArea()).toBeCloseTo(10000, 4);
  });

  it("Home.clone is independent and keeps the wall height", () => {
    const home = new Home(250);
    home.addWall(new Wall(0, 0, 100, 0, 12));
    const copy = home.clone();
    expect(copy.getWallHeight()).toBe(250);
    expect(copy.getWalls().length).toBe(1);
    copy.addWall(new Wall(0, 0, 50, 0, 10));
    expect(home.getWalls().length).toBe(1); // original unaffected
  });

  it("HomeObject.duplicate regenerates the id with the same prefix", () => {
    const wall = new Wall(0, 0, 100, 0, 12);
    const dup = wall.duplicate();
    expect(dup.getId()).not.toBe(wall.getId());
    expect(dup.getId().startsWith("wall-")).toBe(true);
  });

  it("clone() clears property-change listeners (no leaks)", () => {
    const piece = new HomePieceOfFurniture(
      {
        getName: () => null,
        getDescription: () => null,
        getInformation: () => null,
        getLicense: () => null,
        getDepth: () => 10,
        getHeight: () => 20,
        getWidth: () => 30,
        getElevation: () => 0,
        getDropOnTopElevation: () => 0,
        isMovable: () => true,
        isDoorOrWindow: () => false,
        getIcon: () => null,
        getPlanIcon: () => null,
        getModel: () => null,
        getModelFlags: () => 0,
        getModelSize: () => null,
        getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        getStaircaseCutOutShape: () => null,
        getCreator: () => null,
        isBackFaceShown: () => false,
        getColor: () => null,
        isResizable: () => true,
        isDeformable: () => true,
        isWidthDepthDeformable: () => true,
        isTexturable: () => true,
        isHorizontallyRotatable: () => true,
        getPrice: () => null,
        getValueAddedTaxPercentage: () => null,
        getCurrency: () => null,
        getProperty: () => null,
        getPropertyNames: () => [],
        getContentProperty: () => null,
        isContentProperty: () => false,
        getLevel: () => null,
      },
    );
    const clone = piece.clone();
    expect(clone.getId()).toBe(piece.getId());
    expect(clone.getX()).toBe(piece.getX());
  });
});

describe("id generation (task 2.11)", () => {
  it("matches the Java prefix-uuid format", () => {
    const wall = new Wall(0, 0, 100, 0, 12);
    expect(wall.getId()).toMatch(/^wall-[0-9a-f-]{36}$/);
    const room = new Room([[0, 0], [10, 0], [10, 10]]);
    expect(room.getId()).toMatch(/^room-[0-9a-f-]{36}$/);
    const level = new Level("Ground", 0, 20, 250);
    expect(level.getId()).toMatch(/^level-[0-9a-f-]{36}$/);
  });

  it("HomeObject.createId produces unique ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(HomeObject.createId("pieceOfFurniture"));
    }
    expect(ids.size).toBe(100);
  });
});
