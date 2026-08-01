/**
 * Port of java.awt.geom.Rectangle2D / Rectangle2D.Float (subset used by
 * Sweet Home 3D). Coordinates are stored as JS numbers but narrowed to float32
 * at construction and mutation (Java uses float fields).
 * GPL v2+, transcribed from the JDK.
 */
import { f32 } from "../util/f32.js";
import { SEG_CLOSE, SEG_LINETO, SEG_MOVETO, type PathIterator } from "./PathIterator.js";
import { AffineTransform } from "./AffineTransform.js";

export class Rect2D {
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

  setRect(x: number, y: number, width: number, height: number): void {
    this.x = f32(x);
    this.y = f32(y);
    this.width = f32(width);
    this.height = f32(height);
  }

  isEmpty(): boolean {
    return this.width <= 0 || this.height <= 0;
  }

  contains(px: number, py: number): boolean {
    if (this.isEmpty()) return false;
    return px >= this.x && px < this.x + this.width && py >= this.y && py < this.y + this.height;
  }

  containsRect(r: Rect2D): boolean {
    return this.contains(r.x, r.y) && this.contains(r.x + r.width, r.y + r.height);
  }

  /** Intersects check with the same semantics as Rectangle2D.intersects. */
  intersects(r: Rect2D): boolean {
    return r.x < this.x + this.width && this.x < r.x + r.width && r.y < this.y + this.height && this.y < r.y + r.height;
  }

  intersectsBounds(x: number, y: number, width: number, height: number): boolean {
    return x < this.x + this.width && this.x < x + width && y < this.y + this.height && this.y < y + height;
  }

  add(x: number, y: number): void {
    if (this.isEmpty()) {
      this.setRect(x, y, 1, 1);
      return;
    }
    let nx1 = Math.min(this.x, x);
    let ny1 = Math.min(this.y, y);
    let nx2 = Math.max(this.x + this.width, x);
    let ny2 = Math.max(this.y + this.height, y);
    this.setRect(nx1, ny1, nx2 - nx1, ny2 - ny1);
  }

  addRect(r: Rect2D): void {
    if (r.isEmpty()) return;
    if (this.isEmpty()) {
      this.setRect(r.x, r.y, r.width, r.height);
      return;
    }
    let nx1 = Math.min(this.x, r.x);
    let ny1 = Math.min(this.y, r.y);
    let nx2 = Math.max(this.x + this.width, r.x + r.width);
    let ny2 = Math.max(this.y + this.height, r.y + r.height);
    this.setRect(nx1, ny1, nx2 - nx1, ny2 - ny1);
  }

  createUnion(r: Rect2D): Rect2D {
    const out = new Rect2D();
    out.addRect(this);
    out.addRect(r);
    return out;
  }

  createIntersection(r: Rect2D): Rect2D {
    const x1 = Math.max(this.x, r.x);
    const y1 = Math.max(this.y, r.y);
    const x2 = Math.min(this.x + this.width, r.x + r.width);
    const y2 = Math.min(this.y + this.height, r.y + r.height);
    return new Rect2D(x1, y1, Math.max(0, x2 - x1), Math.max(0, y2 - y1));
  }

  getBounds2D(): Rect2D {
    return new Rect2D(this.x, this.y, this.width, this.height);
  }

  getMaxX(): number {
    return this.x + this.width;
  }

  getMaxY(): number {
    return this.y + this.height;
  }

  getMinX(): number {
    return this.x;
  }

  getMinY(): number {
    return this.y;
  }

  getPathIterator(transform: AffineTransform | null): PathIterator {
    return new Rect2DIterator(this, transform);
  }

  clone(): Rect2D {
    return new Rect2D(this.x, this.y, this.width, this.height);
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof Rect2D)) return false;
    return this.x === obj.x && this.y === obj.y && this.width === obj.width && this.height === obj.height;
  }
}

class Rect2DIterator implements PathIterator {
  private index = 0;
  private readonly coords = [0, 0];

  constructor(
    private readonly rect: Rect2D,
    private readonly transform: AffineTransform | null,
  ) {}

  currentSegment(out: number[]): number {
    switch (this.index) {
      case 0: {
        this.coords[0] = this.rect.x;
        this.coords[1] = this.rect.y;
        return this.emit(SEG_MOVETO, out);
      }
      case 1: {
        this.coords[0] = this.rect.x + this.rect.width;
        this.coords[1] = this.rect.y;
        return this.emit(SEG_LINETO, out);
      }
      case 2: {
        this.coords[0] = this.rect.x + this.rect.width;
        this.coords[1] = this.rect.y + this.rect.height;
        return this.emit(SEG_LINETO, out);
      }
      case 3: {
        this.coords[0] = this.rect.x;
        this.coords[1] = this.rect.y + this.rect.height;
        return this.emit(SEG_LINETO, out);
      }
      case 4:
        return SEG_CLOSE;
      default:
        throw new Error("rect iterator exhausted");
    }
  }

  private emit(type: number, out: number[]): number {
    if (this.transform !== null) {
      this.transform.transformCoords(this.coords, 1);
    }
    out[0] = this.coords[0];
    out[1] = this.coords[1];
    return type;
  }

  next(): void {
    this.index += 1;
  }

  isDone(): boolean {
    return this.index > 4;
  }

  getWindingRule(): number {
    return 0; // WIND_EVEN_ODD
  }
}
