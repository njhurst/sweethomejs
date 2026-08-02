/**
 * Port of com.eteks.sweethome3d.model.Polyline (GPL v2+).
 *
 * The full cap/join/arrow outline shapes are a plan-rendering concern (P4);
 * this port covers the model semantics: points, styles, length and
 * point-based hit testing.
 */
import { Point2D } from "../geom/Point2D.js";
import { Rect2D } from "../geom/Rect2D.js";
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";
import type { Selectable } from "./Selectable.js";

export class Polyline extends HomeObject implements Selectable {
  static readonly CapStyle = {
    BUTT: "BUTT",
    SQUARE: "SQUARE",
    ROUND: "ROUND",
  } as const;
  static readonly JoinStyle = {
    BEVEL: "BEVEL",
    MITER: "MITER",
    ROUND: "ROUND",
    CURVED: "CURVED",
  } as const;
  static readonly ArrowStyle = {
    NONE: "NONE",
    DELTA: "DELTA",
    OPEN: "OPEN",
    DISC: "DISC",
  } as const;
  static readonly DashStyle = {
    SOLID: "SOLID",
    DOT: "DOT",
    DASH: "DASH",
    DASH_DOT: "DASH_DOT",
    DASH_DOT_DOT: "DASH_DOT_DOT",
    CUSTOMIZED: "CUSTOMIZED",
  } as const;

  static readonly Property = {
    POINTS: "POINTS",
    THICKNESS: "THICKNESS",
    CAP_STYLE: "CAP_STYLE",
    JOIN_STYLE: "JOIN_STYLE",
    DASH_STYLE: "DASH_STYLE",
    DASH_OFFSET: "DASH_OFFSET",
    DASH_PATTERN: "DASH_PATTERN",
    START_ARROW_STYLE: "START_ARROW_STYLE",
    END_ARROW_STYLE: "END_ARROW_STYLE",
    CLOSED_PATH: "CLOSED_PATH",
    COLOR: "COLOR",
    LEVEL: "LEVEL",
    ELEVATION: "ELEVATION",
    VISIBLE_IN_3D: "VISIBLE_IN_3D",
  } as const;

  private pointsValue: number[][];
  private thickness: number;
  private capStyle: string;
  private joinStyle: string;
  private dashStyle: string;
  private dashPattern: number[] | null = null;
  private dashOffset: number;
  private startArrowStyle: string;
  private endArrowStyle: string;
  private closedPath: boolean;
  private color: number;
  private elevation: number;
  private visibleIn3D: boolean;
  private level: Level | null = null;

  constructor(points: number[][]);
  constructor(id: string | undefined, points: number[][]);
  constructor(points: number[][], thickness: number, capStyle: string, joinStyle: string, dashStyle: string, dashOffset: number, startArrowStyle: string, endArrowStyle: string, closedPath: boolean, color: number);
  constructor(id: string | undefined, points: number[][], thickness: number, capStyle: string, joinStyle: string, dashStyle: string, dashOffset: number, startArrowStyle: string, endArrowStyle: string, closedPath: boolean, color: number);
  constructor(...args: unknown[]) {
    let points: number[][] = [];
    let thickness = 0;
    let capStyle: string = Polyline.CapStyle.BUTT;
    let joinStyle: string = Polyline.JoinStyle.MITER;
    let dashStyle: string = Polyline.DashStyle.SOLID;
    let dashOffset = 0;
    let startArrowStyle: string = Polyline.ArrowStyle.NONE;
    let endArrowStyle: string = Polyline.ArrowStyle.NONE;
    let closedPath = false;
    let colorValue = 0xffffff;
    let id: string | null = null;
    if (typeof args[0] === "string") {
      id = args[0] as string;
      if (typeof args[1] === "number") {
        // (id, points, thickness, capStyle, joinStyle, dashStyle, dashOffset, startArrowStyle, endArrowStyle, closedPath, color)
        points = args[1] as unknown as number[][];
        thickness = args[2] as number;
        capStyle = args[3] as string;
        joinStyle = args[4] as string;
        dashStyle = args[5] as string;
        dashOffset = args[6] as number;
        startArrowStyle = args[7] as string;
        endArrowStyle = args[8] as string;
        closedPath = args[9] as boolean;
        colorValue = args[10] as number;
      } else {
        points = (args[1] as number[][]) ?? [];
      }
    } else {
      if (typeof args[1] === "number") {
        points = args[0] as number[][];
        thickness = args[1] as number;
        capStyle = args[2] as string;
        joinStyle = args[3] as string;
        dashStyle = args[4] as string;
        dashOffset = args[5] as number;
        startArrowStyle = args[6] as string;
        endArrowStyle = args[7] as string;
        closedPath = args[8] as boolean;
        colorValue = args[9] as number;
      } else {
        points = (args[0] as number[][]) ?? [];
      }
    }
    super(id ?? HomeObject.createId("polyline"));
    this.pointsValue = deepCopy(points);
    this.thickness = f32(thickness);
    this.capStyle = capStyle;
    this.joinStyle = joinStyle;
    this.dashStyle = dashStyle;
    this.dashOffset = f32(dashOffset);
    this.startArrowStyle = startArrowStyle;
    this.endArrowStyle = endArrowStyle;
    this.closedPath = closedPath;
    this.color = colorValue;
    this.elevation = 0;
    this.visibleIn3D = false;
  }

