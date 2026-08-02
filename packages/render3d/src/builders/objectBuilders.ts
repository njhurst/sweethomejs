/*
 * objectBuilders.ts
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
 * Object builders (task 6.2): Room, Furniture (placeholder box until 6.5),
 * DimensionLine, Label, Polyline and Ground — each builds THREE objects from
 * the model item and subscribes to its property changes.
 */
import * as THREE from "three";
import type { Home, UserPreferences, Room, HomePieceOfFurniture, DimensionLine, Label, Polyline } from "@sweethomejs/core";
import { Object3DBase } from "../Object3DBase.js";
import { MaterialCache, TextureCache, applyHomeTextureAttributes } from "../AttributeCaches.js";
import { ModelManager, type LoadedModel } from "../ModelManager.js";
import { groundElevation } from "./Elevations.js";

/** Builds a 2D polygon mesh (rooms, ground planes). */
export function buildPolygonGeometry(points: number[][], z: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0]![0]!, points[0]![1]!);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i]![0]!, points[i]![1]!);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  // ShapeGeometry is in XY; rotate +90° about X to map plan y → three z
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, z, 0);
  geometry.computeVertexNormals();
  return geometry;
}

export class RoomObject3D extends Object3DBase<Room> {
  private readonly root = new THREE.Group();
  private readonly materialCache: MaterialCache;
  private readonly textureCache: TextureCache;
  private mesh: THREE.Mesh | null = null;

  constructor(room: Room, home: Home, preferences: UserPreferences, materialCache: MaterialCache, textureCache: TextureCache, context: unknown = null) {
    super(room, home, preferences, context);
    this.materialCache = materialCache;
    this.textureCache = textureCache;
    this.addModelListener(room, () => this.update());
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    const room = this.item;
    if (!room.isFloorVisible()) {
      return;
    }
    const points = room.getPoints();
    if (points.length < 3) {
      return;
    }
    const z = groundElevation(room);
    const geometry = buildPolygonGeometry(points, z);
    const floorTexture = room.getFloorTexture();
    let material: THREE.Material;
    if (floorTexture !== null) {
      const texture = this.textureCache.getTexture(floorTexture.getImage(), () => this.update());
      if (texture !== null) {
        const standardMaterial = this.materialCache.getMaterial({
          diffuseColor: 0xffffff,
          ambientColor: 0x000000,
          shininess: 0,
          opacity: 1,
          doubleSided: true,
        }).clone();
        standardMaterial.map = texture;
        standardMaterial.needsUpdate = true;
        material = standardMaterial;
        applyHomeTextureAttributes(texture, floorTexture, pointsBoundsWidth(points), pointsBoundsHeight(points));
      } else {
        material = this.materialCache.getMaterial({
          diffuseColor: room.getFloorColor() ?? 0xffffff,
          ambientColor: 0x000000,
          shininess: 0,
          opacity: 1,
          doubleSided: true,
        });
      }
    } else {
      material = this.materialCache.getMaterial({
        diffuseColor: room.getFloorColor() ?? 0xffffff,
        ambientColor: 0x000000,
        shininess: 0,
        opacity: 1,
        doubleSided: true,
      });
    }
    this.mesh = new THREE.Mesh(geometry, material);
    this.root.add(this.mesh);
  }

  override destroy(): void {
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
    }
    super.destroy();
  }
}

function pointsBoundsWidth(points: number[][]): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    min = Math.min(min, p[0]!);
    max = Math.max(max, p[0]!);
  }
  return max - min;
}

function pointsBoundsHeight(points: number[][]): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    min = Math.min(min, p[1]!);
    max = Math.max(max, p[1]!);
  }
  return max - min;
}

// ---------------------------------------------------------------------------
// Furniture (placeholder box until the ModelManager lands in 6.5)

export class FurnitureObject3D extends Object3DBase<HomePieceOfFurniture> {
  private readonly root = new THREE.Group();
  private readonly materialCache: MaterialCache;
  private readonly modelManager: ModelManager;
  private mesh: THREE.Mesh | null = null;
  private modelGroup: THREE.Group | null = null;
  private loadedModel: LoadedModel | null = null;

  constructor(piece: HomePieceOfFurniture, home: Home, preferences: UserPreferences, materialCache: MaterialCache, modelManager: ModelManager | null = null, context: unknown = null) {
    super(piece, home, preferences, context);
    this.materialCache = materialCache;
    this.modelManager = modelManager ?? new ModelManager();
    this.addModelListener(piece, () => this.update());
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.modelGroup !== null) {
      this.modelGroup.clear();
      this.modelGroup = null;
    }
    const piece = this.item;
    const width = piece.getWidth();
    const depth = piece.getDepth();
    const height = piece.getHeight();
    const elevation = piece.getElevation() + groundElevation(piece);

    // Try the 3D model; fall back to the placeholder box while loading
    const model = piece.getModel();
    if (model !== null) {
      const loaded = this.modelManager.getModel(model, (loadedModel) => {
        if (loadedModel !== null) {
          this.applyModel(loadedModel);
        }
      });
      if (loaded !== null) {
        this.applyModel(loaded);
        return;
      }
    }

    // Placeholder box centered on the piece position
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = this.materialCache.getMaterial({
      diffuseColor: piece.getColor() ?? 0x8f8f8f,
      ambientColor: 0x000000,
      shininess: 0,
      opacity: 1,
      doubleSided: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(piece.getX(), elevation + height / 2, piece.getY());
    this.mesh.rotation.y = piece.getAngle();
    this.root.add(this.mesh);
  }

  private applyModel(model: LoadedModel): void {
    this.loadedModel = model;
    this.modelGroup = new THREE.Group();
    this.modelManager.applyPieceTransform(model, this.item, this.modelGroup);
    const piece = this.item;
    const elevation = piece.getElevation() + groundElevation(piece);
    this.modelGroup.position.set(piece.getX(), elevation + piece.getHeight() / 2, piece.getY());
    this.modelGroup.rotation.y = piece.getAngle();
    this.root.clear();
    this.root.add(this.modelGroup);
  }

  /** The loaded model group (null when the placeholder is shown). */
  getLoadedModel(): LoadedModel | null {
    return this.loadedModel;
  }

  override destroy(): void {
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
    }
    if (this.modelGroup !== null) {
      this.modelGroup.clear();
    }
    super.destroy();
  }
}

