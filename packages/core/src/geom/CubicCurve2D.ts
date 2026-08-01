/**
 * Port of java.awt.geom.CubicCurve2D / CubicCurve2D.Float (subset used by
 * Sweet Home 3D: wall arc geometry). GPL v2+, transcribed from the JDK.
 */
import { f32 } from "../util/f32.js";
import { SEG_CUBICTO, SEG_MOVETO, type PathIterator } from "./PathIterator.js";
import { Rect2D } from "./Rect2D.js";

export class CubicCurve2D {
  x1: number;
  y1: number;
  ctrlx1: number;
  ctrly1: number;
  ctrlx2: number;
  ctrly2: number;
  x2: number;
  y2: number;

  constructor(x1 = 0, y1 = 0, ctrlx1 = 0, ctrly1 = 0, ctrlx2 = 0, ctrly2 = 0, x2 = 0, y2 = 0) {
    this.x1 = f32(x1);
    this.y1 = f32(y1);
    this.ctrlx1 = f32(ctrlx1);
    this.ctrly1 = f32(ctrly1);
    this.ctrlx2 = f32(ctrlx2);
    this.ctrly2 = f32(ctrly2);
    this.x2 = f32(x2);
    this.y2 = f32(y2);
  }

  setCurve(x1: number, y1: number, ctrlx1: number, ctrly1: number, ctrlx2: number, ctrly2: number, x2: number, y2: number): void {
    this.x1 = f32(x1);
    this.y1 = f32(y1);
    this.ctrlx1 = f32(ctrlx1);
    this.ctrly1 = f32(ctrly1);
    this.ctrlx2 = f32(ctrlx2);
    this.ctrly2 = f32(ctrly2);
    this.x2 = f32(x2);
    this.y2 = f32(y2);
  }

  getBounds2D(): Rect2D {
    const x = Math.min(this.x1, this.ctrlx1, this.ctrlx2, this.x2);
    const y = Math.min(this.y1, this.ctrly1, this.ctrly2, this.y2);
    const w = Math.max(this.x1, this.ctrlx1, this.ctrlx2, this.x2) - x;
    const h = Math.max(this.y1, this.ctrly1, this.ctrly2, this.y2) - y;
    return new Rect2D(x, y, w, h);
  }

  /** Flattens the curve into line segments, like CubicCurve2D.getPathIterator with flatness. */
  flatten(flatness = 1): Array<[number, number]> {
    // Adaptive recursive subdivision (De Casteljau), like the JDK's FlatteningPathIterator.
    const points: Array<[number, number]> = [];
    this.subdivideRecursive(flatness, points);
    return points;
  }

  private subdivideRecursive(flatness: number, out: Array<[number, number]>): void {
    // Check flatness: if the control points are close enough to the chord,
    // emit the chord.
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    const len2 = dx * dx + dy * dy;
    let flat = true;
    if (len2 > 1e-12) {
      const d1 = Math.abs((this.ctrlx1 - this.x2) * dy - (this.ctrly1 - this.y2) * dx) / Math.sqrt(len2);
      const d2 = Math.abs((this.ctrlx2 - this.x2) * dy - (this.ctrly2 - this.y2) * dx) / Math.sqrt(len2);
      flat = d1 <= flatness && d2 <= flatness;
    } else {
      flat =
        Math.abs(this.ctrlx1 - this.x1) <= flatness &&
        Math.abs(this.ctrly1 - this.y1) <= flatness &&
        Math.abs(this.ctrlx2 - this.x1) <= flatness &&
        Math.abs(this.ctrly2 - this.y1) <= flatness;
    }
    if (flat) {
      out.push([this.x2, this.y2]);
      return;
    }
    // De Casteljau subdivision at t = 0.5
    const c01x = (this.x1 + this.ctrlx1) / 2;
    const c01y = (this.y1 + this.ctrly1) / 2;
    const c12x = (this.ctrlx1 + this.ctrlx2) / 2;
    const c12y = (this.ctrly1 + this.ctrly2) / 2;
    const c23x = (this.ctrlx2 + this.x2) / 2;
    const c23y = (this.ctrly2 + this.y2) / 2;
    const c012x = (c01x + c12x) / 2;
    const c012y = (c01y + c12y) / 2;
    const c123x = (c12x + c23x) / 2;
    const c123y = (c12y + c23y) / 2;
    const c0123x = (c012x + c123x) / 2;
    const c0123y = (c012y + c123y) / 2;
    const left = new CubicCurve2D(this.x1, this.y1, c01x, c01y, c012x, c012y, c0123x, c0123y);
    const right = new CubicCurve2D(c0123x, c0123y, c123x, c123y, c23x, c23y, this.x2, this.y2);
    left.subdivideRecursive(flatness, out);
    right.subdivideRecursive(flatness, out);
  }

  getPathIterator(): PathIterator {
    const self = this;
    let index = 0;
    return {
      currentSegment(out: number[]): number {
        if (index === 0) {
          out[0] = self.x1;
          out[1] = self.y1;
          return SEG_MOVETO;
        }
        out[0] = self.ctrlx1;
        out[1] = self.ctrly1;
        out[2] = self.ctrlx2;
        out[3] = self.ctrly2;
        out[4] = self.x2;
        out[5] = self.y2;
        return SEG_CUBICTO;
      },
      next(): void {
        index += 1;
      },
      isDone(): boolean {
        return index > 1;
      },
      getWindingRule(): number {
        return 0;
      },
    };
  }
}
