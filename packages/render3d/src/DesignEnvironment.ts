/*
 * DesignEnvironment.ts
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
 * Design-style image-based lighting (task 11.11, docs/15 §7.1): an
 * environment map drives both the diffuse irradiance (bounce light) and the
 * specular reflections of the PBR materials.
 *
 * Two sources:
 *  - createSceneEnvironment: captures the home's OWN scene (six 90° renders
 *    with its direct lights) and PMREMs it — real one-bounce indirect light
 *    from the actual space, fully dynamic (re-capture when lights/sun move).
 *  - createRoomEnvironment: three's procedural studio environment — cheap
 *    fallback / neutral presentation look.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface DesignEnvironment {
  /** Assign to scene.environment. */
  texture: THREE.Texture;
  dispose(): void;
}

/**
 * PMREM of a procedural interior environment (neutral bounce-light look).
 * Needs a renderer for the PMREM generator (GPU).
 */
export function createRoomEnvironment(renderer: THREE.WebGLRenderer): DesignEnvironment {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  const texture = pmrem.fromScene(env).texture;
  env.dispose();
  return {
    texture,
    dispose: () => {
      texture.dispose();
      pmrem.dispose();
    },
  };
}

export interface SceneEnvironmentOptions {
  /** Cube face size in px (default 128; the PMREM output is 256). */
  size?: number;
  /** Cube camera near plane in model units (cm; default 10). */
  near?: number;
  /** Cube camera far plane in model units (cm; default 50000). */
  far?: number;
}

/**
 * Captures the given scene (a THREE.Scene or the intermediate's root Group)
 * into a cube map and converts it to a PMREM environment. The scene is
 * rendered with its current lights, so the environment contains the home's
 * direct light as one-bounce indirect — the Design style's GI look.
 */
export function createSceneEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  options: SceneEnvironmentOptions = {},
): DesignEnvironment {
  const size = options.size ?? 128;
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const cubeCamera = new THREE.CubeCamera(
    options.near ?? 10,
    options.far ?? 50000,
    cubeRenderTarget,
  );
  cubeCamera.position.set(0, 0, 0);
  cubeCamera.update(renderer, scene);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromCubemap(cubeRenderTarget.texture).texture;
  pmrem.dispose();
  cubeRenderTarget.dispose();
  return {
    texture,
    dispose: () => {
      texture.dispose();
    },
  };
}
