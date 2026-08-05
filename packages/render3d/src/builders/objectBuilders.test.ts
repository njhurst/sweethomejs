/*
 * objectBuilders.test.ts
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
 * Object builder tests (task 6.2): walls become prisms with the right vertex
 * counts, rooms become floor polygons, furniture becomes a positioned box,
 * and the ground plane exists.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  Home,
  Wall,
  Room,
  UserPreferences,
  HomePieceOfFurniture,
  Level,
  HomeMaterial,
} from "@sweethomejs/core";
import { MaterialCache, TextureCache } from "../AttributeCaches.js";
import { ModelManager, type LoadedModel } from "../ModelManager.js";
import { WallObject3D, buildPrismGeometry } from "./WallObject3D.js";
import {
  RoomObject3D,
  FurnitureObject3D,
  DimensionLineObject3D,
  GroundObject3D,
} from "./objectBuilders.js";

function makeHome(): Home {
  return new Home();
}

describe("WallObject3D (task 6.2)", () => {
  it("builds a prism with side quads, bottom and top caps", () => {
    const home = makeHome();
    const wall = new Wall("wall", 0, 0, 500, 0, 10, 250);
    home.addWall(wall);
    const cache = new MaterialCache();
    const builder = new WallObject3D(wall, home, new UserPreferences(), cache);
    const root = builder.getRoot();
    const mesh = root.children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const index = geometry.getIndex();
    // A wall polygon has 4 points: 4 side quads (16 verts) + 4 bottom + 4 top = 24 verts
    expect(positions.count).toBe(24);
    // 4 quads × 2 tris + 2 caps × 2 tris = 12 tris → 36 indices
    expect(index!.count).toBe(36);
    builder.destroy();
  });

  it("elevates the prism to the level elevation", () => {
    const home = makeHome();
    const level = new Level("level", "Ground", 0, 0, 250);
    home.addLevel(level);
    const wall = new Wall("wall", 0, 0, 500, 0, 10, 250);
    wall.setLevel(level);
    home.addWall(wall);
    const builder = new WallObject3D(wall, home, new UserPreferences(), new MaterialCache());
    const mesh = builder.getRoot().children[0] as THREE.Mesh;
    const positions = (mesh.geometry as THREE.BufferGeometry).getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    // All bottom vertices are at z = 0 (level elevation) and tops at 250
    const yValues = new Set<number>();
    for (let i = 0; i < positions.count; i++) {
      yValues.add(positions.getY(i));
    }
    expect(yValues.has(0)).toBe(true);
    expect(yValues.has(250)).toBe(true);
    builder.destroy();
  });
});

describe("RoomObject3D (task 6.2)", () => {
  it("builds a floor polygon with the floor color", () => {
    const home = makeHome();
    const room = new Room("room", [
      [0, 0],
      [500, 0],
      [500, 400],
      [0, 400],
    ]);
    room.setFloorColor(0xcc9966);
    home.addRoom(room);
    const builder = new RoomObject3D(
      room,
      home,
      new UserPreferences(),
      new MaterialCache(),
      new TextureCache(),
    );
    const mesh = builder.getRoot().children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();
    expect(mesh.material).toBeDefined();
    builder.destroy();
  });

  it("maps floor shininess to material roughness (Design style)", () => {
    const home = makeHome();
    const room = new Room("room", [
      [0, 0],
      [500, 0],
      [500, 400],
      [0, 400],
    ]);
    room.setFloorColor(0xd8d8d8);
    room.setFloorShininess(70); // glossy tile
    home.addRoom(room);
    const builder = new RoomObject3D(
      room,
      home,
      new UserPreferences(),
      new MaterialCache(),
      new TextureCache(),
    );
    const mesh = builder.getRoot().children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.roughness).toBeCloseTo(1 - 70 / 128, 4);
    expect(material.color.getHex()).toBe(0xd8d8d8);
    builder.destroy();
  });
});

describe("FurnitureObject3D (task 6.2)", () => {
  it("builds a placeholder box at the piece position and elevation", () => {
    const home = makeHome();
    const piece = new HomePieceOfFurniture("p", {
      getName: () => "Sofa",
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => 50,
      getHeight: () => 30,
      getWidth: () => 100,
      getElevation: () => 20,
      getDropOnTopElevation: () => 1,
      isMovable: () => true,
      isDoorOrWindow: () => false,
      getIcon: () => null,
      getPlanIcon: () => null,
      getModel: () => null,
      getModelFlags: () => 0,
      getModelSize: () => null,
      getModelRotation: () => [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      getStaircaseCutOutShape: () => null,
      getCreator: () => null,
      isBackFaceShown: () => false,
      getColor: () => 0x886644,
      isResizable: () => true,
      isDeformable: () => true,
      isWidthDepthDeformable: () => true,
      isTexturable: () => true,
      isHorizontallyRotatable: () => true,
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => null,
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    } as never);
    piece.setX(200);
    piece.setY(150);
    home.addPieceOfFurniture(piece);
    const builder = new FurnitureObject3D(piece, home, new UserPreferences(), new MaterialCache());
    const mesh = builder.getRoot().children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();
    // Center of the box at (200, 20 + 15 + 1 (z-fight lift), -150)
    expect(mesh.position.x).toBeCloseTo(200, 4);
    expect(mesh.position.y).toBeCloseTo(36, 4);
    expect(mesh.position.z).toBeCloseTo(150, 4);
    builder.destroy();
  });

  it("maps piece shininess to placeholder material roughness", () => {
    const home = makeHome();
    const piece = new HomePieceOfFurniture("p", {
      getName: () => "Counter",
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => 50,
      getHeight: () => 90,
      getWidth: () => 100,
      getElevation: () => 0,
      getDropOnTopElevation: () => 1,
      isMovable: () => true,
      isDoorOrWindow: () => false,
      getIcon: () => null,
      getPlanIcon: () => null,
      getModel: () => null,
      getModelFlags: () => 0,
      getModelSize: () => null,
      getModelRotation: () => [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      getStaircaseCutOutShape: () => null,
      getCreator: () => null,
      isBackFaceShown: () => false,
      getColor: () => 0xe8e4da,
      isResizable: () => true,
      isDeformable: () => true,
      isWidthDepthDeformable: () => true,
      isTexturable: () => true,
      isHorizontallyRotatable: () => true,
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => null,
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    } as never);
    piece.setShininess(40);
    home.addPieceOfFurniture(piece);
    const builder = new FurnitureObject3D(piece, home, new UserPreferences(), new MaterialCache());
    const mesh = builder.getRoot().children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.roughness).toBeCloseTo(1 - 40 / 128, 4);
    builder.destroy();
  });

  it("applies piece modelMaterials to the loaded model by material name", () => {
    const home = makeHome();
    const piece = new HomePieceOfFurniture("p", {
      getName: () => "Table",
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => 60,
      getHeight: () => 45,
      getWidth: () => 120,
      getElevation: () => 0,
      getDropOnTopElevation: () => 1,
      isMovable: () => true,
      isDoorOrWindow: () => false,
      getIcon: () => null,
      getPlanIcon: () => null,
      getModel: () => ({
        getURL: () => "zip:0/table.obj",
        openStream: () => Promise.resolve(new ReadableStream()),
      }),
      getModelFlags: () => 0,
      getModelSize: () => 1,
      getModelRotation: () => [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      getStaircaseCutOutShape: () => null,
      getCreator: () => null,
      isBackFaceShown: () => false,
      getColor: () => null,
      isResizable: () => true,
      isDeformable: () => true,
      isWidthDepthDeformable: () => true,
      isTexturable: () => true,
      isHorizontallyRotatable: () => true,
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => null,
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    } as never);
    piece.setModelMaterials([new HomeMaterial("glossy_wood", 0x9c6b3f, null, 96)]);
    home.addPieceOfFurniture(piece);

    // A stub model manager returning a cube with a named material
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, name: "glossy_wood" });
    group.add(new THREE.Mesh(geometry, material));
    const loaded: LoadedModel = { group, realSize: [100, 100, 100], format: "obj" };
    const stubManager = new (class extends ModelManager {
      override getModel(): LoadedModel | null {
        return loaded;
      }
    })();

    const builder = new FurnitureObject3D(
      piece,
      home,
      new UserPreferences(),
      new MaterialCache(),
      stubManager,
    );
    let mesh: THREE.Mesh | null = null;
    builder.getRoot().traverse((child) => {
      if (mesh === null && (child as THREE.Mesh).isMesh) {
        mesh = child as THREE.Mesh;
      }
    });
    expect(mesh).not.toBeNull();
    const applied = mesh!.material as THREE.MeshStandardMaterial;
    expect(applied.color.getHex()).toBe(0x9c6b3f);
    expect(applied.roughness).toBeCloseTo(1 - 96 / 128, 4);
    geometry.dispose();
    builder.destroy();
  });
});

describe("GroundObject3D (task 6.2)", () => {
  it("builds a ground plane with the ground color", () => {
    const home = makeHome();
    const builder = new GroundObject3D(
      home,
      new UserPreferences(),
      new MaterialCache(),
      new TextureCache(),
    );
    const mesh = builder.getRoot().children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();
    builder.destroy();
  });
});

describe("buildPrismGeometry (task 6.2)", () => {
  it("produces indexed geometry with normals", () => {
    const geometry = buildPrismGeometry(
      [
        [0, 0],
        [100, 0],
        [100, 10],
        [0, 10],
      ],
      0,
      250,
      null,
    );
    expect(geometry.getAttribute("position")).toBeDefined();
    expect(geometry.getAttribute("normal")).toBeDefined();
    expect(geometry.getIndex()!.count).toBeGreaterThan(0);
  });
});
