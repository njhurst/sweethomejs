/**
 * Port of java.awt.geom.Line2D / Line2D.Float (subset used by Sweet Home 3D).
 * GPL v2+, transcribed from the JDK.
 */
import { f32 } from "../util/f32.js";
import { AffineTransform } from "./AffineTransform.js";
import { SEG_LINETO, SEG_MOVETO, type PathIterator } from "./PathIterator.js";
import { Rect2D } from "./Rect2D.js";

export class Line2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
    this.x1 = f32(x1);
    this.y1 = f32(y1);
    this.x2 = f32(x2);
    this.y2 = f32(y2);
  }

  setLine(x1: number, y1: number, x2: number, y2: number): void {
    this.x1 = f32(x1);
    this.y1 = f32(y1);
    this.x2 = f32(x2);
    this.y2 = f32(y2);
  }

  getX1(): number {
    return this.x1;
  }

  getY1(): number {
    return this.y1;
  }

  getX2(): number {
    return this.x2;
  }

  getY2(): number {
    return this.y2;
  }

  /** Distance from a point to the segment, like Line2D.ptSegDist. */
  ptSegDist(px: number, py: number): number {
    return Math.sqrt(this.ptSegDistSq(px, py));
  }

  ptSegDistSq(px: number, py: number): number {
    // Port of the JDK Line2D.ptSegDistSq algorithm.
    const x1 = this.x1;
    const y1 = this.y1;
    const x2 = this.x2;
    const y2 = this.y2;
    let dx = x2 - x1;
    let dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const x = x1 + t * dx;
    const y = y1 + t * dy;
    return (px - x) * (px - x) + (py - y) * (py - y);
  }

  /** Lines have no interior; contains() always returns false like the JDK. */
  contains(px: number, py: number): boolean {
    return false;
  }

  /**
   * True if this segment intersects the given rectangle, like
   * Line2D.intersects(Rectangle2D). Port of the JDK's Cohen-Sutherland
   * outcode-based algorithm.
   */
  intersects(x: number, y: number, width: number, height: number): boolean {
    const rx1 = x;
    const ry1 = y;
    const rx2 = x + width;
    const ry2 = y + height;
    let x1 = this.x1;
    let y1 = this.y1;
    const x2 = this.x2;
    const y2 = this.y2;
    // OUT_LEFT=1, OUT_TOP=2, OUT_RIGHT=4, OUT_BOTTOM=8
    const outcode = (px: number, py: number): number => {
      let out = 0;
      if (px < rx1) out |= 1;
      else if (px > rx2) out |= 4;
      if (py < ry1) out |= 2;
      else if (py > ry2) out |= 8;
      return out;
    };
    let out1 = outcode(x1, y1);
    let out2 = outcode(x2, y2);
    for (;;) {
      if (out2 === 0) return true; // endpoint 2 inside
      if ((out1 & out2) !== 0) return false; // both on same side
      if (out1 === 0) {
        // Swap so out1 is the outside endpoint.
        [out1, out2] = [out2, out1];
        [x1, y1] = [x2, y2];
      }
      // Clip the outside endpoint to the rectangle boundary.
      if ((out1 & 1) !== 0) {
        const t = (rx1 - x1) / (x2 - x1);
        y1 += t * (y2 - y1);
        x1 = rx1;
      } else if ((out1 & 4) !== 0) {
        const t = (rx2 - x1) / (x2 - x1);
        y1 += t * (y2 - y1);
        x1 = rx2;
      } else if ((out1 & 2) !== 0) {
        const t = (ry1 - y1) / (y2 - y1);
        x1 += t * (x2 - x1);
        y1 = ry1;
      } else {
        const t = (ry2 - y1) / (y2 - y1);
        x1 += t * (x2 - x1);
        y1 = ry2;
      }
      out1 = outcode(x1, y1);
    }
  }

  intersectsRect(r: Rect2D): boolean {
    return this.intersects(r.x, r.y, r.width, r.height);
  }

  /** True if two segments intersect, like Line2D.linesIntersect. */
  static linesIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    return (
      (relativeCCW(x1, y1, x2, y2, x3, y3) * relativeCCW(x1, y1, x2, y2, x4, y4) <= 0) &&
      (relativeCCW(x3, y3, x4, y4, x1, y1) * relativeCCW(x3, y3, x4, y4, x2, y2) <= 0)
    );
  }

  getBounds2D(): Rect2D {
    const x = Math.min(this.x1, this.x2);
    const y = Math.min(this.y1, this.y2);
    return new Rect2D(x, y, Math.abs(this.x2 - this.x1), Math.abs(this.y2 - this.y1));
  }

  getPathIterator(transform: AffineTransform | null): PathIterator {
    return new LineIterator(this, transform);
  }

  clone(): Line2D {
    return new Line2D(this.x1, this.y1, this.x2, this.y2);
  }
}

/** Port of the JDK's relativeCCW (which side of a directed line a point is on). */
function relativeCCW(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
  x2 -= x1;
  y2 -= y1;
  px -= x1;
  py -= y1;
  let ccw = px * y2 - py * x2;
  if (ccw === 0) {
    ccw = px * x2 + py * y2;
    if (ccw > 0) {
      px -= x2;
      py -= y2;
      ccw = px * x2 + py * y2;
      if (ccw < 0) ccw = 0;
    }
  }
  return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
}

class LineIterator implements PathIterator {
  private index = 0;

  constructor(
    private readonly line: Line2D,
    private readonly transform: AffineTransform | null,
  ) {}

  currentSegment(out: number[]): number {
    const coords = [0, 0];
    if (this.index === 0) {
      coords[0] = this.line.x1;
      coords[1] = this.line.y1;
    } else if (this.index === 1) {
      coords[0] = this.line.x2;
      coords[1] = this.line.y2;
    }
    if (this.transform !== null) {
      this.transform.transformCoords(coords, 1);
    }
    out[0] = coords[0];
    out[1] = coords[1];
    return this.index === 0 ? SEG_MOVETO : SEG_LINETO;
  }

  next(): void {
    this.index += 1;
  }

  isDone(): boolean {
    return this.index > 1;
  }

  getWindingRule(): number {
    return 0;
  }
}
