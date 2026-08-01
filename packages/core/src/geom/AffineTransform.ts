/**
 * Port of java.awt.geom.AffineTransform (subset used by Sweet Home 3D).
 *
 * The matrix layout matches the JDK: entries m00, m10, m01, m11, m02, m12 with
 *   [ m00 m01 m02 ]
 *   [ m10 m11 m12 ]
 *   [  0   0   1  ]
 * A point transform is x' = m00*x + m01*y + m02; y' = m10*x + m11*y + m12.
 * GPL v2+, transcribed from the JDK.
 */
import { f32 } from "../util/f32.js";
import type { PathIterator } from "./PathIterator.js";
import { Point2D } from "./Point2D.js";
import { Rect2D } from "./Rect2D.js";
import { GeneralPath } from "./GeneralPath.js";

export class AffineTransform {
  private m00: number;
  private m10: number;
  private m01: number;
  private m11: number;
  private m02: number;
  private m12: number;

  constructor(
    m00 = 1,
    m10 = 0,
    m01 = 0,
    m11 = 1,
    m02 = 0,
    m12 = 0,
  ) {
    this.m00 = m00;
    this.m10 = m10;
    this.m01 = m01;
    this.m11 = m11;
    this.m02 = m02;
    this.m12 = m12;
  }

  static getTranslateInstance(tx: number, ty: number): AffineTransform {
    return new AffineTransform(1, 0, 0, 1, tx, ty);
  }

  static getScaleInstance(sx: number, sy: number): AffineTransform {
    return new AffineTransform(sx, 0, 0, sy, 0, 0);
  }

  static getRotateInstance(theta: number, x?: number, y?: number): AffineTransform {
    const sin = Math.sin(theta);
    const cos = Math.cos(theta);
    let base: AffineTransform;
    if (Math.abs(sin) < 1e-15) {
      // Exact for multiples of 90 degrees, matching the JDK's lookup
      base = cos > 0 ? new AffineTransform(1, 0, 0, 1, 0, 0) : new AffineTransform(-1, 0, 0, -1, 0, 0);
    } else if (Math.abs(cos) < 1e-15) {
      base = sin > 0 ? new AffineTransform(0, 1, -1, 0, 0, 0) : new AffineTransform(0, -1, 1, 0, 0, 0);
    } else {
      base = new AffineTransform(cos, sin, -sin, cos, 0, 0);
    }
    if (x === undefined || y === undefined) {
      return base;
    }
    // Rotation around (x, y): translate(x,y) · rotate · translate(-x,-y)
    const tx = new AffineTransform(1, 0, 0, 1, x, y);
    tx.concatenate(base);
    tx.concatenate(new AffineTransform(1, 0, 0, 1, -x, -y));
    return tx;
  }

  getScaleX(): number {
    return this.m00;
  }

  getScaleY(): number {
    return this.m11;
  }

  getTranslateX(): number {
    return this.m02;
  }

  getTranslateY(): number {
    return this.m12;
  }

  getShearX(): number {
    return this.m01;
  }

  getShearY(): number {
    return this.m10;
  }

  /** this = this · tx (like JDK concatenate). */
  concatenate(tx: AffineTransform): void {
    const { m00, m01, m02, m10, m11, m12 } = this;
    const { m00: t00, m01: t01, m02: t02, m10: t10, m11: t11, m12: t12 } = tx;
    this.m00 = m00 * t00 + m01 * t10;
    this.m10 = m10 * t00 + m11 * t10;
    this.m01 = m00 * t01 + m01 * t11;
    this.m11 = m10 * t01 + m11 * t11;
    this.m02 = m00 * t02 + m01 * t12 + m02;
    this.m12 = m10 * t02 + m11 * t12 + m12;
  }

  /** this = tx · this (like JDK preConcatenate). */
  preConcatenate(tx: AffineTransform): void {
    const { m00, m01, m02, m10, m11, m12 } = this;
    const { m00: t00, m01: t01, m02: t02, m10: t10, m11: t11, m12: t12 } = tx;
    this.m00 = t00 * m00 + t01 * m10;
    this.m10 = t10 * m00 + t11 * m10;
    this.m01 = t00 * m01 + t01 * m11;
    this.m11 = t10 * m01 + t11 * m11;
    this.m02 = t00 * m02 + t01 * m12 + t02;
    this.m12 = t10 * m02 + t11 * m12 + t12;
  }

  scale(sx: number, sy: number): void {
    this.concatenate(AffineTransform.getScaleInstance(sx, sy));
  }