// ---------------------------------------------------------------------------
// Dimension lines, labels, polylines (line-based objects)

export class DimensionLineObject3D extends Object3DBase<DimensionLine> {
  private readonly root = new THREE.Group();
  private readonly materialCache: MaterialCache;
  private lines: THREE.Line | null = null;

  constructor(line: DimensionLine, home: Home, preferences: UserPreferences, materialCache: MaterialCache, context: unknown = null) {
    super(line, home, preferences, context);
    this.materialCache = materialCache;
    this.addModelListener(line, () => this.update());
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    if (this.lines !== null) {
      this.lines.geometry.dispose();
      this.lines = null;
    }
    const line = this.item;
    if (!line.isVisibleIn3D()) {
      return;
    }
    const z = line.getElevationStart() + groundElevation(line);
    const geometry = new THREE.BufferGeometry();
    const positions = [
      line.getXStart(), z, line.getYStart(),
      line.getXEnd(), z, line.getYEnd(),
    ];
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: (line.getColor() ?? 0x000000) & 0xffffff,
    });
    this.lines = new THREE.Line(geometry, material);
    this.root.add(this.lines);
  }

  override destroy(): void {
    if (this.lines !== null) {
      this.lines.geometry.dispose();
      (this.lines.material as THREE.Material).dispose();
    }
    super.destroy();
  }
}

export class PolylineObject3D extends Object3DBase<Polyline> {
  private readonly root = new THREE.Group();
  private lines: THREE.Line | null = null;

  constructor(polyline: Polyline, home: Home, preferences: UserPreferences, context: unknown = null) {
    super(polyline, home, preferences, context);
    this.addModelListener(polyline, () => this.update());
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    if (this.lines !== null) {
      this.lines.geometry.dispose();
      (this.lines.material as THREE.Material).dispose();
      this.lines = null;
    }
    const polyline = this.item;
    if (!polyline.isVisibleIn3D()) {
      return;
    }
    const points = polyline.getPoints();
    if (points.length < 2) {
      return;
    }
    const z = polyline.getElevation() + groundElevation(polyline);
    const positions: number[] = [];
    for (const p of points) {
      positions.push(p[0]!, z, p[1]!);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: (polyline.getColor() ?? 0x000000) & 0xffffff,
    });
    this.lines = new THREE.Line(geometry, material);
    this.root.add(this.lines);
  }

  override destroy(): void {
    if (this.lines !== null) {
      this.lines.geometry.dispose();
      (this.lines.material as THREE.Material).dispose();
    }
    super.destroy();
  }
}

export class LabelObject3D extends Object3DBase<Label> {
  private readonly root = new THREE.Group();

  constructor(label: Label, home: Home, preferences: UserPreferences, context: unknown = null) {
    super(label, home, preferences, context);
    this.addModelListener(label, () => this.update());
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    const label = this.item;
    const z = label.getElevation() + groundElevation(label);
    // A small marker point (3D text via canvas billboards is a later refinement)
    const geometry = new THREE.SphereGeometry(1, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: (label.getColor() ?? 0x000000) & 0xffffff,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(label.getX(), z, label.getY());
    this.root.add(marker);
  }

  override destroy(): void {
    super.destroy();
  }
}

// ---------------------------------------------------------------------------
// Ground plane

export class GroundObject3D extends Object3DBase<Home> {
  private readonly root = new THREE.Group();
  private readonly materialCache: MaterialCache;
  private readonly textureCache: TextureCache;
  private mesh: THREE.Mesh | null = null;

  constructor(home: Home, preferences: UserPreferences, materialCache: MaterialCache, textureCache: TextureCache, context: unknown = null) {
    super(home, home, preferences, context);
    this.materialCache = materialCache;
    this.textureCache = textureCache;
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  override update(): void {
    this.root.clear();
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    const environment = this.home.getEnvironment();
    if (!((environment as unknown as { isGroundVisible?(): boolean }).isGroundVisible?.() ?? true)) {
      return;
    }
    // A large ground plane (Java Ground3D uses a big textured plane)
    const size = 5000;
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    const groundTexture = environment.getGroundTexture();
    let material: THREE.Material;
    if (groundTexture !== null) {
      const texture = this.textureCache.getTexture(groundTexture.getImage(), () => this.update());
      if (texture !== null) {
        const standardMaterial = this.materialCache.getMaterial({ diffuseColor: 0xffffff, ambientColor: 0x000000, shininess: 0, opacity: 1, doubleSided: false }).clone();
        standardMaterial.map = texture;
        standardMaterial.needsUpdate = true;
        material = standardMaterial;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(size / groundTexture.getScale(), size / groundTexture.getScale());
      } else {
        material = this.materialCache.getMaterial({ diffuseColor: environment.getGroundColor(), ambientColor: 0x000000, shininess: 0, opacity: 1, doubleSided: false });
      }
    } else {
      material = this.materialCache.getMaterial({ diffuseColor: environment.getGroundColor(), ambientColor: 0x000000, shininess: 0, opacity: 1, doubleSided: false });
    }
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 0;
    this.root.add(this.mesh);
  }

  override destroy(): void {
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
    }
    super.destroy();
  }
}
