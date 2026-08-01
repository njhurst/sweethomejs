/**
 * Port of com.eteks.sweethome3d.model.HomeMaterial (GPL v2+). Immutable.
 */
import { f32 } from "../util/f32.js";
import type { HomeTexture } from "./HomeTexture.js";

export class HomeMaterial {
  private readonly name: string;
  private readonly key: string | null;
  private readonly color: number | null;
  private readonly texture: HomeTexture | null;
  private readonly shininess: number | null;

  constructor(name: string, color: number | null, texture: HomeTexture | null, shininess: number | null);
  constructor(name: string, key: string | null, color: number | null, texture: HomeTexture | null, shininess: number | null);
  constructor(name: string, keyOrColor: string | number | null, colorOrTexture: number | HomeTexture | null, textureOrShininess?: HomeTexture | number | null, shininess?: number | null) {
    this.name = name;
    if (typeof keyOrColor === "string" || keyOrColor === null) {
      this.key = keyOrColor;
      this.color = colorOrTexture as number | null;
      this.texture = textureOrShininess as HomeTexture | null;
      this.shininess = shininess === null || shininess === undefined ? null : f32(shininess);
    } else {
      this.key = null;
      this.color = keyOrColor;
      this.texture = colorOrTexture as HomeTexture | null;
      this.shininess = textureOrShininess === null || textureOrShininess === undefined ? null : f32(textureOrShininess as number);
    }
  }

  getName(): string {
    return this.name;
  }

  getKey(): string | null {
    return this.key;
  }

  getColor(): number | null {
    return this.color;
  }

  getTexture(): HomeTexture | null {
    return this.texture;
  }

  getShininess(): number | null {
    return this.shininess;
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof HomeMaterial)) return false;
    return (
      this.name === obj.name &&
      this.key === obj.key &&
      this.color === obj.color &&
      this.texture === obj.texture &&
      this.shininess === obj.shininess
    );
  }
}
