/**
 * Port of java.awt.geom.Area (polygon subset used by Sweet Home 3D: room
 * area / singularity checks).
 *
 * Java's Area normalizes a shape to its even-odd region: self-intersecting
 * paths are split at crossings and the region covered by an odd number of
 * subpaths is kept. We implement the same for polygonal input:
 *   - simple rings pass through unchanged
 *   - self-intersecting rings are split at segment crossings and the
 *     resulting faces with odd winding are kept (face tracing)
 *   - multiple rings are combined with the even-odd rule via polygon-clipping
 *
 * GPL v2+, behavior transcribed from the JDK Area/Crossings.
 */
import polygonClipping from "polygon-clipping";
import { f32 } from "../util/f32.js";
import { AffineTransform } from "./AffineTransform.js";
import {
  SEG_CLOSE,
  SEG_LINETO,
  SEG_MOVETO,
  WIND_NON_ZERO,
  type PathIterator,
} from "./PathIterator.js";
import { Point2D } from "./Point2D.js";
import { Rect2D } from "./Rect2D.js";

type Pt = [number, number];
/** A normalized area: list of simple polygons; each polygon = [outer, ...holes]. */
export type Polygon = Pt[][];

export class Area {
  private polygons: Polygon[] = [];

  constructor(shape: { getPathIterator(t: AffineTransform | null): PathIterator } | null = null) {
    if (shape !== null) {
      this.polygons = Area.normalizeShape(shape);
    }
  }

  /** Normalizes a shape into simple, non-overlapping polygons (its winding rule). */
  private static normalizeShape(shape: { getPathIterator(t: AffineTransform | null): PathIterator }): Polygon[] {
    const probe = shape.getPathIterator(null);
    const windingRule = probe.getWindingRule();
    const rings = extractRings(shape);
    if (rings.length === 0) {
      return [];
    }
    const simple: Pt[][] = [];
    for (const ring of rings) {
      if (ring.length < 3) continue;
      if (isSimpleRing(ring)) {
        simple.push(ring);
      } else {
        simple.push(...resolveSelfIntersecting(ring, windingRule));
      }
    }
    if (simple.length === 0) {
      return [];
    }
    if (simple.length === 1) {
      return [simple];
    }
    let polygons: Polygon[];
    if (windingRule === WIND_NON_ZERO) {
      // Non-zero winding: every ring is solid; an inner ring drawn in the
      // same direction is covered by its container (matches the JDK's Area).
      polygons = simple.map((ring) => [ring]);
    } else {
      // Even-odd: a ring inside an odd number of other rings is a hole.
      polygons = groupRingsByContainment(simple);
    }
    try {
      const union = polygonClipping.union(polygons[0]!, ...polygons.slice(1)) as unknown as Polygon[];
      return union.length > 0 ? union : polygons;
    } catch {
      // Fall back to the un-merged rings (best effort for degenerate input).
      return polygons;
    }
  }

  /** True if the area is a single simple polygon with no holes. */
  isSingular(): boolean {
    return this.polygons.length === 1 && this.polygons[0]!.length === 1;
  }

  isEmpty(): boolean {
    return this.polygons.length === 0;
  }

  getPolygons(): Polygon[] {
    return this.polygons;
  }