  getPoints(): number[][] {
    return deepCopy(this.pointsValue);
  }

  getPointCount(): number {
    return this.pointsValue.length;
  }

  setPoints(points: number[][]): void {
    const oldPoints = this.pointsValue;
    this.pointsValue = deepCopy(points);
    this.firePropertyChange(Polyline.Property.POINTS, oldPoints, points);
  }

  addPoint(x: number, y: number): void {
    this.addPointAt(x, y, this.pointsValue.length);
  }

  addPointAt(x: number, y: number, index: number): void {
    const oldPoints = this.pointsValue;
    const points = deepCopy(this.pointsValue);
    points.splice(index, 0, [f32(x), f32(y)]);
    this.pointsValue = points;
    this.firePropertyChange(Polyline.Property.POINTS, oldPoints, this.pointsValue);
  }

  setPoint(x: number, y: number, index: number): void {
    const oldPoints = this.pointsValue;
    this.pointsValue[index] = [f32(x), f32(y)];
    this.firePropertyChange(Polyline.Property.POINTS, oldPoints, this.pointsValue);
  }

  removePoint(index: number): void {
    const oldPoints = this.pointsValue;
    const points = deepCopy(this.pointsValue);
    points.splice(index, 1);
    this.pointsValue = points;
    this.firePropertyChange(Polyline.Property.POINTS, oldPoints, this.pointsValue);
  }

  getThickness(): number {
    return this.thickness;
  }

  setThickness(thickness: number): void {
    const narrowed = f32(thickness);
    if (narrowed !== this.thickness) {
      const oldThickness = this.thickness;
      this.thickness = narrowed;
      this.firePropertyChange(Polyline.Property.THICKNESS, oldThickness, narrowed);
    }
  }

  getCapStyle(): string {
    return this.capStyle;
  }

  setCapStyle(capStyle: string): void {
    if (capStyle !== this.capStyle) {
      const oldCapStyle = this.capStyle;
      this.capStyle = capStyle;
      this.firePropertyChange(Polyline.Property.CAP_STYLE, oldCapStyle, capStyle);
    }
  }

  getJoinStyle(): string {
    return this.joinStyle;
  }

  setJoinStyle(joinStyle: string): void {
    if (joinStyle !== this.joinStyle) {
      const oldJoinStyle = this.joinStyle;
      this.joinStyle = joinStyle;
      this.firePropertyChange(Polyline.Property.JOIN_STYLE, oldJoinStyle, joinStyle);
    }
  }

  getDashStyle(): string {
    return this.dashStyle;
  }

