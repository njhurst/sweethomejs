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
 * View3DCanvas (task 7.1 + follow-up): hosts the Three.js 3D view. Defaults
 * to an oblique exterior view framing the whole home, and provides orbit
 * navigation: drag to rotate (yaw/pitch around the home), wheel to dolly,
 * right-drag or two fingers to pan, double-click to re-frame the home. All
 * movements write back to the model observer camera so the 3D view, photos
 * and videos share the same camera.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Home, UserPreferences, HomeController3D, ObserverCamera } from "@sweethomejs/core";
import { HomeScene3D } from "@sweethomejs/render3d";
import { View3DCamera, applyModelCameraToThree } from "@sweethomejs/render3d";

export interface View3DCanvasProps {
  home: Home;
  preferences: UserPreferences;
  homeController3D: HomeController3D;
  onReady?: (scene: HomeScene3D) => void;
}

/** Computes the 3D bounds of the home content (model units, cm). */
function computeHome3DBounds(home: Home): { min: THREE.Vector3; max: THREE.Vector3 } {
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  const add = (x: number, y: number, z: number): void => {
    min.x = Math.min(min.x, x);
    min.y = Math.min(min.y, y);
    min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x);
    max.y = Math.max(max.y, y);
    max.z = Math.max(max.z, z);
  };
  for (const wall of home.getWalls()) {
    for (const point of wall.getPoints()) {
      const x = point[0]!;
      const y = point[1]!;
      add(x, y, 0);
      add(x, y, wall.getHeight() ?? 250);
    }
  }
  for (const room of home.getRooms()) {
    for (const point of room.getPoints()) {
      add(point[0]!, point[1]!, 0);
    }
  }
  for (const piece of home.getFurniture()) {
    const elevation = piece.getElevation();
    add(piece.getX(), piece.getY(), elevation);
    add(piece.getX(), piece.getY(), elevation + piece.getHeight());
  }
  if (!Number.isFinite(min.x)) {
    return { min: new THREE.Vector3(-200, -200, 0), max: new THREE.Vector3(200, 200, 200) };
  }
  return { min, max };
}

export function View3DCanvas(props: View3DCanvasProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HomeScene3D | null>(null);
  const view3DCameraRef = useRef<View3DCamera | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const homeRef = useRef(props.home);
  homeRef.current = props.home;

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
    cameraRef.current = camera;
    const view3DCamera = new View3DCamera({
      home: props.home,
      homeController3D: props.homeController3D,
      camera,
    });
    view3DCameraRef.current = view3DCamera;

    // Default view: an oblique exterior view framing the whole home
    const frameHome = (): void => {
      const bounds = computeHome3DBounds(props.home);
      const center = new THREE.Vector3(
        (bounds.min.x + bounds.max.x) / 2,
        (bounds.min.y + bounds.max.y) / 2,
        (bounds.min.z + bounds.max.z) / 2,
      );
      const radius = Math.max(
        (bounds.max.x - bounds.min.x) / 2,
        (bounds.max.y - bounds.min.y) / 2,
        (bounds.max.z - bounds.min.z) / 2,
        100,
      );
      const yaw = Math.PI / 4; // 45°
      const pitch = Math.PI * 0.19; // ~34° above the horizon, looking down
      const distance = radius * 2.6;
      setObserverCameraFromOrbit(props.home, center, yaw, pitch, distance, radius);
    };

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
    // Frame the home on the first frame (after the scene exists)
    requestAnimationFrame(() => {
      props.homeController3D.viewFromObserver();
      frameHome();
    });

    // ------------------------------------------------------------ navigation
    const orbit = new OrbitNavigator(props.home, camera, () => frameHome());
    orbit.attach(container);
    orbit.dblClickRef = () => frameHome();

    props.onReady?.(scene);

    return () => {
      cancelAnimationFrame(frameId);
      orbit.detach(container);
      view3DCamera.destroy();
      scene.destroy();
      renderer!.dispose();
      renderer!.domElement.remove();
      sceneRef.current = null;
      view3DCameraRef.current = null;
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.home, props.homeController3D, props.preferences]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} data-testid="view3d" />;
}

