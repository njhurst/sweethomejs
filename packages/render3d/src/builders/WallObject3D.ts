/*
 * WallObject3D.ts
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
 * WallObject3D (task 6.2): builds a wall as an extruded prism from
 * wall.getPoints(), from the level elevation up to the wall height (sloping
 * walls use heightAtEnd at the end point). Rounded walls use the model's arc
 * points directly. Mirrors Wall3D's vertical part (without door/window
 * cutouts and baseboards, which land in later refinements).
 */
import * as THREE from "three";
import type { Home, UserPreferences, Wall } from "@sweethomejs/core";
import { Object3DBase } from "../Object3DBase.js";
import { MaterialCache } from "../AttributeCaches.js";
import { groundElevation } from "./Elevations.js";

export class WallObject3D extends Object3DBase<Wall> {
  private readonly root = new THREE.Group();
  private readonly materialCache: MaterialCache;
  private mesh: THREE.Mesh | null = null;

  constructor(wall: Wall, home: Home, preferences: UserPreferences, materialCache: MaterialCache, context: unknown = null) {
    super(wall, home, preferences, context);
    this.materialCache = materialCache;
    this.addModelListener(wall, () => this.update());
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    const wall = this.item;
    const points = wall.getPoints();
    if (points.length < 4) {
      return;
    }
    const elevation = groundElevation(wall);
    const height = wall.getHeight() ?? this.home.getWallHeight();
    const heightAtEnd = wall.getHeightAtEnd();

    const geometry = buildPrismGeometry(points, elevation, height, heightAtEnd);
    const color = wall.getLeftSideColor() ?? wall.getRightSideColor() ?? 0xbfbfbf;
    const material = this.materialCache.getMaterial({
      diffuseColor: color,
      ambientColor: 0x000000,
      shininess: 0,
      opacity: 1,
      doubleSided: true,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.root.add(this.mesh);
  }

  override destroy(): void {
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
    }
    super.destroy();
  }
}

/**
 * Builds a prism geometry from a 2D polygon (bottom at `elevation`, top at
 * `elevation + height`, with an optional `heightAtEnd` sloping the far edge).
 */
export function buildPrismGeometry(points: number[][], elevation: number, height: number, heightAtEnd: number | null): THREE.BufferGeometry {
  const n = points.length;
  const endHeights: number[] = [];
  for (let i = 0; i < n; i++) {
    endHeights.push(heightAtEnd !== null && i === n - 1 ? heightAtEnd : height);
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;

  // Side quads: for each edge (p1, p2), a quad bottom1/bottom2/top2/top1
  for (let i = 0; i < n; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const h1 = endHeights[i]!;
    const h2 = endHeights[(i + 1) % n]!;
    const base = vertexCount;
    positions.push(p1[0]!, elevation + 0, p1[1]!);
    positions.push(p2[0]!, elevation + 0, p2[1]!);
    positions.push(p1[0]!, elevation + h1, p1[1]!);
    positions.push(p2[0]!, elevation + h2, p2[1]!);
    // Edge normal in the xy plane
    const dx = p2[0]! - p1[0]!;
    const dy = p2[1]! - p1[1]!;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dy / len;
    const ny = -dx / len;
    for (let k = 0; k < 4; k++) {
      normals.push(nx, ny, 0);
    }
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    vertexCount += 4;
  }

  // Bottom cap
  const bottomBase = vertexCount;
  for (const p of points) {
    positions.push(p[0]!, elevation + 0, p[1]!);
    normals.push(0, -1, 0);
  }
  for (let i = 1; i < n - 1; i++) {
    indices.push(bottomBase, bottomBase + i, bottomBase + i + 1);
  }
  vertexCount += n;

  // Top cap
  const topBase = vertexCount;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    positions.push(p[0]!, elevation + endHeights[i]!, p[1]!);
    normals.push(0, 1, 0);
  }
  for (let i = 1; i < n - 1; i++) {
    indices.push(topBase, topBase + i + 1, topBase + i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
