/*
 * View3DCamera.ts
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
 * View3DCamera (task 6.3): maps the model Camera (top/observer) to a
 * THREE.PerspectiveCamera and bridges navigation actions to the model (via
 * HomeController3D) so the model stays the source of truth.
 *
 * Coordinate mapping (consistent with the builders): model (x, y, z) →
 * three (x, z, y). A model yaw of 0 faces +y (three +z); positive model
 * pitch looks DOWN at the home.
 */
import * as THREE from "three";
import type { Home, HomeController3D, Camera } from "@sweethomejs/core";

export interface View3DCameraOptions {
  home: Home;
  homeController3D: HomeController3D | null;
  camera: THREE.PerspectiveCamera;
}

export class View3DCamera {
  private readonly home: Home;
  private readonly homeController3D: HomeController3D | null;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly disposables: Array<() => void> = [];
  private lastCamera: Camera | null = null;
  private dirty = false;

  constructor(options: View3DCameraOptions) {
    this.home = options.home;
    this.homeController3D = options.homeController3D;
    this.camera = options.camera;
    const cameraChangeListener = { propertyChange: (): void => { this.dirty = true; } };
    // Sync when the active camera changes
    this.home.addPropertyChangeListener("CAMERA", cameraChangeListener);
    // Re-subscribe to the new camera object and sync
    this.home.addPropertyChangeListener("CAMERA", {
      propertyChange: () => {
        this.subscribeToCamera();
        this.dirty = true;
      },
    });
    this.subscribeToCamera();
  }

  private subscribeToCamera(): void {
    for (const dispose of this.disposables.splice(0)) {
      dispose();
    }
    const camera = this.home.getCamera();
    this.lastCamera = camera;
    const listener = (): void => {
      this.dirty = true;
    };
    camera.addPropertyChangeListener(listener);
    this.disposables.push(() => camera.removePropertyChangeListener(listener));
    this.dirty = true;
  }

  getThreeCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /** Applies the model camera to the THREE camera if dirty. */
  update(): void {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    const camera = this.home.getCamera();
    if (camera !== this.lastCamera) {
      this.subscribeToCamera();
    }
    applyModelCameraToThree(this.camera, camera);
  }

  /** Forces a re-apply (e.g. after an aspect-ratio change). */
  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.dirty = true;
  }

  // ------------------------------------------------------------- navigation

  /** Rotates the view (yaw) around the vertical axis. */
  rotateYaw(delta: number): void {
    this.homeController3D?.rotateCameraYaw(delta);
  }

  /** Rotates the view vertically (pitch). */
  rotatePitch(delta: number): void {
    this.homeController3D?.rotateCameraPitch(delta);
  }

  /** Moves the camera forward/backward. */
  moveCamera(delta: number): void {
    this.homeController3D?.moveCamera(delta);
  }

  /** Moves the camera sideways. */
  moveCameraSideways(delta: number): void {
    this.homeController3D?.moveCameraSideways(delta);
  }

  /** Elevates the camera. */
  elevateCamera(delta: number): void {
    this.homeController3D?.elevateCamera(delta);
  }

  /** Zooms (field of view) for the observer camera. */
  modifyFieldOfView(delta: number): void {
    this.homeController3D?.modifyFieldOfView(delta);
  }

  destroy(): void {
    for (const dispose of this.disposables.splice(0)) {
      dispose();
    }
  }
}

/**
 * Applies a model Camera to a THREE.PerspectiveCamera.
 * Model yaw 0 faces +y; positive pitch looks down; fov is in radians.
 */
export function applyModelCameraToThree(threeCamera: THREE.PerspectiveCamera, modelCamera: Camera): void {
  const yaw = modelCamera.getYaw();
  const pitch = modelCamera.getPitch();
  const fieldOfView = modelCamera.getFieldOfView();

  // Direction in three space: (sin(yaw)·cos(pitch), -sin(pitch), cos(yaw)·cos(pitch))
  const direction = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  );
  if (direction.lengthSq() < 1e-12) {
    direction.set(0, -1, 0);
  }
  threeCamera.position.set(modelCamera.getX(), modelCamera.getZ(), modelCamera.getY());
  threeCamera.lookAt(threeCamera.position.clone().add(direction));
  threeCamera.fov = THREE.MathUtils.radToDeg(fieldOfView);
  threeCamera.updateProjectionMatrix();
}
