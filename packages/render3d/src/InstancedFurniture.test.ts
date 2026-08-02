/*
 * InstancedFurniture.test.ts
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
 * InstancedFurniture tests (task 6.7): a single InstancedMesh serves many
 * placeholder pieces; instance matrices track positions; the mesh rebuilds on
 * collection changes and updates on property changes.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, HomePieceOfFurniture, UserPreferences } from "@sweethomejs/core";
import { InstancedFurniture } from "./InstancedFurniture.js";
import { MaterialCache } from "./AttributeCaches.js";

function makePiece(name: string, x: number, y: number, model: boolean): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("p-" + name, {
    getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null,
    getModel: () => model ? { getURL: () => "zip:0/m.obj", openStream: () => Promise.resolve(new ReadableStream()) } : null,
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

describe("InstancedFurniture (task 6.7)", () => {
  it("renders many placeholder pieces as a single InstancedMesh", () => {
    const home = new Home();
    for (let i = 0; i < 100; i++) {
      home.addPieceOfFurniture(makePiece(`p${i}`, i * 10, 0, false));
    }
    const instanced = new InstancedFurniture(home, new MaterialCache());
    const group = instanced.getGroup();
    expect(group.children.length).toBe(1);
    expect(group.children[0]).toBeInstanceOf(THREE.InstancedMesh);
    expect(instanced.getInstanceCount()).toBe(100);
    instanced.destroy();
  });

  it("excludes pieces with models", () => {
    const home = new Home();
    home.addPieceOfFurniture(makePiece("plain", 0, 0, false));
    home.addPieceOfFurniture(makePiece("modeled", 100, 0, true));
    const instanced = new InstancedFurniture(home, new MaterialCache());
    expect(instanced.getInstanceCount()).toBe(1);
    instanced.destroy();
  });

  it("positions instances at the piece coordinates", async () => {
    const home = new Home();
    const piece = makePiece("a", 200, 150, false);
    home.addPieceOfFurniture(piece);
    const instanced = new InstancedFurniture(home, new MaterialCache());
    const mesh = instanced.getGroup().children[0] as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(0, matrix);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    matrix.decompose(position, quaternion, scale);
    expect(position.x).toBeCloseTo(200, 4);
    expect(position.z).toBeCloseTo(150, 4);
    expect(scale.x).toBeCloseTo(100, 4);
    expect(scale.y).toBeCloseTo(30, 4);
    expect(scale.z).toBeCloseTo(50, 4);
    instanced.destroy();
  });

  it("rebuilds when furniture is added", async () => {
    const home = new Home();
    home.addPieceOfFurniture(makePiece("a", 0, 0, false));
    const instanced = new InstancedFurniture(home, new MaterialCache());
    expect(instanced.getInstanceCount()).toBe(1);
    home.addPieceOfFurniture(makePiece("b", 10, 0, false));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(instanced.getInstanceCount()).toBe(2);
    instanced.destroy();
  });
});
