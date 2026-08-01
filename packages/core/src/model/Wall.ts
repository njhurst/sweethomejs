/**
 * Port of com.eteks.sweethome3d.model.Wall (GPL v2+).
 *
 * A wall segment with thickness, optional arc, height, baseboards and wall
 * connection topology. The outline geometry (getPoints) is transcribed
 * faithfully from the Java implementation, including the arc-circle math and
 * the wall-join intersection computation.
 */
import { GeneralPath } from "../geom/GeneralPath.js";
import { Line2D } from "../geom/Line2D.js";
import { Point2D } from "../geom/Point2D.js";
import { Rect2D } from "../geom/Rect2D.js";
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";
import type { Selectable } from "./Selectable.js";
import type { Baseboard, HomeTexture, TextureImage } from "./stubs.js";

const EPSILON = 0.01;

export class Wall extends HomeObject implements Selectable {
  static readonly Property = {
    X_START: "X_START",
    Y_START: "Y_START",
    X_END: "X_END",
    Y_END: "Y_END",
    ARC_EXTENT: "ARC_EXTENT",
    WALL_AT_START: "WALL_AT_START",
    WALL_AT_END: "WALL_AT_END",
    THICKNESS: "THICKNESS",
    HEIGHT: "HEIGHT",
    HEIGHT_AT_END: "HEIGHT_AT_END",
    LEFT_SIDE_COLOR: "LEFT_SIDE_COLOR",
    LEFT_SIDE_TEXTURE: "LEFT_SIDE_TEXTURE",
    LEFT_SIDE_SHININESS: "LEFT_SIDE_SHININESS",
    LEFT_SIDE_BASEBOARD: "LEFT_SIDE_BASEBOARD",
    RIGHT_SIDE_COLOR: "RIGHT_SIDE_COLOR",
    RIGHT_SIDE_TEXTURE: "RIGHT_SIDE_TEXTURE",
    RIGHT_SIDE_SHININESS: "RIGHT_SIDE_SHININESS",
    RIGHT_SIDE_BASEBOARD: "RIGHT_SIDE_BASEBOARD",
    PATTERN: "PATTERN",
    TOP_COLOR: "TOP_COLOR",
    LEVEL: "LEVEL",
  } as const;

  private xStart: number;
  private yStart: number;
  private xEnd: number;
  private yEnd: number;
  private arcExtent: number | null = null;
  private wallAtStart: Wall | null = null;
  private wallAtEnd: Wall | null = null;
  private thickness: number;
  private height: number | null = null;
  private heightAtEnd: number | null = null;
  private leftSideColor: number | null = null;
  private leftSideTexture: HomeTexture | null = null;
  private leftSideShininess = 0;
  private leftSideBaseboard: Baseboard | null = null;
  private rightSideColor: number | null = null;
  private rightSideTexture: HomeTexture | null = null;
  private rightSideShininess = 0;
  private rightSideBaseboard: Baseboard | null = null;
  private symmetric = true;
  private pattern: TextureImage | null = null;
  private topColor: number | null = null;
  private level: Level | null = null;

  // Caches (Java transient fields)
  private shapeCache: GeneralPath | null = null;
  private arcCircleCenterCache: number[] | null = null;
  private pointsCache: number[][] | null = null;
  private pointsIncludingBaseboardsCache: number[][] | null = null;

  constructor(xStart: number, yStart: number, xEnd: number, yEnd: number, thickness: number);
  constructor(xStart: number, yStart: number, xEnd: number, yEnd: number, thickness: number, height: number);
  constructor(xStart: number, yStart: number, xEnd: number, yEnd: number, thickness: number, height: number, pattern: TextureImage);
  constructor(id: string, xStart: number, yStart: number, xEnd: number, yEnd: number, thickness: number, height: number);
  constructor(id: string, xStart: number, yStart: number, xEnd: number, yEnd: number, thickness: number, height: number, pattern: TextureImage);
  constructor(
    xStartOrId: number | string,
    yStartOrXStart: number,
    xEndOrYStart: number,
    yEndOrXEnd: number,
    thicknessOrYEnd: number,
    thicknessOrHeight?: number,
    heightOrPattern?: number | TextureImage | null,
    pattern?: TextureImage | null,
  ) {
    if (typeof xStartOrId === "string") {
      super(xStartOrId);
      this.xStart = f32(yStartOrXStart);
      this.yStart = f32(xEndOrYStart);
      this.xEnd = f32(yEndOrXEnd);
      this.yEnd = f32(thicknessOrYEnd);
      this.thickness = f32(thicknessOrHeight ?? 0);
      this.height = typeof heightOrPattern === "number" ? f32(heightOrPattern) : null;
      this.pattern = typeof heightOrPattern === "object" ? heightOrPattern : (pattern ?? null);
    } else {
      super();
      this.xStart = f32(xStartOrId);
      this.yStart = f32(yStartOrXStart);
      this.xEnd = f32(xEndOrYStart);
      this.yEnd = f32(yEndOrXEnd);
      this.thickness = f32(thicknessOrYEnd);
      this.height = typeof thicknessOrHeight === "number" && heightOrPattern === undefined ? f32(thicknessOrHeight) : null;
      this.pattern = typeof thicknessOrHeight === "object" ? thicknessOrHeight : null;
    }
  }

