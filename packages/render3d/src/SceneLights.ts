/*
 * SceneLights.ts
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
 * SceneLights (task 6.4): builds and updates the scene lights — the Java
 * default light rig (4 colored directional lights + ambient) with the
 * environment's light color applied, a sun directional light from the
 * compass (azimuth/elevation at the camera time), and a ceiling light from
 * above with the ceiling light color.
 */
import * as THREE from "three";
import type { Home } from "@sweethomejs/core";
import { colorToThree } from "./AttributeCaches.js";
import { groundElevation } from "./builders/Elevations.js";

/** The LightSource surface used by furniture light points (structural). */
type LightSourceLike = {
  getX(): number;
  getY(): number;
  getZ(): number;
  getColor(): number;
};

/**
 * Scales furniture light-source power (0..1) to PointLight intensity (cd)
 * for three's physical lighting. Tuned so a power-0.5 lamp pools ~250 lux at
 * 2 m with ACES tone mapping; see KNOWN_DIFFS for the Java comparison.
 */
const LIGHT_SOURCE_INTENSITY_SCALE = 2000;

export interface SceneLightsOptions {
  home: Home;
  /** Enable shadow-casting on the sun light (default false). */
  shadows?: boolean;
  /**
   * Add a PointLight per furniture light source (HomeLight pieces),
   * positioned in the piece's frame and scaled by its power (default false —
   * off keeps the current/Technical look and golden renders).
   */
  addLightSources?: boolean;
}

export class SceneLights {
  private readonly home: Home;
  private readonly lights: THREE.Object3D[] = [];
  private readonly sunLight: THREE.DirectionalLight;
  private readonly ceilingLight: THREE.DirectionalLight;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly addLightSources: boolean;
  private readonly disposables: Array<() => void> = [];

  constructor(options: SceneLightsOptions) {
    this.home = options.home;
    this.addLightSources = options.addLightSources ?? false;
    this.ambientLight = new THREE.AmbientLight(0x333333);

    // Fixed directional rig with default intensities (Java createLights)
    const rigDirections = [
      new THREE.Vector3(1.5, -0.8, -1),
      new THREE.Vector3(-1.5, -0.8, -1),
      new THREE.Vector3(0, -0.8, 1),
      new THREE.Vector3(0, 1, 0),
    ];
    const rigIntensities = [1, 1, 1, 0.7];
    for (let i = 0; i < rigDirections.length; i++) {
      const light = new THREE.DirectionalLight(0xffffff, rigIntensities[i]);
      light.position.copy(rigDirections[i]!).multiplyScalar(1000);
      this.lights.push(light);
    }

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.ceilingLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.ceilingLight.position.set(0, 5000, 0);
    if (options.shadows ?? false) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.camera.left = -2000;
      this.sunLight.shadow.camera.right = 2000;
      this.sunLight.shadow.camera.top = 2000;
      this.sunLight.shadow.camera.bottom = -2000;
      this.sunLight.shadow.camera.far = 10000;
    }
    this.lights.push(this.sunLight, this.ceilingLight, this.ambientLight);

    if (this.addLightSources) {
      this.updateLightSources();
      // Rebuild furniture lights when pieces are added/removed
      const furnitureListener = { collectionChanged: () => this.updateLightSources() };
      this.home.addFurnitureListener(furnitureListener);
      this.disposables.push(() => this.home.removeFurnitureListener(furnitureListener));
    }

    this.update();
    const listener = (): void => this.update();
    this.home.getEnvironment().addPropertyChangeListener((evt) => {
      const propertyName = (evt as { propertyName?: string }).propertyName;
      if (propertyName === "LIGHT_COLOR" || propertyName === "CEILING_LIGHT_COLOR") {
        this.update();
      }
    });
    this.home.addPropertyChangeListener("CAMERA", {
      propertyChange: () => this.updateSunDirection(),
    });
    this.home.getCompass().addPropertyChangeListener(listener);
  }

  /**
   * Replaces the furniture light-source PointLights. LightSource (x,y,z)
   * offsets are in the piece's frame: rotated by the piece's plan angle and
   * raised by its elevation. Intensity scales with the piece's power.
   */
  private updateLightSources(): void {
    for (const light of this.lights) {
      if (light.userData.furnitureLight === true) {
        this.lights.splice(this.lights.indexOf(light), 1);
        light.removeFromParent();
      }
    }
    for (const piece of this.home.getFurniture()) {
      const lightSources =
        (piece as { getLightSources?: () => LightSourceLike[] }).getLightSources?.() ?? [];
      for (const lightSource of lightSources) {
        const angle = piece.getAngle();
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = lightSource.getX();
        const y = lightSource.getY();
        const light = new THREE.PointLight(
          colorToThree(lightSource.getColor()),
          ((piece as { getPower?: () => number }).getPower?.() ?? 0.5) *
            LIGHT_SOURCE_INTENSITY_SCALE,
        );
        light.position.set(
          piece.getX() + x * cos - y * sin,
          piece.getElevation() + groundElevation(piece) + lightSource.getZ(),
          piece.getY() + x * sin + y * cos,
        );
        light.userData.furnitureLight = true;
        this.lights.push(light);
      }
    }
  }

  /** The light objects to add to the scene. */
  getLights(): THREE.Object3D[] {
    return this.lights;
  }

  /** Updates colors from the environment and the sun direction. */
  update(): void {
    const environment = this.home.getEnvironment();
    const lightColor = colorToThree(environment.getLightColor());
    for (const light of this.lights) {
      if (light instanceof THREE.DirectionalLight) {
        light.color.copy(lightColor);
      }
    }
    this.ambientLight.color.set(0x333333);
    this.ceilingLight.color.copy(colorToThree(environment.getCeillingLightColor()));
    this.updateSunDirection();
  }

  /**
   * Positions the sun light from the compass: model azimuth (from north =
   * +y) and elevation, mapped to three space (north → +z).
   */
  updateSunDirection(): void {
    const compass = this.home.getCompass();
    const time = this.home.getCamera().getTime();
    const azimuth = compass.getSunAzimuth(time);
    const elevation = compass.getSunElevation(time);
    // Sun direction: model (sin(az)·cos(el), sin(el), cos(az)·cos(el))
    // → three (x, y, z) with model +y = three +z
    const direction = new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation),
    );
    if (direction.lengthSq() < 1e-12) {
      direction.set(0, 1, 0);
    }
    direction.normalize();
    this.sunLight.position.copy(direction).multiplyScalar(5000);
    this.sunLight.target.position.set(0, 0, 0);
    if (this.sunLight.target.parent === null) {
      // The target must be in the scene; the caller adds it
      this.sunLight.target.updateMatrixWorld();
    }
  }

  /** The sun light (for shadows/debug). */
  getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  destroy(): void {
    for (const dispose of this.disposables.splice(0)) {
      dispose();
    }
  }
}
