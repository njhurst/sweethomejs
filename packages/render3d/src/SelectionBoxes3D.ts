/*
 * SelectionBoxes3D.ts
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
 * SelectionBoxes3D (task 6.4): blue wireframe selection boxes around the
 * selected furniture, mirroring Java's blue selection box.
 */
import * as THREE from "three";
import type { Home } from "@sweethomejs/core";
import { colorToThree } from "./AttributeCaches.js";

export const SELECTION_BOX_COLOR = 0x1d00b4;

export class SelectionBoxes3D {
  private readonly home: Home;
  private readonly group = new THREE.Group();
  private readonly disposables: Array<() => void> = [];
  private boxes: THREE.LineSegments[] = [];

  constructor(home: Home) {
    this.home = home;
    const listener = (): void => this.update();
    this.home.addSelectionListener(listener);
    this.home.addFurnitureListener({ collectionChanged: listener });
    this.update();
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  update(): void {
    this.group.clear();
    for (const box of this.boxes) {
      box.geometry.dispose();
      (box.material as THREE.Material).dispose();
    }
    this.boxes = [];
    for (const item of this.home.getSelectedItems()) {
      const piece = item as { getWidth?(): number; getDepth?(): number; getHeight?(): number; getX?(): number; getY?(): number; getElevation?(): number };
      if (typeof piece.getWidth !== "function") {
        continue;
      }
      const width = piece.getWidth!();
      const depth = piece.getDepth!();
      const height = piece.getHeight!();
      const elevation = piece.getElevation!();
      const boxGeometry = new THREE.BoxGeometry(width, height, depth);
      const edges = new THREE.EdgesGeometry(boxGeometry);
      const material = new THREE.LineBasicMaterial({ color: colorToThree(SELECTION_BOX_COLOR) });
      const box = new THREE.LineSegments(edges, material);
      box.position.set(piece.getX!(), elevation + height / 2, piece.getY!());
      box.rotation.y = (piece as unknown as { getAngle?(): number }).getAngle?.() ?? 0;
      this.group.add(box);
      this.boxes.push(box);
    }
  }

  destroy(): void {
    for (const dispose of this.disposables.splice(0)) {
      dispose();
    }
    for (const box of this.boxes) {
      box.geometry.dispose();
      (box.material as THREE.Material).dispose();
    }
    this.boxes = [];
  }
}
