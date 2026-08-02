/*
 * InstancedFurniture.ts
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
 * InstancedFurniture (task 6.7): renders all furniture placeholders as a
 * single THREE.InstancedMesh (one draw call for hundreds of pieces) instead
 * of one mesh per piece. Instance matrices update when furniture moves or
 * resizes. THREE's built-in frustum culling handles off-screen pieces.
 *
 * The 3D scene uses this for pieces without loaded models; loaded-model
 * pieces keep their individual builders (few of them).
 */
import * as THREE from "three";
import type { Home, HomePieceOfFurniture } from "@sweethomejs/core";
import { MaterialCache } from "./AttributeCaches.js";
import { groundElevation } from "./builders/Elevations.js";

export class InstancedFurniture {
  private readonly home: Home;
  private readonly materialCache: MaterialCache;
  private readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh | null = null;
  private readonly pieces: HomePieceOfFurniture[] = [];
  private readonly disposables: Array<() => void> = [];
  private pendingUpdate = false;

  constructor(home: Home, materialCache: MaterialCache) {
    this.home = home;
    this.materialCache = materialCache;
    this.rebuild();
    const onFurnitureChanged = (): void => this.scheduleUpdate();
    const listener = { collectionChanged: () => this.scheduleUpdate() };
    this.home.addFurnitureListener(listener);
    this.disposables.push(() => this.home.removeFurnitureListener(listener));
    // Track per-piece property changes for instance-matrix updates
    for (const piece of home.getFurniture()) {
      piece.addPropertyChangeListener(onFurnitureChanged);
    }
    this.disposables.push(() => {
      for (const piece of this.home.getFurniture()) {
        piece.removePropertyChangeListener(onFurnitureChanged);
      }
    });
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  /** Rebuilds the instanced mesh from the current furniture list. */
  rebuild(): void {
    this.group.clear();
    if (this.mesh !== null) {
      this.mesh.dispose();
      this.mesh = null;
    }
    this.pieces.length = 0;

    // Only placeholder pieces (no model, or model not yet loaded — the
    // ModelManager-backed builders take over loaded models)
    const pieces = this.home.getFurniture().filter((piece) => piece.getModel() === null);
    if (pieces.length === 0) {
      return;
    }
    this.pieces.push(...pieces);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = this.materialCache.getMaterial({
      diffuseColor: 0x8f8f8f,
      ambientColor: 0x000000,
      shininess: 0,
      opacity: 1,
      doubleSided: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.pieces.length);
    this.pieces.forEach((piece, i) => this.updateInstanceMatrix(mesh, piece, i));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = true;
    this.mesh = mesh;
    this.group.add(mesh);
  }

  private updateInstanceMatrix(mesh: THREE.InstancedMesh, piece: HomePieceOfFurniture, index: number): void {
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3(piece.getWidth(), piece.getHeight(), piece.getDepth());
    const position = new THREE.Vector3(piece.getX(), piece.getElevation() + groundElevation(piece) + piece.getHeight() / 2, piece.getY());
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, piece.getAngle(), 0));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }

  private scheduleUpdate(): void {
    if (this.pendingUpdate) {
      return;
    }
    this.pendingUpdate = true;
    // Defer to the next microtask to coalesce bursts of changes
    Promise.resolve().then(() => {
      this.pendingUpdate = false;
      const changed = this.home.getFurniture().filter((piece) => piece.getModel() === null);
      if (changed.length !== this.pieces.length) {
        this.rebuild();
        return;
      }
      if (this.mesh !== null) {
        changed.forEach((piece, i) => this.updateInstanceMatrix(this.mesh!, piece, i));
        this.mesh.instanceMatrix.needsUpdate = true;
      }
    });
  }

  getInstanceCount(): number {
    return this.mesh?.count ?? 0;
  }

  destroy(): void {
    for (const dispose of this.disposables.splice(0)) {
      dispose();
    }
    this.mesh?.dispose();
    this.group.clear();
  }
}
