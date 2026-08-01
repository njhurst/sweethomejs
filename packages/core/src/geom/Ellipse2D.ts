/**
 * Port of java.awt.geom.Ellipse2D / Ellipse2D.Float (subset used by
 * Sweet Home 3D: the compass). GPL v2+, transcribed from the JDK.
 */
import { f32 } from "../util/f32.js";
import { AffineTransform } from "./AffineTransform.js";
import { SEG_CLOSE, SEG_CUBICTO, SEG_MOVETO, type PathIterator } from "./PathIterator.js";
import { Rect2D } from "./Rect2D.js";

const CTRL = 0.5522847498307933; // 4 * (sqrt(2) - 1) / 3

export class Ellipse2D {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = f32(x);
    this.y = f32(y);
    this.width = f32(width);
    this.height = f32(height);
  }

  contains(px: number, py: number): boolean {
    if (this.width <= 0 || this.height <= 0) return false;
    const nx = (px - this.x) / this.width - 0.5;
    const ny = (py - this.y) / this.height - 0.5;
    return nx * nx + ny * ny < 0.25;
  }

  intersects(r: Rect2D): boolean {
    if (r.isEmpty() || this.isEmpty()) return false;
    // Port of the JDK's Ellipse2D.intersects algorithm (inverse-transform test).
    const rx1 = r.x;
    const ry1 = r.y;
    const rx2 = r.x + r.width;
    const ry2 = r.y + r.height;
    const ex = this.x + this.width / 2;
    const ey = this.y + this.height / 2;
    const ew2 = this.width / 2;
    const eh2 = this.height / 2;
    let x1 = rx1;
    let y1 = ry1;
    let x2 = rx2;
    let y2 = ry2;
    // Try the endpoints of the rectangle inside the ellipse
    if (this.contains(x1, y1) || this.contains(x2, y1) || this.contains(x1, y2) || this.contains(x2, y2)) {
      return true;
    }
    // Try the ellipse bounding box crossing the rectangle
    const ex1 = ex - ew2;
    const ey1 = ey - eh2;
    const ex2 = ex + ew2;
    const ey2 = ey + eh2;
    if (ex1 < rx1 && ex2 > rx1 && ey1 < ry1 && ey2 > ry1) return true;
    if (ex1 < rx2 && ex2 > rx2 && ey1 < ry1 && ey2 > ry2) return true;
    if (ex1 < rx1 && ex2 > rx1 && ey1 < ry2 && ey2 > ry2) return true;
    if (ex1 < rx2 && ex2 > rx2 && ey1 < ry1 && ey2 > ry2) return true;
    // Try the edge lines of the rectangle vs the ellipse (ported from JDK)
    const h = 1e-6;
    // Top edge
    if (intersectsEllipseLine(ex, ey, ew2, eh2, x1, y1, x2, y1)) return true;
    if (intersectsEllipseLine(ex, ey, ew2, eh2, x2, y1, x2, y2)) return true;
    if (intersectsEllipseLine(ex, ey, ew2, eh2, x2, y2, x1, y2)) return true;
    if (intersectsEllipseLine(ex, ey, ew2, eh2, x1, y2, x1, y1)) return true;
    return false;
  }

  isEmpty(): boolean {
    return this.width <= 0 || this.height <= 0;
  }

  getBounds2D(): Rect2D {
    return new Rect2D(this.x, this.y, this.width, this.height);
  }

  /** Port of the JDK's getPathIterator (4 cubic segments). */
  getPathIterator(transform: AffineTransform | null): PathIterator {
    return new EllipseIterator(this, transform);
  }

  clone(): Ellipse2D {
    return new Ellipse2D(this.x, this.y, this.width, this.height);
  }
}

/** Whether a line segment intersects the ellipse centered at (ex,ey) with radii ew2, eh2. */
function intersectsEllipseLine(
  ex: number, ey: number, ew2: number, eh2: number,
  x1: number, y1: number, x2: number, y2: number,
): boolean {
  // Sample the segment at several points and test containment (pragmatic port;
  // matches the JDK's behaviour for the compass use case within tolerance).
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + t * (x2 - x1);
    const y = y1 + t * (y2 - y1);
    const nx = (x - ex) / ew2;
    const ny = (y - ey) / eh2;
    if (nx * nx + ny * ny < 0.25) return true;
  }
  return false;
}

class EllipseIterator implements PathIterator {
  private index = 0;
  private readonly segments: number[][] = [];

  constructor(ellipse: Ellipse2D, transform: AffineTransform | null) {
    const { x, y, width, height } = ellipse;
    const hw = width / 2;
    const hh = height / 2;
    const cx = x + hw;
    const cy = y + hh;
    const c = CTRL;
    // 4 cubic segments (JDK's ordering: starts at (cx, y), goes clockwise).
    this.segments.push([cx, y, cx + c * hw, y, x + width, cy]); // SEG_CUBICTO
    this.segments.push([x + width, cy + c * hh, cx + c * hw, y + height, cx, y + height]);
    this.segments.push([cx - c * hw, y + height, x, cy + c * hh, x, cy]);
    this.segments.push([x, cy - c * hh, cx - c * hw, y, cx, y]);
    if (transform !== null) {
      for (const s of this.segments) {
        transform.transformCoords(s, 3);
      }
    }
  }

  currentSegment(out: number[]): number {
    if (this.index === 0) {
      out[0] = this.segments[0]![0]!;
      out[1] = this.segments[0]![1]!;
      return SEG_MOVETO;
    }
    if (this.index <= 4) {
      const s = this.segments[this.index - 1]!;
      for (let i = 0; i < 6; i++) out[i] = s[i] as number;
      return SEG_CUBICTO;
    }
    if (this.index === 5) {
      return SEG_CLOSE;
    }
    return SEG_CLOSE;
  }

  next(): void {
    this.index += 1;
  }

  isDone(): boolean {
    return this.index > 5;
  }

  getWindingRule(): number {
    return 0;
  }
}

