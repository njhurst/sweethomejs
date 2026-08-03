/*
 * ThreeJSPhotoRenderer.ts
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
 * Three.js photo renderer (task 8.3, option C from the design doc): renders
 * the home from a camera using the shared scene intermediate, with
 * physically-correct lighting, shadows and tone mapping. Progressive display
 * renders at increasing resolutions and reports progress through the
 * observer; stop() cancels between passes. Uses OffscreenCanvas when
 * available (worker-ready), otherwise a hidden canvas.
 */
import * as THREE from "three";
import { AbstractPhotoRenderer, PhotoQuality } from "@sweethomejs/core";
import type { Home, Camera, UserPreferences, Selectable } from "@sweethomejs/core";
import type { PhotoRendererObserver, RenderedImage } from "@sweethomejs/core";
import { buildSceneIntermediate } from "@sweethomejs/render3d";
import type { SceneIntermediate } from "@sweethomejs/render3d";
import { applyModelCameraToThree } from "@sweethomejs/render3d";

/** The 2D context methods the photo pipeline needs (works for canvas + OffscreenCanvas). */
interface Photo2DContext {
  drawImage(image: ImageBitmap, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
}

/** Progressive render passes as fractions of the final size. */
export const PROGRESSIVE_PASSES: number[] = [0.25, 0.5, 1];

export class ThreeJSPhotoRenderer extends AbstractPhotoRenderer {
  private readonly preferences: UserPreferences;
  private scene: SceneIntermediate | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private stopped = false;

  constructor(home: Home, preferences: UserPreferences, quality: PhotoQuality) {
    super(home, quality);
    this.preferences = preferences;
  }

  override getName(): string {
    return "Three.js renderer";
  }

  override isAvailable(): boolean {
    if (typeof OffscreenCanvas === "undefined" && typeof document === "undefined") {
      return false;
    }
    try {
      // Probe for WebGL2 support
      const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1) : null;
      if (canvas !== null) {
        const gl = (canvas as OffscreenCanvas & { getContext(type: string): unknown }).getContext("webgl2");
        if (gl !== null) return true;
        const gl1 = (canvas as OffscreenCanvas & { getContext(type: string): unknown }).getContext("webgl");
        return gl1 !== null;
      }
      const test = document.createElement("canvas");
      const gl = test.getContext("webgl2") ?? test.getContext("webgl");
      return gl !== null;
    } catch {
      return false;
    }
  }

  private createRenderer(width: number, height: number): THREE.WebGLRenderer {
    const quality = this.getQuality();
    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : undefined;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: quality === PhotoQuality.HIGH,
      alpha: false,
      stencil: false,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = quality === PhotoQuality.HIGH;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    return renderer;
  }

  override async render(
    image: RenderedImage,
    camera: Camera,
    updatedItems: Selectable[] | null,
    observer: PhotoRendererObserver,
  ): Promise<void> {
    this.stopped = false;
    const width = image.width;
    const height = image.height;
    if (width <= 0 || height <= 0) {
      observer.photoRenderingFailed(new Error("Invalid image size"));
      return;
    }
    try {
      // Build (or reuse) the shared scene intermediate and camera rig
      if (this.scene === null) {
        this.scene = buildSceneIntermediate(this.getHome(), this.preferences, {
          addLights: true,
          addGround: true,
        });
      }
      if (this.renderer === null) {
        this.renderer = this.createRenderer(width, height);
      }

      const threeCamera = new THREE.PerspectiveCamera();
      applyModelCameraToThree(threeCamera, camera);
      threeCamera.aspect = width / height;
      threeCamera.updateProjectionMatrix();

      // Fade the photo: render from a neutral background (like a photo studio)
      const renderer = this.renderer;
      const sceneRoot = this.scene.group;
      renderer.setClearColor(0xffffff, 1);

      // Progressive passes: render at increasing resolution into the target.
      const targetCanvas = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : document.createElement("canvas");
      targetCanvas.width = width;
      targetCanvas.height = height;
      const targetContext = targetCanvas.getContext("2d") as Photo2DContext | null;
      if (targetContext === null) {
        observer.photoRenderingFailed(new Error("2D context unavailable"));
        return;
      }
      let completed = 0;
      for (const passFraction of PROGRESSIVE_PASSES) {
        if (this.stopped) {
          observer.photoRenderingCanceled();
          return;
        }
        const passWidth = Math.max(2, Math.round(width * passFraction));
        const passHeight = Math.max(2, Math.round(height * passFraction));
        renderer.setSize(passWidth, passHeight, false);
        renderer.setViewport(0, 0, passWidth, passHeight);
        renderer.render(sceneRoot, threeCamera);
        // Read the rendered canvas back and scale it into the target image
        const bitmap = await createImageBitmap(renderer.domElement);
        targetContext.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const finalImage = targetContext.getImageData(0, 0, width, height);
        image.data.set(finalImage.data);
        completed = PROGRESSIVE_PASSES.indexOf(passFraction) + 1;
        const progress = completed / PROGRESSIVE_PASSES.length;
        observer.photoRenderingProgress(progress, { ...image, data: image.data.slice() });
        // Let the UI paint between passes
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      if (this.stopped) {
        observer.photoRenderingCanceled();
        return;
      }
      observer.photoRenderingEnded(image);
    } catch (error) {
      observer.photoRenderingFailed(error instanceof Error ? error : new Error(String(error)));
    }
  }

  override stop(): void {
    this.stopped = true;
  }

  override dispose(): void {
    this.stopped = true;
    this.renderer?.dispose();
    this.renderer = null;
    this.scene?.dispose();
    this.scene = null;
  }
}
