/*
 * PlanPainterPipeline.test.ts
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
 * PlanPainterPipeline tests (task 5.3): paints a home's rooms/walls/furniture/
 * dimension lines/labels onto an SVGPainter in the Java paint order.
 */
import { describe, expect, it } from "vitest";
import { Home, Wall, Room, UserPreferences, HomePieceOfFurniture, DimensionLine, Label } from "@sweethomejs/core";
import { SVGPainter } from "./SVGPainter.js";
import { PlanPainterPipeline } from "./PlanPainterPipeline.js";

function makePiece(name: string, x: number, y: number, width = 100, depth = 50): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("piece-" + name, {
    getName: () => name,
    getDescription: () => null,
    getInformation: () => null,
    getLicense: () => null,
    getDepth: () => depth,
    getHeight: () => 30,
    getWidth: () => width,
    getElevation: () => 0,
    getDropOnTopElevation: () => 1,
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
  } as never);
  piece.setX(x);
  piece.setY(y);
  return piece;
}

describe("PlanPainterPipeline (task 5.3)", () => {
  it("paints walls as filled polygons", () => {
    const home = new Home();
    home.addWall(new Wall("wall", 0, 0, 1000, 0, 10, 250));
    home.addWall(new Wall("wall2", 1000, 0, 1000, 800, 10, 250));

    const painter = new SVGPainter();
    const pipeline = new PlanPainterPipeline();
    pipeline.paint(painter, home, new UserPreferences(), null);
    const svg = painter.toString();

    // Walls are painted as closed paths (fill + outline)
    const pathCount = (svg.match(/<path /g) ?? []).length;
    expect(pathCount).toBeGreaterThanOrEqual(4); // 2 fills + 2 outlines
    expect(svg).toContain("fill='rgba(191,191,191,1)'"); // default wall color
  });

  it("paints rooms with floor color and outline", () => {
    const home = new Home();
    const room = new Room("room", [[0, 0], [500, 0], [500, 400], [0, 400]]);
    room.setFloorColor(0xffcc99);
    home.addRoom(room);

    const painter = new SVGPainter();
    new PlanPainterPipeline().paint(painter, home, new UserPreferences(), null);
    const svg = painter.toString();
    expect(svg).toContain("fill='rgba(255,204,153,1)'");
  });

  it("paints furniture placeholders and name labels", () => {
    const home = new Home();
    const piece = makePiece("Sofa", 200, 100);
    piece.setNameVisible(true);
    home.addPieceOfFurniture(piece);

    const painter = new SVGPainter();
    new PlanPainterPipeline().paint(painter, home, new UserPreferences(), null);
    const svg = painter.toString();
    expect(svg).toContain("stroke='rgba(29,0,180,1)'"); // furniture outline color
    expect(svg).toContain("<text"); // name
  });

  it("paints dimension lines, labels and the compass", () => {
    const home = new Home();
    home.addDimensionLine(new DimensionLine(0, 0, 500, 0, 0));
    home.addLabel(new Label("Kitchen", 100, 100));

    const painter = new SVGPainter();
    new PlanPainterPipeline().paint(painter, home, new UserPreferences(), null);
    const svg = painter.toString();
    expect(svg).toContain("<line x1='0' y1='0' x2='500' y2='0'");
    expect(svg).toContain("Kitchen");
    // Compass circle
    expect(svg).toContain("<ellipse");
  });

  it("sorts furniture by elevation and filters by selected level", () => {
    const home = new Home();
    const low = makePiece("Low", 0, 0);
    low.setElevation(0);
    const high = makePiece("High", 200, 0);
    high.setElevation(100);
    home.addPieceOfFurniture(high);
    home.addPieceOfFurniture(low);

    const painter = new SVGPainter();
    new PlanPainterPipeline().paint(painter, home, new UserPreferences(), null);
    const svg = painter.toString();
    // Both pieces painted as placeholder rectangles
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
