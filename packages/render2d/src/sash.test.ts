/*
 * sash.test.ts
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
import { describe, expect, it } from "vitest";
import { Home, HomeDoorOrWindow, UserPreferences } from "@sweethomejs/core";
import { PlanPainterPipeline } from "./PlanPainterPipeline.js";
import { SVGPainter } from "./SVGPainter.js";

function doorWithSash(): HomeDoorOrWindow {
  // A door like 58-anderson's "Double French window"
  const door = new HomeDoorOrWindow("door", {
    getName: () => "Door", getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 10.45, getHeight: () => 210, getWidth: () => 132.08, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => true, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    // DoorOrWindow-specific
    getWallThickness: () => 20, getWallDistance: () => 0, isWallCutOutOnBothSides: () => false,
    getSashes: () => [{
      getXAxis: () => 0.015142337419092655, getYAxis: () => 0.7290754914283752,
      getWidth: () => 0.48076921701431274, getStartAngle: () => 0, getEndAngle: () => -1.5707963705062866,
    }],
    getCutOutShape: () => "M0,0 v1 h1 v-1 z",
  } as never);
  door.setX(1201);
  door.setY(69);
  door.setAngle(0);
  return door;
}

describe("door/window sashes (Java paintDoorOrWindowSashes)", () => {
  it("draws a pie arc for the sash", () => {
    const home = new Home();
    const door = doorWithSash();
    home.addPieceOfFurniture(door);
    const painter = new SVGPainter();
    const pipeline = new PlanPainterPipeline();
    // Paint at 1:1
    painter.save();
    pipeline.paint(painter, home, new UserPreferences(), null, {});
    painter.restore();
    const svg = painter.toString();
    // The sash pie is drawn as a stroked path with the outline color
    expect(svg).toContain("rgba(29,0,180,1)");
    // The pie center is at the hinge: (door.x - 66.04 + 2, door.y - 5.23 + 7.62)
    // ≈ (1137, 71.4) — and the arc's far point is perpendicular to the wall
    // (radius 63.5 up: y ≈ 7.9). The old bug drew with a 2x radius (y ≈ -20+).
    expect(svg).toMatch(/M 1136\.9[0-9]+ 71\.3[0-9]+/);
    // The far arc point at θ=-90° is the hinge minus the radius (63.5):
    // y ≈ 7.89 — the old 2x-radius bug put it at y ≈ -20.
    expect(svg).toMatch(/L 1136\.9[0-9]+ 7\.8[0-9]+/);
  });
});