  setDashStyle(dashStyle: string): void {
    if (dashStyle !== this.dashStyle) {
      const oldDashStyle = this.dashStyle;
      this.dashStyle = dashStyle;
      this.firePropertyChange(Polyline.Property.DASH_STYLE, oldDashStyle, dashStyle);
    }
  }

  getDashPattern(): number[] | null {
    return this.dashPattern;
  }

  setDashPattern(dashPattern: number[] | null): void {
    if (dashPattern !== this.dashPattern) {
      const oldDashPattern = this.dashPattern;
      this.dashPattern = dashPattern === null ? null : dashPattern.map((d) => f32(d));
      this.firePropertyChange(Polyline.Property.DASH_PATTERN, oldDashPattern, dashPattern);
    }
  }

  getDashOffset(): number {
    return this.dashOffset;
  }

  setDashOffset(dashOffset: number): void {
    const narrowed = f32(dashOffset);
    if (narrowed !== this.dashOffset) {
      const oldDashOffset = this.dashOffset;
      this.dashOffset = narrowed;
      this.firePropertyChange(Polyline.Property.DASH_OFFSET, oldDashOffset, narrowed);
    }
  }

  getStartArrowStyle(): string {
    return this.startArrowStyle;
  }

  setStartArrowStyle(startArrowStyle: string): void {
    if (startArrowStyle !== this.startArrowStyle) {
      const oldStartArrowStyle = this.startArrowStyle;
      this.startArrowStyle = startArrowStyle;
      this.firePropertyChange(Polyline.Property.START_ARROW_STYLE, oldStartArrowStyle, startArrowStyle);
    }
  }

  getEndArrowStyle(): string {
    return this.endArrowStyle;
  }

  setEndArrowStyle(endArrowStyle: string): void {
    if (endArrowStyle !== this.endArrowStyle) {
      const oldEndArrowStyle = this.endArrowStyle;
      this.endArrowStyle = endArrowStyle;
      this.firePropertyChange(Polyline.Property.END_ARROW_STYLE, oldEndArrowStyle, endArrowStyle);
    }
  }

  isClosedPath(): boolean {
    return this.closedPath;
  }

  setClosedPath(closedPath: boolean): void {
    if (closedPath !== this.closedPath) {
      const oldClosedPath = this.closedPath;
      this.closedPath = closedPath;
      this.firePropertyChange(Polyline.Property.CLOSED_PATH, oldClosedPath, closedPath);
    }
  }

  getColor(): number {
    return this.color;
  }

