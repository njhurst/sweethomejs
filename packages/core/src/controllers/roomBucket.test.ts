/*
 * roomBucket.test.ts
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

/**
 * Room bucket fill (computeRoomPointsAt): double-clicking inside walls
 * enclosed by a closed wall loop detects the room (the innermost ring of the
 * walls' union area) — transcribed from Java's PlanController.computeRoomPointsAt.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { Wall } from "../model/Wall.js";
import { PlanController } from "./PlanController.js";
import { UserPreferences } from "../model/UserPreferences.js";

function makeController(): { home: Home; controller: PlanController } {
  const home = new Home();
  const controller = new PlanController(home, new UserPreferences(), {
    createPlanView: () => ({}) as never,
  } as never, null, null);
  return { home, controller };
}

function addBoxWalls(home: Home): void {
  // A closed box 1000 x 600 (center lines), thickness 20
  const walls: Array<[number, number, number, number]> = [
    [0, 0, 1000, 0],
    [1000, 0, 1000, 600],
    [1000, 600, 0, 600],
    [0, 600, 0, 0],
  ];
  for (const [x1, y1, x2, y2] of walls) {
    const wall = new Wall("wall", x1, y1, x2, y2, 20, 250);
    home.addWall(wall);
  }
}

describe("room bucket fill", () => {
  it("detects the room inside a closed wall box", () => {
    const { home, controller } = makeController();
    addBoxWalls(home);
    const points = controller.computeRoomPointsAt(500, 300);
    expect(points).not.toBeNull();
    // The room ring is the inner edge of the walls: 10 cm inset from the center lines
    const sorted = [...points!].sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
    expect(sorted[0]![0]!).toBeCloseTo(10, 0);
    expect(sorted[0]![1]!).toBeCloseTo(10, 0);
    const maxX = Math.max(...points!.map((p) => p[0]!));
    expect(maxX).toBeCloseTo(990, 0);
  });

  it("returns null for a point outside any wall enclosure", () => {
    const { home, controller } = makeController();
    addBoxWalls(home);
    expect(controller.computeRoomPointsAt(2000, 2000)).toBeNull();
  });

  it("returns null when walls are open (no closed loop)", () => {
    const { home, controller } = makeController();
    home.addWall(new Wall("w", 0, 0, 1000, 0, 20, 250));
    home.addWall(new Wall("w", 1000, 0, 1000, 600, 20, 250));
    // U shape, open at the top-left
    expect(controller.computeRoomPointsAt(500, 300)).toBeNull();
  });

  it("picks the innermost ring for a point inside nested walls", () => {
    const { home, controller } = makeController();
    // Outer box 2000 x 2000, inner box 1000 x 600
    const outer: Array<[number, number, number, number]> = [
      [0, 0, 2000, 0],
      [2000, 0, 2000, 2000],
      [2000, 2000, 0, 2000],
      [0, 2000, 0, 0],
    ];
    for (const [x1, y1, x2, y2] of outer) {
      home.addWall(new Wall("w", x1, y1, x2, y2, 20, 250));
    }
    const inner: Array<[number, number, number, number]> = [
      [500, 500, 1500, 500],
      [1500, 500, 1500, 1100],
      [1500, 1100, 500, 1100],
      [500, 1100, 500, 500],
    ];
    for (const [x1, y1, x2, y2] of inner) {
      home.addWall(new Wall("w", x1, y1, x2, y2, 20, 250));
    }
    const innerPoints = controller.computeRoomPointsAt(1000, 800);
    const maxX = Math.max(...innerPoints!.map((p) => p[0]!));
    const minX = Math.min(...innerPoints!.map((p) => p[0]!));
    // The inner room: 500..1500 center lines, inset by 10
    expect(minX).toBeCloseTo(510, 0);
    expect(maxX).toBeCloseTo(1490, 0);
  });
});
