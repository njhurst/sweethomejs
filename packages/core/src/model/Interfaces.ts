/**
 * Port of com.eteks.sweethome3d.model.DoorOrWindow / Light / ShelfUnit
 * interfaces (GPL v2+).
 */
import type { PieceOfFurniture } from "./PieceOfFurniture.js";
import type { LightSource, Sash } from "./stubs.js";

export interface DoorOrWindow extends PieceOfFurniture {
  getWallThickness(): number;
  getWallDistance(): number;
  getSashes(): Sash[];
  getCutOutShape(): string;
  isWallCutOutOnBothSides(): boolean;
  isWidthDepthDeformable(): boolean;
}

export interface Light extends PieceOfFurniture {
  getLightSources(): LightSource[];
  getLightSourceMaterialNames(): string[];
  getPower(): number;
}

export interface ShelfUnit extends PieceOfFurniture {
  getShelfElevations(): number[];
  getShelfBoxes(): unknown[];
}
