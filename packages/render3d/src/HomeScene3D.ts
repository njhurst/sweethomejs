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
import { buildSceneIntermediate, type SceneIntermediate } from "./SceneIntermediate.js";
import { SceneLights } from "./SceneLights.js";
import { SelectionBoxes3D } from "./SelectionBoxes3D.js";
import type { InstancedFurniture } from "./InstancedFurniture.js";

export interface HomeScene3DOptions {
  home: Home;
  preferences: UserPreferences;
  /** Shared caches (optional; new ones are created). */
  materialCache?: MaterialCache;
  textureCache?: TextureCache;
  modelManager?: ModelManager;
  /** Add lights (default true). */
  addLights?: boolean;
  /** Add a PointLight per furniture light source (Design style; default false). */
  addLightSources?: boolean;
  /** Use MeshPhysicalMaterial for all surfaces (Design style; default false). */
  physicalMaterials?: boolean;
  /** Enable sun shadow maps (Design style; default false). */
  shadows?: boolean;
  /** Add the ground plane (default true). */
  addGround?: boolean;
  /** Use the instanced placeholder path for model-less furniture (default true). */
  instancedFurniture?: boolean;
}

export class HomeScene3D extends Object3DBase<Home> {
  private readonly root = new THREE.Group();
  private readonly intermediate: SceneIntermediate;
  private readonly materialCache: MaterialCache;
  private readonly textureCache: TextureCache;
  private readonly modelManager: ModelManager;
  private readonly lights: SceneLights | null = null;
  private readonly selectionBoxes: SelectionBoxes3D;
  private readonly instancedFurniture: InstancedFurniture | null = null;
  private readonly builders: Object3DBase[] = [];
  private disposed = false;

  constructor(options: HomeScene3DOptions) {
    super(options.home, options.home, options.preferences, null);
    this.materialCache = options.materialCache ?? new MaterialCache();
    this.textureCache = options.textureCache ?? new TextureCache();
    this.modelManager = options.modelManager ?? new ModelManager();

    // The shared scene intermediate (task 8.2): the same scene graph the
    // photo renderer consumes.
    this.intermediate = buildSceneIntermediate(options.home, options.preferences, {
      addGround: options.addGround ?? true,
      addLights: options.addLights ?? true,
      addLightSources: options.addLightSources ?? false,
      physicalMaterials: options.physicalMaterials ?? false,
      shadows: options.shadows ?? false,
      instancedFurniture: options.instancedFurniture ?? true,
      materialCache: this.materialCache,
      textureCache: this.textureCache,
      modelManager: this.modelManager,
    });
    this.root.add(this.intermediate.group);
    this.lights = this.intermediate.lights;
    this.builders.push(...this.intermediate.builders);

    // Selection boxes
    this.selectionBoxes = new SelectionBoxes3D(options.home);
    this.root.add(this.selectionBoxes.getGroup());
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
    this.intermediate.rebuildStaticItems();
    // Rebuild the builders array (the intermediate replaced its wall/room
    // builders; the rest are shared).
    this.builders.length = 0;
    this.builders.push(...this.intermediate.builders);
  }

  /** The scene's bounding sphere (for culling/camera framing). */
  getBoundingSphere(): THREE.Sphere {
    const sphere = new THREE.Sphere();
    new THREE.Box3().setFromObject(this.root).getBoundingSphere(sphere);
    return sphere;
  }

  override destroy(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.builders.length = 0;
    this.selectionBoxes.destroy();
    this.intermediate.dispose();
    super.destroy();
  }
}
