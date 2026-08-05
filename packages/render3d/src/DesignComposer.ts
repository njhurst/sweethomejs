/*
 * DesignComposer.ts
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
 * Design-style post-processing (task 11.11, docs/15 §7.1): ground-truth
 * ambient occlusion (the algorithm family Eevee uses) applied between the
 * scene render and the tone-mapped output. Shared by the 3D view and (later)
 * the photo renderer.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface DesignComposerOptions {
  /** AO radius in world units (cm; default 80 ≈ a chair's footprint). */
  radius?: number;
  /** AO strength (default 1.2). */
  intensity?: number;
  /** AO resolution scale relative to the canvas (default 0.5). */
  resolutionScale?: number;
}

export interface DesignComposer {
  composer: EffectComposer;
  /** AO pass (tune radius/intensity at runtime). */
  gtao: GTAOPass;
  /** Resizes internal targets to the new canvas size. */
  setSize(width: number, height: number): void;
  dispose(): void;
}

/**
 * Creates a Render → GTAO → Output chain. The scene renderer's tone mapping
 * is deferred to the OutputPass, so set renderer.toneMapping = NoToneMapping
 * while using this composer.
 */
export function createDesignComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  options: DesignComposerOptions = {},
): DesignComposer {
  const width = renderer.domElement.width || 1;
  const height = renderer.domElement.height || 1;
  const aoScale = options.resolutionScale ?? 0.5;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene as THREE.Scene, camera));
  const gtao = new GTAOPass(
    scene as THREE.Scene,
    camera,
    Math.max(1, Math.floor(width * aoScale)),
    Math.max(1, Math.floor(height * aoScale)),
  );
  gtao.updateGtaoMaterial({
    radius: options.radius ?? 80,
    samples: 16,
    distanceExponent: 1,
  });
  gtao.blendIntensity = options.intensity ?? 1.2;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());

  return {
    composer,
    gtao,
    setSize: (w: number, h: number) => {
      composer.setSize(w, h);
      gtao.setSize(Math.max(1, Math.floor(w * aoScale)), Math.max(1, Math.floor(h * aoScale)));
    },
    dispose: () => {
      composer.dispose();
    },
  };
}
