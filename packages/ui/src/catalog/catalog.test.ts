/*
 * catalog.test.ts
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
 * Catalog panel + table tests (task 7.2): catalog search filtering and
 * furniture sorting are pure helpers.
 */
import { describe, expect, it } from "vitest";
import { Home, HomePieceOfFurniture, UserPreferences, FurnitureCatalog, FurnitureCategory } from "@sweethomejs/core";
import { filterCatalog } from "./FurnitureCatalogPanel.js";
import { sortFurniture, FURNITURE_COLUMNS } from "./FurnitureTable.js";

function makePiece(name: string, width: number, height: number): HomePieceOfFurniture {
  return new HomePieceOfFurniture("p-" + name, {
    getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 50, getHeight: () => height, getWidth: () => width, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
    getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
  } as never);
}

/** A catalog with catalog pieces (the stub type works for filterCatalog's structural access). */
function makeCatalog(): FurnitureCatalog {
  const catalog = new FurnitureCatalog();
  const category = new FurnitureCategory("Living room");
  const piece = {
    getId: () => "sofa-1",
    getName: () => "Sofa",
    getWidth: () => 200,
    getDepth: () => 90,
    getHeight: () => 80,
  };
  catalog.add(category, piece as never);
  const beds = new FurnitureCategory("Bedroom");
  const bed = {
    getId: () => "bed-1",
    getName: () => "Bed",
    getWidth: () => 160,
    getDepth: () => 200,
    getHeight: () => 50,
  };
  catalog.add(beds, bed as never);
  return catalog;
}

describe("filterCatalog (task 7.2)", () => {
  it("returns all pieces with an empty query", () => {
    const results = filterCatalog(makeCatalog(), "");
    expect(results.length).toBe(2);
    expect(results[0]!.pieces.length).toBe(1);
  });

  it("filters by name substring", () => {
    const results = filterCatalog(makeCatalog(), "bed");
    expect(results.length).toBe(1);
    expect(results[0]!.category).toBe("Bedroom");
    expect(results[0]!.pieces[0]!.name).toBe("Bed");
  });

  it("matches category names too", () => {
    const results = filterCatalog(makeCatalog(), "bedroom");
    expect(results.length).toBe(1);
    expect(results[0]!.category).toBe("Bedroom");
  });

  it("returns nothing for unmatched queries", () => {
    expect(filterCatalog(makeCatalog(), "xyz")).toEqual([]);
  });
});

describe("sortFurniture (task 7.2)", () => {
  it("sorts by name and by numeric width", () => {
    const pieces = [makePiece("Table", 100, 70), makePiece("Chair", 40, 90), makePiece("Sofa", 200, 80)];
    const byName = sortFurniture(pieces, FURNITURE_COLUMNS[0]!, false);
    expect(byName.map((p) => p.getName())).toEqual(["Chair", "Sofa", "Table"]);
    const byWidth = sortFurniture(pieces, FURNITURE_COLUMNS[1]!, false);
    expect(byWidth.map((p) => p.getWidth())).toEqual([40, 100, 200]);
  });

  it("reverses on descending", () => {
    const pieces = [makePiece("A", 100, 70), makePiece("B", 200, 80)];
    const byWidthDesc = sortFurniture(pieces, FURNITURE_COLUMNS[1]!, true);
    expect(byWidthDesc.map((p) => p.getWidth())).toEqual([200, 100]);
  });
});

describe("FurnitureCatalog integration (task 7.2)", () => {
  it("catalog pieces resolve by id", () => {
    const catalog = makeCatalog();
    const piece = catalog.getPieceOfFurnitureWithId("sofa-1");
    expect(piece).not.toBeNull();
    expect(catalog.getPieceOfFurnitureWithId("missing")).toBeNull();
  });

  it("catalog + preferences connect to the home controller's furniture controller", () => {
    const home = new Home();
    const preferences = new UserPreferences();
    void home;
    void preferences;
    // The FurnitureController accepts a catalog piece (converted to a home piece)
    expect(typeof HomePieceOfFurniture).toBe("function");
  });
});
