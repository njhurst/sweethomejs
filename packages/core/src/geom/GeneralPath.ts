/**
 * Port of java.awt.geom.GeneralPath (subset used by Sweet Home 3D).
 *
 * Segments are stored as a compact array so geometry math (wall outlines,
 * room areas, plan rendering) can consume them without a DOM dependency.
 * Winding rule is WIND_NON_ZERO, matching GeneralPath's default.
 * GPL v2+, transcribed from the JDK.
 */
import { f32 } from "../util/f32.js";
import { AffineTransform } from "./AffineTransform.js";
import {
  SEG_CLOSE,
  SEG_CUBICTO,
  SEG_LINETO,
  SEG_MOVETO,
  SEG_QUADTO,
  WIND_NON_ZERO,
  type PathIterator,
} from "./PathIterator.js";
import { Rect2D } from "./Rect2D.js";

type Segment =
  | { type: typeof SEG_MOVETO; x: number; y: number }
  | { type: typeof SEG_LINETO; x: number; y: number }
  | { type: typeof SEG_QUADTO; x1: number; y1: number; x2: number; y2: number }
  | { type: typeof SEG_CUBICTO; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
  | { type: typeof SEG_CLOSE };

export class GeneralPath {
  private segments: Segment[] = [];
  private currentX = 0;
  private currentY = 0;

  moveTo(x: number, y: number): void {
    this.currentX = f32(x);
    this.currentY = f32(y);
    this.segments.push({ type: SEG_MOVETO, x: this.currentX, y: this.currentY });
  }

  lineTo(x: number, y: number): void {
    this.currentX = f32(x);
    this.currentY = f32(y);
    this.segments.push({ type: SEG_LINETO, x: this.currentX, y: this.currentY });
  }

  quadTo(x1: number, y1: number, x2: number, y2: number): void {
    this.segments.push({
      type: SEG_QUADTO,
      x1: f32(x1),
      y1: f32(y1),
      x2: f32(x2),
      y2: f32(y2),
    });
    this.currentX = f32(x2);
    this.currentY = f32(y2);
  }

  curveTo(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
    this.segments.push({
      type: SEG_CUBICTO,
      x1: f32(x1),
      y1: f32(y1),
      x2: f32(x2),
      y2: f32(y2),
      x3: f32(x3),
      y3: f32(y3),
    });
    this.currentX = f32(x3);
    this.currentY = f32(y3);
  }

  closePath(): void {
    this.segments.push({ type: SEG_CLOSE });
  }

  getCurrentPoint(): { x: number; y: number } | null {
    if (this.segments.length === 0) return null;
    return { x: this.currentX, y: this.currentY };
  }

  reset(): void {
    this.segments = [];
    this.currentX = 0;
    this.currentY = 0;
  }

  getSegmentCount(): number {
    return this.segments.length;
  }

  getSegments(): readonly Segment[] {
    return this.segments;
  }

  /**
   * Appends a shape's segments, like GeneralPath.append(Shape, boolean).
   * If `connect` is true, the first point of the appended shape is connected
   * to the current point with a line segment (when they differ).
   */
  append(shape: { getPathIterator(t: AffineTransform | null): PathIterator }, connect: boolean): void {
    const iterator = shape.getPathIterator(null);
    const coords = new Array<number>(6).fill(0);
    let moveIndex = 0;
    while (!iterator.isDone()) {
      const type = iterator.currentSegment(coords);
      switch (type) {
        case SEG_MOVETO:
          if (connect && this.segments.length > 0) {
            // Java converts the first MOVETO of the appended shape to a LINETO
            // only when its point differs from the current point.
            if (this.currentX !== coords[0] || this.currentY !== coords[1]) {
              this.lineTo(coords[0]!, coords[1]!);
            }
          } else {
            this.moveTo(coords[0]!, coords[1]!);
          }
          moveIndex = this.segments.length;
          break;
        case SEG_LINETO:
          this.lineTo(coords[0]!, coords[1]!);
          break;
        case SEG_QUADTO:
          this.quadTo(coords[0]!, coords[1]!, coords[2]!, coords[3]!);
          break;
        case SEG_CUBICTO:
          this.curveTo(coords[0]!, coords[1]!, coords[2]!, coords[3]!, coords[4]!, coords[5]!);
          break;
        case SEG_CLOSE:
          this.closePath();
          break;
      }
      iterator.next();
    }
    void moveIndex;
  }

  getPathIterator(transform: AffineTransform | null): PathIterator {
    return new GeneralPathIterator(this, transform);
  }

  getBounds2D(): Rect2D {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const segment of this.segments) {
      if (segment.type === SEG_CLOSE) continue;
      const xs = segment.type === SEG_CUBICTO ? [segment.x1, segment.x2, segment.x3] : segment.type === SEG_QUADTO ? [segment.x1, segment.x2] : [segment.x];
      const ys = segment.type === SEG_CUBICTO ? [segment.y1, segment.y2, segment.y3] : segment.type === SEG_QUADTO ? [segment.y1, segment.y2] : [segment.y];
      for (let i = 0; i < xs.length; i++) {
        const x = xs[i] as number;
        const y = ys[i] as number;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (!Number.isFinite(minX)) {
      return new Rect2D();
    }
    return new Rect2D(minX, minY, maxX - minX, maxY - minY);
  }

  /**
   * Point-in-shape test using the non-zero winding rule (GeneralPath default).
   */
  contains(px: number, py: number): boolean {
    let winding = 0;
    let lastMove: { x: number; y: number } | null = null;
    let start: { x: number; y: number } | null = null;
    for (const segment of this.segments) {
      switch (segment.type) {
        case SEG_MOVETO:
          start = { x: segment.x, y: segment.y };
          lastMove = start;
          break;
        case SEG_LINETO:
          if (start !== null) {
            winding += crossWinding(start.x, start.y, segment.x, segment.y, px, py);
            start = { x: segment.x, y: segment.y };
          }
          break;
        case SEG_CLOSE:
          if (start !== null && lastMove !== null) {
            winding += crossWinding(start.x, start.y, lastMove.x, lastMove.y, px, py);
          }
          start = null;
          break;
        default:
          // Quadratic/cubic segments are flattened by the model before
          // contains() is used; treat as line to current point.
          if (start !== null) {
            const end = segment.type === SEG_QUADTO ? { x: segment.x2, y: segment.y2 } : { x: segment.x3, y: segment.y3 };
            winding += crossWinding(start.x, start.y, end.x, end.y, px, py);
            start = end;
          }
      }
    }
    return winding !== 0;
  }

  clone(): GeneralPath {
    const copy = new GeneralPath();
    for (const segment of this.segments) {
      switch (segment.type) {
        case SEG_MOVETO:
          copy.moveTo(segment.x, segment.y);
          break;
        case SEG_LINETO:
          copy.lineTo(segment.x, segment.y);
          break;
        case SEG_QUADTO:
          copy.quadTo(segment.x1, segment.y1, segment.x2, segment.y2);
          break;
        case SEG_CUBICTO:
          copy.curveTo(segment.x1, segment.y1, segment.x2, segment.y2, segment.x3, segment.y3);
          break;
        case SEG_CLOSE:
          copy.closePath();
          break;
      }
    }
    return copy;
  }
}

function crossWinding(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
  // Standard even-odd/non-zero ray cast contribution.
  if (y1 <= py === y2 <= py) return 0;
  const xIntersect = x1 + ((py - y1) * (x2 - x1)) / (y2 - y1);
  if (xIntersect > px) {
    return y2 > y1 ? 1 : -1;
  }
  return 0;
}

class GeneralPathIterator implements PathIterator {
  private index = 0;
  private readonly coords = new Array<number>(6).fill(0);

  constructor(
    private readonly path: GeneralPath,
    private readonly transform: AffineTransform | null,
  ) {}

  currentSegment(out: number[]): number {
    const segment = this.path.getSegments()[this.index];
    if (segment === undefined) {
      throw new Error("path iterator exhausted");
    }
    switch (segment.type) {
      case SEG_MOVETO:
      case SEG_LINETO: {
        out[0] = segment.x;
        out[1] = segment.y;
        break;
      }
      case SEG_QUADTO: {
        out[0] = segment.x1;
        out[1] = segment.y1;
        out[2] = segment.x2;
        out[3] = segment.y2;
        break;
      }
      case SEG_CUBICTO: {
        out[0] = segment.x1;
        out[1] = segment.y1;
        out[2] = segment.x2;
        out[3] = segment.y2;
        out[4] = segment.x3;
        out[5] = segment.y3;
        break;
      }
      case SEG_CLOSE:
        return SEG_CLOSE;
    }
    if (this.transform !== null) {
      const count = segment.type === SEG_QUADTO ? 2 : segment.type === SEG_CUBICTO ? 3 : 1;
      this.transform.transformCoords(out, count);
    }
    return segment.type;
  }

  next(): void {
    this.index += 1;
  }

  isDone(): boolean {
    return this.index >= this.path.getSegmentCount();
  }

  getWindingRule(): number {
    return WIND_NON_ZERO;
  }
}
