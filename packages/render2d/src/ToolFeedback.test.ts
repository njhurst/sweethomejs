/*
 * ToolFeedback.test.ts
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
 * Tool feedback tests (task 5.6): selection outline/grips, tool tips,
 * alignment dashes, and the editable-property commit path.
 */
import { describe, expect, it } from "vitest";
import { Home, Wall, UserPreferences, PlanController, HomePieceOfFurniture } from "@sweethomejs/core";
import { SVGPainter } from "./SVGPainter.js";
import { paintToolTip, emptyToolTip, paintAlignmentFeedback, emptyAlignmentFeedback, commitEditableProperty } from "./ToolFeedback.js";
import { paintSelectionFeedback as paintSelection } from "./SelectionFeedbackPainter.js";

class FakePlanView {
  scale = 1;
  getScale(): number {
    return this.scale;
  }
  setScale(scale: number): void {
    this.scale = scale;
  }
  setResizeIndicatorVisible(): void {}
  setCursor(): void {}
  convertXPixelToModel(x: number): number {
    return x;
  }
  convertYPixelToModel(y: number): number {
    return y;
  }
  convertXModelToScreen(x: number): number {
    return x;
  }
  convertYModelToScreen(y: number): number {
    return y;
  }
  getPixelLength(): number {
    return 1;
  }
}

describe("Tool feedback (task 5.6)", () => {
  it("paints selection outlines with the translucent selection color", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 1000, 0, 10, 250);
    home.addWall(wall);
    home.setSelectedItems([wall]);
    const painter = new SVGPainter();
    paintSelection(painter, home, 1);
    const svg = painter.toString();
    // 0x0057ff | 0x80000000 = rgba(0,87,255,0.5)
    expect(svg).toContain("stroke='rgba(0,87,255,0.5019607843137255)'");
    expect(svg).toContain("stroke-width='6'");
  });

  it("paints grip rectangles at item vertices", () => {
    const home = new Home();
    const piece = new HomePieceOfFurniture("p", {
      getName: () => "Table", getDescription: () => null, getInformation: () => null, getLicense: () => null,
      getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
      isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
      getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
      isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
      isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
      getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    } as never);
    piece.setX(100);
    piece.setY(0);
    home.addPieceOfFurniture(piece);
    home.setSelectedItems([piece]);
    const painter = new SVGPainter();
    paintSelection(painter, home, 1);
    const svg = painter.toString();
    // 4 grip rectangles (3×3) at the piece corners
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBeGreaterThanOrEqual(4);
  });

  it("paints a tool tip box with text", () => {
    const painter = new SVGPainter();
    const toolTip = emptyToolTip();
    toolTip.text = "Length: 250 cm";
    toolTip.x = 100;
    toolTip.y = 100;
    paintToolTip(painter, toolTip);
    const svg = painter.toString();
    expect(svg).toContain("Length: 250 cm");
  });

  it("paints dashed alignment feedback", () => {
    const painter = new SVGPainter();
    const feedback = emptyAlignmentFeedback();
    feedback.segments = [[0, 0, 500, 0]];
    paintAlignmentFeedback(painter, feedback);
    const svg = painter.toString();
    expect(svg).toContain("stroke-dasharray='20,5,5,5'");
  });

  it("commits editable property values to the controller", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 100, 0, 10, 250);
    home.addWall(wall);
    home.setSelectedItems([wall]);
    const controller = new PlanController(home, new UserPreferences(), {
      createPlanView: () => new FakePlanView(),
    } as never, null, null);
    controller.getView();
    commitEditableProperty(controller, "LENGTH", 300);
    expect(Math.sqrt(Math.pow(wall.getXEnd() - wall.getXStart(), 2))).toBeCloseTo(300, 4);
  });
});
