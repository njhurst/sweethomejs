/**
 * Port of com.eteks.sweethome3d.model.Label (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import type { Level } from "./Level.js";
import type { Selectable } from "./Selectable.js";
import type { TextStyle } from "./TextStyle.js";

export class Label extends HomeObject implements Selectable {
  static readonly Property = {
    TEXT: "TEXT",
    X: "X",
    Y: "Y",
    ELEVATION: "ELEVATION",
    STYLE: "STYLE",
    COLOR: "COLOR",
    OUTLINE_COLOR: "OUTLINE_COLOR",
    ANGLE: "ANGLE",
    PITCH: "PITCH",
    LEVEL: "LEVEL",
  } as const;

  private text: string;
  private x: number;
  private y: number;
  private style: TextStyle | null = null;
  private color: number | null = null;
  private outlineColor: number | null = null;
  private angle = 0;
  private pitch: number | null = null;
  private elevation = 0;
  private level: Level | null = null;

  constructor(text: string, x: number, y: number);
  constructor(id: string | undefined, text: string, x: number, y: number);
  constructor(idOrText: string, textOrX: string | number, xOrY: number, y = 0) {
    if (typeof textOrX === "string") {
      super(idOrText);
      this.text = textOrX;
      this.x = f32(xOrY);
      this.y = f32(y);
    } else {
      super(HomeObject.createId("label"));
      this.text = idOrText;
      this.x = f32(textOrX);
      this.y = f32(xOrY);
    }
  }

  getText(): string {
    return this.text;
  }

  setText(text: string): void {
    if (text !== this.text) {
      const oldText = this.text;
      this.text = text;
      this.firePropertyChange(Label.Property.TEXT, oldText, text);
    }
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    const narrowed = f32(x);
    if (narrowed !== this.x) {
      const oldX = this.x;
      this.x = narrowed;
      this.firePropertyChange(Label.Property.X, oldX, narrowed);
    }
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): void {
    const narrowed = f32(y);
    if (narrowed !== this.y) {
      const oldY = this.y;
      this.y = narrowed;
      this.firePropertyChange(Label.Property.Y, oldY, narrowed);
    }
  }

  getGroundElevation(): number {
    return this.level !== null ? this.level.getElevation() : 0;
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    const narrowed = f32(elevation);
    if (narrowed !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = narrowed;
      this.firePropertyChange(Label.Property.ELEVATION, oldElevation, narrowed);
    }
  }

  getStyle(): TextStyle | null {
    return this.style;
  }

  setStyle(style: TextStyle | null): void {
    if (style !== this.style) {
      const oldStyle = this.style;
      this.style = style;
      this.firePropertyChange(Label.Property.STYLE, oldStyle, style);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.firePropertyChange(Label.Property.COLOR, oldColor, color);
    }
  }

  getOutlineColor(): number | null {
    return this.outlineColor;
  }

  setOutlineColor(outlineColor: number | null): void {
    if (outlineColor !== this.outlineColor) {
      const oldOutlineColor = this.outlineColor;
      this.outlineColor = outlineColor;
      this.firePropertyChange(Label.Property.OUTLINE_COLOR, oldOutlineColor, outlineColor);
    }
  }

  getAngle(): number {
    return this.angle;
  }

  setAngle(angle: number): void {
    const narrowed = f32(angle);
    if (narrowed !== this.angle) {
      const oldAngle = this.angle;
      this.angle = narrowed;
      this.firePropertyChange(Label.Property.ANGLE, oldAngle, narrowed);
    }
  }

  getPitch(): number | null {
    return this.pitch;
  }

  setPitch(pitch: number | null): void {
    const narrowed = pitch === null ? null : f32(pitch);
    if (narrowed !== this.pitch) {
      const oldPitch = this.pitch;
      this.pitch = narrowed;
      this.firePropertyChange(Label.Property.PITCH, oldPitch, narrowed);
    }
  }

  getLevel(): Level | null {
    return this.level;
  }

  setLevel(level: Level | null): void {
    if (level !== this.level) {
      const oldLevel = this.level;
      this.level = level;
      this.firePropertyChange(Label.Property.LEVEL, oldLevel, level);
    }
  }

  isAtLevel(level: Level): boolean {
    return this.level === level;
  }

  getPoints(): number[][] {
    return [[this.x, this.y]];
  }

  intersectsRectangle(x0: number, y0: number, x1: number, y1: number): boolean {
    return (
      this.x >= Math.min(x0, x1) &&
      this.x <= Math.max(x0, x1) &&
      this.y >= Math.min(y0, y1) &&
      this.y <= Math.max(y0, y1)
    );
  }

  containsPoint(x: number, y: number, margin: number): boolean {
    return Math.abs(x - this.x) <= margin && Math.abs(y - this.y) <= margin;
  }

  move(dx: number, dy: number): void {
    this.setX(this.getX() + dx);
    this.setY(this.getY() + dy);
  }

  override clone(): Label {
    const copy = Object.create(Label.prototype) as Label;
    this.copyBaseTo(copy);
    copy.text = this.text;
    copy.x = this.x;
    copy.y = this.y;
    copy.style = this.style;
    copy.color = this.color;
    copy.outlineColor = this.outlineColor;
    copy.angle = this.angle;
    copy.pitch = this.pitch;
    copy.elevation = this.elevation;
    copy.level = null;
    return copy;
  }
}
