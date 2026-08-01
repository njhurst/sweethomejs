/**
 * Temporary stub shells for model classes ported in later P1 tasks.
 *
 * These exist so Home.ts (the document root, task 2.2) can be ported and
 * type-checked first. Each class is filled in by its task:
 *
 *   Wall / Room                 → 2.3
 *   HomePieceOfFurniture (+ family) → 2.4
 *   HomeEnvironment / Compass   → 2.5
 *   Polyline / DimensionLine / Label / TextStyle / ... → 2.6
 *   catalogs / UserPreferences  → 2.8
 *   interfaces                  → 2.9
 */
import type { Camera } from "./Camera.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";

/** Elevatable: items bound to a level (Wall, Room, Polyline, ...). */
export interface Elevatable {
  getLevel(): Level | null;
}

// Real ports replace the remaining stubs as their tasks land (2.4–2.9).
export { Room } from "./Room.js";
export { Wall } from "./Wall.js";

// Real ports replace the remaining stubs as their tasks land (2.5–2.9).
export { HomeFurnitureGroup } from "./HomeFurnitureGroup.js";
export { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";

export { DimensionLine } from "./DimensionLine.js";
export { Label } from "./Label.js";
export { Polyline } from "./Polyline.js";

export { Compass } from "./Compass.js";
export { HomeEnvironment } from "./HomeEnvironment.js";

export { ObjectProperty } from "./ValueClasses.js";
export { HomeTexture } from "./HomeTexture.js";
export { HomeMaterial } from "./HomeMaterial.js";
export { TextStyle } from "./TextStyle.js";
export class TextureImage {}
export { LightSource } from "./ValueClasses.js";
export class Baseboard {
  getThickness(): number {
    return 0;
  }
}
export { Sash } from "./ValueClasses.js";
export class AspectRatio {}
export class Library {}
export class PieceOfFurniture {}
export class Transformation {}
