/*
 * TopViewIconRenderer.ts
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
 * TopViewIconRenderer (task 6.6): implements render2d's FurnitureIconRenderer
 * seam — renders a furniture piece's 3D model from directly above into an
 * offscreen canvas, for use as the plan's furniture icon. Uses a small
 * orthographic camera and the ModelManager (6.5); falls back to null (the
 * plan placeholder) when WebGL is unavailable or the model can't load.
 */
import * as THREE from "three";
import type { HomePieceOfFurniture } from "@sweethomejs/core";
import { ModelManager, type LoadedModel } from "./ModelManager.js";
import { SceneLights } from "./SceneLights.js";

export interface TopViewIconRendererOptions {
  modelManager: ModelManager;
  /** A renderer factory (defaults to THREE.WebGLRenderer with antialias). */
  rendererFactory?: () => THREE.WebGLRenderer;
  /** Canvas factory (defaults to document.createElement). */
  canvasFactory?: () => HTMLCanvasElement;
  /** Environment used by the icon scene (null uses the default). */
  environment?: THREE.Scene;
  background?: THREE.Color;
}

/**
 * Renders the piece's model from the top into a canvas. The piece transform
 * (width/height/depth) is applied to the normalized model, an orthographic
 * camera looks down +y, and the light rig illuminates it.
 */
export class TopViewIconRenderer {
  private readonly modelManager: ModelManager;
  private readonly canvasFactory: () => HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer | null;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly lightRig: THREE.Group;
  private rendererCreated = false;

  constructor(options: TopViewIconRendererOptions) {
    this.modelManager = options.modelManager;
    this.canvasFactory = options.canvasFactory ?? (() => document.createElement("canvas"));
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = (options.rendererFactory ?? (() => new THREE.WebGLRenderer({ antialias: true })))();
      this.rendererCreated = true;
    } catch {
      renderer = null;
    }
    this.renderer = renderer;
    void this.rendererCreated;
    this.scene = options.environment ?? new THREE.Scene();
    this.scene.background = options.background ?? new THREE.Color(0xffffff);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.lightRig = new THREE.Group();
    this.lightRig.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(1, 2, 0.5);
    this.lightRig.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-1, 1, -1);
    this.lightRig.add(fill);
    this.scene.add(this.lightRig);
  }

  isSupported(): boolean {
    return this.renderer !== null;
  }

  async renderTopView(piece: HomePieceOfFurniture, width: number, height: number): Promise<unknown | null> {
    if (this.renderer === null) {
      return null;
    }
    const model = piece.getModel();
    if (model === null) {
      return null;
    }
    const loaded = await new Promise<LoadedModel | null>((resolve) => {
      const cached = this.modelManager.getModel(model, resolve);
      if (cached !== null) {
        resolve(cached);
      }
    });
    if (loaded === null) {
      return null;
    }

    const canvas = this.canvasFactory();
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.setPixelRatio(1);

    // Clear the scene's pieces, add the model with the piece transform
    const pieceGroup = new THREE.Group();
    this.modelManager.applyPieceTransform(loaded, piece, pieceGroup);
    pieceGroup.position.y = piece.getHeight() / 2;
    this.scene.add(pieceGroup);

    // Orthographic camera from above, framing the piece bounds
    const maxDim = Math.max(piece.getWidth(), piece.getHeight(), piece.getDepth()) || 1;
    const half = maxDim * 0.6;
    this.camera.left = -half;
    this.camera.right = half;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.near = 0.1;
    this.camera.far = 1000;
    this.camera.position.set(0, maxDim * 2, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    this.scene.remove(pieceGroup);

    // The WebGL renderer draws into ITS OWN canvas; copy its buffer into the
    // target canvas immediately (a WebGL buffer without preserveDrawingBuffer
    // is only valid until the next composite, and the plan draws this icon
    // later). The result is a stable 2D canvas with a white background.
    const context = (canvas as HTMLCanvasElement).getContext?.("2d") ?? null;
    if (context !== null) {
      context.drawImage(this.renderer.domElement, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }

  destroy(): void {
    this.renderer?.dispose();
  }
}
