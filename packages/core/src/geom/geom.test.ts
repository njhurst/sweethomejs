/**
 * Tests for the awt.geom shim (task 1.11). Verifies semantics against known
 * Java2D behaviors (values verified with the JDK where noted).
 */
import { describe, expect, it } from "vitest";
import { f32 } from "../util/f32.js";
import {
  AffineTransform,
  Area,
  Ellipse2D,
  GeneralPath,
  Line2D,
  Point2D,
  Rect2D,
  SEG_CLOSE,
  SEG_LINETO,
  SEG_MOVETO,
  type PathIterator,
} from "./index.js";

describe("Point2D", () => {
  it("computes distance and distanceSq like the JDK", () => {
    const p = new Point2D(0, 0);
    expect(p.distanceSq(3, 4)).toBe(25);
    expect(p.distance(3, 4)).toBe(5);
    expect(Point2D.distance(1, 1, 4, 5)).toBe(5);
  });
});

describe("Rect2D", () => {
  it("contains and intersects like Rectangle2D", () => {
    const r = new Rect2D(10, 10, 100, 50);
    expect(r.contains(10, 10)).toBe(true);
    expect(r.contains(109.9, 59.9)).toBe(true);
    expect(r.contains(110, 60)).toBe(false);
    expect(r.intersects(new Rect2D(0, 0, 20, 20))).toBe(true);
    expect(r.intersects(new Rect2D(111, 0, 20, 20))).toBe(false);
    expect(r.intersects(new Rect2D(10, 10, 100, 50))).toBe(true);
  });

  it("isEmpty, add and unions behave like the JDK", () => {
    const empty = new Rect2D(0, 0, -1, 0);
    expect(empty.isEmpty()).toBe(true);
    const r = new Rect2D(0, 0, 10, 10);
    r.add(20, 5);
    expect(r.x).toBe(0);
    expect(r.width).toBe(20); // point (20,5) grows the right edge to 20
    const u = new Rect2D(0, 0, 5, 5).createUnion(new Rect2D(10, 10, 5, 5));
    expect(u.width).toBe(15);
    expect(u.height).toBe(15);
    const i = new Rect2D(0, 0, 10, 10).createIntersection(new Rect2D(5, 5, 10, 10));
    expect(i.x).toBe(5);
    expect(i.width).toBe(5);
  });
});

describe("Line2D", () => {
  it("ptSegDist matches the JDK", () => {
    const line = new Line2D(0, 0, 10, 0);
    expect(line.ptSegDist(5, 3)).toBe(3);
    expect(line.ptSegDist(-5, 0)).toBe(5); // beyond the start
    expect(line.ptSegDist(15, 0)).toBe(5); // beyond the end
    expect(line.ptSegDist(5, 0)).toBe(0);
    expect(f32(line.ptSegDist(2.5, 4))).toBe(f32(4));
  });

  it("linesIntersect matches the JDK", () => {
    expect(Line2D.linesIntersect(0, 0, 10, 10, 0, 10, 10, 0)).toBe(true);
    // (0,5)-(5,5) touches y=x at its endpoint (5,5) — still an intersection.
    expect(Line2D.linesIntersect(0, 0, 10, 10, 0, 5, 5, 5)).toBe(true);
    // y=6 from x=0..4 never reaches the line y=x (x=6 at y=6).
    expect(Line2D.linesIntersect(0, 0, 10, 10, 0, 6, 4, 6)).toBe(false);
  });

  it("intersectsRect behaves like Line2D.intersects(Rectangle2D)", () => {
    const line = new Line2D(0, 0, 10, 10);
    expect(line.intersects(2, 2, 2, 2)).toBe(true);
    expect(line.intersects(20, 20, 2, 2)).toBe(false);
    expect(line.intersects(1, 0, 2, 2)).toBe(true); // line passes through (1,1),(2,2)
    expect(line.intersects(5, 0, 2, 2)).toBe(false); // line is at x<2 within y∈[0,2]
  });
});

