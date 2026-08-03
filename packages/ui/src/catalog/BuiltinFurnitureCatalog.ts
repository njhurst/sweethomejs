/*
 * BuiltinFurnitureCatalog.ts
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
 * Built-in furniture catalog: a small offline catalog of basic furniture the
 * app ships with (the official Sweet Home 3D catalogs are separate GPL
 * downloads not present in the source tree). Pieces have no 3D model or icon
 * content, so they render as colored boxes in 3D and as placeholder icons in
 * the plan — the same path model-less furniture takes in the 3D view.
 */
import { FurnitureCatalog, FurnitureCategory, CatalogPieceOfFurniture } from "@sweethomejs/core";
import type { FurnitureCatalog as CatalogType } from "@sweethomejs/core";

function piece(
  id: string,
  name: string,
  width: number,
  depth: number,
  height: number,
  color: number | null,
  doorOrWindow = false,
  light = false,
): CatalogPieceOfFurniture {
  return new CatalogPieceOfFurniture(
    id, name, null, null, null, null, null, null,
    null, null, null, // icon, planIcon, model
    width, depth, height,
    0, 0, true, null, null, 0, null, null,
    true, true, true, true,
    null, null, null, null,
    undefined,
  ) as CatalogPieceOfFurniture;
}

function category(catalog: FurnitureCatalog, name: string, pieces: CatalogPieceOfFurniture[]): void {
  const cat = new FurnitureCategory(name);
  for (const p of pieces) {
    catalog.add(cat, p);
  }
}

const WOOD = 0x8b6f47;
const WOOD_LIGHT = 0xb08d57;
const METAL = 0x8a8d8f;
const BLACK = 0x2b2b2b;
const WHITE = 0xe8e8e8;
const BLUE = 0x4a6fa5;
const RED = 0x9c3d3d;
const GREEN = 0x4f7a4f;
const YELLOW = 0xc9a53e;

export function buildBuiltinFurnitureCatalog(): CatalogType {
  const catalog = new FurnitureCatalog();

  category(catalog, "Chairs", [
    piece("chair-wood", "Wood chair", 45, 45, 90, WOOD),
    piece("chair-white", "White chair", 45, 45, 90, WHITE),
    piece("chair-office", "Office chair", 60, 60, 110, BLACK),
    piece("armchair", "Armchair", 90, 85, 80, RED),
    piece("sofa-2", "Sofa 2 seats", 160, 90, 80, BLUE),
    piece("sofa-3", "Sofa 3 seats", 210, 90, 80, BLUE),
  ]);

  category(catalog, "Tables", [
    piece("table-80", "Round table 80", 80, 80, 75, WOOD),
    piece("table-120", "Rectangular table 120×70", 120, 70, 75, WOOD),
    piece("table-200", "Dining table 200×100", 200, 100, 75, WOOD),
    piece("desk", "Desk 120×60", 120, 60, 75, WOOD_LIGHT),
    piece("coffee-table", "Coffee table", 90, 50, 40, WOOD_LIGHT),
  ]);

  category(catalog, "Beds", [
    piece("bed-90", "Single bed 90×190", 90, 190, 55, WHITE),
    piece("bed-140", "Double bed 140×190", 140, 190, 55, WHITE),
    piece("bed-160", "Double bed 160×200", 160, 200, 55, WHITE),
    piece("bedside-table", "Bedside table", 40, 40, 50, WOOD),
    piece("wardrobe-120", "Wardrobe 120", 120, 60, 200, WOOD),
    piece("wardrobe-200", "Wardrobe 200", 200, 60, 200, WOOD),
  ]);

  category(catalog, "Storage", [
    piece("shelf-80", "Shelf 80", 80, 30, 180, WOOD),
    piece("shelf-120", "Shelf 120", 120, 30, 180, WOOD),
    piece("bookcase", "Bookcase", 90, 30, 180, WOOD),
    piece("chest", "Chest of drawers", 90, 50, 90, WOOD),
    piece("cabinet", "Cabinet", 80, 45, 85, WHITE),
  ]);

  category(catalog, "Kitchen", [
    piece("fridge", "Refrigerator", 70, 70, 180, WHITE),
    piece("stove", "Stove", 60, 60, 85, WHITE),
    piece("dishwasher", "Dishwasher", 60, 60, 85, METAL),
    piece("sink", "Kitchen sink", 60, 60, 90, METAL),
    piece("kitchen-unit-60", "Base unit 60", 60, 60, 85, WOOD),
    piece("kitchen-unit-80", "Base unit 80", 80, 60, 85, WOOD),
  ]);

  category(catalog, "Bathroom", [
    piece("toilet", "Toilet", 40, 60, 70, WHITE),
    piece("bath", "Bathtub 170", 170, 75, 60, WHITE),
    piece("shower", "Shower tray", 80, 80, 40, WHITE),
    piece("washbasin", "Washbasin", 60, 50, 85, WHITE),
    piece("bathroom-cabinet", "Bathroom cabinet", 60, 30, 70, WHITE),
  ]);

  category(catalog, "Doors & windows", [
    piece("door-80", "Door 80", 5, 80, 204, WOOD, true),
    piece("door-90", "Door 90", 5, 90, 204, WOOD, true),
    piece("door-double", "Double door 140", 5, 140, 204, WOOD, true),
    piece("window-100", "Window 100", 5, 100, 100, WHITE, true),
    piece("window-140", "Window 140", 5, 140, 100, WHITE, true),
    piece("window-200", "Window 200", 5, 200, 120, WHITE, true),
  ]);

  category(catalog, "Lights", [
    piece("lamp-table", "Table lamp", 30, 30, 60, YELLOW, false, true),
    piece("lamp-floor", "Floor lamp", 35, 35, 160, YELLOW, false, true),
    piece("lamp-ceiling", "Ceiling light", 40, 40, 10, WHITE, false, true),
  ]);

  category(catalog, "Electrical", [
    piece("tv-100", "TV 100", 100, 20, 60, BLACK),
    piece("tv-140", "TV 140", 140, 20, 80, BLACK),
    piece("stereo", "Stereo system", 60, 30, 90, BLACK),
    piece("washing-machine", "Washing machine", 60, 60, 85, WHITE),
  ]);

  category(catalog, "Decoration", [
    piece("plant-1", "Plant", 40, 40, 100, GREEN),
    piece("plant-2", "Small plant", 25, 25, 50, GREEN),
    piece("carpet-140", "Carpet 140×200", 140, 200, 2, RED),
    piece("rug-200", "Rug 200×300", 200, 300, 2, BLUE),
  ]);

  return catalog;
}