  private clearPointsCache(): void {
    this.pointsCache = null;
    this.pointsIncludingBaseboardsCache = null;
    this.shapeCache = null;
    this.arcCircleCenterCache = null;
  }

  // ------------------------------------------------------------------ coords

  getXStart(): number {
    return this.xStart;
  }

  setXStart(xStart: number): void {
    const narrowed = f32(xStart);
    if (narrowed !== this.xStart) {
      const oldXStart = this.xStart;
      this.xStart = narrowed;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.X_START, oldXStart, narrowed);
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
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.Y_START, oldYStart, narrowed);
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
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.X_END, oldXEnd, narrowed);
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
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.Y_END, oldYEnd, narrowed);
    }
  }

  getLength(): number {
    if (this.arcExtent === null || this.arcExtent === 0) {
      return f32(Point2D.distance(this.xStart, this.yStart, this.xEnd, this.yEnd));
    }
    const arcCircleCenter = this.getArcCircleCenter();
    const arcCircleRadius = Point2D.distance(this.xStart, this.yStart, arcCircleCenter[0]!, arcCircleCenter[1]!);
    return f32(Math.abs(this.arcExtent) * arcCircleRadius);
  }

  getStartPointToEndPointDistance(): number {
    return f32(Point2D.distance(this.xStart, this.yStart, this.xEnd, this.yEnd));
  }

  // -------------------------------------------------------------------- arc

  setArcExtent(arcExtent: number | null): void {
    const narrowed = arcExtent === null ? null : f32(arcExtent);
    if (narrowed !== this.arcExtent) {
      const oldArcExtent = this.arcExtent;
      this.arcExtent = narrowed;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.ARC_EXTENT, oldArcExtent, narrowed);
    }
  }

  getArcExtent(): number | null {
    return this.arcExtent;
  }

  getXArcCircleCenter(): number {
    return this.getArcCircleCenter()[0]!;
  }

  getYArcCircleCenter(): number {
    return this.getArcCircleCenter()[1]!;
  }

  private getArcCircleCenter(): number[] {
    if (this.arcCircleCenterCache === null) {
      const startToEndPointsDistance = Point2D.distance(this.xStart, this.yStart, this.xEnd, this.yEnd);
      const wallToStartPointArcCircleCenterAngle =
        Math.abs(this.arcExtent!) > Math.PI ? -(Math.PI + this.arcExtent!) / 2 : (Math.PI - this.arcExtent!) / 2;
      const arcCircleCenterToWallDistance = -f32(Math.tan(wallToStartPointArcCircleCenterAngle) * startToEndPointsDistance / 2);
      const xMiddlePoint = f32((this.xStart + this.xEnd) / 2);
      const yMiddlePoint = f32((this.yStart + this.yEnd) / 2);
      const angle = Math.atan2(this.xStart - this.xEnd, this.yEnd - this.yStart);
      this.arcCircleCenterCache = [
        f32(xMiddlePoint + arcCircleCenterToWallDistance * Math.cos(angle)),
        f32(yMiddlePoint + arcCircleCenterToWallDistance * Math.sin(angle)),
      ];
    }
    return this.arcCircleCenterCache;
  }

  // ------------------------------------------------------- wall connections

  getWallAtStart(): Wall | null {
    return this.wallAtStart;
  }

  setWallAtStart(wallAtStart: Wall | null): void {
    this.setWallAtStartInternal(wallAtStart, true);
  }

  private setWallAtStartInternal(wallAtStart: Wall | null, detachJoinedWallAtStart: boolean): void {
    if (wallAtStart !== this.wallAtStart) {
      const oldWallAtStart = this.wallAtStart;
      this.wallAtStart = wallAtStart;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.WALL_AT_START, oldWallAtStart, wallAtStart);
      if (detachJoinedWallAtStart) {
        this.detachJoinedWall(oldWallAtStart);
      }
    }
  }

  getWallAtEnd(): Wall | null {
    return this.wallAtEnd;
  }

  setWallAtEnd(wallAtEnd: Wall | null): void {
    this.setWallAtEndInternal(wallAtEnd, true);
  }

  private setWallAtEndInternal(wallAtEnd: Wall | null, detachJoinedWallAtEnd: boolean): void {
    if (wallAtEnd !== this.wallAtEnd) {
      const oldWallAtEnd = this.wallAtEnd;
      this.wallAtEnd = wallAtEnd;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.WALL_AT_END, oldWallAtEnd, wallAtEnd);
      if (detachJoinedWallAtEnd) {
        this.detachJoinedWall(oldWallAtEnd);
      }
    }
  }

  private detachJoinedWall(joinedWall: Wall | null): void {
    if (joinedWall !== null) {
      if (joinedWall.getWallAtStart() === this) {
        joinedWall.setWallAtStartInternal(null, false);
      } else if (joinedWall.getWallAtEnd() === this) {
        joinedWall.setWallAtEndInternal(null, false);
      }
    }
  }

  // ------------------------------------------------------------ dimensions

  getThickness(): number {
    return this.thickness;
  }

  setThickness(thickness: number): void {
    const narrowed = f32(thickness);
    if (narrowed !== this.thickness) {
      const oldThickness = this.thickness;
      this.thickness = narrowed;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.THICKNESS, oldThickness, narrowed);
    }
  }

  getHeight(): number | null {
    return this.height;
  }

  setHeight(height: number | null): void {
    const narrowed = height === null ? null : f32(height);
    if (narrowed !== this.height) {
      const oldHeight = this.height;
      this.height = narrowed;
      this.firePropertyChange(Wall.Property.HEIGHT, oldHeight, narrowed);
    }
  }

  getHeightAtEnd(): number | null {
    return this.heightAtEnd;
  }

  setHeightAtEnd(heightAtEnd: number | null): void {
    const narrowed = heightAtEnd === null ? null : f32(heightAtEnd);
    if (narrowed !== this.heightAtEnd) {
      const oldHeightAtEnd = this.heightAtEnd;
      this.heightAtEnd = narrowed;
      this.firePropertyChange(Wall.Property.HEIGHT_AT_END, oldHeightAtEnd, narrowed);
    }
  }

  isTrapezoidal(): boolean {
    return this.height !== null && this.heightAtEnd !== null && this.height !== this.heightAtEnd;
  }

  // -------------------------------------------------------------- surfaces

  getLeftSideColor(): number | null {
    return this.leftSideColor;
  }

  setLeftSideColor(leftSideColor: number | null): void {
    if (leftSideColor !== this.leftSideColor) {
      const oldLeftSideColor = this.leftSideColor;
      this.leftSideColor = leftSideColor;
      this.firePropertyChange(Wall.Property.LEFT_SIDE_COLOR, oldLeftSideColor, leftSideColor);
    }
  }

  getRightSideColor(): number | null {
    return this.rightSideColor;
  }

  setRightSideColor(rightSideColor: number | null): void {
    if (rightSideColor !== this.rightSideColor) {
      const oldRightSideColor = this.rightSideColor;
      this.rightSideColor = rightSideColor;
      this.firePropertyChange(Wall.Property.RIGHT_SIDE_COLOR, oldRightSideColor, rightSideColor);
    }
  }

  getLeftSideTexture(): HomeTexture | null {
    return this.leftSideTexture;
  }

  setLeftSideTexture(leftSideTexture: HomeTexture | null): void {
    if (leftSideTexture !== this.leftSideTexture) {
      const oldLeftSideTexture = this.leftSideTexture;
      this.leftSideTexture = leftSideTexture;
      this.firePropertyChange(Wall.Property.LEFT_SIDE_TEXTURE, oldLeftSideTexture, leftSideTexture);
    }
  }

  getRightSideTexture(): HomeTexture | null {
    return this.rightSideTexture;
  }

  setRightSideTexture(rightSideTexture: HomeTexture | null): void {
    if (rightSideTexture !== this.rightSideTexture) {
      const oldRightSideTexture = this.rightSideTexture;
      this.rightSideTexture = rightSideTexture;
      this.firePropertyChange(Wall.Property.RIGHT_SIDE_TEXTURE, oldRightSideTexture, rightSideTexture);
    }
  }

  getLeftSideShininess(): number {
    return this.leftSideShininess;
  }

  setLeftSideShininess(leftSideShininess: number): void {
    const narrowed = f32(leftSideShininess);
    if (narrowed !== this.leftSideShininess) {
      const oldLeftSideShininess = this.leftSideShininess;
      this.leftSideShininess = narrowed;
      this.firePropertyChange(Wall.Property.LEFT_SIDE_SHININESS, oldLeftSideShininess, narrowed);
    }
  }

  getRightSideShininess(): number {
    return this.rightSideShininess;
  }

  setRightSideShininess(rightSideShininess: number): void {
    const narrowed = f32(rightSideShininess);
    if (narrowed !== this.rightSideShininess) {
      const oldRightSideShininess = this.rightSideShininess;
      this.rightSideShininess = narrowed;
      this.firePropertyChange(Wall.Property.RIGHT_SIDE_SHININESS, oldRightSideShininess, narrowed);
    }
  }

  getLeftSideBaseboard(): Baseboard | null {
    return this.leftSideBaseboard;
  }

  setLeftSideBaseboard(leftSideBaseboard: Baseboard | null): void {
    if (leftSideBaseboard !== this.leftSideBaseboard) {
      const oldLeftSideBaseboard = this.leftSideBaseboard;
      this.leftSideBaseboard = leftSideBaseboard;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.LEFT_SIDE_BASEBOARD, oldLeftSideBaseboard, leftSideBaseboard);
    }
  }

  getRightSideBaseboard(): Baseboard | null {
    return this.rightSideBaseboard;
  }

  setRightSideBaseboard(rightSideBaseboard: Baseboard | null): void {
    if (rightSideBaseboard !== this.rightSideBaseboard) {
      const oldRightSideBaseboard = this.rightSideBaseboard;
      this.rightSideBaseboard = rightSideBaseboard;
      this.clearPointsCache();
      this.firePropertyChange(Wall.Property.RIGHT_SIDE_BASEBOARD, oldRightSideBaseboard, rightSideBaseboard);
    }
  }

  getPattern(): TextureImage | null {
    return this.pattern;
  }

  setPattern(pattern: TextureImage | null): void {
    if (pattern !== this.pattern) {
      const oldPattern = this.pattern;
      this.pattern = pattern;
      this.firePropertyChange(Wall.Property.PATTERN, oldPattern, pattern);
    }
  }

  getTopColor(): number | null {
    return this.topColor;
  }

  setTopColor(topColor: number | null): void {
    if (topColor !== this.topColor) {
      const oldTopColor = this.topColor;
      this.topColor = topColor;
      this.firePropertyChange(Wall.Property.TOP_COLOR, oldTopColor, topColor);
    }
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level | null): void {
    if (level !== this.level) {
      const oldLevel = this.level;
      this.level = level;
      this.firePropertyChange(Wall.Property.LEVEL, oldLevel, level);
    }
  }

  isAtLevel(level: Level): boolean {
    return this.level === level;
  }

  private getWallMaximumHeight(): number {
    const defaultWallHeight = 250; // Home default wall height when unknown
    return Math.max(this.height ?? defaultWallHeight, this.heightAtEnd ?? defaultWallHeight);
  }

  // ---------------------------------------------------------------- points

  getPoints(): number[][] {
    if (this.pointsCache === null) {
      this.pointsCache = this.getShapePoints(false);
    }
    return this.pointsCache;
  }

  getPointsIncludingBaseboards(): number[][] {
    if (this.pointsIncludingBaseboardsCache === null) {
      this.pointsIncludingBaseboardsCache = this.getShapePoints(true);
    }
    return this.pointsIncludingBaseboardsCache;
  }

  private getShapePoints(includeBaseboards: boolean): number[][] {
    const wallPoints = this.getUnjoinedShapePoints(includeBaseboards);
    const leftSideStartPointIndex = 0;
    const rightSideStartPointIndex = wallPoints.length - 1;
    const leftSideEndPointIndex = wallPoints.length / 2 - 1;
    const rightSideEndPointIndex = wallPoints.length / 2;

    // If wall is joined to a wall at its start, compute the intersection
    // between their outlines.
    if (this.wallAtStart !== null) {
      const wallAtStartPoints = this.wallAtStart.getUnjoinedShapePoints(includeBaseboards);
      const wallAtStartLeftSideStartPointIndex = 0;
      const wallAtStartRightSideStartPointIndex = wallAtStartPoints.length - 1;
      const wallAtStartLeftSideEndPointIndex = wallAtStartPoints.length / 2 - 1;
      const wallAtStartRightSideEndPointIndex = wallAtStartPoints.length / 2;
      const wallAtStartJoinedAtEnd =
        this.wallAtStart.getWallAtEnd() === this &&
        (this.wallAtStart.getWallAtStart() !== this ||
          (this.wallAtStart.xEnd === this.xStart && this.wallAtStart.yEnd === this.yStart));
      const wallAtStartJoinedAtStart =
        this.wallAtStart.getWallAtStart() === this &&
        (this.wallAtStart.getWallAtEnd() !== this ||
          (this.wallAtStart.xStart === this.xStart && this.wallAtStart.yStart === this.yStart));
      const wallAtStartPointsCache = includeBaseboards
        ? this.wallAtStart.pointsIncludingBaseboardsCache
        : this.wallAtStart.pointsCache;
      const limit = 2 * Math.max(this.thickness, this.wallAtStart.getThickness());
      if (wallAtStartJoinedAtEnd) {
        computeIntersection(
          wallPoints[leftSideStartPointIndex]!, wallPoints[leftSideStartPointIndex + 1]!,
          wallAtStartPoints[wallAtStartLeftSideEndPointIndex]!, wallAtStartPoints[wallAtStartLeftSideEndPointIndex - 1]!,
          limit,
        );
        computeIntersection(
          wallPoints[rightSideStartPointIndex]!, wallPoints[rightSideStartPointIndex - 1]!,
          wallAtStartPoints[wallAtStartRightSideEndPointIndex]!, wallAtStartPoints[wallAtStartRightSideEndPointIndex + 1]!,
          limit,
        );
        if (wallAtStartPointsCache !== null) {
          if (
            Math.abs(wallPoints[leftSideStartPointIndex]![0]! - wallAtStartPointsCache[wallAtStartLeftSideEndPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[leftSideStartPointIndex]![1]! - wallAtStartPointsCache[wallAtStartLeftSideEndPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[leftSideStartPointIndex] = wallAtStartPointsCache[wallAtStartLeftSideEndPointIndex]!;
          }
          if (
            Math.abs(wallPoints[rightSideStartPointIndex]![0]! - wallAtStartPointsCache[wallAtStartRightSideEndPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[rightSideStartPointIndex]![1]! - wallAtStartPointsCache[wallAtStartRightSideEndPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[rightSideStartPointIndex] = wallAtStartPointsCache[wallAtStartRightSideEndPointIndex]!;
          }
        }
      } else if (wallAtStartJoinedAtStart) {
        computeIntersection(
          wallPoints[leftSideStartPointIndex]!, wallPoints[leftSideStartPointIndex + 1]!,
          wallAtStartPoints[wallAtStartRightSideStartPointIndex]!, wallAtStartPoints[wallAtStartRightSideStartPointIndex - 1]!,
          limit,
        );
        computeIntersection(
          wallPoints[rightSideStartPointIndex]!, wallPoints[rightSideStartPointIndex - 1]!,
          wallAtStartPoints[wallAtStartLeftSideStartPointIndex]!, wallAtStartPoints[wallAtStartLeftSideStartPointIndex + 1]!,
          limit,
        );
        if (wallAtStartPointsCache !== null) {
          if (
            Math.abs(wallPoints[leftSideStartPointIndex]![0]! - wallAtStartPointsCache[wallAtStartRightSideStartPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[leftSideStartPointIndex]![1]! - wallAtStartPointsCache[wallAtStartRightSideStartPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[leftSideStartPointIndex] = wallAtStartPointsCache[wallAtStartRightSideStartPointIndex]!;
          }
          if (
            Math.abs(wallPoints[rightSideStartPointIndex]![0]! - wallAtStartPointsCache[wallAtStartLeftSideStartPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[rightSideStartPointIndex]![1]! - wallAtStartPointsCache[wallAtStartLeftSideStartPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[rightSideStartPointIndex] = wallAtStartPointsCache[wallAtStartLeftSideStartPointIndex]!;
          }
        }
      }
    }

    // If wall is joined to a wall at its end, compute the intersection
    // between their outlines.
    if (this.wallAtEnd !== null) {
      const wallAtEndPoints = this.wallAtEnd.getUnjoinedShapePoints(includeBaseboards);
      const wallAtEndLeftSideStartPointIndex = 0;
      const wallAtEndRightSideStartPointIndex = wallAtEndPoints.length - 1;
      const wallAtEndLeftSideEndPointIndex = wallAtEndPoints.length / 2 - 1;
      const wallAtEndRightSideEndPointIndex = wallAtEndPoints.length / 2;
      const wallAtEndJoinedAtStart =
        this.wallAtEnd.getWallAtStart() === this &&
        (this.wallAtEnd.getWallAtEnd() !== this ||
          (this.wallAtEnd.xStart === this.xEnd && this.wallAtEnd.yStart === this.yEnd));
      const wallAtEndJoinedAtEnd =
        this.wallAtEnd.getWallAtEnd() === this &&
        (this.wallAtEnd.getWallAtStart() !== this ||
          (this.wallAtEnd.xEnd === this.xEnd && this.wallAtEnd.yEnd === this.yEnd));
      const wallAtEndPointsCache = includeBaseboards
        ? this.wallAtEnd.pointsIncludingBaseboardsCache
        : this.wallAtEnd.pointsCache;
      const limit = 2 * Math.max(this.thickness, this.wallAtEnd.getThickness());
      if (wallAtEndJoinedAtStart) {
        computeIntersection(
          wallPoints[leftSideEndPointIndex]!, wallPoints[leftSideEndPointIndex - 1]!,
          wallAtEndPoints[wallAtEndLeftSideStartPointIndex]!, wallAtEndPoints[wallAtEndLeftSideStartPointIndex + 1]!,
          limit,
        );
        computeIntersection(
          wallPoints[rightSideEndPointIndex]!, wallPoints[rightSideEndPointIndex + 1]!,
          wallAtEndPoints[wallAtEndRightSideStartPointIndex]!, wallAtEndPoints[wallAtEndRightSideStartPointIndex - 1]!,
          limit,
        );
        if (wallAtEndPointsCache !== null) {
          if (
            Math.abs(wallPoints[leftSideEndPointIndex]![0]! - wallAtEndPointsCache[wallAtEndLeftSideStartPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[leftSideEndPointIndex]![1]! - wallAtEndPointsCache[wallAtEndLeftSideStartPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[leftSideEndPointIndex] = wallAtEndPointsCache[wallAtEndLeftSideStartPointIndex]!;
          }
          if (
            Math.abs(wallPoints[rightSideEndPointIndex]![0]! - wallAtEndPointsCache[wallAtEndRightSideStartPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[rightSideEndPointIndex]![1]! - wallAtEndPointsCache[wallAtEndRightSideStartPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[rightSideEndPointIndex] = wallAtEndPointsCache[wallAtEndRightSideStartPointIndex]!;
          }
        }
      } else if (wallAtEndJoinedAtEnd) {
        computeIntersection(
          wallPoints[leftSideEndPointIndex]!, wallPoints[leftSideEndPointIndex - 1]!,
          wallAtEndPoints[wallAtEndRightSideEndPointIndex]!, wallAtEndPoints[wallAtEndRightSideEndPointIndex + 1]!,
          limit,
        );
        computeIntersection(
          wallPoints[rightSideEndPointIndex]!, wallPoints[rightSideEndPointIndex + 1]!,
          wallAtEndPoints[wallAtEndLeftSideEndPointIndex]!, wallAtEndPoints[wallAtEndLeftSideEndPointIndex - 1]!,
          limit,
        );
        if (wallAtEndPointsCache !== null) {
          if (
            Math.abs(wallPoints[leftSideEndPointIndex]![0]! - wallAtEndPointsCache[wallAtEndRightSideEndPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[leftSideEndPointIndex]![1]! - wallAtEndPointsCache[wallAtEndRightSideEndPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[leftSideEndPointIndex] = wallAtEndPointsCache[wallAtEndRightSideEndPointIndex]!;
          }
          if (
            Math.abs(wallPoints[rightSideEndPointIndex]![0]! - wallAtEndPointsCache[wallAtEndLeftSideEndPointIndex]![0]!) < EPSILON &&
            Math.abs(wallPoints[rightSideEndPointIndex]![1]! - wallAtEndPointsCache[wallAtEndLeftSideEndPointIndex]![1]!) < EPSILON
          ) {
            wallPoints[rightSideEndPointIndex] = wallAtEndPointsCache[wallAtEndLeftSideEndPointIndex]!;
          }
        }
      }
    }
    return wallPoints;
  }

  /**
   * Computes the rectangle or circle arc outline of a wall according to its
   * thickness and possibly the thickness of its baseboards.
   */
  private getUnjoinedShapePoints(includeBaseboards: boolean): number[][] {
    if (this.arcExtent !== null && this.arcExtent !== 0 && Point2D.distanceSq(this.xStart, this.yStart, this.xEnd, this.yEnd) > 1e-10) {
      const arcCircleCenter = this.getArcCircleCenter();
      let startAngle = f32(Math.atan2(arcCircleCenter[1]! - this.yStart, arcCircleCenter[0]! - this.xStart));
      startAngle = f32(startAngle + 2 * f32(Math.atan2(this.yStart - this.yEnd, this.xEnd - this.xStart)));
      const arcCircleRadius = f32(Point2D.distance(arcCircleCenter[0]!, arcCircleCenter[1]!, this.xStart, this.yStart));
      let exteriorArcRadius = f32(arcCircleRadius + this.thickness / 2);
      let interiorArcRadius = f32(Math.max(0, arcCircleRadius - this.thickness / 2));
      const exteriorArcLength = f32(exteriorArcRadius * Math.abs(this.arcExtent!));
      let angleDelta = f32(this.arcExtent! / f32(Math.sqrt(exteriorArcLength)));
      let angleStepCount = Math.trunc(f32(this.arcExtent! / angleDelta));
      if (includeBaseboards) {
        if (angleDelta > 0) {
          if (this.leftSideBaseboard !== null) {
            exteriorArcRadius += this.leftSideBaseboard.getThickness();
          }
          if (this.rightSideBaseboard !== null) {
            interiorArcRadius -= this.rightSideBaseboard.getThickness();
          }
        } else {
          if (this.leftSideBaseboard !== null) {
            interiorArcRadius -= this.leftSideBaseboard.getThickness();
          }
          if (this.rightSideBaseboard !== null) {
            exteriorArcRadius += this.rightSideBaseboard.getThickness();
          }
        }
      }
      const wallPoints: number[][] = [];
      if (this.symmetric) {
        if (Math.abs(this.arcExtent! - angleStepCount * angleDelta) > 1e-6) {
          angleDelta = f32(this.arcExtent! / ++angleStepCount);
        }
        for (let i = 0; i <= angleStepCount; i++) {
          const angle = f32(f32(startAngle + this.arcExtent!) - f32(i * angleDelta));
          this.computeRoundWallShapePoint(wallPoints, angle, i, angleDelta, arcCircleCenter, exteriorArcRadius, interiorArcRadius);
        }
      } else {
        // Don't change the way walls were computed in version 3.0 (unserialized walls only)
        let i = 0;
        for (let angle = f32(this.arcExtent!); angleDelta > 0 ? angle >= angleDelta * 0.1 : angle <= -angleDelta * 0.1; angle = f32(angle - angleDelta), i++) {
          this.computeRoundWallShapePoint(wallPoints, f32(startAngle + angle), i, angleDelta, arcCircleCenter, exteriorArcRadius, interiorArcRadius);
        }
        this.computeRoundWallShapePoint(wallPoints, startAngle, i, angleDelta, arcCircleCenter, exteriorArcRadius, interiorArcRadius);
      }
      return wallPoints;
    }
    const angle = Math.atan2(this.yEnd - this.yStart, this.xEnd - this.xStart);
    const sin = f32(Math.sin(angle));
    const cos = f32(Math.cos(angle));
    let leftSideThickness = f32(this.thickness / 2);
    if (includeBaseboards && this.leftSideBaseboard !== null) {
      leftSideThickness = f32(leftSideThickness + this.leftSideBaseboard.getThickness());
    }
    const leftSideDx = f32(sin * leftSideThickness);
    const leftSideDy = f32(cos * leftSideThickness);
    let rightSideThickness = f32(this.thickness / 2);
    if (includeBaseboards && this.rightSideBaseboard !== null) {
      rightSideThickness = f32(rightSideThickness + this.rightSideBaseboard.getThickness());
    }
    const rightSideDx = f32(sin * rightSideThickness);
    const rightSideDy = f32(cos * rightSideThickness);
    return [
      [f32(this.xStart + leftSideDx), f32(this.yStart - leftSideDy)],
      [f32(this.xEnd + leftSideDx), f32(this.yEnd - leftSideDy)],
      [f32(this.xEnd - rightSideDx), f32(this.yEnd + rightSideDy)],
      [f32(this.xStart - rightSideDx), f32(this.yStart + rightSideDy)],
    ];
  }

  private computeRoundWallShapePoint(
    wallPoints: number[][],
    angle: number,
    index: number,
    angleDelta: number,
    arcCircleCenter: number[],
    exteriorArcRadius: number,
    interiorArcRadius: number,
  ): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const interiorArcPoint = [f32(arcCircleCenter[0]! + interiorArcRadius * cos), f32(arcCircleCenter[1]! - interiorArcRadius * sin)];
    const exteriorArcPoint = [f32(arcCircleCenter[0]! + exteriorArcRadius * cos), f32(arcCircleCenter[1]! - exteriorArcRadius * sin)];
    if (angleDelta > 0) {
      wallPoints.splice(index, 0, interiorArcPoint);
      wallPoints.splice(wallPoints.length - 1 - index, 0, exteriorArcPoint);
    } else {
      wallPoints.splice(index, 0, exteriorArcPoint);
      wallPoints.splice(wallPoints.length - 1 - index, 0, interiorArcPoint);
    }
  }

  // --------------------------------------------------------------- queries

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    const rectangle = new Rect2D(x0, y0, 0, 0);
    rectangle.add(x1, y1);
    return this.getShape(false).intersects(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    return this.containsPointWithBaseboards(x, y, false, margin);
  }

  containsPointWithBaseboards(x: number, y: number, includeBaseboards: boolean, margin: number): boolean {
    return this.containsShapeAtWithMargin(this.getShape(includeBaseboards), x, y, margin);
  }

  isMiddlePointAt(x: number, y: number, margin: number): boolean {
    const wallPoints = this.getPoints();
    const leftSideMiddlePointIndex = Math.trunc(wallPoints.length / 4);
    const rightSideMiddlePointIndex = wallPoints.length - 1 - leftSideMiddlePointIndex;
    const middleLine =
      wallPoints.length % 4 === 0
        ? new Line2D(
            (wallPoints[leftSideMiddlePointIndex - 1]![0]! + wallPoints[leftSideMiddlePointIndex]![0]!) / 2,
            (wallPoints[leftSideMiddlePointIndex - 1]![1]! + wallPoints[leftSideMiddlePointIndex]![1]!) / 2,
            (wallPoints[rightSideMiddlePointIndex]![0]! + wallPoints[rightSideMiddlePointIndex + 1]![0]!) / 2,
            (wallPoints[rightSideMiddlePointIndex]![1]! + wallPoints[rightSideMiddlePointIndex + 1]![1]!) / 2,
          )
        : new Line2D(
            wallPoints[leftSideMiddlePointIndex]![0]!,
            wallPoints[leftSideMiddlePointIndex]![1]!,
            wallPoints[rightSideMiddlePointIndex]![0]!,
            wallPoints[rightSideMiddlePointIndex]![1]!,
          );
    return this.containsShapeAtWithMargin(middleLine, x, y, margin);
  }

  containsWallStartAt(x: number, y: number, margin: number): boolean {
    const wallPoints = this.getPoints();
    const startLine = new Line2D(wallPoints[0]![0]!, wallPoints[0]![1]!, wallPoints[wallPoints.length - 1]![0]!, wallPoints[wallPoints.length - 1]![1]!);
    return this.containsShapeAtWithMargin(startLine, x, y, margin);
  }

  containsWallEndAt(x: number, y: number, margin: number): boolean {
    const wallPoints = this.getPoints();
    const endLine = new Line2D(
      wallPoints[wallPoints.length / 2 - 1]![0]!,
      wallPoints[wallPoints.length / 2 - 1]![1]!,
      wallPoints[wallPoints.length / 2]![0]!,
      wallPoints[wallPoints.length / 2]![1]!,
    );
    return this.containsShapeAtWithMargin(endLine, x, y, margin);
  }

  private containsShapeAtWithMargin(shape: GeneralPath | Line2D, x: number, y: number, margin: number): boolean {
    if (margin === 0) {
      return shape.contains(x, y);
    }
    return shape.intersects(x - margin, y - margin, 2 * margin, 2 * margin);
  }

  private getShape(includeBaseboards: boolean): GeneralPath {
    if (this.shapeCache === null) {
      const wallPoints = includeBaseboards ? this.getPointsIncludingBaseboards() : this.getPoints();
      const wallPath = new GeneralPath();
      wallPath.moveTo(wallPoints[0]![0]!, wallPoints[0]![1]!);
      for (let i = 1; i < wallPoints.length; i++) {
        wallPath.lineTo(wallPoints[i]![0]!, wallPoints[i]![1]!);
      }
      wallPath.closePath();
      this.shapeCache = wallPath;
    }
    return this.shapeCache;
  }

  move(dx: number, dy: number): void {
    this.setXStart(this.getXStart() + dx);
    this.setYStart(this.getYStart() + dy);
    this.setXEnd(this.getXEnd() + dx);
    this.setYEnd(this.getYEnd() + dy);
  }

  // --------------------------------------------------------------- cloning

  static duplicate(walls: Wall[]): Wall[] {
    return Wall.updateBoundWalls(walls.map((wall) => wall.duplicate()), walls);
  }

  static clone(walls: Wall[]): Wall[] {
    return Wall.updateBoundWalls(walls.map((wall) => wall.clone()), walls);
  }

  private static updateBoundWalls(wallsCopy: Wall[], walls: Wall[]): Wall[] {
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i]!;
      const wallAtStartIndex = walls.indexOf(wall.getWallAtStart()!);
      if (wallAtStartIndex !== -1) {
        wallsCopy[i]!.setWallAtStart(wallsCopy[wallAtStartIndex]!);
      }
      const wallAtEndIndex = walls.indexOf(wall.getWallAtEnd()!);
      if (wallAtEndIndex !== -1) {
        wallsCopy[i]!.setWallAtEnd(wallsCopy[wallAtEndIndex]!);
      }
    }
    return wallsCopy;
  }

  override clone(): Wall {
    const copy = Object.create(Wall.prototype) as Wall;
    this.copyBaseTo(copy);
    copy.xStart = this.xStart;
    copy.yStart = this.yStart;
    copy.xEnd = this.xEnd;
    copy.yEnd = this.yEnd;
    copy.arcExtent = this.arcExtent;
    copy.wallAtStart = null;
    copy.wallAtEnd = null;
    copy.thickness = this.thickness;
    copy.height = this.height;
    copy.heightAtEnd = this.heightAtEnd;
    copy.leftSideColor = this.leftSideColor;
    copy.leftSideTexture = this.leftSideTexture;
    copy.leftSideShininess = this.leftSideShininess;
    copy.leftSideBaseboard = this.leftSideBaseboard;
    copy.rightSideColor = this.rightSideColor;
    copy.rightSideTexture = this.rightSideTexture;
    copy.rightSideShininess = this.rightSideShininess;
    copy.rightSideBaseboard = this.rightSideBaseboard;
    copy.symmetric = this.symmetric;
    copy.pattern = this.pattern;
    copy.topColor = this.topColor;
    copy.level = null;
    return copy;
  }
}

/** Computes the intersection of the lines (point1-point2) and (point3-point4) into point1. */
function computeIntersection(point1: number[], point2: number[], point3: number[], point4: number[], limit: number): void {
  const alpha1 = f32((point2[1]! - point1[1]!) / (point2[0]! - point1[0]!));
  const alpha2 = f32((point4[1]! - point3[1]!) / (point4[0]! - point3[0]!));
  if (alpha1 !== alpha2) {
    let x = f32(point1[0]!);
    let y = f32(point1[1]!);
    if (Math.abs(alpha1) > 4000) {
      if (Math.abs(alpha2) < 4000) {
        x = f32(point1[0]!);
        const beta2 = f32(point4[1]! - alpha2 * point4[0]!);
        y = f32(alpha2 * x + beta2);
      }
    } else if (Math.abs(alpha2) > 4000) {
      if (Math.abs(alpha1) < 4000) {
        x = f32(point3[0]!);
        const beta1 = f32(point2[1]! - alpha1 * point2[0]!);
        y = f32(alpha1 * x + beta1);
      }
    } else {
      const sameSignum = Math.sign(alpha1) === Math.sign(alpha2);
      if (Math.abs(alpha1 - alpha2) > 1e-5 && (!sameSignum || (Math.abs(alpha1) > Math.abs(alpha2) ? alpha1 / alpha2 : alpha2 / alpha1) > 1.004)) {
        const beta1 = f32(point2[1]! - alpha1 * point2[0]!);
        const beta2 = f32(point4[1]! - alpha2 * point4[0]!);
        x = f32((beta2 - beta1) / (alpha1 - alpha2));
        y = f32(alpha1 * x + beta1);
      }
    }
    if (Point2D.distanceSq(x, y, point1[0]!, point1[1]!) < limit * limit) {
      point1[0] = f32(x);
      point1[1] = f32(y);
    }
  }
}
