/**
 * Port of com.eteks.sweethome3d.model.Selectable (GPL v2+).
 */

/** An object that can be selected on the plan. */
export interface Selectable {
  /** Returns the outline points of this object as float [][2]. */
  getPoints(): number[][];
  /** True if the object intersects the rectangle with opposite corners (x0,y0)-(x1,y1). */
  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean;
  /** True if the object contains the point (x, y) within the given margin. */
  containsPoint(x: number, y: number, margin: number): boolean;
  move(dx: number, dy: number): void;
  clone(): Selectable;
}
