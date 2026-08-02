/*
 * Object3DBase.ts
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
 * Object3DBase (task 6.1): base class of the 3D object builders, mirroring
 * Object3DBranch. Each builder owns a THREE.Group, an item + home +
 * preferences + context, an update() entry point, and a listener registry
 * with automatic cleanup.
 */
import * as THREE from "three";
import type { Home, UserPreferences } from "@sweethomejs/core";

/** The context distinguishes simultaneous 3D scenes (view vs offscreen icon). */
export type Object3DContext = unknown;

export abstract class Object3DBase<T extends object = object> {
  protected readonly item: T;
  protected readonly home: Home;
  protected readonly preferences: UserPreferences;
  protected readonly context: Object3DContext;
  private readonly disposables: Array<() => void> = [];

  constructor(item: T, home: Home, preferences: UserPreferences, context: Object3DContext = null) {
    this.item = item;
    this.home = home;
    this.preferences = preferences;
    this.context = context;
  }

  getHome(): Home {
    return this.home;
  }

  getUserPreferences(): UserPreferences {
    return this.preferences;
  }

  getContext(): Object3DContext {
    return this.context;
  }

  /** The root group of this builder (subclasses expose it via getRoot). */
  abstract getRoot(): THREE.Object3D;

  /** Rebuilds/recolors the 3D objects from the current model state. */
  abstract update(): void;

  /**
   * Registers a property-change subscription that is removed on destroy.
   * `listener` is the plain-callback API of the model.
   */
  protected addModelListener(target: { addPropertyChangeListener(l: (evt: unknown) => void): void; removePropertyChangeListener(l: (evt: unknown) => void): void }, listener: (evt: unknown) => void): void {
    target.addPropertyChangeListener(listener);
    this.disposables.push(() => target.removePropertyChangeListener(listener));
  }

  /** Registers a one-shot disposal callback. */
  protected onDispose(callback: () => void): void {
    this.disposables.push(callback);
  }

  /** Disposes the subscriptions (and registered resources) of this builder. */
  destroy(): void {
    for (const dispose of this.disposables.splice(0)) {
      dispose();
    }
  }

  /** Disposes a THREE object graph (geometries, materials, textures). */
  protected static disposeObject3D(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry !== undefined) {
        mesh.geometry.dispose();
      }
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (material !== undefined) {
        const materials = Array.isArray(material) ? material : [material];
        for (const m of materials) {
          const standard = m as THREE.MeshStandardMaterial;
          if (standard.map !== null && standard.map !== undefined) {
            standard.map.dispose();
          }
          m.dispose();
        }
      }
    });
  }
}
