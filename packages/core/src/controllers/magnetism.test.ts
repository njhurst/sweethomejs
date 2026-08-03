/*
 * magnetism.test.ts
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
 * Wall drawing magnetism (Java PlanController WallPointWithAngleMagnetism /
 * PointMagnetizedToClosestWallOrRoomPoint): wall ends snap to nearby wall
 * vertices and to 15 degree angles.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { Wall } from "../model/Wall.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { PlanView } from "./PlanView.js";
import { PlanController } from "./PlanController.js";

class MockPlanView {
  scale = 0.5;
  convertXPixelToModel(x: number): number {
    return x / this.scale;
  }
  convertYPixelToModel(y: number): number {
    return y / this.scale;
  }
  convertXModelToScreen(x: number): number {
    return x * this.scale;
  }
  convertYModelToScreen(y: number): number {
    return y * this.scale;
  }
  getScale(): number {
    return this.scale;
  }
  getPixelLength(): number {
    return this.scale;
  }
  setAlignmentFeedback(): void {}
  setRectangleFeedback(): void {}
  setToolTipFeedback(): void {}
  deleteFeedback(): void {}
  setCursor(): void {}
  repaint(): void {}
}

function makeController(home: Home): PlanController {
  const view = new MockPlanView();
  const controller = new PlanController(home, new UserPreferences(), {
    createPlanView: () => view as unknown as PlanView,
  } as never, null, null);
  controller.getView();
  return controller;
}

describe("wall magnetism", () => {
  it("snaps a new wall end to a nearby existing wall end", () => {
    const home = new Home();
    home.addWall(new Wall("w", 0, 0, 1000, 0, 20, 250));
    const controller = makeController(home);
    // Draw from (0, 0) toward (1002, 3): the angle snaps to 0°, then the wall
    // end vertex (1000, 0) (within 4 px = 8 cm at scale 0.5) pulls the end.
    const p = controller.wallPointWithAngleMagnetism(null, 0, 0, 1002, 3);
    expect(p.y).toBeCloseTo(0, 0);
    expect(p.x).toBeCloseTo(1000, 0);
  });

  it("snaps a wall direction to a 15 degree multiple", () => {
    const home = new Home();
    const controller = makeController(home);
    // 20 degrees from the x axis should snap to 15 degrees
    const p = controller.pointWithAngleMagnetism(0, 0, 1000, Math.tan(Math.PI * 20 / 180) * 1000);
    const angle = Math.atan2(0 - p.y, p.x - 0);
    const degrees = Math.round((angle * 180) / Math.PI);
    expect(Math.abs(degrees) % 15).toBe(0);
  });

  it("magnetizes the wall length to the unit grid", () => {
    const home = new Home();
    const controller = makeController(home);
    // At scale 0.5 the max length delta is 0.5 px: precision 0.5 cm
    const p = controller.pointWithAngleMagnetism(0, 0, 133.37, 0);
    expect(p.x).toBeCloseTo(133.5, 1);
  });

  it("vertex magnetism finds the closest wall corner within the margin", () => {
    const home = new Home();
    home.addWall(new Wall("w", 0, 0, 1000, 0, 20, 250));
    const controller = makeController(home);
    // The closest room-path vertex of a 20-thick wall is its rectangle corner
    // (1000, 10); the cursor (1002, 3) is within the 8 cm margin.
    const m = controller.pointMagnetizedToClosestWallOrRoomPoint(1002, 3);
    expect(m.magnetized).toBe(true);
    expect(m.x).toBeCloseTo(1000, 0);
    const far = controller.pointMagnetizedToClosestWallOrRoomPoint(1200, 500);
    expect(far.magnetized).toBe(false);
  });
});
