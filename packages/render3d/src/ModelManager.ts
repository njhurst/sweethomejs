/*
 * ModelManager.ts
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
 * ModelManager (task 6.5): loads 3D models (OBJ/DAE/3DS) from Content
 * asynchronously, caches the loaded scene graphs by content identity, and
 * normalizes models to fit a 1-unit box (Java ModelManager.getScaleTransform)
 * so pieces can scale them to their own width/height/depth.
 *
 * Loading runs off the WebGL critical path; a worker offload (Web Worker +
 * three loaders) can replace the main-thread FileLoader later without
 * changing this interface.
 */
import * as THREE from "three";
import type { HomePieceOfFurniture } from "@sweethomejs/core";

/** A content source (the piece's model). */
export interface ModelSource {
  openStream(): Promise<ReadableStream<Uint8Array>>;
  getURL(): string;
}

export interface LoadedModel {
  /** The normalized model group (fits a 1-unit box). */
  group: THREE.Group;
  /** The model's real size before normalization (width, height, depth). */
  realSize: [number, number, number];
  /** The format detected from the URL (obj/dae/3ds/unknown). */
  format: string;
}

export interface ModelLoaderFactory {
  (format: string): ModelLoader;
}

export interface ModelLoader {
  /** Parses the model bytes into a THREE.Group (in the model's own units). */
  parse(bytes: Uint8Array, url: string): Promise<THREE.Group | THREE.Scene>;
}

/**
 * The default loader factory uses three's loaders via a Blob URL. The Blob
 * API is unavailable in Node; a factory can be injected for tests.
 */
