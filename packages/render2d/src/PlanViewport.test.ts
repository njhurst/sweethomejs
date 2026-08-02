/*
 * PlanViewport.test.ts
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
 * PlanViewport tests (task 5.2): model↔pixel round-trips, zoom-at-point
 * keeps the cursor's model point fixed, pan, preferred size.
 */
import { describe, expect, it } from "vitest";
import { PlanViewport } from "./PlanViewport.js";

describe("PlanViewport (task 5.2)", () => {
  it("round-trips model ↔ pixel at the default scale", () => {
    const viewport = new PlanViewport();
    viewport.setPlanBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
    viewport.setScale(0.5);
    // Model (0, 0) maps to the margin position: 40cm * 0.5 = 20px
    expect(viewport.convertXModelToPixel(0)).toBeCloseTo(20, 6);
    expect(viewport.convertXModelToPixel(1000)).toBeCloseTo(20 + 500, 6);
    expect(viewport.convertXPixelToModel(20)).toBeCloseTo(0, 6);
    expect(viewport.convertXPixelToModel(520)).toBeCloseTo(1000, 6);
    // y is symmetric (Java PlanComponent uses the same formula for y)
    expect(viewport.convertYModelToPixel(250)).toBeCloseTo(20 + 125, 6);
    expect(viewport.convertYPixelToModel(145)).toBeCloseTo(250, 6);
  });

  it("accounts for insets", () => {
    const viewport = new PlanViewport();
    viewport.setPlanBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
    viewport.setScale(1);
    viewport.setInsets({ left: 5, top: 10, right: 5, bottom: 10 });
    expect(viewport.convertXModelToPixel(0)).toBeCloseTo(5 + 40, 6);
    expect(viewport.convertXPixelToModel(5 + 40)).toBeCloseTo(0, 6);
    expect(viewport.convertYModelToPixel(0)).toBeCloseTo(10 + 40, 6);
  });

  it("zoomAt keeps the cursor's model point fixed", () => {
    const viewport = new PlanViewport();
    viewport.setPlanBounds({ minX: -100, minY: -100, maxX: 900, maxY: 900 });
    viewport.setScale(0.5);
    const pixelX = 300;
    const pixelY = 200;
    const modelXBefore = viewport.convertXPixelToModel(pixelX);
    const modelYBefore = viewport.convertYPixelToModel(pixelY);

    viewport.zoomAt(2, pixelX, pixelY);
    expect(viewport.getScale()).toBeCloseTo(1, 6);
    expect(viewport.convertXPixelToModel(pixelX)).toBeCloseTo(modelXBefore, 6);
    expect(viewport.convertYPixelToModel(pixelY)).toBeCloseTo(modelYBefore, 6);

    viewport.zoomAt(0.5, pixelX, pixelY);
    expect(viewport.getScale()).toBeCloseTo(0.5, 6);
    expect(viewport.convertXPixelToModel(pixelX)).toBeCloseTo(modelXBefore, 6);
  });

  it("moveView pans in the opposite screen direction", () => {
    const viewport = new PlanViewport();
    viewport.setPlanBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
    viewport.setScale(1);
    const xBefore = viewport.convertXModelToPixel(100);
    viewport.moveView(10, 0);
    // Moving the view by +10 model units shifts the content left by 10 px
    expect(viewport.convertXModelToPixel(100)).toBeCloseTo(xBefore - 10, 6);
  });

  it("computes the preferred size from bounds + margin + insets", () => {
    const viewport = new PlanViewport();
    viewport.setPlanBounds({ minX: 0, minY: 0, maxX: 800, maxY: 600 });
    viewport.setScale(0.5);
    viewport.setInsets({ left: 5, top: 10, right: 5, bottom: 10 });
    const size = viewport.getPreferredSize();
    expect(size.width).toBeCloseTo(400 + 40 * 2 * 0.5 + 10, 6);
    expect(size.height).toBeCloseTo(300 + 40 * 2 * 0.5 + 20, 6);
  });

  it("getPaintTransform matches PlanComponent.paintComponent", () => {
    const viewport = new PlanViewport();
    viewport.setPlanBounds({ minX: 10, minY: 20, maxX: 810, maxY: 620 });
    viewport.setScale(0.5);
    viewport.setInsets({ left: 2, top: 3, right: 2, bottom: 3 });
    const t = viewport.getPaintTransform();
    expect(t.translateX).toBeCloseTo(2 + (40 - 10) * 0.5, 6);
    expect(t.translateY).toBeCloseTo(3 + (40 - 20) * 0.5, 6);
    expect(t.scale).toBe(0.5);
  });
});