  contains(px: number, py: number): boolean {
    for (const polygon of this.polygons) {
      if (pointInPolygon(px, py, polygon[0]!)) {
        // Holes subtract
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon(px, py, polygon[i]!)) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }

  intersects(r: Rect2D): boolean {
    if (r.isEmpty()) return false;
    // Test rectangle corners inside the area, or any area edge crossing the rect.
    if (
      this.contains(r.x, r.y) ||
      this.contains(r.x + r.width, r.y) ||
      this.contains(r.x, r.y + r.height) ||
      this.contains(r.x + r.width, r.y + r.height)
    ) {
      return true;
    }
    for (const polygon of this.polygons) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i]!;
          const b = ring[(i + 1) % ring.length]!;
          if (segmentIntersectsRect(a[0], a[1], b[0], b[1], r)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getBounds2D(): Rect2D {
    const bounds = new Rect2D();
    let first = true;
    for (const polygon of this.polygons) {
      for (const ring of polygon) {
        for (const p of ring) {
          const x = p[0]!;
          const y = p[1]!;
          if (first) {
            bounds.setRect(x, y, 0, 0);
            first = false;
          } else {
            bounds.add(x, y);
          }
        }
      }
    }
    return bounds;
  }

  getPathIterator(transform: AffineTransform | null): PathIterator {
    return new AreaIterator(this, transform);
  }

  clone(): Area {
    const copy = new Area();
    copy.polygons = this.polygons.map((polygon) => polygon.map((ring) => ring.map((p) => [p[0], p[1]] as Pt)));
    return copy;
  }
}

/** Extracts closed rings (point lists) from a shape's path iterator. */
function extractRings(shape: { getPathIterator(t: AffineTransform | null): PathIterator }): Pt[][] {
  const iterator = shape.getPathIterator(null);
  const coords = new Array<number>(6).fill(0);
  const rings: Pt[][] = [];
  let current: Pt[] = [];
  while (!iterator.isDone()) {
    switch (iterator.currentSegment(coords)) {
      case SEG_MOVETO:
        current = [[coords[0]!, coords[1]!]];
        break;
      case SEG_LINETO:
        current.push([coords[0]!, coords[1]!]);
        break;
      case SEG_CLOSE:
        if (current.length >= 3) {
          rings.push(current);
        }
        current = [];
        break;
      default:
        // Curves: flatten via the current point. Rooms/walls are line-only;
        // a curve here is approximated by its endpoints.
        current.push([coords[2]!, coords[3]!]);
    }
    iterator.next();
  }
  if (current.length >= 3) {
    rings.push(current);
  }
  // Drop repeated closing point (ring is closed by convention).
  return rings.map((ring) => {
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] === last[0] && first[1] === last[1]) {
      return ring.slice(0, -1);
    }
    return ring;
  });
}

