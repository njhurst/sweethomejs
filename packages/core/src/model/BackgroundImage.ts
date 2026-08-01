/**
 * Port of com.eteks.sweethome3d.model.BackgroundImage (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import type { Content } from "./Content.js";
import { HomeObject } from "./HomeObject.js";

export class BackgroundImage extends HomeObject {
  static readonly Property = {
    IMAGE: "IMAGE",
    SCALE: "SCALE",
    X_OFFSET: "X_OFFSET",
    Y_OFFSET: "Y_OFFSET",
    ANGLE: "ANGLE",
  } as const;

  private image: Content | null = null;
  private scale: number;
  private xOffset: number;
  private yOffset: number;
  private angle: number;

  constructor(scale: number, xOffset: number, yOffset: number, angle: number);
  constructor(id: string, scale: number, xOffset: number, yOffset: number, angle: number);
  constructor(
    scaleOrId: number | string,
    scaleOrXOffset: number,
    xOffsetOrYOffset: number,
    yOffsetOrAngle: number,
    angle = 0,
  ) {
    if (typeof scaleOrId === "string") {
      super(scaleOrId);
      this.scale = f32(scaleOrXOffset);
      this.xOffset = f32(xOffsetOrYOffset);
      this.yOffset = f32(yOffsetOrAngle);
      this.angle = f32(angle);
    } else {
      super();
      this.scale = f32(scaleOrId);
      this.xOffset = f32(scaleOrXOffset);
      this.yOffset = f32(xOffsetOrYOffset);
      this.angle = f32(yOffsetOrAngle);
    }
  }

  getImage(): Content | null {
    return this.image;
  }

  setImage(image: Content | null): void {
    if (image !== this.image) {
      const oldImage = this.image;
      this.image = image;
      this.firePropertyChange(BackgroundImage.Property.IMAGE, oldImage, image);
    }
  }

  getScale(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    const narrowed = f32(scale);
    if (narrowed !== this.scale) {
      const oldScale = this.scale;
      this.scale = narrowed;
      this.firePropertyChange(BackgroundImage.Property.SCALE, oldScale, narrowed);
    }
  }

  getXOffset(): number {
    return this.xOffset;
  }

  setXOffset(xOffset: number): void {
    const narrowed = f32(xOffset);
    if (narrowed !== this.xOffset) {
      const oldXOffset = this.xOffset;
      this.xOffset = narrowed;
      this.firePropertyChange(BackgroundImage.Property.X_OFFSET, oldXOffset, narrowed);
    }
  }

  getYOffset(): number {
    return this.yOffset;
  }

  setYOffset(yOffset: number): void {
    const narrowed = f32(yOffset);
    if (narrowed !== this.yOffset) {
      const oldYOffset = this.yOffset;
      this.yOffset = narrowed;
      this.firePropertyChange(BackgroundImage.Property.Y_OFFSET, oldYOffset, narrowed);
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
      this.firePropertyChange(BackgroundImage.Property.ANGLE, oldAngle, narrowed);
    }
  }

  override clone(): BackgroundImage {
    const copy = Object.create(BackgroundImage.prototype) as BackgroundImage;
    this.copyBaseTo(copy);
    copy.image = this.image;
    copy.scale = this.scale;
    copy.xOffset = this.xOffset;
    copy.yOffset = this.yOffset;
    copy.angle = this.angle;
    return copy;
  }
}
