/**
 * Port of com.eteks.sweethome3d.model.HomeTexture (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import type { Content } from "./Content.js";
import type { TextureImage } from "./stubs.js";

type TextureSupplier = TextureImage & {
  getCatalogId?: () => string | null;
  getName?: () => string | null;
  getCreator?: () => string | null;
  getImage: () => Content;
  getWidth: () => number;
  getHeight: () => number;
};

export class HomeTexture {
  static readonly Property = {
    CATALOG_ID: "CATALOG_ID",
    NAME: "NAME",
    CREATOR: "CREATOR",
    IMAGE: "IMAGE",
    WIDTH: "WIDTH",
    HEIGHT: "HEIGHT",
    X_OFFSET: "X_OFFSET",
    Y_OFFSET: "Y_OFFSET",
    ANGLE: "ANGLE",
    SCALE: "SCALE",
    FITTING_AREA: "FITTING_AREA",
    LEFT_TO_RIGHT_ORIENTED: "LEFT_TO_RIGHT_ORIENTED",
  } as const;

  private readonly catalogId: string | null;
  private readonly name: string | null;
  private readonly creator: string | null;
  private readonly image: Content;
  private readonly width: number;
  private readonly height: number;
  private readonly xOffset: number;
  private readonly yOffset: number;
  private readonly angle: number;
  private scale: number;
  private fittingArea: boolean;
  private readonly leftToRightOriented: boolean;

  constructor(texture: TextureImage);
  constructor(texture: TextureImage, angle: number, leftToRightOriented: boolean);
  constructor(texture: TextureImage, angle: number, scale: number, leftToRightOriented: boolean);
  constructor(texture: TextureImage, xOffset: number, yOffset: number, angle: number, scale: number, leftToRightOriented: boolean);
  constructor(texture: TextureImage, xOffset: number, yOffset: number, angle: number, scale: number, fittingArea: boolean, leftToRightOriented: boolean);
  constructor(texture: TextureImage, ...args: Array<number | boolean>) {
    const t = texture as TextureSupplier;
    this.catalogId = t.getCatalogId?.() ?? null;
    this.name = t.getName?.() ?? null;
    this.creator = t.getCreator?.() ?? null;
    this.image = t.getImage();
    this.width = f32(t.getWidth());
    this.height = f32(t.getHeight());

    const num = (v: number | boolean | undefined): number => (typeof v === "boolean" ? 0 : v ?? 0);
    const bool = (v: number | boolean | undefined, dflt: boolean): boolean => (v === undefined ? dflt : typeof v === "boolean" ? v : true);
    let xOffset: number;
    let yOffset: number;
    let angle: number;
    let scale: number;
    let fittingArea: boolean;
    let oriented: boolean;
    switch (args.length) {
      case 0: // defaults
        xOffset = 0;
        yOffset = 0;
        angle = 0;
        scale = 1;
        fittingArea = false;
        oriented = true;
        break;
      case 2: // (angle, leftToRightOriented)
        xOffset = 0;
        yOffset = 0;
        angle = num(args[0]);
        scale = 1;
        fittingArea = false;
        oriented = bool(args[1], true);
        break;
      case 3: // (angle, scale, leftToRightOriented)
        xOffset = 0;
        yOffset = 0;
        angle = num(args[0]);
        scale = num(args[1]);
        fittingArea = false;
        oriented = bool(args[2], true);
        break;
      case 5: // (xOffset, yOffset, angle, scale, leftToRightOriented)
        xOffset = num(args[0]);
        yOffset = num(args[1]);
        angle = num(args[2]);
        scale = num(args[3]);
        fittingArea = false;
        oriented = bool(args[4], true);
        break;
      default: // (xOffset, yOffset, angle, scale, fittingArea, leftToRightOriented)
        xOffset = num(args[0]);
        yOffset = num(args[1]);
        angle = num(args[2]);
        scale = num(args[3]);
        fittingArea = bool(args[4], false);
        oriented = bool(args[5], true);
    }
    this.xOffset = f32(xOffset);
    this.yOffset = f32(yOffset);
    this.angle = f32(angle);
    this.scale = f32(scale);
    this.fittingArea = fittingArea;
    this.leftToRightOriented = oriented;
  }

  getCatalogId(): string | null {
    return this.catalogId;
  }

  getName(): string | null {
    return this.name;
  }

  getCreator(): string | null {
    return this.creator;
  }

  getImage(): Content {
    return this.image;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getXOffset(): number {
    return this.xOffset;
  }

  getYOffset(): number {
    return this.yOffset;
  }

  getAngle(): number {
    return this.angle;
  }

  getScale(): number {
    return this.scale;
  }

  isFittingArea(): boolean {
    return this.fittingArea;
  }

  setFittingArea(fittingArea: boolean): void {
    this.fittingArea = fittingArea;
  }

  isLeftToRightOriented(): boolean {
    return this.leftToRightOriented;
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof HomeTexture)) return false;
    return (
      this.catalogId === obj.catalogId &&
      this.name === obj.name &&
      this.image === obj.image &&
      this.width === obj.width &&
      this.height === obj.height &&
      this.xOffset === obj.xOffset &&
      this.yOffset === obj.yOffset &&
      this.angle === obj.angle &&
      this.scale === obj.scale &&
      this.fittingArea === obj.fittingArea &&
      this.leftToRightOriented === obj.leftToRightOriented
    );
  }
}
