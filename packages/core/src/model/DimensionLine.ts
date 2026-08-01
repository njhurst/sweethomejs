/**
 * Port of com.eteks.sweethome3d.model.DimensionLine (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";
import type { Selectable } from "./Selectable.js";
import type { TextStyle } from "./TextStyle.js";

export class DimensionLine extends HomeObject implements Selectable {
  static readonly Property = {
    X_START: "X_START",
    Y_START: "Y_START",
    ELEVATION_START: "ELEVATION_START",
    X_END: "X_END",
    Y_END: "Y_END",
    ELEVATION_END: "ELEVATION_END",
    OFFSET: "OFFSET",
    END_MARK_SIZE: "END_MARK_SIZE",
    PITCH: "PITCH",
    LENGTH_STYLE: "LENGTH_STYLE",
    COLOR: "COLOR",
    VISIBLE_IN_3D: "VISIBLE_IN_3D",
    LEVEL: "LEVEL",
  } as const;

  private xStart: number;
  private yStart: number;
  private elevationStart: number;
  private xEnd: number;
  private yEnd: number;
  private elevationEnd: number;
  private offset: number;
  private endMarkSize: number;
  private pitch: number;
  private lengthStyle: TextStyle | null;
  private color: number | null;
  private visibleIn3D: boolean;
  private level: Level | null = null;

  constructor(xStart: number, yStart: number, xEnd: number, yEnd: number, offset: number);
  constructor(xStart: number, yStart: number, elevationStart: number, xEnd: number, yEnd: number, elevationEnd: number, offset: number);
  constructor(id: string, xStart: number, yStart: number, xEnd: number, yEnd: number, offset: number);
  constructor(id: string, xStart: number, yStart: number, elevationStart: number, xEnd: number, yEnd: number, elevationEnd: number, offset: number);
  constructor(...args: Array<number | string>) {
    let id: string | null = null;
    let xStart = 0;
    let yStart = 0;
    let elevationStart = 0;
    let xEnd = 0;
    let yEnd = 0;
    let elevationEnd = 0;
    let offsetValue = 0;
    if (typeof args[0] === "string") {
      id = args[0];
      xStart = args[1] as number;
      yStart = args[2] as number;
      if (args.length === 6) {
        // (id, xStart, yStart, xEnd, yEnd, offset)
        xEnd = args[3] as number;
        yEnd = args[4] as number;
        offsetValue = args[5] as number;
      } else {
        // (id, xStart, yStart, elevationStart, xEnd, yEnd, elevationEnd, offset)
        elevationStart = args[3] as number;
        xEnd = args[4] as number;
        yEnd = args[5] as number;
        elevationEnd = args[6] as number;
        offsetValue = args[7] as number;
      }
    } else {
      xStart = args[0] as number;
      yStart = args[1] as number;
      if (args.length === 5) {
        // (xStart, yStart, xEnd, yEnd, offset)
        xEnd = args[2] as number;
        yEnd = args[3] as number;
        offsetValue = args[4] as number;
      } else {
        // (xStart, yStart, elevationStart, xEnd, yEnd, elevationEnd, offset)
        elevationStart = args[2] as number;
        xEnd = args[3] as number;
        yEnd = args[4] as number;
        elevationEnd = args[5] as number;
        offsetValue = args[6] as number;
      }
    }
    super(id ?? HomeObject.createId("dimensionLine"));
    this.xStart = f32(xStart);
    this.yStart = f32(yStart);
    this.elevationStart = f32(elevationStart);
    this.xEnd = f32(xEnd);
    this.yEnd = f32(yEnd);
    this.elevationEnd = f32(elevationEnd);
    this.offset = f32(offsetValue);
    this.endMarkSize = 0.2;
    this.pitch = 0;
    this.lengthStyle = null;
    this.color = null;
    this.visibleIn3D = true;
  }

  getXStart(): number {
    return this.xStart;
  }

  setXStart(xStart: number): void {
    const narrowed = f32(xStart);
    if (narrowed !== this.xStart) {
      const oldXStart = this.xStart;
      this.xStart = narrowed;
      this.firePropertyChange(DimensionLine.Property.X_START, oldXStart, narrowed);
    }
  }

  getYStart(): number {
    return this.yStart;
  }

  setYStart(yStart: number): void {
    const narrowed = f32(yStart);
    if (narrowed !== this.yStart) {
      const oldYStart = this.yStart;
      this.yStart = narrowed;
      this.firePropertyChange(DimensionLine.Property.Y_START, oldYStart, narrowed);
    }
  }

  getElevationStart(): number {
    return this.elevationStart;
  }

  setElevationStart(elevationStart: number): void {
    const narrowed = f32(elevationStart);
    if (narrowed !== this.elevationStart) {
      const oldElevationStart = this.elevationStart;
      this.elevationStart = narrowed;
      this.firePropertyChange(DimensionLine.Property.ELEVATION_START, oldElevationStart, narrowed);
    }
  }

  getXEnd(): number {
    return this.xEnd;
  }

  setXEnd(xEnd: number): void {
    const narrowed = f32(xEnd);
    if (narrowed !== this.xEnd) {
      const oldXEnd = this.xEnd;
      this.xEnd = narrowed;
      this.firePropertyChange(DimensionLine.Property.X_END, oldXEnd, narrowed);
    }
  }

  getYEnd(): number {
    return this.yEnd;
  }

  setYEnd(yEnd: number): void {
    const narrowed = f32(yEnd);
    if (narrowed !== this.yEnd) {
      const oldYEnd = this.yEnd;
      this.yEnd = narrowed;
      this.firePropertyChange(DimensionLine.Property.Y_END, oldYEnd, narrowed);
    }
  }

  getElevationEnd(): number {
    return this.elevationEnd;
  }

  setElevationEnd(elevationEnd: number): void {
    const narrowed = f32(elevationEnd);
    if (narrowed !== this.elevationEnd) {
      const oldElevationEnd = this.elevationEnd;
      this.elevationEnd = narrowed;
      this.firePropertyChange(DimensionLine.Property.ELEVATION_END, oldElevationEnd, narrowed);
    }
  }

  getOffset(): number {
    return this.offset;
  }

  setOffset(offset: number): void {
    const narrowed = f32(offset);
    if (narrowed !== this.offset) {
      const oldOffset = this.offset;
      this.offset = narrowed;
      this.firePropertyChange(DimensionLine.Property.OFFSET, oldOffset, narrowed);
    }
  }

  getEndMarkSize(): number {
    return this.endMarkSize;
  }

  setEndMarkSize(endMarkSize: number): void {
    const narrowed = f32(endMarkSize);
    if (narrowed !== this.endMarkSize) {
      const oldEndMarkSize = this.endMarkSize;
      this.endMarkSize = narrowed;
      this.firePropertyChange(DimensionLine.Property.END_MARK_SIZE, oldEndMarkSize, narrowed);
    }
  }

  getPitch(): number {
    return this.pitch;
  }

  setPitch(pitch: number): void {
    const narrowed = f32(pitch);
    if (narrowed !== this.pitch) {
      const oldPitch = this.pitch;
      this.pitch = narrowed;
      this.firePropertyChange(DimensionLine.Property.PITCH, oldPitch, narrowed);
    }
  }

  getLengthStyle(): TextStyle | null {
    return this.lengthStyle;
  }

  setLengthStyle(lengthStyle: TextStyle | null): void {
    if (lengthStyle !== this.lengthStyle) {
      const oldLengthStyle = this.lengthStyle;
      this.lengthStyle = lengthStyle;
      this.firePropertyChange(DimensionLine.Property.LENGTH_STYLE, oldLengthStyle, lengthStyle);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.firePropertyChange(DimensionLine.Property.COLOR, oldColor, color);
    }
  }

  getLength(): number {
    const deltaX = this.xEnd - this.xStart;
    const deltaY = this.yEnd - this.yStart;
    const deltaElevation = this.elevationEnd - this.elevationStart;
    return f32(Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaElevation * deltaElevation));
  }

  isVisibleIn3D(): boolean {
    return this.visibleIn3D;
  }

  setVisibleIn3D(visibleIn3D: boolean): void {
    if (visibleIn3D !== this.visibleIn3D) {
      const oldVisibleIn3D = this.visibleIn3D;
      this.visibleIn3D = visibleIn3D;
      this.firePropertyChange(DimensionLine.Property.VISIBLE_IN_3D, oldVisibleIn3D, visibleIn3D);
    }
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level | null): void {
    if (level !== this.level) {
      const oldLevel = this.level;
      this.level = level;
      this.firePropertyChange(DimensionLine.Property.LEVEL, oldLevel, level);
    }
  }

  isAtLevel(level: Level): boolean {
    return this.level === level;
  }

  getPoints(): number[][] {
    return [
      [this.xStart, this.yStart],
      [this.xEnd, this.yEnd],
    ];
  }

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    return (
      (this.xStart >= minX && this.xStart <= maxX && this.yStart >= minY && this.yStart <= maxY) ||
      (this.xEnd >= minX && this.xEnd <= maxX && this.yEnd >= minY && this.yEnd <= maxY) ||
      segmentCrossesRect(this.xStart, this.yStart, this.xEnd, this.yEnd, minX, minY, maxX, maxY)
    );
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    return Math.abs(x - this.xStart) <= margin && Math.abs(y - this.yStart) <= margin || Math.abs(x - this.xEnd) <= margin && Math.abs(y - this.yEnd) <= margin;
  }

  move(dx: number, dy: number): void {
    this.setXStart(this.getXStart() + dx);
    this.setYStart(this.getYStart() + dy);
    this.setXEnd(this.getXEnd() + dx);
    this.setYEnd(this.getYEnd() + dy);
  }

  override clone(): DimensionLine {
    const copy = Object.create(DimensionLine.prototype) as DimensionLine;
    this.copyBaseTo(copy);
    copy.xStart = this.xStart;
    copy.yStart = this.yStart;
    copy.elevationStart = this.elevationStart;
    copy.xEnd = this.xEnd;
    copy.yEnd = this.yEnd;
    copy.elevationEnd = this.elevationEnd;
    copy.offset = this.offset;
    copy.endMarkSize = this.endMarkSize;
    copy.pitch = this.pitch;
    copy.lengthStyle = this.lengthStyle;
    copy.color = this.color;
    copy.visibleIn3D = this.visibleIn3D;
    copy.level = null;
    return copy;
  }
}

function segmentCrossesRect(x1: number, y1: number, x2: number, y2: number, rx1: number, ry1: number, rx2: number, ry2: number): boolean {
  const edges: Array<[number, number, number, number]> = [
    [rx1, ry1, rx2, ry1],
    [rx2, ry1, rx2, ry2],
    [rx2, ry2, rx1, ry2],
    [rx1, ry2, rx1, ry1],
  ];
  for (const [ax, ay, bx, by] of edges) {
    const d1 = (ax - x1) * (y2 - y1) - (ay - y1) * (x2 - x1);
    const d2 = (bx - x1) * (y2 - y1) - (by - y1) * (x2 - x1);
    const d3 = (x1 - ax) * (by - ay) - (y1 - ay) * (bx - ax);
    const d4 = (x2 - ax) * (by - ay) - (y2 - ay) * (bx - ax);
    if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  }
  return false;
}
