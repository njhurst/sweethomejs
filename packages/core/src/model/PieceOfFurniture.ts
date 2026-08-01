/**
 * Port of com.eteks.sweethome3d.model.PieceOfFurniture (GPL v2+).
 */
import type { Content } from "./Content.js";
import type { Level } from "./Level.js";
import type { HomeMaterial, HomeTexture, TextStyle } from "./stubs.js";

export const DEFAULT_CUT_OUT_SHAPE = "M0,0 v1 h1 v-1 z";
export const IDENTITY_ROTATION: number[][] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
export const SHOW_BACK_FACE = 0x01;
export const HIDE_EDGE_COLOR_MATERIAL = 0x02;

/** A piece of furniture, either from a catalog or placed in a home. */
export interface PieceOfFurniture {
  getName(): string | null;
  getDescription(): string | null;
  getInformation(): string | null;
  getLicense(): string | null;
  getDepth(): number;
  getHeight(): number;
  getWidth(): number;
  getElevation(): number;
  getDropOnTopElevation(): number;
  isMovable(): boolean;
  isDoorOrWindow(): boolean;
  getIcon(): Content | null;
  getPlanIcon(): Content | null;
  getModel(): Content | null;
  getModelFlags(): number;
  getModelSize(): number | null;
  getModelRotation(): number[][];
  getStaircaseCutOutShape(): string | null;
  getCreator(): string | null;
  isBackFaceShown(): boolean;
  getColor(): number | null;
  isResizable(): boolean;
  isDeformable(): boolean;
  isWidthDepthDeformable(): boolean;
  isTexturable(): boolean;
  isHorizontallyRotatable(): boolean;
  getPrice(): number | null;
  getValueAddedTaxPercentage(): number | null;
  getCurrency(): string | null;
  getProperty(name: string): string | null;
  getPropertyNames(): string[];
  getContentProperty(name: string): Content | null;
  isContentProperty(name: string): boolean;
  getLevel(): Level | null;
}