  translate(tx: number, ty: number): void {
    this.concatenate(AffineTransform.getTranslateInstance(tx, ty));
  }

  rotate(theta: number): void {
    this.concatenate(AffineTransform.getRotateInstance(theta));
  }

  transform(p: Point2D): Point2D {
    const x = p.x;
    const y = p.y;
    p.x = this.m00 * x + this.m01 * y + this.m02;
    p.y = this.m10 * x + this.m11 * y + this.m12;
    return p;
  }

  transformPoint(x: number, y: number): { x: number; y: number } {
    return {
      x: this.m00 * x + this.m01 * y + this.m02,
      y: this.m10 * x + this.m11 * y + this.m12,
    };
  }

  /** Transforms an array of [x0, y0, x1, y1, ...] in place (like JDK transform(double[],int,double[],int,int)). */
  transformCoords(src: number[], count: number, dst: number[] = src): void {
    for (let i = 0; i < count; i++) {
      const x = src[i * 2]!;
      const y = src[i * 2 + 1]!;
      dst[i * 2] = this.m00 * x + this.m01 * y + this.m02;
      dst[i * 2 + 1] = this.m10 * x + this.m11 * y + this.m12;
    }
  }

  inverseTransform(p: Point2D): Point2D {
    const x = p.x;
    const y = p.y;
    const det = this.m00 * this.m11 - this.m01 * this.m10;
    if (det === 0) throw new Error("Determinant is zero");
    const x0 = (this.m11 * x - this.m01 * y - this.m11 * this.m02 + this.m01 * this.m12) / det;
    const y0 = (this.m10 * x - this.m00 * y + this.m00 * this.m12 - this.m10 * this.m02) / det;
    p.x = x0;
    p.y = y0;
    return p;
  }

  createInverse(): AffineTransform {
    const det = this.m00 * this.m11 - this.m01 * this.m10;
    if (det === 0) throw new Error("Determinant is zero");
    return new AffineTransform(
      this.m11 / det,
      -this.m10 / det,
      -this.m01 / det,
      this.m00 / det,
      (this.m01 * this.m12 - this.m11 * this.m02) / det,
      (this.m10 * this.m02 - this.m00 * this.m12) / det,
    );
  }

  /** Applies this transform to every segment of a path (like JDK createTransformedShape). */
  createTransformedShape(shape: { getPathIterator(t: AffineTransform | null): PathIterator }): GeneralPath {
    const iterator = shape.getPathIterator(this);
    const path = new GeneralPath();
    const coords = new Array<number>(6).fill(0);
    while (!iterator.isDone()) {
      switch (iterator.currentSegment(coords)) {
        case 0: // SEG_MOVETO
          path.moveTo(coords[0]!, coords[1]!);
          break;
        case 1: // SEG_LINETO
          path.lineTo(coords[0]!, coords[1]!);
          break;
        case 2: // SEG_QUADTO
          path.quadTo(coords[0]!, coords[1]!, coords[2]!, coords[3]!);
          break;
        case 3: // SEG_CUBICTO
          path.curveTo(coords[0]!, coords[1]!, coords[2]!, coords[3]!, coords[4]!, coords[5]!);
          break;
        case 4: // SEG_CLOSE
          path.closePath();
          break;
      }
      iterator.next();
    }
    return path;
  }

  isIdentity(): boolean {
    return this.m00 === 1 && this.m11 === 1 && this.m01 === 0 && this.m10 === 0 && this.m02 === 0 && this.m12 === 0;
  }

  getBounds2D(rect: Rect2D): Rect2D {
    // Transform the 4 corners and compute the bounding box.
    const corners = [
      this.transformPoint(rect.x, rect.y),
      this.transformPoint(rect.x + rect.width, rect.y),
      this.transformPoint(rect.x, rect.y + rect.height),
      this.transformPoint(rect.x + rect.width, rect.y + rect.height),
    ];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const c of corners) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x);
      maxY = Math.max(maxY, c.y);
    }
    return new Rect2D(f32(minX), f32(minY), f32(maxX - minX), f32(maxY - minY));
  }

  clone(): AffineTransform {
    return new AffineTransform(this.m00, this.m10, this.m01, this.m11, this.m02, this.m12);
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof AffineTransform)) return false;
    return (
      this.m00 === obj.m00 && this.m10 === obj.m10 && this.m01 === obj.m01 &&
      this.m11 === obj.m11 && this.m02 === obj.m02 && this.m12 === obj.m12
    );
  }
}
