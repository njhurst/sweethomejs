/**
 * Ported upstream test assertions (task 2.12). The upstream tests
 * (test/com/eteks/sweethome3d/junit/) are Swing integration tests; we port
 * their model-level assertions here. UI-interaction coverage lands with the
 * plan controller tests in phase P3.
 */
import { describe, expect, it } from "vitest";
import { Home } from "./Home.js";
import { Room } from "./Room.js";
import { Level } from "./Level.js";
import { Wall } from "./Wall.js";

describe("Room model assertions (from RoomTest)", () => {
  it("computes the area of a rectangular room", () => {
    const room = new Room([
      [0, 0],
      [400, 0],
      [400, 300],
      [0, 300],
    ]);
    expect(room.getArea()).toBe(120_000); // 400 x 300 cm
    // Java's signed-area convention: this winding yields a negative value.
    expect(room.isClockwise()).toBe(true);
    expect(room.isSingular()).toBe(true);
    expect(room.getPointCount()).toBe(4);
  });

  it("handles clockwise rooms", () => {
    const room = new Room([
      [0, 0],
      [0, 300],
      [400, 300],
      [400, 0],
    ]);
    expect(room.getArea()).toBe(120_000);
    expect(room.isClockwise()).toBe(false);
  });

  it("concave rooms keep their area", () => {
    const room = new Room([
      [0, 0],
      [400, 0],
      [400, 400],
      [200, 200],
      [0, 400],
    ]);
    // 400x400 square minus the two 100x200 corner triangles
    expect(room.getArea()).toBeCloseTo(120_000, 0);
  });

  it("point index lookup (getPointIndexAt)", () => {
    const room = new Room([
      [10, 10],
      [110, 10],
      [110, 110],
    ]);
    expect(room.getPointIndexAt(10, 10, 2)).toBe(0);
    expect(room.getPointIndexAt(110, 110, 2)).toBe(2);
    expect(room.getPointIndexAt(500, 500, 2)).toBe(-1);
  });
});

describe("Wall model assertions", () => {
  it("wall length and join geometry", () => {
    const wall = new Wall(0, 0, 300, 0, 12);
    expect(wall.getLength()).toBe(300);
    expect(wall.getStartPointToEndPointDistance()).toBe(300);
    const wall2 = new Wall(300, 0, 300, 200, 12);
    wall.setWallAtEnd(wall2);
    expect(wall.getWallAtEnd()).toBe(wall2);
    // Detaching clears the other wall's back-reference
    wall.setWallAtEnd(null);
    expect(wall2.getWallAtStart()).toBeNull();
  });

  it("isTrapezoidal detects different end height", () => {
    const wall = new Wall(0, 0, 100, 0, 12);
    wall.setHeight(250);
    wall.setHeightAtEnd(200);
    expect(wall.isTrapezoidal()).toBe(true);
  });
});

describe("Home model assertions (from HomeCameraTest & friends)", () => {
  it("creates a home with the default wall height and cameras", () => {
    const home = new Home(250);
    expect(home.getWallHeight()).toBe(250);
    expect(home.getWalls().length).toBe(0);
    expect(home.getFurniture().length).toBe(0);
    expect(home.isEmpty()).toBe(true);
    expect(home.getVersion()).toBe(Home.CURRENT_VERSION);
    // Cameras exist with default ids
    expect(home.getObserverCamera().getId()).toBe("observerCamera-homeObserverCamera");
    expect(home.getTopCamera().getId()).toBe("camera-homeTopCamera");
    expect(home.getEnvironment().getId()).toBe("environment-homeEnvironment");
  });

  it("compass visibility affects selectable viewable items", () => {
    const home = new Home(250);
    home.getCompass().setVisible(false);
    expect(home.getSelectableViewableItems().length).toBe(0);
    home.getCompass().setVisible(true);
    expect(home.getSelectableViewableItems().length).toBe(1);
  });

  it("levels stay sorted by elevation", () => {
    const home = new Home(250);
    const attic = new Level("Attic", 560, 15, 220);
    const ground = new Level("Ground", 0, 20, 250);
    const first = new Level("First", 280, 20, 250);
    home.addLevel(attic);
    home.addLevel(ground);
    home.addLevel(first);
    expect(home.getLevels().map((l) => l.getName())).toEqual(["Ground", "First", "Attic"]);
    expect(home.getLevels()[0]!.getElevationIndex()).toBe(0);
  });
});
