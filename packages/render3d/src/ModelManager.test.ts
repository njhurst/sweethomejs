/*
 * ModelManager.test.ts
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
 * ModelManager tests (task 6.5): format detection, normalization, caching
 * with waiters, and furniture placeholder→model swap.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, HomePieceOfFurniture, UserPreferences } from "@sweethomejs/core";
import { ModelManager, detectModelFormat, computeModelBounds, normalizeModel, type ModelLoaderFactory, type ModelSource } from "./ModelManager.js";
import { MaterialCache } from "./AttributeCaches.js";
import { FurnitureObject3D } from "./builders/objectBuilders.js";

function source(url: string, bytes: Uint8Array = new Uint8Array([1, 2, 3])): ModelSource {
  return {
    openStream: async () => new Blob([bytes]).stream(),
    getURL: () => url,
  };
}

function boxModelLoaderFactory(): ModelLoaderFactory {
  return () => ({
    parse: async () => {
      // A 10×20×30 box in model units
      const geometry = new THREE.BoxGeometry(10, 20, 30);
      const material = new THREE.MeshBasicMaterial();
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geometry, material));
      return group;
    },
  });
}

function makePiece(modelUrl: string | null): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("p", {
    getName: () => "Sofa", getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null,
    getModel: () => modelUrl === null ? null : { getURL: () => modelUrl, openStream: () => Promise.resolve(new Blob([new Uint8Array([1, 2, 3])]).stream()) },
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
  } as never);
  return piece;
}

describe("ModelManager (task 6.5)", () => {
  it("detects the model format from the URL", () => {
    expect(detectModelFormat("zip:0/sofa.obj")).toBe("obj");
    expect(detectModelFormat("https://x/model.dae")).toBe("dae");
    expect(detectModelFormat("zip:1/table.3ds")).toBe("3ds");
    expect(detectModelFormat("zip:2/unknown.txt")).toBe("unknown");
  });

  it("normalizes a model to fit a 1-unit box", () => {
    const geometry = new THREE.BoxGeometry(10, 20, 30);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
    const bounds = computeModelBounds(group);
    const realSize = normalizeModel(group, bounds);
    expect(realSize).toEqual([10, 20, 30]);
    const normalizedBounds = computeModelBounds(group);
    const size = normalizedBounds.getSize(new THREE.Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(1, 4);
  });

  it("loads, caches and notifies waiters once", async () => {
    const manager = new ModelManager(boxModelLoaderFactory());
    const model = source("zip:0/sofa.obj");
    let loaded: unknown = "pending";
    const first = manager.getModel(model, (m) => { loaded = m; });
    expect(first).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(loaded).not.toBe("pending");
    // Second request reuses the cache
    let secondLoaded = "pending";
    const second = manager.getModel(model, (m) => { secondLoaded = m; });
    expect(second).not.toBeNull();
    expect(second).toBe(loaded);
    expect(secondLoaded).toBe("pending");
  });

  it("applies a piece's dimensions to the normalized model", async () => {
    const manager = new ModelManager(boxModelLoaderFactory());
    const piece = makePiece("zip:0/sofa.obj");
    const modelSource = source("zip:0/sofa.obj");
    manager.getModel(modelSource, () => {});
    await new Promise((resolve) => setTimeout(resolve, 100));
    const loaded = manager.getModel(modelSource, () => {});
    expect(loaded).not.toBeNull();
    const target = new THREE.Group();
    manager.applyPieceTransform(loaded!, piece, target);
    const child = target.children[0] as THREE.Group;
    // The 1-unit model scaled to 100 × 30 × 50
    expect(child.scale.x).toBeCloseTo(100, 4);
    expect(child.scale.y).toBeCloseTo(30, 4);
    expect(child.scale.z).toBeCloseTo(50, 4);
  });
});

describe("FurnitureObject3D model swap (task 6.5)", () => {
  it("shows a placeholder and swaps to the loaded model", async () => {
    const home = new Home();
    const piece = makePiece("zip:0/sofa.obj");
    piece.setX(100);
    piece.setY(50);
    home.addPieceOfFurniture(piece);
    const manager = new ModelManager(boxModelLoaderFactory());
    const builder = new FurnitureObject3D(piece, home, new UserPreferences(), new MaterialCache(), manager);
    // Placeholder while loading
    expect(builder.getRoot().children[0]).toBeInstanceOf(THREE.Mesh);
    expect(builder.getLoadedModel()).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 100));
    // The model arrives (via the waiter) and replaces the placeholder
    expect(builder.getLoadedModel()).not.toBeNull();
    builder.destroy();
  });

  it("keeps the placeholder for pieces without a model", () => {
    const home = new Home();
    const piece = makePiece(null);
    home.addPieceOfFurniture(piece);
    const builder = new FurnitureObject3D(piece, home, new UserPreferences(), new MaterialCache());
    expect(builder.getRoot().children[0]).toBeInstanceOf(THREE.Mesh);
    expect(builder.getLoadedModel()).toBeNull();
    builder.destroy();
  });
});
