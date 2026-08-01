/**
 * Port of com.eteks.sweethome3d.model.BackgroundImage (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import type { Content } from "./Content.js";
import { HomeObject } from "./HomeObject.js";

export class BackgroundImage extends HomeObject {
  static readonly Property = {
    IMAGE: "IMAGE",
    SCALE_DISTANCE: "SCALE_DISTANCE",
    SCALE_DISTANCE_X_START: "SCALE_DISTANCE_X_START",
    SCALE_DISTANCE_Y_START: "SCALE_DISTANCE_Y_START",
    SCALE_DISTANCE_X_END: "SCALE_DISTANCE_X_END",
    SCALE_DISTANCE_Y_END: "SCALE_DISTANCE_Y_END",
    X_ORIGIN: "X_ORIGIN",
    Y_ORIGIN: "Y_ORIGIN",
    VISIBLE: "VISIBLE",
  } as const;

  private image: Content | null;
  private scaleDistance: number;
  private scaleDistanceXStart: number;
  private scaleDistanceYStart: number;
  private scaleDistanceXEnd: number;
  private scaleDistanceYEnd: number;
  private xOrigin: number;
  private yOrigin: number;
  private invisible: boolean;

  constructor(
    image: Content | null,
    scaleDistance: number,
    scaleDistanceXStart: number,
    scaleDistanceYStart: number,
    scaleDistanceXEnd: number,
    scaleDistanceYEnd: number,
    xOrigin: number,
    yOrigin: number,
    visible: boolean,
  );
  constructor(id: string, image: Content | null, scaleDistance: number, scaleDistanceXStart: number, scaleDistanceYStart: number, scaleDistanceXEnd: number, scaleDistanceYEnd: number, xOrigin: number, yOrigin: number, visible: boolean);
  constructor(
    imageOrId: Content | null | string,
    scaleDistanceOrImage: number | Content | null,
    scaleDistanceXStartOrScale: number,
    scaleDistanceYStartOrXStart: number,
    scaleDistanceXEndOrYStart: number,
    scaleDistanceYEndOrXEnd: number,
    xOriginOrYEnd: number,
    yOriginOrXOrigin: number,
    visibleOrYOrigin: number | boolean,
    visible?: boolean,
  ) {
    if (typeof imageOrId === "string") {
      super(imageOrId);
      this.image = scaleDistanceOrImage as Content | null;
      this.scaleDistance = f32(scaleDistanceXStartOrScale);
      this.scaleDistanceXStart = f32(scaleDistanceYStartOrXStart);
      this.scaleDistanceYStart = f32(scaleDistanceXEndOrYStart);
      this.scaleDistanceXEnd = f32(scaleDistanceYEndOrXEnd);
      this.scaleDistanceYEnd = f32(xOriginOrYEnd);
      this.xOrigin = f32(yOriginOrXOrigin);
      this.yOrigin = f32(visibleOrYOrigin as number);
      this.invisible = visible === false;
    } else {
      super();
      this.image = imageOrId;
      this.scaleDistance = f32(scaleDistanceOrImage as number);
      this.scaleDistanceXStart = f32(scaleDistanceXStartOrScale);
      this.scaleDistanceYStart = f32(scaleDistanceYStartOrXStart);
      this.scaleDistanceXEnd = f32(scaleDistanceXEndOrYStart);
      this.scaleDistanceYEnd = f32(scaleDistanceYEndOrXEnd);
      this.xOrigin = f32(xOriginOrYEnd);
      this.yOrigin = f32(yOriginOrXOrigin);
      this.invisible = visibleOrYOrigin === false;
    }
  }

  getImage(): Content | null {
    return this.image;
  }

  getScaleDistance(): number {
    return this.scaleDistance;
  }

  getScaleDistanceXStart(): number {
    return this.scaleDistanceXStart;
  }

  getScaleDistanceYStart(): number {
    return this.scaleDistanceYStart;
  }

  getScaleDistanceXEnd(): number {
    return this.scaleDistanceXEnd;
  }

  getScaleDistanceYEnd(): number {
    return this.scaleDistanceYEnd;
  }

  getXOrigin(): number {
    return this.xOrigin;
  }

  getYOrigin(): number {
    return this.yOrigin;
  }

  isVisible(): boolean {
    return !this.invisible;
  }

  override clone(): BackgroundImage {
    const copy = Object.create(BackgroundImage.prototype) as BackgroundImage;
    this.copyBaseTo(copy);
    copy.image = this.image;
    copy.scaleDistance = this.scaleDistance;
    copy.scaleDistanceXStart = this.scaleDistanceXStart;
    copy.scaleDistanceYStart = this.scaleDistanceYStart;
    copy.scaleDistanceXEnd = this.scaleDistanceXEnd;
    copy.scaleDistanceYEnd = this.scaleDistanceYEnd;
    copy.xOrigin = this.xOrigin;
    copy.yOrigin = this.yOrigin;
    copy.invisible = this.invisible;
    return copy;
  }
}
