/*
 * SceneIntermediate.test.ts
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
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, Wall, UserPreferences } from "@sweethomejs/core";
import { buildSceneIntermediate } from "./SceneIntermediate.js";

describe("SceneIntermediate (task 8.2)", () => {
  it("builds the scene graph shared by the 3D view and photo renderer", () => {
    const home = new Home();
    home.addWall(new Wall("w", 0, 0, 1000, 0, 20, 250));
    const intermediate = buildSceneIntermediate(home, new UserPreferences(), {});
    // Ground + wall + lights (5) + sun target + instanced furniture group
    expect(intermediate.group.children.length).toBeGreaterThanOrEqual(5);
    expect(intermediate.lights).not.toBeNull();
    // The intermediate rebuilds walls on collection changes
    home.addWall(new Wall("w2", 0, 0, 0, 1000, 20, 250));
    intermediate.rebuildStaticItems();
    let wallMeshes = 0;
    intermediate.group.traverse((object) => {
      if ((object as THREE.Mesh).isMesh && object.name === "") wallMeshes++;
    });
    // dispose must not throw
    intermediate.dispose();
  });

  it("can be built without lights or ground (photo-only options)", () => {
    const home = new Home();
    const intermediate = buildSceneIntermediate(home, new UserPreferences(), {
      addLights: false,
      addGround: false,
      instancedFurniture: false,
    });
    expect(intermediate.lights).toBeNull();
    expect(intermediate.instancedGroup).toBeNull();
    intermediate.dispose();
  });
});
