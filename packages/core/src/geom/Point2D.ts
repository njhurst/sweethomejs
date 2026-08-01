/**
 * Port of java.awt.geom.Point2D / Point2D.Float (subset used by Sweet Home 3D).
 * GPL v2+, transcribed from the JDK.
 */

export class Point2D {
  constructor(
    public x: number,
    public y: number,
  ) {}

  setLocation(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** Squared distance between (x1,y1) and (x2,y2), like Point2D.distanceSq. */
  static distanceSq(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Point2D.distanceSq(x1, y1, x2, y2));
  }

  distanceSq(px: number, py: number): number {
    return Point2D.distanceSq(this.x, this.y, px, py);
  }

  distance(px: number, py: number): number {
    return Math.sqrt(this.distanceSq(px, py));
  }

  clone(): Point2D {
    return new Point2D(this.x, this.y);
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof Point2D)) return false;
    return this.x === obj.x && this.y === obj.y;
  }
}

export class Point2DFloat extends Point2D {
  constructor(x = 0, y = 0) {
    super(x, y);
  }

  override clone(): Point2DFloat {
    return new Point2DFloat(this.x, this.y);
  }
}
