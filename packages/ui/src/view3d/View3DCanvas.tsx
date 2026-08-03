/*
 * View3DCanvas.tsx
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
 * View3DCanvas (task 7.1): React component hosting the Three.js 3D view.
 * Creates a WebGL renderer, assembles the HomeScene3D, syncs the camera from
 * the model via View3DCamera, and runs the render loop.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Home, UserPreferences, HomeController3D } from "@sweethomejs/core";
import { HomeScene3D, View3DCamera } from "@sweethomejs/render3d";

export interface View3DCanvasProps {
  home: Home;
  preferences: UserPreferences;
  homeController3D: HomeController3D;
  onReady?: (scene: HomeScene3D) => void;
}

export function View3DCanvas(props: View3DCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HomeScene3D | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      // WebGL unavailable
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    const scene = new HomeScene3D({ home: props.home, preferences: props.preferences });
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20000);
    camera.position.set(0, 2000, 0);
    camera.lookAt(0, 0, 0);
    const view3DCamera = new View3DCamera({
      home: props.home,
      homeController3D: props.homeController3D,
      camera,
    });

    const render = (): void => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer!.setSize(width, height, false);
      view3DCamera.setAspect(width / height);
      view3DCamera.update();
      renderer!.render(scene.getRoot() as THREE.Scene, camera);
      frameId = requestAnimationFrame(render);
    };
    let frameId = requestAnimationFrame(render);

    props.onReady?.(scene);

    return () => {
      cancelAnimationFrame(frameId);
      view3DCamera.destroy();
      scene.destroy();
      renderer!.dispose();
      renderer!.domElement.remove();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.home, props.homeController3D, props.preferences]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} data-testid="view3d" />;
}