function isSimpleRing(ring: Pt[]): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a1 = ring[i]!;
    const a2 = ring[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent segments (they share an endpoint).
      if (j === i || j === (i + 1) % n || i === (j + 1) % n) continue;
      const b1 = ring[j]!;
      const b2 = ring[(j + 1) % n]!;
      if (segmentsIntersect(a1[0], a1[1], a2[0], a2[1], b1[0], b1[1], b2[0], b2[1])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Groups simple rings by containment (even-odd): a ring inside an odd number
 * of other rings is a hole of its innermost containing ring. Returns polygons
 * each shaped [outer, ...holes] as required by polygon-clipping.
 */
function groupRingsByContainment(rings: Pt[][]): Polygon[] {
  const polygons: Polygon[] = [];
  const used = new Set<number>();
  for (let i = 0; i < rings.length; i++) {
    if (used.has(i)) continue;
    const outer = rings[i]!;
    const children: Pt[][] = [];
    for (let j = 0; j < rings.length; j++) {
      if (j === i || used.has(j)) continue;
      const inner = rings[j]!;
      if (ringContains(outer, inner)) {
        const parentIndex = innermostContainerIndex(rings, j);
        if (parentIndex === i) {
          children.push(inner);
          used.add(j);
        }
      }
    }
    used.add(i);
    polygons.push([outer, ...children]);
  }
  return polygons;
}

/** Returns the index of the innermost ring containing ring index `j` (or -1). */
function innermostContainerIndex(rings: Pt[][], j: number): number {
  let container = -1;
  for (let i = 0; i < rings.length; i++) {
    if (i === j) continue;
    if (ringContains(rings[i]!, rings[j]!)) {
      if (container === -1) {
        container = i;
      } else if (ringContains(rings[container]!, rings[i]!)) {
        container = i;
      }
    }
  }
  return container;
}

function ringContains(outer: Pt[], inner: Pt[]): boolean {
  // A ring contains another if any vertex of the inner is strictly inside the
  // outer and no vertex of the outer is inside the inner (rings are simple).
  const probe = inner[0]!;
  if (!pointInPolygon(probe[0], probe[1], outer)) {
    return false;
  }
  const probeOuter = outer[0]!;
  return !pointInPolygon(probeOuter[0], probeOuter[1], inner);
}

function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): boolean {
  const d1 = cross(x3 - x1, y3 - y1, x2 - x1, y2 - y1);
  const d2 = cross(x4 - x1, y4 - y1, x2 - x1, y2 - y1);
  const d3 = cross(x1 - x3, y1 - y3, x4 - x3, y4 - y3);
  const d4 = cross(x2 - x3, y2 - y3, x4 - x3, y4 - y3);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/**
 * Splits a self-intersecting ring into simple polygons (the region per the
 * shape's winding rule). Uses the classic face-tracing algorithm on the
 * planar arrangement of the split segments.
 */
function resolveSelfIntersecting(ring: Pt[], windingRule: number): Pt[][] {
  const n = ring.length;
  // Collect split points per segment.
  const splitSegments: Pt[][] = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    const cuts: Pt[] = [a];
    for (let j = 0; j < n; j++) {
      if (j === i || (j + 1) % n === i || (i + 1) % n === j || j === (i + 1) % n) continue;
      const c = ring[j]!;
      const d = ring[(j + 1) % n]!;
      const p = segmentIntersection(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
      if (p !== null) {
        cuts.push(p);
      }
    }
    cuts.push(b);
    // Sort cuts along the segment (by distance from a).
    cuts.sort((p, q) => Point2D.distanceSq(a[0], a[1], p[0], p[1]) - Point2D.distanceSq(a[0], a[1], q[0], q[1]));
    // Dedupe near-identical cuts.
    const deduped: Pt[] = [];
    for (const cut of cuts) {
      const last = deduped[deduped.length - 1];
      if (last === undefined || Point2D.distanceSq(last[0], last[1], cut[0], cut[1]) > 1e-12) {
        deduped.push(cut);
      }
    }
    splitSegments.push(deduped);
  }

  // Build directed half-edges: (from, to) with the segment index.
  const halfEdges: Array<{ from: Pt; to: Pt; seg: number }> = [];
  splitSegments.forEach((points, seg) => {
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k]!;
      const b = points[k + 1]!;
      if (a[0] !== b[0] || a[1] !== b[1]) {
        halfEdges.push({ from: a, to: b, seg });
      }
    }
  });

  // Adjacency: at each vertex, outgoing half-edges sorted by angle.
  const outEdges = new Map<string, Array<{ he: number; angle: number }>>();
  const key = (p: Pt): string => `${p[0]},${p[1]}`;
  for (let i = 0; i < halfEdges.length; i++) {
    const he = halfEdges[i]!;
    const k = key(he.from);
    let list = outEdges.get(k);
    if (list === undefined) {
      list = [];
      outEdges.set(k, list);
    }
    list.push({ he: i, angle: Math.atan2(he.to[1] - he.from[1], he.to[0] - he.from[0]) });
  }
  for (const list of outEdges.values()) {
    list.sort((a, b) => a.angle - b.angle);
  }

  // Face tracing: traverse each unused half-edge, at each vertex take the next
  // clockwise edge (largest clockwise turn).
  const used = new Set<number>();
  const faces: Pt[][] = [];
  for (let start = 0; start < halfEdges.length; start++) {
    if (used.has(start)) continue;
    const face: Pt[] = [];
    let heIndex = start;
    let guard = 0;
    while (!used.has(heIndex) && guard < halfEdges.length * 2) {
      used.add(heIndex);
      const he = halfEdges[heIndex]!;
      face.push(he.from);
      // Next edge at `to`: pick the incoming edge reversed, then the next
      // outgoing clockwise from it.
      const k = key(he.to);
      const outgoing = outEdges.get(k) ?? [];
      if (outgoing.length === 0) break;
      // Angle of the reverse of the incoming edge.
      const incomingAngle = Math.atan2(he.from[1] - he.to[1], he.from[0] - he.to[0]);
      // Find the outgoing edge with the largest clockwise turn (smallest
      // counter-clockwise angle difference), i.e. the next in CCW order.
      let best = -1;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const cand of outgoing) {
        let diff = incomingAngle - cand.angle;
        while (diff < 0) diff += 2 * Math.PI;
        if (diff < bestDiff) {
          bestDiff = diff;
          best = cand.he;
        }
      }
      heIndex = best;
      guard += 1;
    }
    if (face.length >= 3) {
      const winding = windingOf(face, ring);
      const keep = windingRule === WIND_NON_ZERO ? winding !== 0 : winding % 2 === 1;
      if (keep) {
        faces.push(face);
      }
    }
  }
  return faces;
}

