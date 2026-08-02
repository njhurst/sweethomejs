/**
 * Port of com.eteks.sweethome3d.model.Sash / LightSource / Baseboard /
 * ObjectProperty (GPL v2+). Small immutable value classes.
 */
import { f32 } from "../util/f32.js";
import type { HomeTexture } from "./HomeTexture.js";

export class Sash {
  private readonly xAxis: number;
  private readonly yAxis: number;
  private readonly width: number;
  private readonly startAngle: number;
  private readonly endAngle: number;
  private readonly horizontal: boolean;

  constructor(xAxis: number, yAxis: number, width: number, startAngle: number, endAngle: number, horizontal: boolean) {
    this.xAxis = f32(xAxis);
    this.yAxis = f32(yAxis);
    this.width = f32(width);
    this.startAngle = f32(startAngle);
    this.endAngle = f32(endAngle);
    this.horizontal = horizontal;
  }

  getXAxis(): number {
    return this.xAxis;
  }

  getYAxis(): number {
    return this.yAxis;
  }

  getWidth(): number {
    return this.width;
  }

  getStartAngle(): number {
    return this.startAngle;
  }

  getEndAngle(): number {
    return this.endAngle;
  }

  isHorizontal(): boolean {
    return this.horizontal;
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof Sash)) return false;
    return (
      this.xAxis === obj.xAxis &&
      this.yAxis === obj.yAxis &&
      this.width === obj.width &&
      this.startAngle === obj.startAngle &&
      this.endAngle === obj.endAngle &&
      this.horizontal === obj.horizontal
    );
  }
}

export class LightSource {
  private readonly x: number;
  private readonly y: number;
  private readonly z: number;
  private readonly color: number;
  private readonly diameter: number | null;

  constructor(x: number, y: number, z: number, color: number, diameter?: number | null) {
    this.x = f32(x);
    this.y = f32(y);
    this.z = f32(z);
    this.color = color;
    this.diameter = diameter === undefined || diameter === null ? null : f32(diameter);
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  getZ(): number {
    return this.z;
  }

  getColor(): number {
    return this.color;
  }

  getDiameter(): number | null {
    return this.diameter;
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof LightSource)) return false;
    return this.x === obj.x && this.y === obj.y && this.z === obj.z && this.color === obj.color && this.diameter === obj.diameter;
  }
}

export class Baseboard {
  private thickness: number;
  private height: number;
  private color: number | null;
  private texture: HomeTexture | null;

  constructor(thickness: number, height: number, color: number | null, texture: HomeTexture | null) {
    // The Java public constructor forwards to a private ctor with swapped args
    // (this(height, thickness, ...)), so the fields end up swapped relative to
    // the parameter names. Reproduce for parity.
    this.thickness = f32(height);
    this.height = f32(thickness);
    this.color = color;
    this.texture = texture;
  }

  /** Internal construction without the constructor's arg swap (used by deserialization). */
  static fromFields(thickness: number, height: number, color: number | null, texture: HomeTexture | null): Baseboard {
    const baseboard = Object.create(Baseboard.prototype) as Baseboard;
    baseboard.thickness = f32(thickness);
    baseboard.height = f32(height);
    baseboard.color = color;
    baseboard.texture = texture;
    return baseboard;
  }

  getThickness(): number {
    return this.thickness;
  }

  getHeight(): number {
    return this.height;
  }

  getColor(): number | null {
    return this.color;
  }

  getTexture(): HomeTexture | null {
    return this.texture;
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof Baseboard)) return false;
    return this.thickness === obj.thickness && this.height === obj.height && this.color === obj.color && this.texture === obj.texture;
  }
}

export class BoxBounds {
  private readonly xLower: number;
  private readonly yLower: number;
  private readonly zLower: number;
  private readonly xUpper: number;
  private readonly yUpper: number;
  private readonly zUpper: number;

  constructor(xLower: number, yLower: number, zLower: number, xUpper: number, yUpper: number, zUpper: number) {
    this.xLower = f32(xLower);
    this.yLower = f32(yLower);
    this.zLower = f32(zLower);
    this.xUpper = f32(xUpper);
    this.yUpper = f32(yUpper);
    this.zUpper = f32(zUpper);
  }

  getXLower(): number {
    return this.xLower;
  }

  getYLower(): number {
    return this.yLower;
  }

  getZLower(): number {
    return this.zLower;
  }

  getXUpper(): number {
    return this.xUpper;
  }

  getYUpper(): number {
    return this.yUpper;
  }

  getZUpper(): number {
    return this.zUpper;
  }
}

export class ObjectProperty {
  static readonly Type = {
    STRING: "STRING",
    INTEGER: "INTEGER",
    FLOAT: "FLOAT",
    BOOLEAN: "BOOLEAN",
    ENUM: "ENUM",
    TEXT: "TEXT",
    CONTENT: "CONTENT",
    COLOR: "COLOR",
  } as const;

  private readonly name: string;
  private readonly type: string;
  private readonly displayable: boolean;
  private readonly modifiable: boolean;
  private readonly exportable: boolean;
  private readonly displayedName: string | null;
  private readonly valueRange: [number, number] | null;
  private readonly valueDescriptions: string[];

  constructor(name: string);
  constructor(name: string, type: string);
  constructor(name: string, type: string, displayable: boolean, modifiable: boolean, exportable: boolean, displayedName: string | null);
  constructor(name: string, type: string, displayable: boolean, modifiable: boolean, exportable: boolean, displayedName: string | null, valueRange: [number, number] | null, valueDescriptions: string[]);
  constructor(
    name: string,
    typeOrNothing?: string,
    displayable = true,
    modifiable = true,
    exportable = true,
    displayedName: string | null = null,
    valueRange: [number, number] | null = null,
    valueDescriptions: string[] = [],
  ) {
    this.name = name;
    this.type = typeOrNothing ?? ObjectProperty.Type.STRING;
    this.displayable = displayable;
    this.modifiable = modifiable;
    this.exportable = exportable;
    this.displayedName = displayedName;
    this.valueRange = valueRange;
    this.valueDescriptions = valueDescriptions;
  }

  getName(): string {
    return this.name;
  }

  getType(): string {
    return this.type;
  }

  isDisplayable(): boolean {
    return this.displayable;
  }

  isModifiable(): boolean {
    return this.modifiable;
  }

  isExportable(): boolean {
    return this.exportable;
  }

  getDisplayedName(): string | null {
    return this.displayedName;
  }

  getValueRange(): [number, number] | null {
    return this.valueRange;
  }

  getValueDescriptions(): string[] {
    return this.valueDescriptions;
  }
}