describe("Ellipse2D", () => {
  it("contains matches the ellipse equation", () => {
    const e = new Ellipse2D(0, 0, 100, 50);
    expect(e.contains(50, 25)).toBe(true);
    expect(e.contains(1, 25)).toBe(true); // nx² = (0.01-0.5)² = 0.2401 < 0.25
    // Boundary points are NOT contained (strict inequality, like the JDK):
    expect(e.contains(0, 25)).toBe(false);
    expect(e.contains(100.001, 25)).toBe(false);
    expect(e.contains(50, 50.001)).toBe(false);
  });

  it("intersects rectangle", () => {
    const e = new Ellipse2D(0, 0, 100, 50);
    expect(e.intersects(new Rect2D(49, 24, 2, 2))).toBe(true);
    expect(e.intersects(new Rect2D(200, 200, 10, 10))).toBe(false);
  });
});

describe("AffineTransform", () => {
  it("rotate/scale/translate compose like the JDK", () => {
    const t = AffineTransform.getTranslateInstance(10, 20);
    t.rotate(Math.PI / 2);
    const p = t.transformPoint(1, 0);
    // rotate 90° → (0,1) then translate → (10, 21)
    expect(f32(p.x)).toBe(f32(10));
    expect(f32(p.y)).toBe(f32(21));
  });

  it("inverse and concatenate round-trip", () => {
    const t = AffineTransform.getScaleInstance(2, 3);
    t.translate(5, 7);
    const inv = t.createInverse();
    const tp = t.transformPoint(3, 4);
    const p = inv.transformPoint(tp.x, tp.y);
    expect(f32(p.x)).toBe(f32(3));
    expect(f32(p.y)).toBe(f32(4));
  });

  it("createTransformedShape transforms every point", () => {
    const path = new GeneralPath();
    path.moveTo(0, 0);
    path.lineTo(10, 0);
    path.lineTo(10, 10);
    path.closePath();
    const t = AffineTransform.getTranslateInstance(100, 50);
    const transformed = t.createTransformedShape(path);
    const coords: number[] = [];
    const it = transformed.getPathIterator(null);
    const points: number[][] = [];
    while (!it.isDone()) {
      const seg = it.currentSegment(coords);
      if (seg === SEG_MOVETO || seg === SEG_LINETO) {
        points.push([coords[0]!, coords[1]!]);
      }
      it.next();
    }
    expect(points[0]).toEqual([100, 50]);
    expect(points[1]).toEqual([110, 50]);
    expect(points[2]).toEqual([110, 60]);
  });
});

describe("GeneralPath", () => {
  it("iterator emits segments in order", () => {
    const path = new GeneralPath();
    path.moveTo(0, 0);
    path.lineTo(10, 0);
    path.lineTo(10, 10);
    path.closePath();
    const types: number[] = [];
    const it = path.getPathIterator(null);
    while (!it.isDone()) {
      types.push(it.currentSegment([0, 0, 0, 0, 0, 0]));
      it.next();
    }
    expect(types).toEqual([SEG_MOVETO, SEG_LINETO, SEG_LINETO, SEG_CLOSE]);
  });

  it("bounds match the extents", () => {
    const path = new GeneralPath();
    path.moveTo(5, 10);
    path.lineTo(20, 15);
    path.lineTo(0, 30);
    path.closePath();
    const b = path.getBounds2D();
    expect(b.x).toBe(0);
    expect(b.y).toBe(10);
    expect(b.width).toBe(20);
    expect(b.height).toBe(20);
  });

  it("contains uses the non-zero winding rule", () => {
    const path = new GeneralPath();
    path.moveTo(0, 0);
    path.lineTo(10, 0);
    path.lineTo(10, 10);
    path.lineTo(0, 10);
    path.closePath();
    expect(path.contains(5, 5)).toBe(true);
    expect(path.contains(15, 5)).toBe(false);
  });

  it("append(connect) joins shapes", () => {
    const a = new GeneralPath();
    a.moveTo(0, 0);
    a.lineTo(10, 0);
    const b = new GeneralPath();
    b.moveTo(10, 0);
    b.lineTo(10, 10);
    a.append(b, true);
    const types: number[] = [];
    const it = a.getPathIterator(null);
    while (!it.isDone()) {
      types.push(it.currentSegment([0, 0, 0, 0, 0, 0]));
      it.next();
    }
    // Java converts the appended shape's MOVETO to a LINETO when connect=true
    // and the point differs; coincident points are skipped (verified against
    // the JDK: segment types 0 1 1).
    expect(types).toEqual([SEG_MOVETO, SEG_LINETO, SEG_LINETO]);
  });
});

