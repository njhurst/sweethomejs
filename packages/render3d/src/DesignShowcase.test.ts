/*
 * DesignShowcase.test.ts
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
 * Design-showcase integration test (tasks 11.8): reads the generated fixture
 * (built by tools/build-design-showcase.mjs) through the .sh3d codec and
 * verifies the Design-style scene — room floor shininess, furniture
 * materials, and furniture light sources as PointLights.
 *
 * Model loading and texture decoding need browser APIs (Blob URLs,
 * createImageBitmap), so modeled pieces fall back to their placeholders and
 * the wood floor to its color — the assertions below target the material
 * pipeline, not the model/geometry path.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { HomeFileRecorder, UserPreferences } from "@sweethomejs/core";
import { buildSceneIntermediate } from "./SceneIntermediate.js";
import { ModelManager } from "./ModelManager.js";
import { WallObject3D } from "./builders/WallObject3D.js";
import { RoomObject3D, FurnitureObject3D } from "./builders/objectBuilders.js";

const FIXTURE = fileURLToPath(
  new URL("../../../test/fixtures/generated/design-showcase.sh3d", import.meta.url),
);

describe("design-showcase fixture (task 11.8)", () => {
  it("round-trips materials and lights through the .sh3d codec", async () => {
    const bytes = new Uint8Array(readFileSync(FIXTURE));
    const { home, repaired } = await new HomeFileRecorder().readHomeFromZip(bytes);
    expect(repaired).toBe(false);
    expect(home.getWalls().length).toBe(6);
    expect(home.getRooms().length).toBe(2);
    expect(home.getFurniture().length).toBe(8);

    const living = home.getRooms().find((r) => r.getName() === "Living");
    expect(living?.getFloorColor()).toBe(0x9c6b3f);
    expect(living?.getFloorShininess()).toBe(25);
    expect(living?.getFloorTexture()).not.toBeNull();
    const kitchen = home.getRooms().find((r) => r.getName() === "Kitchen");
    expect(kitchen?.getFloorShininess()).toBe(70);
  });

  it("builds a Design-style scene: shininess on floors, materials on pieces, point lights", async () => {
    const bytes = new Uint8Array(readFileSync(FIXTURE));
    const { home } = await new HomeFileRecorder().readHomeFromZip(bytes);
    // Node has no Blob-URL loader path; stub model parsing so modeled pieces
    // resolve to empty groups instead of hanging the worker.
    const modelManager = new ModelManager(() => ({ parse: async () => new THREE.Group() }));
    const scene = buildSceneIntermediate(home, new UserPreferences(), {
      addLightSources: true,
      modelManager,
    });

    // Builders per model item: model-less pieces go through the instanced
    // path, so FurnitureObject3D builders only cover the 3 modeled pieces
    const walls = scene.builders.filter((b) => b instanceof WallObject3D);
    const rooms = scene.builders.filter((b) => b instanceof RoomObject3D);
    const furniture = scene.builders.filter((b) => b instanceof FurnitureObject3D);
    expect(walls.length).toBe(6);
    expect(rooms.length).toBe(2);
    expect(furniture.length).toBe(3);
    const instanced = scene.instancedGroup?.children[0] as THREE.InstancedMesh | undefined;
    expect(instanced?.count).toBe(5); // sofa, counter + 3 lamp placeholders

    // Floor materials honor floorShininess (glossy tile kitchen)
    const kitchenMesh = rooms[1]!.getRoot().children[0] as THREE.Mesh;
    const kitchenFloor = kitchenMesh.material as THREE.MeshStandardMaterial;
    expect(kitchenFloor.color.getHex()).toBe(0xd8d8d8);
    expect(kitchenFloor.roughness).toBeCloseTo(1 - 70 / 128, 4);

    // Furniture light sources become PointLights
    const pointLights = scene.group.children.filter(
      (child) =>
        (child as THREE.Light).isLight === true &&
        (child as THREE.PointLight).isPointLight === true,
    );
    expect(pointLights.length).toBe(3);
    const colors = pointLights.map((l) => (l as THREE.PointLight).color.getHex()).sort();
    expect(colors).toEqual([0xe8f0ff, 0xffe0a8, 0xfff0c8]);

    scene.dispose();
  });
});
