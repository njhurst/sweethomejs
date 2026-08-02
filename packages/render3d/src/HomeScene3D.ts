/*
 * HomeScene3D.ts
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
 * HomeScene3D (task 6.8): assembles the full 3D scene for a home — ground,
 * walls, rooms, furniture (instanced placeholders + per-piece model builders),
 * dimension lines, polylines, labels, lights and selection boxes — and keeps
 * it in sync with the model. This is the integration point for the P5 view.
 */
import * as THREE from "three";
import type { Home, UserPreferences } from "@sweethomejs/core";
import { Object3DBase } from "./Object3DBase.js";
import { MaterialCache, TextureCache } from "./AttributeCaches.js";
import { ModelManager } from "./ModelManager.js";
import { WallObject3D } from "./builders/WallObject3D.js";
import { RoomObject3D, FurnitureObject3D, DimensionLineObject3D, PolylineObject3D, LabelObject3D, GroundObject3D } from "./builders/objectBuilders.js";
import { SceneLights } from "./SceneLights.js";
import { SelectionBoxes3D } from "./SelectionBoxes3D.js";
import { InstancedFurniture } from "./InstancedFurniture.js";

export interface HomeScene3DOptions {
  home: Home;
  preferences: UserPreferences;
  /** Shared caches (optional; new ones are created). */
  materialCache?: MaterialCache;
  textureCache?: TextureCache;
  modelManager?: ModelManager;
  /** Add lights (default true). */
  addLights?: boolean;
  /** Add the ground plane (default true). */
  addGround?: boolean;
  /** Use the instanced placeholder path for model-less furniture (default true). */
  instancedFurniture?: boolean;
}

export class HomeScene3D extends Object3DBase<Home> {
  private readonly root = new THREE.Group();
  private readonly materialCache: MaterialCache;
  private readonly textureCache: TextureCache;
  private readonly modelManager: ModelManager;
  private readonly lights: SceneLights | null = null;
  private readonly selectionBoxes: SelectionBoxes3D;
  private readonly builders: Object3DBase[] = [];
  private readonly instancedFurniture: InstancedFurniture | null = null;

  constructor(options: HomeScene3DOptions) {
    super(options.home, options.home, options.preferences, null);
    this.materialCache = options.materialCache ?? new MaterialCache();
    this.textureCache = options.textureCache ?? new TextureCache();
    this.modelManager = options.modelManager ?? new ModelManager();

    // Ground
    if (options.addGround ?? true) {
      const ground = new GroundObject3D(options.home, options.preferences, this.materialCache, this.textureCache);
      this.builders.push(ground);
      this.root.add(ground.getRoot());
    }

    // Walls
    for (const wall of options.home.getWalls()) {
      const builder = new WallObject3D(wall, options.home, options.preferences, this.materialCache);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
    // Rooms
    for (const room of options.home.getRooms()) {
      const builder = new RoomObject3D(room, options.home, options.preferences, this.materialCache, this.textureCache);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
    // Furniture: instanced placeholders for model-less pieces + individual
    // builders for pieces with models
    if (options.instancedFurniture ?? true) {
      this.instancedFurniture = new InstancedFurniture(options.home, this.materialCache);
      this.root.add(this.instancedFurniture.getGroup());
    }
    for (const piece of options.home.getFurniture()) {
      if (piece.getModel() !== null) {
        const builder = new FurnitureObject3D(piece, options.home, options.preferences, this.materialCache, this.modelManager);
        this.builders.push(builder);
        this.root.add(builder.getRoot());
      }
    }
    // Dimension lines
    for (const line of options.home.getDimensionLines()) {
      const builder = new DimensionLineObject3D(line, options.home, options.preferences, this.materialCache);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
    // Polylines
    for (const polyline of options.home.getPolylines()) {
      const builder = new PolylineObject3D(polyline, options.home, options.preferences);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
    // Labels
    for (const label of options.home.getLabels()) {
      const builder = new LabelObject3D(label, options.home, options.preferences);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
    // Selection boxes
    this.selectionBoxes = new SelectionBoxes3D(options.home);
    this.root.add(this.selectionBoxes.getGroup());

    // Lights
    if (options.addLights ?? true) {
      this.lights = new SceneLights({ home: options.home });
      for (const light of this.lights.getLights()) {
        this.root.add(light);
      }
      this.root.add(this.lights.getSunLight().target);
    }

    // Rebuild walls/rooms when the home collection changes (add/delete)
    const collectionListener = { collectionChanged: () => this.rebuildStaticItems() };
    this.home.addWallsListener(collectionListener);
    this.home.addRoomsListener(collectionListener);
    this.onDispose(() => {
      this.home.removeWallsListener(collectionListener);
      this.home.removeRoomsListener(collectionListener);
    });
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    // Individual builders update on their own property changes; the scene
    // rebuilds collections (add/delete) via the collection listeners.
  }

  getMaterialCache(): MaterialCache {
    return this.materialCache;
  }

  getTextureCache(): TextureCache {
    return this.textureCache;
  }

  getModelManager(): ModelManager {
    return this.modelManager;
  }

  getSceneLights(): SceneLights | null {
    return this.lights;
  }

  getSelectionBoxes(): SelectionBoxes3D {
    return this.selectionBoxes;
  }

  /** Rebuilds walls + rooms from the model (used on collection changes). */
  private rebuildStaticItems(): void {
    // Remove old wall/room builders
    const keep: Object3DBase[] = [];
    for (const builder of this.builders) {
      if (builder instanceof WallObject3D || builder instanceof RoomObject3D) {
        this.root.remove(builder.getRoot());
        builder.destroy();
      } else {
        keep.push(builder);
      }
    }
    this.builders.length = 0;
    this.builders.push(...keep);
    for (const wall of this.home.getWalls()) {
      const builder = new WallObject3D(wall, this.home, this.preferences, this.materialCache);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
    for (const room of this.home.getRooms()) {
      const builder = new RoomObject3D(room, this.home, this.preferences, this.materialCache, this.textureCache);
      this.builders.push(builder);
      this.root.add(builder.getRoot());
    }
  }

  /** The scene's bounding sphere (for culling/camera framing). */
  getBoundingSphere(): THREE.Sphere {
    const sphere = new THREE.Sphere();
    new THREE.Box3().setFromObject(this.root).getBoundingSphere(sphere);
    return sphere;
  }

  override destroy(): void {
    for (const builder of this.builders) {
      builder.destroy();
    }
    this.builders.length = 0;
    this.instancedFurniture?.destroy();
    this.selectionBoxes.destroy();
    this.lights?.destroy();
    this.materialCache.clear();
    this.textureCache.clear();
    super.destroy();
  }
}
