/*
 * View3DCamera.test.ts
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
 * View3DCamera tests (task 6.3): model→three camera mapping and navigation
 * delegation.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, Camera, UserPreferences } from "@sweethomejs/core";
import { View3DCamera, applyModelCameraToThree } from "./View3DCamera.js";

describe("applyModelCameraToThree (task 6.3)", () => {
  it("maps the observer camera position and orientation", () => {
    const threeCamera = new THREE.PerspectiveCamera(63, 1.5, 1, 5000);
    const camera = new Camera(100, 200, 175, 0, 0, Math.PI / 3);
    applyModelCameraToThree(threeCamera, camera);
    // Model (x, y, z) → three (x, z, y)
    expect(threeCamera.position.x).toBeCloseTo(100, 4);
    expect(threeCamera.position.y).toBeCloseTo(175, 4);
    expect(threeCamera.position.z).toBeCloseTo(200, 4);
    // fov converted from radians to degrees
    expect(threeCamera.fov).toBeCloseTo(60, 4);
  });

  it("orients the camera along yaw (0 = +z in three space)", () => {
    const threeCamera = new THREE.PerspectiveCamera(63, 1.5, 1, 5000);
    const camera = new Camera(0, 0, 100, 0, 0, Math.PI / 3);
    applyModelCameraToThree(threeCamera, camera);
    // Yaw 0, pitch 0 → looking along +z
    const forward = new THREE.Vector3();
    threeCamera.getWorldDirection(forward);
    expect(forward.x).toBeCloseTo(0, 4);
    expect(forward.z).toBeCloseTo(1, 4);
    expect(forward.y).toBeCloseTo(0, 4);
  });

  it("positive pitch looks down (toward the home)", () => {
    const threeCamera = new THREE.PerspectiveCamera(63, 1.5, 1, 5000);
    const camera = new Camera(0, 0, 100, 0, Math.PI / 2, Math.PI / 3);
    applyModelCameraToThree(threeCamera, camera);
    const forward = new THREE.Vector3();
    threeCamera.getWorldDirection(forward);
    expect(forward.y).toBeCloseTo(-1, 4);
  });
});

describe("View3DCamera (task 6.3)", () => {
  it("syncs the three camera when the model camera moves", () => {
    const home = new Home();
    const threeCamera = new THREE.PerspectiveCamera(63, 1.5, 1, 5000);
    const view3D = new View3DCamera({ home, homeController3D: null, camera: threeCamera });
    view3D.update();

    // The active camera is the top camera by default (getCamera() lazily)
    home.getTopCamera().setX(500);
    view3D.update();
    expect(threeCamera.position.x).toBeCloseTo(500, 4);

    home.setCamera(home.getObserverCamera());
    home.getObserverCamera().setY(300);
    view3D.update();
    expect(threeCamera.position.z).toBeCloseTo(300, 4);
    view3D.destroy();
  });

  it("delegates navigation to the HomeController3D", () => {
    const home = new Home();
    const threeCamera = new THREE.PerspectiveCamera(63, 1.5, 1, 5000);
    const homeController3D = {
      rotateCameraYaw: (delta: number) => home.getObserverCamera().setYaw(home.getObserverCamera().getYaw() + delta),
      rotateCameraPitch: () => {},
      moveCamera: () => {},
      moveCameraSideways: () => {},
      elevateCamera: () => {},
      modifyFieldOfView: () => {},
    } as never;
    const view3D = new View3DCamera({ home, homeController3D, camera: threeCamera });
    const yawBefore = home.getObserverCamera().getYaw();
    view3D.rotateYaw(0.5);
    expect(home.getObserverCamera().getYaw()).toBeCloseTo(yawBefore + 0.5, 4);
    view3D.destroy();
  });

  it("updates the projection matrix on aspect change", () => {
    const home = new Home();
    const threeCamera = new THREE.PerspectiveCamera(63, 1.5, 1, 5000);
    const view3D = new View3DCamera({ home, homeController3D: null, camera: threeCamera });
    view3D.setAspect(2);
    view3D.update();
    expect(threeCamera.aspect).toBe(2);
    view3D.destroy();
  });
});
