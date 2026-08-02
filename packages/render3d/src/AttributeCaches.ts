/*
 * AttributeCaches.ts
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */

/**
 * Attribute caches (task 6.1): materials and textures keyed by value,
 * mirroring Object3DBranch.getMaterial and TextureManager. Sharing materials
 * and textures across objects keeps memory and shader count low for large
 * homes.
 */
import * as THREE from "three";
import type { HomeTexture } from "@sweethomejs/core";

// ---------------------------------------------------------------------------
// Material cache

export interface MaterialKey {
  /** 0xRRGGBB or 0xAARRGGBB diffuse color, or null for default. */
  diffuseColor: number | null;
  /** 0xRRGGBB ambient color, or null. */
  ambientColor: number | null;
  shininess: number;
  /** Set when the material is transparent (e.g. wallsAlpha < 1). */
  opacity: number;
  /** Back-face rendering (rooms with holes, wall cutouts). */
  doubleSided: boolean;
}

function materialKeyString(key: MaterialKey): string {
  return `${key.diffuseColor ?? "d"}|${key.ambientColor ?? "a"}|${key.shininess}|${key.opacity}|${key.doubleSided}`;
}

/** Converts a 0xRRGGBB/0xAARRGGBB color to a THREE.Color. */
export function colorToThree(color: number | null): THREE.Color {
  const value = (color ?? 0xffffff) >>> 0;
  // setHex is unambiguous in recent three versions (Color(number) shifts)
  return new THREE.Color().setHex(value & 0xffffff);
}

export class MaterialCache {
  private readonly materials = new Map<string, THREE.Material>();

  /** Returns a shared material for the given key (Java getMaterial). */
  getMaterial(key: MaterialKey): THREE.MeshStandardMaterial {
    const id = materialKeyString(key);
    let material = this.materials.get(id) as THREE.MeshStandardMaterial | undefined;
    if (material === undefined) {
      const hasAlpha = key.diffuseColor !== null && (key.diffuseColor >>> 0) > 0xffffff;
      const alpha = hasAlpha ? ((key.diffuseColor! >>> 24) & 0xff) / 255 : 1;
      material = new THREE.MeshStandardMaterial({
        color: colorToThree(key.diffuseColor),
        emissive: colorToThree(key.ambientColor),
        roughness: key.shininess === 0 ? 1 : Math.max(0, 1 - key.shininess / 128),
        metalness: 0,
        transparent: alpha < 1 || key.opacity < 1,
        opacity: Math.min(alpha, key.opacity),
        side: key.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      });
      this.materials.set(id, material);
    }
    return material;
  }

  /** A shared unlit outline material (selection outlines). */
  getOutlineMaterial(color: number): THREE.MeshBasicMaterial {
    const id = `outline:${(color >>> 0).toString(16)}`;
    let material = this.materials.get(id) as THREE.MeshBasicMaterial | undefined;
    if (material === undefined) {
      material = new THREE.MeshBasicMaterial({
        color: colorToThree(color),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      this.materials.set(id, material);
    }
    return material;
  }

  clear(): void {
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();
  }
}

// ---------------------------------------------------------------------------
// Texture cache

/** A texture loaded from model content, with a loading callback. */
export interface LoadedTexture {
  texture: THREE.Texture | null;
  /** The image source (for the icon renderer). */
  image: unknown | null;
}

export interface TextureSource {
  /** Opens the content bytes. */
  openStream(): Promise<ReadableStream<Uint8Array>>;
  /** A stable URL identifying the content. */
  getURL(): string;
}

/**
 * Loads textures from Content asynchronously; observers are notified when a
 * texture becomes available (like TextureManager's loadingTextureObservers).
 */
export class TextureCache {
  private readonly textures = new Map<string, THREE.Texture>();
  private readonly loading = new Map<string, Promise<THREE.Texture | null>>();
  private readonly observers = new Map<string, Set<(texture: THREE.Texture | null) => void>>();
  /** Canvas factory (document.createElement in browsers; injectable in tests). */
  private readonly canvasFactory: () => HTMLCanvasElement;

  constructor(canvasFactory?: () => HTMLCanvasElement) {
    this.canvasFactory = canvasFactory ?? (() => document.createElement("canvas"));
  }

  /** Returns a cached texture or null; starts loading when missing. */
  getTexture(
    source: TextureSource,
    onLoaded: (texture: THREE.Texture | null) => void,
  ): THREE.Texture | null {
    const url = source.getURL();
    const cached = this.textures.get(url);
    if (cached !== undefined) {
      return cached;
    }
    if (!this.loading.has(url)) {
      const promise = this.loadTexture(source);
      this.loading.set(url, promise);
      promise.then((texture) => {
        this.loading.delete(url);
        if (texture !== null) {
          this.textures.set(url, texture);
        }
        const set = this.observers.get(url);
        if (set !== undefined) {
          for (const observer of set) {
            observer(texture);
          }
          set.clear();
          this.observers.delete(url);
        }
      }).catch(() => {
        this.loading.delete(url);
      });
    }
    let set = this.observers.get(url);
    if (set === undefined) {
      set = new Set();
      this.observers.set(url, set);
    }
    set.add(onLoaded);
    return null;
  }

  private async loadTexture(source: TextureSource): Promise<THREE.Texture | null> {
    try {
      const stream = await source.openStream();
      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
      }
      const total = chunks.reduce((sum, c) => sum + c.length, 0);
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const blob = new Blob([bytes]);
      const bitmap = await createImageBitmap(blob);
      const texture = new THREE.CanvasTexture(bitmapToCanvas(bitmap, this.canvasFactory));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    } catch {
      return null;
    }
  }

  clear(): void {
    for (const texture of this.textures.values()) {
      texture.dispose();
    }
    this.textures.clear();
    this.loading.clear();
    this.observers.clear();
  }
}

function bitmapToCanvas(bitmap: ImageBitmap, canvasFactory: () => HTMLCanvasElement): HTMLCanvasElement {
  const canvas = canvasFactory();
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    ctx.drawImage(bitmap, 0, 0);
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// HomeTexture → Three.js mapping

export interface HomeTextureAttributes {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

/** Applies a HomeTexture's transform to a Three.js texture (Java TextureAttributes). */
export function applyHomeTextureAttributes(texture: THREE.Texture, homeTexture: HomeTexture, width: number, depth: number): void {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const scale = homeTexture.getScale();
  texture.repeat.set(width / scale, depth / scale);
  const xOffset = homeTexture.getXOffset();
  const yOffset = homeTexture.getYOffset();
  texture.offset.set(xOffset / scale, yOffset / scale);
  const angle = homeTexture.getAngle();
  if (angle !== 0) {
    texture.rotation = angle;
    texture.center.set(0.5, 0.5);
  }
}
