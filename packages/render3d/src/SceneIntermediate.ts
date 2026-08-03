/*
 * SceneIntermediate.ts
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
 * Scene intermediate (task 8.2): builds the home's 3D scene graph (meshes,
 * materials, lights) ONCE, shared by the 3D view (HomeScene3D) and the photo
 * renderer (packages/photo). The intermediate is a THREE.Group plus handles
 * to the caches and lights — the same scene description Java feeds to both
 * the 3D view and the Sunflow photo renderer.
 */
import * as THREE from "three";
import type { Home } from "@sweethomejs/core";
import type { UserPreferences } from "@sweethomejs/core";
import { MaterialCache, TextureCache } from "./AttributeCaches.js";
import { ModelManager } from "./ModelManager.js";
import { SceneLights } from "./SceneLights.js";
import { WallObject3D } from "./builders/WallObject3D.js";
import { RoomObject3D, FurnitureObject3D, DimensionLineObject3D, PolylineObject3D, LabelObject3D, GroundObject3D } from "./builders/objectBuilders.js";
import { InstancedFurniture } from "./InstancedFurniture.js";
import type { Object3DBase } from "./Object3DBase.js";

export interface SceneIntermediateOptions {
  addGround?: boolean;
  addLights?: boolean;
  /** Use a single InstancedMesh for model-less furniture (default true). */
  instancedFurniture?: boolean;
  materialCache?: MaterialCache;
  textureCache?: TextureCache;
  modelManager?: ModelManager;
}

export interface SceneIntermediate {
  /** The ground builder (resized when walls/rooms change). */
  ground: GroundObject3D | null;
  /** The scene root group. */
  group: THREE.Group;
  /** The light rig (sun + lights from the home); null when addLights is false. */
  lights: SceneLights | null;
  /** All builders for static items (walls/rooms/etc.), for rebuilds. */
  builders: Object3DBase[];
  /** The InstancedMesh group for model-less furniture (may be null). */
  instancedGroup: THREE.Group | null;
  materialCache: MaterialCache;
  textureCache: TextureCache;
  modelManager: ModelManager;
  /** Rebuilds walls + rooms (used on home collection changes). */
  rebuildStaticItems(): void;
  /** Releases all GPU resources. */
  dispose(): void;
}

/**
 * Builds the home's 3D scene graph once, shared by the 3D view and the photo
 * renderer. Wall/room geometry is rebuilt on home collection changes.
 */
export function buildSceneIntermediate(
  home: Home,
  preferences: UserPreferences,
  options: SceneIntermediateOptions = {},
): SceneIntermediate {
  const group = new THREE.Group();
  const materialCache = options.materialCache ?? new MaterialCache();
  const textureCache = options.textureCache ?? new TextureCache();
  const modelManager = options.modelManager ?? new ModelManager();
  const builders: Object3DBase[] = [];
  let instancedGroup: THREE.Group | null = null;
  let groundBuilder: GroundObject3D | null = null;

  // Ground
  if (options.addGround ?? true) {
    const ground = new GroundObject3D(home, preferences, materialCache, textureCache);
    groundBuilder = ground;
    builders.push(ground);
    group.add(ground.getRoot());
  }
  // Walls
  for (const wall of home.getWalls()) {
    const builder = new WallObject3D(wall, home, preferences, materialCache);
    builders.push(builder);
    group.add(builder.getRoot());
  }
  // Rooms
  for (const room of home.getRooms()) {
    const builder = new RoomObject3D(room, home, preferences, materialCache, textureCache);
    builders.push(builder);
    group.add(builder.getRoot());
  }
  // Furniture: instanced placeholders for model-less pieces
  if (options.instancedFurniture ?? true) {
    const instanced = new InstancedFurniture(home, materialCache);
    instancedGroup = instanced.getGroup();
    group.add(instancedGroup);
  }
  for (const piece of home.getFurniture()) {
    if (piece.getModel() !== null) {
      const builder = new FurnitureObject3D(piece, home, preferences, materialCache, modelManager);
      builders.push(builder);
      group.add(builder.getRoot());
    }
  }
  // Dimension lines
  for (const line of home.getDimensionLines()) {
    const builder = new DimensionLineObject3D(line, home, preferences, materialCache);
    builders.push(builder);
    group.add(builder.getRoot());
  }
  // Polylines
  for (const polyline of home.getPolylines()) {
    const builder = new PolylineObject3D(polyline, home, preferences);
    builders.push(builder);
    group.add(builder.getRoot());
  }
  // Labels
  for (const label of home.getLabels()) {
    const builder = new LabelObject3D(label, home, preferences);
    builders.push(builder);
    group.add(builder.getRoot());
  }

  // Lights
  let lights: SceneLights | null = null;
  if (options.addLights ?? true) {
    lights = new SceneLights({ home });
    for (const light of lights.getLights()) {
      group.add(light);
    }
    group.add(lights.getSunLight().target);
  }

  // Rebuild walls/rooms when the home collection changes (add/delete)
  const collectionListener = { collectionChanged: () => rebuildStaticItems() };
  home.addWallsListener(collectionListener);
  home.addRoomsListener(collectionListener);

  const rebuildStaticItems = (): void => {
    const keep: Object3DBase[] = [];
    for (const builder of builders) {
      if (builder instanceof WallObject3D || builder instanceof RoomObject3D) {
        group.remove(builder.getRoot());
        builder.destroy();
      } else {
        keep.push(builder);
      }
    }
    builders.length = 0;
    builders.push(...keep);
    // Resize the ground to the new bounds
    groundBuilder?.update();
    for (const wall of home.getWalls()) {
      const builder = new WallObject3D(wall, home, preferences, materialCache);
      builders.push(builder);
      group.add(builder.getRoot());
    }
    for (const room of home.getRooms()) {
      const builder = new RoomObject3D(room, home, preferences, materialCache, textureCache);
      builders.push(builder);
      group.add(builder.getRoot());
    }
  };

  const dispose = (): void => {
    home.removeWallsListener(collectionListener);
    home.removeRoomsListener(collectionListener);
    for (const builder of builders) {
      builder.destroy();
    }
    builders.length = 0;
    if (instancedGroup !== null) {
      instancedGroup.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose?.());
        } else {
          material?.dispose?.();
        }
      });
    }
    lights?.destroy();
    materialCache.clear();
    textureCache.clear();
  };

  return { ground: groundBuilder, group, lights, builders, instancedGroup, materialCache, textureCache, modelManager, rebuildStaticItems, dispose };
}