/** Even-odd winding number of a point (use ring centroid of the face). */
function windingOf(face: Pt[], ring: Pt[]): number {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of face) {
    cx += x;
    cy += y;
  }
  cx /= face.length;
  cy /= face.length;
  let crossings = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    if (a[1] <= cy !== b[1] <= cy) {
      const xInt = a[0] + ((cy - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
      if (xInt > cx) crossings += 1;
    }
  }
  return crossings;
}

function segmentIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): Pt | null {
  const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (d === 0) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
  const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [f32(x1 + t * (x2 - x1)), f32(y1 + t * (y2 - y1))];
}

function pointInPolygon(px: number, py: number, ring: Pt[]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i]![0];
    const yi = ring[i]![1];
    const xj = ring[j]![0];
    const yj = ring[j]![1];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function segmentIntersectsRect(x1: number, y1: number, x2: number, y2: number, r: Rect2D): boolean {
  // Quick reject via bounding box
  if (Math.min(x1, x2) > r.x + r.width) return false;
  if (Math.max(x1, x2) < r.x) return false;
  if (Math.min(y1, y2) > r.y + r.height) return false;
  if (Math.max(y1, y2) < r.y) return false;
  const corners: Pt[] = [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x + r.width, r.y + r.height],
    [r.x, r.y + r.height],
  ];
  for (let i = 0; i < 4; i++) {
    const c1 = corners[i]!;
    const c2 = corners[(i + 1) % 4]!;
    if (segmentsIntersect(x1, y1, x2, y2, c1[0], c1[1], c2[0], c2[1])) {
      return true;
    }
  }
  // Segment fully inside the rect
  return pointInPolygon(x1, y1, [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x + r.width, r.y + r.height],
    [r.x, r.y + r.height],
  ]);
}

class AreaIterator implements PathIterator {
  private polygonIndex = 0;
  private ringIndex = 0;
  private pointIndex = 0;
  private phase: "move" | "line" | "close" = "move";
  private readonly coords = new Array<number>(6).fill(0);

  constructor(
    private readonly area: Area,
    private readonly transform: AffineTransform | null,
  ) {}

  currentSegment(out: number[]): number {
    const polygon = this.area.getPolygons()[this.polygonIndex];
    if (polygon === undefined) throw new Error("area iterator exhausted");
    const ring = polygon[this.ringIndex]!;
    if (this.phase === "move") {
      out[0] = ring[0]![0];
      out[1] = ring[0]![1];
      return this.emit(SEG_MOVETO, out, 1);
    }
    const p = ring[this.pointIndex]!;
    out[0] = p[0];
    out[1] = p[1];
    return this.emit(SEG_LINETO, out, 1);
  }

  private emit(type: number, out: number[], count: number): number {
    if (this.transform !== null) {
      this.transform.transformCoords(out, count);
    }
    return type;
  }

  next(): void {
    if (this.phase === "close") {
      this.phase = "move";
      this.pointIndex = 0;
      this.ringIndex += 1;
      const polygon = this.area.getPolygons()[this.polygonIndex];
      if (polygon !== undefined && this.ringIndex >= polygon.length) {
        this.ringIndex = 0;
        this.polygonIndex += 1;
      }
      return;
    }
    const polygon = this.area.getPolygons()[this.polygonIndex];
    if (polygon === undefined) return;
    const ring = polygon[this.ringIndex]!;
    if (this.phase === "move") {
      this.phase = "line";
      this.pointIndex = 1;
      return;
    }
    // "line" phase: iterate points, then emit the close marker.
    this.pointIndex += 1;
    if (this.pointIndex >= ring.length) {
      this.phase = "close";
    }
  }

  isDone(): boolean {
    return this.polygonIndex >= this.area.getPolygons().length;
  }

  getWindingRule(): number {
    return 0; // WIND_EVEN_ODD
  }
}