/** Positions the model observer camera at an orbit point looking at the target. */
function setObserverCameraFromOrbit(
  home: Home,
  target: THREE.Vector3,
  yaw: number,
  pitch: number,
  distance: number,
  radius: number,
): void {
  const observer = home.getObserverCamera();
  // Model (x, y, z) with yaw/pitch matching applyModelCameraToThree
  const dir = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  );
  const camPos = target.clone().add(dir.multiplyScalar(-distance));
  observer.setX(camPos.x);
  observer.setY(camPos.z);
  observer.setZ(camPos.y);
  observer.setYaw(yaw);
  observer.setPitch(pitch);
  // Keep the far plane well beyond the home
  observer.setFieldOfView(Math.PI * 55 / 180);
}

/**
 * Orbit navigation: drag to rotate around the home, wheel to dolly,
 * right-drag to pan, double-click to re-frame. Writes to the observer camera.
 */
class OrbitNavigator {
  private pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;
  private panning = false;
  private lastX = 0;
  private lastY = 0;
  /** Re-frames the home (double-click). */
  dblClickRef: (() => void) | null = null;

  constructor(
    private readonly home: Home,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly reframe: () => void,
  ) {}

  private readonly onPointerDown = (event: PointerEvent): void => {
    const rect = this.camera.parent?.parent === null ? null : null;
    void rect;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (event.button === 2) {
      this.panning = true;
    } else if (event.button === 0 && this.pointers.size === 1) {
      this.dragging = true;
    }
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging && !this.panning) {
      return;
    }
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    const observer = this.home.getObserverCamera() as ObserverCamera;
    const width = (event.currentTarget as HTMLElement).clientWidth || 600;
    if (this.panning) {
      // Pan: move the camera + target along the camera's right/up axes
      const distance = 250 * (observer.getZ() / 1500);
      const yaw = observer.getYaw();
      const pitch = observer.getPitch();
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const up = new THREE.Vector3(Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), Math.cos(yaw) * Math.sin(pitch));
      const pan = right.multiplyScalar(-dx * distance * 0.5).add(up.multiplyScalar(dy * distance * 0.5));
      observer.setX(observer.getX() + pan.x);
      observer.setY(observer.getY() + pan.z);
      observer.setZ(observer.getZ() + pan.y);
      return;
    }
    // Rotate (yaw/pitch) around the home center target
    const target = this.orbitTarget();
    const yaw = observer.getYaw() - dx * (Math.PI / width) * 2;
    const pitch = Math.min(Math.max(observer.getPitch() - dy * (Math.PI / width) * 2, -Math.PI / 2.05), Math.PI / 2.05);
    const current = new THREE.Vector3(observer.getX(), observer.getZ(), observer.getY());
    const distance = Math.max(50, current.distanceTo(target));
    setObserverCameraFromOrbit(this.home, target, yaw, pitch, distance, 100);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.panning = false;
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const observer = this.home.getObserverCamera() as ObserverCamera;
    const target = this.orbitTarget();
    const current = new THREE.Vector3(observer.getX(), observer.getZ(), observer.getY());
    const distance = Math.max(50, current.distanceTo(target));
    const factor = event.deltaY < 0 ? 0.9 : 1.1;
    setObserverCameraFromOrbit(this.home, target, observer.getYaw(), observer.getPitch(), distance * factor, 100);
  };

  private readonly onDblClick = (event: MouseEvent): void => {
    void event;
    this.dblClickRef?.();
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  /** The orbit target: the home's 3D center. */
  private orbitTarget(): THREE.Vector3 {
    // Recompute from the home each time so the view follows content changes
    const bounds = computeHome3DBounds(this.home);
    return new THREE.Vector3(
      (bounds.min.x + bounds.max.x) / 2,
      (bounds.min.y + bounds.max.y) / 2,
      (bounds.min.z + bounds.max.z) / 2,
    );
  }

  attach(element: HTMLElement): void {
    element.addEventListener("pointerdown", this.onPointerDown);
    element.addEventListener("pointermove", this.onPointerMove);
    element.addEventListener("pointerup", this.onPointerUp);
    element.addEventListener("pointercancel", this.onPointerUp);
    element.addEventListener("wheel", this.onWheel, { passive: false });
    element.addEventListener("dblclick", this.onDblClick);
    element.addEventListener("contextmenu", this.onContextMenu);
  }

  detach(element: HTMLElement): void {
    element.removeEventListener("pointerdown", this.onPointerDown);
    element.removeEventListener("pointermove", this.onPointerMove);
    element.removeEventListener("pointerup", this.onPointerUp);
    element.removeEventListener("pointercancel", this.onPointerUp);
    element.removeEventListener("wheel", this.onWheel);
    element.removeEventListener("dblclick", this.onDblClick);
    element.removeEventListener("contextmenu", this.onContextMenu);
  }
}
