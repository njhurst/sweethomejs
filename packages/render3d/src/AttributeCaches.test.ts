/*
 * AttributeCaches.test.ts
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
 * Attribute cache tests (task 6.1): materials are shared by value key,
 * textures load asynchronously with observers, the Object3DBase lifecycle
 * disposes subscriptions.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, UserPreferences } from "@sweethomejs/core";
import { MaterialCache, TextureCache, colorToThree } from "./AttributeCaches.js";
import { Object3DBase } from "./Object3DBase.js";

describe("MaterialCache (task 6.1)", () => {
  it("shares materials for identical value keys", () => {
    const cache = new MaterialCache();
    const key = {
      diffuseColor: 0xa0522d,
      ambientColor: 0x000000,
      shininess: 0.2,
      opacity: 1,
      doubleSided: false,
    };
    expect(cache.getMaterial(key)).toBe(cache.getMaterial(key));
    // Different color → different material
    expect(cache.getMaterial({ ...key, diffuseColor: 0xffffff })).not.toBe(cache.getMaterial(key));
  });

  it("creates transparent materials for 0xAARRGGBB colors", () => {
    const cache = new MaterialCache();
    const material = cache.getMaterial({
      diffuseColor: 0x80a0522d,
      ambientColor: 0,
      shininess: 0,
      opacity: 1,
      doubleSided: false,
    });
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0x80 / 255, 4);
  });

  it("returns MeshPhysicalMaterial in physical mode (Design style)", () => {
    const cache = new MaterialCache();
    expect(cache.physical).toBe(false);
    const standard = cache.getMaterial({
      diffuseColor: 0xffffff,
      ambientColor: 0,
      shininess: 20,
      opacity: 1,
      doubleSided: false,
    });
    expect(standard).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(standard).not.toBeInstanceOf(THREE.MeshPhysicalMaterial);
    cache.physical = true;
    const physical = cache.getMaterial({
      diffuseColor: 0xffffff,
      ambientColor: 0,
      shininess: 20,
      opacity: 1,
      doubleSided: false,
    });
    expect(physical).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(physical.roughness).toBeCloseTo(1 - 20 / 128, 4);
  });

  it("converts 0xRRGGBB colors to THREE.Color", () => {
    const color = colorToThree(0x336699);
    // three 0.185 converts to linear working space on setHex; getHexString
    // converts back to sRGB for display
    expect(color.getHexString()).toBe("336699");
  });
});

describe("TextureCache (task 6.1)", () => {
  it("loads a texture and notifies observers once", async () => {
    // createImageBitmap is not available in Node; stub it
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    globalThis.createImageBitmap = (() => Promise.resolve({ width: 2, height: 2 })) as never;
    try {
      const cache = new TextureCache(
        () => ({ width: 2, height: 2, getContext: () => null }) as never,
      );
      const source = {
        openStream: async () => new Blob([new Uint8Array([1, 2, 3])]).stream(),
        getURL: () => "zip:0/texture.png",
      };
      let loaded: THREE.Texture | null | undefined;
      const first = cache.getTexture(source, (t) => {
        loaded = t;
      });
      expect(first).toBeNull(); // not loaded yet
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(loaded).not.toBeNull();
      // Second request reuses the cache without reloading
      let secondLoaded: THREE.Texture | null | undefined;
      const second = cache.getTexture(source, (t) => {
        secondLoaded = t;
      });
      expect(second).not.toBeNull();
      expect(second).toBe(loaded);
      expect(secondLoaded).toBeUndefined();
    } finally {
      globalThis.createImageBitmap = originalCreateImageBitmap;
    }
  });
});

describe("Object3DBase (task 6.1)", () => {
  it("registers and disposes model listeners", () => {
    const home = new Home();
    const listeners: Array<(evt: unknown) => void> = [];
    const fakeTarget = {
      addPropertyChangeListener: (l: (evt: unknown) => void) => listeners.push(l),
      removePropertyChangeListener: (l: (evt: unknown) => void) => {
        const index = listeners.indexOf(l);
        if (index !== -1) listeners.splice(index, 1);
      },
    };
    class TestBranch extends Object3DBase<{ name: string }> {
      getRoot(): THREE.Object3D {
        return new THREE.Group();
      }
      update(): void {}
      constructor() {
        super({ name: "x" }, home, new UserPreferences(), null);
        this.addModelListener(fakeTarget, () => {});
      }
    }
    const branch = new TestBranch();
    expect(listeners.length).toBe(1);
    branch.destroy();
    expect(listeners.length).toBe(0);
  });
});
