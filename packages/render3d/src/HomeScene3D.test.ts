/*
 * HomeScene3D.test.ts
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
 * Golden 3D scene tests (task 6.8): the assembled HomeScene3D has the
 * expected object counts for a home at fixed cameras, and building a scene
 * for a 500-furniture home stays within a perf budget.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, Wall, Room, UserPreferences, HomePieceOfFurniture, HomeFileRecorder } from "@sweethomejs/core";
import { HomeScene3D } from "./HomeScene3D.js";
import { ModelManager } from "./ModelManager.js";
import { applyModelCameraToThree } from "./View3DCamera.js";

function makePiece(name: string, x: number, y: number): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("p-" + name, {
    getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
  } as never);
  piece.setX(x);
  piece.setY(y);
  return piece;
}

function buildTestHome(): Home {
  const home = new Home();
  // A small L-shaped plan: 3 walls, 1 room, 5 furniture pieces
  home.addWall(new Wall("w1", 0, 0, 1000, 0, 10, 250));
  home.addWall(new Wall("w2", 1000, 0, 1000, 800, 10, 250));
  home.addWall(new Wall("w3", 1000, 800, 0, 800, 10, 250));
  home.addRoom(new Room("r1", [[0, 0], [1000, 0], [1000, 800], [0, 800]]));
  for (let i = 0; i < 5; i++) {
    home.addPieceOfFurniture(makePiece(`sofa${i}`, 100 + i * 150, 100));
  }
  return home;
}

function countMeshes(scene: THREE.Object3D): number {
  let count = 0;
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh || (object as THREE.LineSegments).isLineSegments || (object as THREE.Line).isLine) {
      count++;
    }
  });
  return count;
}

describe("HomeScene3D golden structure (task 6.8)", () => {
  it("assembles the expected objects for the test home", () => {
    const home = buildTestHome();
    const scene = new HomeScene3D({ home, preferences: new UserPreferences() });
    const root = scene.getRoot();
    // The root now contains the shared scene-intermediate group (task 8.2)
    // plus the selection-box group. The intermediate holds ground, walls,
    // rooms, furniture, dimension lines, polylines, labels, lights + sun target.
    expect(root.children.length).toBeGreaterThanOrEqual(2);
    const intermediate = root.children[0]!;
    expect(intermediate.children.length).toBeGreaterThanOrEqual(10);
    const meshes = countMeshes(root);
    expect(meshes).toBeGreaterThanOrEqual(3 + 1); // walls + room
    const box = new THREE.Box3().setFromObject(root);
    expect(box.max.x).toBeGreaterThan(900);
    expect(box.max.z).toBeGreaterThan(700);
    scene.destroy();
  });

  it("furniture renders as one instanced mesh", () => {
    const home = buildTestHome();
    const scene = new HomeScene3D({ home, preferences: new UserPreferences() });
    let instanced = 0;
    scene.getRoot().traverse((object) => {
      if ((object as THREE.InstancedMesh).isInstancedMesh) {
        instanced++;
        expect((object as THREE.InstancedMesh).count).toBe(5);
      }
    });
    expect(instanced).toBe(1);
    scene.destroy();
  });

  it("the scene camera applies at a fixed point (top view)", () => {
    const home = buildTestHome();
    const scene = new HomeScene3D({ home, preferences: new UserPreferences() });
    const sphere = scene.getBoundingSphere();
    const threeCamera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 10000);
    // A top camera above the scene center looking down
    const topCamera = home.getTopCamera();
    topCamera.setX(sphere.center.x);
    topCamera.setY(sphere.center.z);
    topCamera.setZ(sphere.radius * 3);
    topCamera.setPitch(Math.PI / 2); // straight down
    applyModelCameraToThree(threeCamera, topCamera);
    const forward = new THREE.Vector3();
    threeCamera.getWorldDirection(forward);
    expect(forward.y).toBeCloseTo(-1, 3);
    scene.destroy();
  });
});

describe("Perf budget (task 6.8)", () => {
  it("builds a 500-furniture home scene within budget", () => {
    const home = new Home();
    for (let i = 0; i < 500; i++) {
      home.addPieceOfFurniture(makePiece(`f${i}`, (i % 25) * 100, Math.floor(i / 25) * 100));
    }
    const start = performance.now();
    const scene = new HomeScene3D({ home, preferences: new UserPreferences() });
    const elapsed = performance.now() - start;
    let instanced = 0;
    scene.getRoot().traverse((object) => {
      if ((object as THREE.InstancedMesh).isInstancedMesh) {
        instanced++;
        expect((object as THREE.InstancedMesh).count).toBe(500);
      }
    });
    expect(instanced).toBe(1);
    expect(elapsed).toBeLessThan(2000);
    scene.destroy();
  });

  it("reads the real 2019 home into a scene", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const recorder = new HomeFileRecorder();
    const { home } = await recorder.readHomeFromZip(new Uint8Array(fs.readFileSync(path.join(__dirname, "../../../test/fixtures/dream_house.sh3d"))));
    home.setSelectedLevel(null);
    const start = performance.now();
    // A stub loader avoids network/ProgressEvent in the Node test env
    const modelManager = new ModelManager(() => ({ parse: async () => new THREE.Group() }));
    const scene = new HomeScene3D({ home, preferences: new UserPreferences(), modelManager });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
    let walls = 0;
    scene.getRoot().traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        walls++;
      }
    });
    expect(walls).toBeGreaterThanOrEqual(home.getWalls().length);
    scene.destroy();
  });
});
