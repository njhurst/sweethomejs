/**
 * Port of com.eteks.sweethome3d.model.Room (GPL v2+).
 */
import { Area } from "../geom/Area.js";
import { GeneralPath } from "../geom/GeneralPath.js";
import { Rect2D } from "../geom/Rect2D.js";
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";
import type { Selectable } from "./Selectable.js";
import type { HomeTexture, TextStyle } from "./stubs.js";

export class Room extends HomeObject implements Selectable {
  static readonly Property = {
    NAME: "NAME",
    NAME_X_OFFSET: "NAME_X_OFFSET",
    NAME_Y_OFFSET: "NAME_Y_OFFSET",
    NAME_STYLE: "NAME_STYLE",
    NAME_ANGLE: "NAME_ANGLE",
    NAME_COLOR: "NAME_COLOR",
    NAME_VISIBLE: "NAME_VISIBLE",
    POINTS: "POINTS",
    AREA_VISIBLE: "AREA_VISIBLE",
    AREA_X_OFFSET: "AREA_X_OFFSET",
    AREA_Y_OFFSET: "AREA_Y_OFFSET",
    AREA_STYLE: "AREA_STYLE",
    AREA_ANGLE: "AREA_ANGLE",
    AREA_COLOR: "AREA_COLOR",
    FLOOR_VISIBLE: "FLOOR_VISIBLE",
    FLOOR_COLOR: "FLOOR_COLOR",
    FLOOR_TEXTURE: "FLOOR_TEXTURE",
    FLOOR_SHININESS: "FLOOR_SHININESS",
    CEILING_VISIBLE: "CEILING_VISIBLE",
    CEILING_COLOR: "CEILING_COLOR",
    CEILING_TEXTURE: "CEILING_TEXTURE",
    CEILING_SHININESS: "CEILING_SHININESS",
    CEILING_FLAT: "CEILING_FLAT",
    LEVEL: "LEVEL",
  } as const;

  private name: string | null = null;
  private nameXOffset = 0;
  private nameYOffset = 0;
  private nameStyle: TextStyle | null = null;
  private nameAngle = 0;
  private nameColor: number | null = null;
  private nameVisible = true;
  private pointsValue: number[][];
  private areaVisible = false;
  private areaXOffset = 0;
  private areaYOffset = 0;
  private areaStyle: TextStyle | null = null;
  private areaAngle = 0;
  private areaColor: number | null = null;
  private floorVisible = true;
  private floorColor: number | null = null;
  private floorTexture: HomeTexture | null = null;
  private floorShininess = 0;
  private ceilingVisible = true;
  private ceilingColor: number | null = null;
  private ceilingTexture: HomeTexture | null = null;
  private ceilingShininess = 0;
  private ceilingFlat = false;
  private level: Level | null = null;

  // Caches (Java transient fields)
  private shapeCache: GeneralPath | null = null;
  private boundsCache: Rect2D | null = null;
  private areaCache: number | null = null;

  constructor(points: number[][]);
  constructor(id: string, points: number[][]);
  constructor(idOrPoints: string | number[][], points?: number[][]) {
    if (typeof idOrPoints === "string") {
      super(idOrPoints);
      this.pointsValue = deepCopy(points!);
    } else {
      super(HomeObject.createId("room"));
      this.pointsValue = deepCopy(idOrPoints);
    }
  }

  private clearShapeCache(): void {
    this.shapeCache = null;
    this.boundsCache = null;
    this.areaCache = null;
  }

  getName(): string | null {
    return this.name;
  }

