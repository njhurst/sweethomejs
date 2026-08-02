/*
 * FurnitureIconCache.test.ts
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
 * FurnitureIconCache tests (task 5.4): identity keys, cached-icon reuse,
 * async render completion → repaint callback, placeholder painting.
 */
import { describe, expect, it } from "vitest";
import { HomePieceOfFurniture } from "@sweethomejs/core";
import { FurnitureIconCache, getModelIdentity, paintFurniturePlanIcon } from "./FurnitureIconCache.js";
import { SVGPainter } from "./SVGPainter.js";
import { DEFAULT_PLAN_COLORS } from "./PlanPainterPipeline.js";

function makePiece(modelUrl: string, x = 0, y = 0, width = 100, depth = 50): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("piece", {
    getName: () => "Sofa",
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
    getModel: () => ({ getURL: () => modelUrl, openStream: () => Promise.resolve(new ReadableStream()) }),
    getModelFlags: () => 0,
    getModelSize: () => 1234,
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

describe("FurnitureIconCache (task 5.4)", () => {
  it("keys models by content identity", () => {
    const a = makePiece("zip:0/sofa.obj");
    const b = makePiece("zip:0/sofa.obj");
    const c = makePiece("zip:1/chair.obj");
    expect(getModelIdentity(a)).toBe(getModelIdentity(b));
    expect(getModelIdentity(a)).not.toBe(getModelIdentity(c));
  });

  it("renders async and caches the icon, invoking the ready callback once", () => {
    const cache = new FurnitureIconCache();
    const piece = makePiece("zip:0/sofa.obj");
    let renderCalls = 0;
    cache.setRenderer({
      renderTopView: async () => {
        renderCalls++;
        return { kind: "canvas", width: 400, height: 200 };
      },
    });
    let readyCalls = 0;
    const icon = cache.getOrCreateIcon(piece, 400, 200, () => readyCalls++);
    expect(icon).toBeNull(); // not ready yet

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const cached = cache.getCachedIcon(piece, 400, 200);
        expect(cached).not.toBeNull();
        expect(cached!.image).toEqual({ kind: "canvas", width: 400, height: 200 });
        expect(renderCalls).toBe(1);
        expect(readyCalls).toBe(1);
        // Second request reuses the cache without re-rendering
        cache.getOrCreateIcon(piece, 400, 200, () => readyCalls++);
        expect(renderCalls).toBe(1);
        expect(readyCalls).toBe(1);
        resolve();
      }, 20);
    });
  });

  it("does not re-render while a render is pending", () => {
    const cache = new FurnitureIconCache();
    const piece = makePiece("zip:0/sofa.obj");
    let renderCalls = 0;
    cache.setRenderer({
      renderTopView: () => {
        renderCalls++;
        return new Promise((resolve) => setTimeout(() => resolve(null), 30));
      },
    });
    cache.getOrCreateIcon(piece, 100, 100, () => {});
    cache.getOrCreateIcon(piece, 100, 100, () => {});
    expect(renderCalls).toBe(1);
  });

  it("paints a placeholder when no icon is available", () => {
    const cache = new FurnitureIconCache();
    const piece = makePiece("zip:0/sofa.obj");
    piece.setX(0);
    piece.setY(0);
    const painter = new SVGPainter();
    paintFurniturePlanIcon(painter, piece, DEFAULT_PLAN_COLORS, cache, () => {});
    const svg = painter.toString();
    // Placeholder: a rect + two diagonals
    expect(svg).toContain("<rect ");
    expect((svg.match(/<line /g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
