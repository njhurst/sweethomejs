/*
 * TopViewIconRenderer.test.ts
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
 * TopViewIconRenderer tests (task 6.6): renders a piece's model from the top
 * into a canvas using an injectable (mock) WebGL renderer.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, HomePieceOfFurniture } from "@sweethomejs/core";
import { ModelManager } from "./ModelManager.js";
import { TopViewIconRenderer } from "./TopViewIconRenderer.js";

class MockRenderer {
  renderCalls = 0;
  size: { width: number; height: number } | null = null;
  disposed = false;

  setSize(width: number, height: number, updateStyle: boolean): void {
    this.size = { width, height };
    void updateStyle;
  }
  setPixelRatio(ratio: number): void {
    void ratio;
  }
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    void scene;
    void camera;
    this.renderCalls++;
  }
  dispose(): void {
    this.disposed = true;
  }
}

function makePiece(): HomePieceOfFurniture {
  return new HomePieceOfFurniture("p", {
    getName: () => "Sofa", getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null,
    getModel: () => ({ getURL: () => "zip:0/sofa.obj", openStream: () => Promise.resolve(new Blob([new Uint8Array([1])]).stream()) }),
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
  } as never);
}

describe("TopViewIconRenderer (task 6.6)", () => {
  it("is supported when a renderer can be created", () => {
    const modelManager = new ModelManager(() => ({
      parse: async () => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
        return group;
      },
    }));
    const renderer = new TopViewIconRenderer({
      modelManager,
      rendererFactory: () => new MockRenderer() as never,
      canvasFactory: () => ({ width: 0, height: 0 } as never),
    });
    expect(renderer.isSupported()).toBe(true);
    renderer.destroy();
  });

  it("renders the piece model from the top into a canvas", async () => {
    const modelManager = new ModelManager(() => ({
      parse: async () => {
        const group = new THREE.Group();
        group.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
        return group;
      },
    }));
    const mockRenderer = new MockRenderer();
    const renderer = new TopViewIconRenderer({
      modelManager,
      rendererFactory: () => mockRenderer as never,
      canvasFactory: () => ({ width: 0, height: 0 } as never),
    });
    const canvas = await renderer.renderTopView(makePiece(), 200, 100);
    expect(canvas).not.toBeNull();
    expect(mockRenderer.renderCalls).toBe(1);
    expect(mockRenderer.size!.width).toBe(200);
    expect(mockRenderer.size!.height).toBe(100);
    renderer.destroy();
  });

  it("returns null without WebGL support", async () => {
    const modelManager = new ModelManager(() => ({
      parse: async () => new THREE.Group(),
    }));
    const renderer = new TopViewIconRenderer({
      modelManager,
      rendererFactory: () => {
        throw new Error("no webgl");
      },
    });
    expect(renderer.isSupported()).toBe(false);
    const canvas = await renderer.renderTopView(makePiece(), 200, 100);
    expect(canvas).toBeNull();
    renderer.destroy();
  });
});