  setName(name: string | null): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.firePropertyChange(Room.Property.NAME, oldName, name);
    }
  }

  getNameXOffset(): number {
    return this.nameXOffset;
  }

  setNameXOffset(nameXOffset: number): void {
    const narrowed = f32(nameXOffset);
    if (narrowed !== this.nameXOffset) {
      const oldNameXOffset = this.nameXOffset;
      this.nameXOffset = narrowed;
      this.firePropertyChange(Room.Property.NAME_X_OFFSET, oldNameXOffset, narrowed);
    }
  }

  getNameYOffset(): number {
    return this.nameYOffset;
  }

  setNameYOffset(nameYOffset: number): void {
    const narrowed = f32(nameYOffset);
    if (narrowed !== this.nameYOffset) {
      const oldNameYOffset = this.nameYOffset;
      this.nameYOffset = narrowed;
      this.firePropertyChange(Room.Property.NAME_Y_OFFSET, oldNameYOffset, narrowed);
    }
  }

  getNameStyle(): TextStyle | null {
    return this.nameStyle;
  }

  setNameStyle(nameStyle: TextStyle | null): void {
    if (nameStyle !== this.nameStyle) {
      const oldNameStyle = this.nameStyle;
      this.nameStyle = nameStyle;
      this.firePropertyChange(Room.Property.NAME_STYLE, oldNameStyle, nameStyle);
    }
  }

  getNameAngle(): number {
    return this.nameAngle;
  }

  setNameAngle(nameAngle: number): void {
    const narrowed = f32(nameAngle);
    if (narrowed !== this.nameAngle) {
      const oldNameAngle = this.nameAngle;
      this.nameAngle = narrowed;
      this.firePropertyChange(Room.Property.NAME_ANGLE, oldNameAngle, narrowed);
    }
  }

  getNameColor(): number | null {
    return this.nameColor;
  }

  setNameColor(nameColor: number | null): void {
    if (nameColor !== this.nameColor) {
      const oldNameColor = this.nameColor;
      this.nameColor = nameColor;
      this.firePropertyChange(Room.Property.NAME_COLOR, oldNameColor, nameColor);
    }
  }

  isNameVisible(): boolean {
    return this.nameVisible;
  }

  setNameVisible(nameVisible: boolean): void {
    if (nameVisible !== this.nameVisible) {
      const oldNameVisible = this.nameVisible;
      this.nameVisible = nameVisible;
      this.firePropertyChange(Room.Property.NAME_VISIBLE, oldNameVisible, nameVisible);
    }
  }

  getPoints(): number[][] {
    return deepCopy(this.pointsValue);
  }

  getPointCount(): number {
    return this.pointsValue.length;
  }

  setPoints(points: number[][]): void {
    this.updatePoints(points);
  }

  private updatePoints(points: number[][]): void {
    if (this.pointsValue.length !== points.length) {
      const oldPoints = this.pointsValue;
      this.pointsValue = deepCopy(points);
      this.clearShapeCache();
      this.firePropertyChange(Room.Property.POINTS, oldPoints, points);
    } else {
      const oldPoints = this.pointsValue;
      for (let i = 0; i < points.length; i++) {
        this.pointsValue[i] = [f32(points[i]![0]!), f32(points[i]![1]!)];
      }
      this.clearShapeCache();
      this.firePropertyChange(Room.Property.POINTS, oldPoints, points);
    }
  }

  addPoint(x: number, y: number): void {
    this.addPointAt(x, y, this.pointsValue.length);
  }

  addPointAt(x: number, y: number, index: number): void {
    const oldPoints = this.pointsValue;
    const points = deepCopy(this.pointsValue);
    points.splice(index, 0, [f32(x), f32(y)]);
    this.pointsValue = points;
    this.clearShapeCache();
    this.firePropertyChange(Room.Property.POINTS, oldPoints, this.pointsValue);
  }

  setPoint(x: number, y: number, index: number): void {
    const oldPoints = this.pointsValue;
    this.pointsValue[index] = [f32(x), f32(y)];
    this.clearShapeCache();
    this.firePropertyChange(Room.Property.POINTS, oldPoints, this.pointsValue);
  }

  removePoint(index: number): void {
    const oldPoints = this.pointsValue;
    const points = deepCopy(this.pointsValue);
    points.splice(index, 1);
    this.pointsValue = points;
    this.clearShapeCache();
    this.firePropertyChange(Room.Property.POINTS, oldPoints, this.pointsValue);
  }

  getBoundsMinimumCoordinates(): number[] {
    let xMin = Number.POSITIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    for (const point of this.pointsValue) {
      xMin = Math.min(xMin, point[0]!);
      yMin = Math.min(yMin, point[1]!);
    }
    return [f32(xMin), f32(yMin)];
  }

  getBoundsMaximumCoordinates(): number[] {
    let xMax = Number.NEGATIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    for (const point of this.pointsValue) {
      xMax = Math.max(xMax, point[0]!);
      yMax = Math.max(yMax, point[1]!);
    }
    return [f32(xMax), f32(yMax)];
  }

  isAreaVisible(): boolean {
    return this.areaVisible;
  }

  setAreaVisible(areaVisible: boolean): void {
    if (areaVisible !== this.areaVisible) {
      const oldAreaVisible = this.areaVisible;
      this.areaVisible = areaVisible;
      this.firePropertyChange(Room.Property.AREA_VISIBLE, oldAreaVisible, areaVisible);
    }
  }

  getAreaXOffset(): number {
    return this.areaXOffset;
  }

  setAreaXOffset(areaXOffset: number): void {
    const narrowed = f32(areaXOffset);
    if (narrowed !== this.areaXOffset) {
      const oldAreaXOffset = this.areaXOffset;
      this.areaXOffset = narrowed;
      this.firePropertyChange(Room.Property.AREA_X_OFFSET, oldAreaXOffset, narrowed);
    }
  }

  getAreaYOffset(): number {
    return this.areaYOffset;
  }

  setAreaYOffset(areaYOffset: number): void {
    const narrowed = f32(areaYOffset);
    if (narrowed !== this.areaYOffset) {
      const oldAreaYOffset = this.areaYOffset;
      this.areaYOffset = narrowed;
      this.firePropertyChange(Room.Property.AREA_Y_OFFSET, oldAreaYOffset, narrowed);
    }
  }

  getAreaStyle(): TextStyle | null {
    return this.areaStyle;
  }

  setAreaStyle(areaStyle: TextStyle | null): void {
    if (areaStyle !== this.areaStyle) {
      const oldAreaStyle = this.areaStyle;
      this.areaStyle = areaStyle;
      this.firePropertyChange(Room.Property.AREA_STYLE, oldAreaStyle, areaStyle);
    }
  }

  getAreaAngle(): number {
    return this.areaAngle;
  }

  setAreaAngle(areaAngle: number): void {
    const narrowed = f32(areaAngle);
    if (narrowed !== this.areaAngle) {
      const oldAreaAngle = this.areaAngle;
      this.areaAngle = narrowed;
      this.firePropertyChange(Room.Property.AREA_ANGLE, oldAreaAngle, narrowed);
    }
  }

  getAreaColor(): number | null {
    return this.areaColor;
  }

  setAreaColor(areaColor: number | null): void {
    if (areaColor !== this.areaColor) {
      const oldAreaColor = this.areaColor;
      this.areaColor = areaColor;
      this.firePropertyChange(Room.Property.AREA_COLOR, oldAreaColor, areaColor);
    }
  }

  getXCenter(): number {
    const bounds = this.getShape().getBounds2D();
    return f32(bounds.x + bounds.width / 2);
  }

  getYCenter(): number {
    const bounds = this.getShape().getBounds2D();
    return f32(bounds.y + bounds.height / 2);
  }

  isFloorVisible(): boolean {
    return this.floorVisible;
  }

  setFloorVisible(floorVisible: boolean): void {
    if (floorVisible !== this.floorVisible) {
      const oldFloorVisible = this.floorVisible;
      this.floorVisible = floorVisible;
      this.firePropertyChange(Room.Property.FLOOR_VISIBLE, oldFloorVisible, floorVisible);
    }
  }

  getFloorColor(): number | null {
    return this.floorColor;
  }

  setFloorColor(floorColor: number | null): void {
    if (floorColor !== this.floorColor) {
      const oldFloorColor = this.floorColor;
      this.floorColor = floorColor;
      this.firePropertyChange(Room.Property.FLOOR_COLOR, oldFloorColor, floorColor);
    }
  }

  getFloorTexture(): HomeTexture | null {
    return this.floorTexture;
  }

  setFloorTexture(floorTexture: HomeTexture | null): void {
    if (floorTexture !== this.floorTexture) {
      const oldFloorTexture = this.floorTexture;
      this.floorTexture = floorTexture;
      this.firePropertyChange(Room.Property.FLOOR_TEXTURE, oldFloorTexture, floorTexture);
    }
  }

  getFloorShininess(): number {
    return this.floorShininess;
  }

  setFloorShininess(floorShininess: number): void {
    const narrowed = f32(floorShininess);
    if (narrowed !== this.floorShininess) {
      const oldFloorShininess = this.floorShininess;
      this.floorShininess = narrowed;
      this.firePropertyChange(Room.Property.FLOOR_SHININESS, oldFloorShininess, narrowed);
    }
  }

  isCeilingVisible(): boolean {
    return this.ceilingVisible;
  }

  setCeilingVisible(ceilingVisible: boolean): void {
    if (ceilingVisible !== this.ceilingVisible) {
      const oldCeilingVisible = this.ceilingVisible;
      this.ceilingVisible = ceilingVisible;
      this.firePropertyChange(Room.Property.CEILING_VISIBLE, oldCeilingVisible, ceilingVisible);
    }
  }

  getCeilingColor(): number | null {
    return this.ceilingColor;
  }

  setCeilingColor(ceilingColor: number | null): void {
    if (ceilingColor !== this.ceilingColor) {
      const oldCeilingColor = this.ceilingColor;
      this.ceilingColor = ceilingColor;
      this.firePropertyChange(Room.Property.CEILING_COLOR, oldCeilingColor, ceilingColor);
    }
  }

  getCeilingTexture(): HomeTexture | null {
    return this.ceilingTexture;
  }

  setCeilingTexture(ceilingTexture: HomeTexture | null): void {
    if (ceilingTexture !== this.ceilingTexture) {
      const oldCeilingTexture = this.ceilingTexture;
      this.ceilingTexture = ceilingTexture;
      this.firePropertyChange(Room.Property.CEILING_TEXTURE, oldCeilingTexture, ceilingTexture);
    }
  }

  getCeilingShininess(): number {
    return this.ceilingShininess;
  }

  setCeilingShininess(ceilingShininess: number): void {
    const narrowed = f32(ceilingShininess);
    if (narrowed !== this.ceilingShininess) {
      const oldCeilingShininess = this.ceilingShininess;
      this.ceilingShininess = narrowed;
      this.firePropertyChange(Room.Property.CEILING_SHININESS, oldCeilingShininess, narrowed);
    }
  }

  isCeilingFlat(): boolean {
    return this.ceilingFlat;
  }

  setCeilingFlat(ceilingFlat: boolean): void {
    if (ceilingFlat !== this.ceilingFlat) {
      const oldCeilingFlat = this.ceilingFlat;
      this.ceilingFlat = ceilingFlat;
      this.firePropertyChange(Room.Property.CEILING_FLAT, oldCeilingFlat, ceilingFlat);
    }
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level | null): void {
    if (level !== this.level) {
      const oldLevel = this.level;
      this.level = level;
      this.firePropertyChange(Room.Property.LEVEL, oldLevel, level);
    }
  }

  isAtLevel(level: Level): boolean {
    return this.level === level;
  }

  // -------------------------------------------------------------- geometry

  getArea(): number {
    if (this.areaCache === null) {
      const roomArea = new Area(this.getShape());
      if (roomArea.isSingular()) {
        this.areaCache = Math.abs(this.getSignedArea(this.pointsValue));
      } else {
        // Add the surface of the different polygons of this room
        let area = 0;
        const currentPathPoints: number[][] = [];
        const iterator = roomArea.getPathIterator(null);
        const coords = new Array<number>(6).fill(0);
        while (!iterator.isDone()) {
          const segment = iterator.currentSegment(coords);
          if (segment === 0 /* SEG_MOVETO */ || segment === 1 /* SEG_LINETO */) {
            currentPathPoints.push([coords[0]!, coords[1]!]);
          } else if (segment === 4 /* SEG_CLOSE */) {
            area += this.getSignedArea(currentPathPoints);
            currentPathPoints.length = 0;
          }
          iterator.next();
        }
        this.areaCache = area;
      }
    }
    return this.areaCache;
  }

  private getSignedArea(areaPoints: number[][]): number {
    // From "Area of a General Polygon" — compute in double to avoid precision loss
    let area = 0;
    for (let i = 1; i < areaPoints.length; i++) {
      area += areaPoints[i]![0]! * areaPoints[i - 1]![1]!;
      area -= areaPoints[i]![1]! * areaPoints[i - 1]![0]!;
    }
    area += areaPoints[0]![0]! * areaPoints[areaPoints.length - 1]![1]!;
    area -= areaPoints[0]![1]! * areaPoints[areaPoints.length - 1]![0]!;
    return f32(area / 2);
  }

  isClockwise(): boolean {
    return this.getSignedArea(this.pointsValue) < 0;
  }

  isSingular(): boolean {
    return new Area(this.getShape()).isSingular();
  }

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    const rectangle = new Rect2D(x0, y0, 0, 0);
    rectangle.add(x1, y1);
    return this.getShape().intersects(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    return this.containsShapeAtWithMargin(this.getShape(), x, y, margin);
  }

  getPointIndexAt(x: number, y: number, margin: number): number {
    for (let i = 0; i < this.pointsValue.length; i++) {
      if (Math.abs(x - this.pointsValue[i]![0]!) <= margin && Math.abs(y - this.pointsValue[i]![1]!) <= margin) {
        return i;
      }
    }
    return -1;
  }

  isNameCenterPointAt(x: number, y: number, margin: number): boolean {
    return Math.abs(x - this.getXCenter() - this.nameXOffset) <= margin && Math.abs(y - this.getYCenter() - this.nameYOffset) <= margin;
  }

  isAreaCenterPointAt(x: number, y: number, margin: number): boolean {
    return Math.abs(x - this.getXCenter() - this.areaXOffset) <= margin && Math.abs(y - this.getYCenter() - this.areaYOffset) <= margin;
  }

  private containsShapeAtWithMargin(shape: GeneralPath, x: number, y: number, margin: number): boolean {
    if (margin === 0) {
      return shape.contains(x, y);
    }
    return shape.intersects(x - margin, y - margin, 2 * margin, 2 * margin);
  }

  private getShape(): GeneralPath {
    if (this.shapeCache === null) {
      const roomPath = new GeneralPath();
      for (let i = 0; i < this.pointsValue.length; i++) {
        if (i === 0) {
          roomPath.moveTo(this.pointsValue[0]![0]!, this.pointsValue[0]![1]!);
        } else {
          roomPath.lineTo(this.pointsValue[i]![0]!, this.pointsValue[i]![1]!);
        }
      }
      roomPath.closePath();
      this.shapeCache = roomPath;
    }
    return this.shapeCache;
  }

  move(dx: number, dy: number): void {
    const oldPoints = this.pointsValue;
    for (const point of this.pointsValue) {
      point[0] = f32(point[0]! + dx);
      point[1] = f32(point[1]! + dy);
    }
    this.clearShapeCache();
    this.firePropertyChange(Room.Property.POINTS, oldPoints, this.pointsValue);
  }

  override clone(): Room {
    const copy = Object.create(Room.prototype) as Room;
    this.copyBaseTo(copy);
    copy.name = this.name;
    copy.nameXOffset = this.nameXOffset;
    copy.nameYOffset = this.nameYOffset;
    copy.nameStyle = this.nameStyle;
    copy.nameAngle = this.nameAngle;
    copy.nameColor = this.nameColor;
    copy.nameVisible = this.nameVisible;
    copy.pointsValue = deepCopy(this.pointsValue);
    copy.areaVisible = this.areaVisible;
    copy.areaXOffset = this.areaXOffset;
    copy.areaYOffset = this.areaYOffset;
    copy.areaStyle = this.areaStyle;
    copy.areaAngle = this.areaAngle;
    copy.areaColor = this.areaColor;
    copy.floorVisible = this.floorVisible;
    copy.floorColor = this.floorColor;
    copy.floorTexture = this.floorTexture;
    copy.floorShininess = this.floorShininess;
    copy.ceilingVisible = this.ceilingVisible;
    copy.ceilingColor = this.ceilingColor;
    copy.ceilingTexture = this.ceilingTexture;
    copy.ceilingShininess = this.ceilingShininess;
    copy.ceilingFlat = this.ceilingFlat;
    copy.level = null;
    return copy;
  }
}

function deepCopy(points: number[][]): number[][] {
  return points.map((point) => [f32(point[0]!), f32(point[1]!)]);
}