  setColor(color: number): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.firePropertyChange(Polyline.Property.COLOR, oldColor, color);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    const narrowed = f32(elevation);
    if (narrowed !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = narrowed;
      this.firePropertyChange(Polyline.Property.ELEVATION, oldElevation, narrowed);
    }
  }

  getGroundElevation(): number {
    return this.level !== null ? this.level.getElevation() : 0;
  }

  isVisibleIn3D(): boolean {
    return this.visibleIn3D;
  }

  setVisibleIn3D(visibleIn3D: boolean): void {
    if (visibleIn3D !== this.visibleIn3D) {
      const oldVisibleIn3D = this.visibleIn3D;
      this.visibleIn3D = visibleIn3D;
      this.firePropertyChange(Polyline.Property.VISIBLE_IN_3D, oldVisibleIn3D, visibleIn3D);
    }
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level | null): void {
    if (level !== this.level) {
      const oldLevel = this.level;
      this.level = level;
      this.firePropertyChange(Polyline.Property.LEVEL, oldLevel, level);
    }
  }

  isAtLevel(level: Level): boolean {
    return this.level === level;
  }

  getLength(): number {
    let length = 0;
    for (let i = 1; i < this.pointsValue.length; i++) {
      length += Point2D.distance(this.pointsValue[i - 1]![0]!, this.pointsValue[i - 1]![1]!, this.pointsValue[i]![0]!, this.pointsValue[i]![1]!);
    }
    if (this.closedPath && this.pointsValue.length > 1) {
      const first = this.pointsValue[0]!;
      const last = this.pointsValue[this.pointsValue.length - 1]!;
      length += Point2D.distance(last[0]!, last[1]!, first[0]!, first[1]!);
    }
    return length;
  }

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    const rectangle = new Rect2D(x0, y0, 0, 0);
    rectangle.add(x1, y1);
    for (let i = 1; i < this.pointsValue.length; i++) {
      const p1 = this.pointsValue[i - 1]!;
      const p2 = this.pointsValue[i]!;
      if (segmentHitsRect(p1[0]!, p1[1]!, p2[0]!, p2[1]!, rectangle)) {
        return true;
      }
    }
    if (this.closedPath && this.pointsValue.length > 1) {
      const first = this.pointsValue[0]!;
      const last = this.pointsValue[this.pointsValue.length - 1]!;
      return segmentHitsRect(first[0]!, first[1]!, last[0]!, last[1]!, rectangle);
    }
    return false;
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    return this.getPointIndexAt(x, y, margin) !== -1 || this.pointsNear(x, y, margin);
  }

  getPointIndexAt(x: number, y: number, margin: number): number {
    for (let i = 0; i < this.pointsValue.length; i++) {
      if (Math.abs(x - this.pointsValue[i]![0]!) <= margin && Math.abs(y - this.pointsValue[i]![1]!) <= margin) {
        return i;
      }
    }
    return -1;
  }

  /** True if a point is within `margin` of any segment of this polyline. */
  private pointsNear(x: number, y: number, margin: number): boolean {
    for (let i = 1; i < this.pointsValue.length; i++) {
      const p1 = this.pointsValue[i - 1]!;
      const p2 = this.pointsValue[i]!;
      if (Point2D.distanceSq(x, y, p1[0]!, p1[1]!) <= margin * margin || Point2D.distanceSq(x, y, p2[0]!, p2[1]!) <= margin * margin) {
        return true;
      }
      if (segmentPointDistanceSq(p1[0]!, p1[1]!, p2[0]!, p2[1]!, x, y) <= margin * margin) {
        return true;
      }
    }
    return false;
  }

  move(dx: number, dy: number): void {
    const oldPoints = this.pointsValue;
    for (const point of this.pointsValue) {
      point[0] = f32(point[0]! + dx);
      point[1] = f32(point[1]! + dy);
    }
    this.firePropertyChange(Polyline.Property.POINTS, oldPoints, this.pointsValue);
  }

  override clone(): Polyline {
    const copy = Object.create(Polyline.prototype) as Polyline;
    this.copyBaseTo(copy);
    copy.pointsValue = deepCopy(this.pointsValue);
    copy.thickness = this.thickness;
    copy.capStyle = this.capStyle;
    copy.joinStyle = this.joinStyle;
    copy.dashStyle = this.dashStyle;
    copy.dashPattern = this.dashPattern === null ? null : [...this.dashPattern];
    copy.dashOffset = this.dashOffset;
    copy.startArrowStyle = this.startArrowStyle;
    copy.endArrowStyle = this.endArrowStyle;
    copy.closedPath = this.closedPath;
    copy.color = this.color;
    copy.elevation = this.elevation;
    copy.visibleIn3D = this.visibleIn3D;
    copy.level = null;
    return copy;
  }
}

function deepCopy(points: number[][]): number[][] {
  return points.map((point) => [f32(point[0]!), f32(point[1]!)]);
}

function segmentHitsRect(x1: number, y1: number, x2: number, y2: number, rect: Rect2D): boolean {
  if (rect.contains(x1, y1) || rect.contains(x2, y2)) return true;
  const edges: Array<[number, number, number, number]> = [
    [rect.x, rect.y, rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height],
    [rect.x, rect.y + rect.height, rect.x, rect.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}

function segmentsCross(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
  const d1 = (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
  const d2 = (x4 - x1) * (y2 - y1) - (y4 - y1) * (x2 - x1);
  const d3 = (x1 - x3) * (y4 - y3) - (y1 - y3) * (x4 - x3);
  const d4 = (x2 - x3) * (y4 - y3) - (y2 - y3) * (x4 - x3);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Squared distance from a point to a segment. */
function segmentPointDistanceSq(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
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