export function defaultLoaderFactory(): ModelLoaderFactory {
  return (format) => ({
    parse: async (bytes, url) => {
      const blob = new Blob([bytes as unknown as BlobPart]);
      const objectUrl = URL.createObjectURL(blob);
      try {
        switch (format) {
          case "obj": {
            const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
            const loader = new OBJLoader();
            const object = await loader.loadAsync(objectUrl);
            const group = new THREE.Group();
            group.add(object);
            return group;
          }
          case "dae": {
            const { ColladaLoader } = await import("three/examples/jsm/loaders/ColladaLoader.js");
            const loader = new ColladaLoader();
            const collada = await loader.loadAsync(objectUrl);
            const group = new THREE.Group();
            if (collada !== null && collada.scene !== undefined) {
              group.add(collada.scene);
            }
            return group;
          }
          case "3ds": {
            const { TDSLoader } = await import("three/examples/jsm/loaders/TDSLoader.js");
            const loader = new TDSLoader();
            const object = await loader.loadAsync(objectUrl);
            const group = new THREE.Group();
            if (object !== null) {
              group.add(object);
            }
            return group;
          }
          default:
            throw new Error(`Unsupported model format ${format}`);
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
  });
}

/** Detects the model format from a content URL. */
export function detectModelFormat(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".obj") || lower.includes(".obj?")) return "obj";
  if (lower.endsWith(".dae") || lower.includes(".dae?")) return "dae";
  if (lower.endsWith(".3ds") || lower.includes(".3ds?")) return "3ds";
  return "unknown";
}

/**
 * Sniffs the model format from the content bytes when the URL has no
 * extension (Sweet Home 3D homes reference models as zip entries like
 * "zip:2"). OBJ is text starting with vertices/comments; DAE is XML
 * (COLLADA); 3DS is the binary 0x4D4D chunk.
 */
export function detectModelFormatFromBytes(bytes: Uint8Array): string {
  const head = bytes.subarray(0, Math.min(bytes.length, 256));
  // Skip UTF-8 BOM / whitespace
  let i = 0;
  while (i < head.length && (head[i]! === 0xef || head[i]! === 0xbb || head[i]! === 0xbf || head[i]! === 0x20 || head[i]! === 0x09 || head[i]! === 0x0a || head[i]! === 0x0d)) {
    i++;
  }
  if (i < head.length) {
    const c = head[i]!;
    if (c === 0x76 || c === 0x23 || c === 0x6f || c === 0x6d) {
      // 'v' / '#' / 'o' / 'm' (mtllib) — OBJ
      return "obj";
    }
    if (c === 0x3c) {
      // '<' — XML (COLLADA)
      return "dae";
    }
    if (head.length >= 2 && head[0] === 0x4d && head[1] === 0x4d) {
      // 0x4D4D — 3DS chunk
      return "3ds";
    }
  }
  return "unknown";
}

/** Computes the bounding box of a group (model units). */
export function computeModelBounds(group: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(group);
  return box;
}

/**
 * Normalizes a loaded group per-axis to a 1×1×1 cube — Java's
 * ModelManager.getNormalizedTransform (width reference 1, scaled per axis).
 * The piece transform then stretches each axis to the piece's nominal
 * width/height/depth, so furniture fills its catalog box (matching Java).
 */
export function normalizeModel(group: THREE.Group, bounds: THREE.Box3): [number, number, number] {
  const minSize = 1e-5;
  const size = bounds.getSize(new THREE.Vector3());
  const realSize: [number, number, number] = [size.x, size.y, size.z];
  const scaleX = 1 / Math.max(minSize, size.x);
  const scaleY = 1 / Math.max(minSize, size.y);
  const scaleZ = 1 / Math.max(minSize, size.z);
  group.scale.set(scaleX, scaleY, scaleZ);
  // Center the model at the origin
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.set(-center.x * scaleX, -center.y * scaleY, -center.z * scaleZ);
  return realSize;
}

export class ModelManager {
  private readonly cache = new Map<string, LoadedModel>();
  private readonly loading = new Map<string, Promise<LoadedModel | null>>();
  private readonly waiters = new Map<string, Set<(model: LoadedModel | null) => void>>();
  private readonly loaderFactory: ModelLoaderFactory;

  constructor(loaderFactory?: ModelLoaderFactory) {
    this.loaderFactory = loaderFactory ?? defaultLoaderFactory();
  }

  /** A stable identity for a model (content URL + size). */
  static getModelIdentity(source: ModelSource): string {
    return `${source.getURL()}#${0}`;
  }

  /** Returns a cached model or null; starts loading when missing. */
  getModel(source: ModelSource, onLoaded: (model: LoadedModel | null) => void): LoadedModel | null {
    const identity = ModelManager.getModelIdentity(source);
    const cached = this.cache.get(identity);
    if (cached !== undefined) {
      return cached;
    }
    if (!this.loading.has(identity)) {
      const promise = this.loadModel(source, identity);
      this.loading.set(identity, promise);
      promise.then((model) => {
        this.loading.delete(identity);
        if (model !== null) {
          this.cache.set(identity, model);
        }
        const set = this.waiters.get(identity);
        if (set !== undefined) {
          for (const waiter of set) {
            waiter(model);
          }
          set.clear();
          this.waiters.delete(identity);
        }
      }).catch(() => {
        this.loading.delete(identity);
      });
    }
    let set = this.waiters.get(identity);
    if (set === undefined) {
      set = new Set();
      this.waiters.set(identity, set);
    }
    set.add(onLoaded);
    return null;
  }

  private async loadModel(source: ModelSource, identity: string): Promise<LoadedModel | null> {
    try {
      let format = detectModelFormat(source.getURL());
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
      // Extension-less zip entries (e.g. "zip:2") are sniffed from the bytes
      if (format === "unknown") {
        format = detectModelFormatFromBytes(bytes);
      }
      if (format === "unknown") {
        return null;
      }
      const loader = this.loaderFactory(format);
      const parsed = await loader.parse(bytes, source.getURL());
      const group = parsed instanceof THREE.Group ? parsed : new THREE.Group().add(parsed) as THREE.Group;
      const bounds = computeModelBounds(group);
      if (bounds.isEmpty()) {
        return null;
      }
      const realSize = normalizeModel(group, bounds);
      return { group, realSize, format };
    } catch {
      return null;
    }
  }

  /** Applies a piece's dimensions + rotation to a normalized model. */
  applyPieceTransform(model: LoadedModel, piece: HomePieceOfFurniture, target: THREE.Group): void {
    target.clear();
    const child = model.group.clone();
    const width = piece.getWidth();
    const depth = piece.getDepth();
    const height = piece.getHeight();
    const scaleX = piece.isModelMirrored() ? -width : width;
    // The clone carries the normalization scale (model fits a 1-unit box);
    // MULTIPLY by the piece dimensions instead of overwriting, so models that
    // are not already 1-unit-sized render at their piece size.
    child.scale.multiply(new THREE.Vector3(scaleX, height, depth));
    target.add(child);
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
    this.waiters.clear();
  }
}