describe("Area", () => {
  it("is singular for a simple rectangle", () => {
    const path = new GeneralPath();
    path.moveTo(0, 0);
    path.lineTo(10, 0);
    path.lineTo(10, 10);
    path.lineTo(0, 10);
    path.closePath();
    const area = new Area(path);
    expect(area.isEmpty()).toBe(false);
    expect(area.isSingular()).toBe(true);
    expect(area.contains(5, 5)).toBe(true);
    expect(area.contains(11, 5)).toBe(false);
  });

  it("is not singular for a self-intersecting bowtie (even-odd)", () => {
    const path = new GeneralPath();
    path.moveTo(0, 0);
    path.lineTo(10, 10);
    path.lineTo(10, 0);
    path.lineTo(0, 10);
    path.closePath();
    const area = new Area(path);
    // Even-odd: the bowtie splits into two disjoint triangles.
    expect(area.isSingular()).toBe(false);
    const polygons = area.getPolygons();
    expect(polygons.length).toBe(2);
    // Each triangle has area 25 (of 50 total in the 10x10 box).
    for (const polygon of polygons) {
      expect(areaOfRing(polygon[0]!)).toBeCloseTo(25, 5);
    }
  });

  it("hole: non-zero winding keeps an inner ring solid (like the JDK)", () => {
    // GeneralPath uses WIND_NON_ZERO: an inner ring drawn in the same
    // direction doubles the winding, so it is NOT a hole (verified against
    // the JDK: contains(5,5)=true, singular=true).
    const outer = new GeneralPath();
    outer.moveTo(0, 0);
    outer.lineTo(10, 0);
    outer.lineTo(10, 10);
    outer.lineTo(0, 10);
    outer.closePath();
    outer.moveTo(4, 4);
    outer.lineTo(6, 4);
    outer.lineTo(6, 6);
    outer.lineTo(4, 6);
    outer.closePath();
    const area = new Area(outer);
    expect(area.contains(5, 5)).toBe(true);
    expect(area.contains(2, 2)).toBe(true);
    expect(area.isSingular()).toBe(true);
  });

  it("even-odd winding treats an inner ring as a hole", () => {
    const outer = new GeneralPath();
    outer.moveTo(0, 0);
    outer.lineTo(10, 0);
    outer.lineTo(10, 10);
    outer.lineTo(0, 10);
    outer.closePath();
    outer.moveTo(4, 4);
    outer.lineTo(6, 4);
    outer.lineTo(6, 6);
    outer.lineTo(4, 6);
    outer.closePath();
    // Wrap the path with an even-odd winding iterator.
    const evenOddShape = {
      getPathIterator(): PathIterator {
        const inner = outer.getPathIterator(null);
        return {
          currentSegment: (out: number[]): number => inner.currentSegment(out),
          next: (): void => inner.next(),
          isDone: (): boolean => inner.isDone(),
          getWindingRule: (): number => 0, // WIND_EVEN_ODD
        };
      },
    };
    const area = new Area(evenOddShape);
    expect(area.contains(5, 5)).toBe(false); // hole
    expect(area.contains(2, 2)).toBe(true);
    expect(area.isSingular()).toBe(false); // hole ⇒ not singular
  });

  it("empty area for degenerate input", () => {
    const path = new GeneralPath();
    path.moveTo(0, 0);
    path.lineTo(1, 1);
    path.closePath();
    const area = new Area(path);
    expect(area.isEmpty()).toBe(true);
  });
});

function areaOfRing(ring: Array<[number, number]>): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    area += a[0] * b[1] - a[1] * b[0];
  }
  return Math.abs(area) / 2;
}
