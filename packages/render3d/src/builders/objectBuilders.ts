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
import type {
  Home,
  UserPreferences,
  Room,
  HomePieceOfFurniture,
  DimensionLine,
  Label,
  Polyline,
} from "@sweethomejs/core";
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

  constructor(
    room: Room,
    home: Home,
    preferences: UserPreferences,
    materialCache: MaterialCache,
    textureCache: TextureCache,
    context: unknown = null,
  ) {
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
    const floorShininess = room.getFloorShininess();
    const geometry = buildPolygonGeometry(points, z);
    const floorTexture = room.getFloorTexture();
    let material: THREE.Material;
    if (floorTexture !== null) {
      const texture = this.textureCache.getTexture(floorTexture.getImage(), () => this.update());
      if (texture !== null) {
        const standardMaterial = this.materialCache
          .getMaterial({
            diffuseColor: 0xffffff,
            ambientColor: 0x000000,
            shininess: floorShininess,
            opacity: 1,
            doubleSided: true,
            polygonOffset: 2,
          })
          .clone();
        standardMaterial.map = texture;
        standardMaterial.needsUpdate = true;
        material = standardMaterial;
        applyHomeTextureAttributes(
          texture,
          floorTexture,
          pointsBoundsWidth(points),
          pointsBoundsHeight(points),
        );
      } else {
        material = this.materialCache.getMaterial({
          diffuseColor: room.getFloorColor() ?? 0xffffff,
          ambientColor: 0x000000,
          shininess: floorShininess,
          opacity: 1,
          doubleSided: true,
          polygonOffset: 2,
        });
      }
    } else {
      material = this.materialCache.getMaterial({
        diffuseColor: room.getFloorColor() ?? 0xffffff,
        ambientColor: 0x000000,
        shininess: floorShininess,
        opacity: 1,
        doubleSided: true,
        // Keep the floor's fragments clearly in front of the ground in the
        // depth test (z-fighting at distance otherwise shows the floor's
        // triangulation as visible borders).
        polygonOffset: 2,
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

  constructor(
    piece: HomePieceOfFurniture,
    home: Home,
    preferences: UserPreferences,
    materialCache: MaterialCache,
    modelManager: ModelManager | null = null,
    context: unknown = null,
  ) {
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
      shininess: piece.getShininess() ?? 0,
      opacity: 1,
      doubleSided: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    // A tiny lift keeps the piece clear of the floor in the depth test
    // (model bottoms at the floor elevation otherwise z-fight the floor).
    const LIFT = 1;
    this.mesh.position.set(piece.getX(), elevation + height / 2 + LIFT, piece.getY());
    this.mesh.rotation.y = piece.getAngle();
    this.root.add(this.mesh);
  }

  private applyModel(model: LoadedModel): void {
    this.loadedModel = model;
    this.modelGroup = new THREE.Group();
    this.modelManager.applyPieceTransform(model, this.item, this.modelGroup);
    this.applyPieceMaterials();
    const piece = this.item;
    const elevation = piece.getElevation() + groundElevation(piece);
    // Small lift so the model's bottom doesn't z-fight the floor
    this.modelGroup.position.set(piece.getX(), elevation + piece.getHeight() / 2 + 1, piece.getY());
    this.modelGroup.rotation.y = piece.getAngle();
    this.root.clear();
    this.root.add(this.modelGroup);
  }

  /**
   * Overrides the loaded model's materials with the piece's modelMaterials
   * (matched by material name) or its single color, mirroring Java's
   * HomePieceOfFurniture3D: modelMaterials win per-name; otherwise a piece
   * color tints every material. Textures on the model are kept.
   */
  private applyPieceMaterials(): void {
    const piece = this.item;
    const modelMaterials = piece.getModelMaterials();
    const color = piece.getColor();
    if (modelMaterials === null && color === null) {
      return;
    }
    this.modelGroup?.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) {
        return;
      }
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as THREE.MeshStandardMaterial;
        if (standard.color === undefined || standard.roughness === undefined) {
          continue;
        }
        const modelMaterial =
          modelMaterials !== null
            ? modelMaterials.find((m) => m.getName() === material.name)
            : undefined;
        const useAlpha = (value: number): boolean => value >>> 0 > 0xffffff;
        const materialColor =
          modelMaterial !== undefined
            ? modelMaterial.getColor()
            : modelMaterials === null
              ? color
              : null;
        const shininess =
          modelMaterial !== undefined
            ? (modelMaterial.getShininess() ?? 0)
            : modelMaterials === null
              ? (piece.getShininess() ?? 0)
              : 0;
        if (materialColor !== null && materialColor !== undefined) {
          const alpha = useAlpha(materialColor) ? ((materialColor >>> 24) & 0xff) / 255 : 1;
          standard.color.setHex(materialColor & 0xffffff);
          if (alpha < 1) {
            // A translucent piece color wins over the model's own opacity;
            // otherwise keep MTL-driven transparency (e.g. glass models).
            standard.opacity = alpha;
            standard.transparent = true;
          }
          standard.needsUpdate = true;
        }
        if (shininess > 0) {
          // Mirror MaterialCache's shininess→roughness approximation
          standard.roughness = Math.max(0, 1 - shininess / 128);
          standard.needsUpdate = true;
        }
      }
    });
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

  constructor(
    line: DimensionLine,
    home: Home,
    preferences: UserPreferences,
    materialCache: MaterialCache,
    context: unknown = null,
  ) {
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
    const positions = [line.getXStart(), z, line.getYStart(), line.getXEnd(), z, line.getYEnd()];
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

  constructor(
    polyline: Polyline,
    home: Home,
    preferences: UserPreferences,
    context: unknown = null,
  ) {
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
  private grid: THREE.LineSegments | null = null;

  constructor(
    home: Home,
    preferences: UserPreferences,
    materialCache: MaterialCache,
    textureCache: TextureCache,
    context: unknown = null,
  ) {
    super(home, home, preferences, context);
    this.materialCache = materialCache;
    this.textureCache = textureCache;
    this.update();
  }

  override getRoot(): THREE.Object3D {
    return this.root;
  }

  /** The ground is bounded to the home's 2D bounds + a margin (reads as a
   * floor under the house, not an infinite plane). */
  private homeBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const add = (x: number, y: number): void => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };
    for (const wall of this.home.getWalls()) {
      for (const p of wall.getPoints()) add(p[0]!, p[1]!);
    }
    for (const room of this.home.getRooms()) {
      for (const p of room.getPoints()) add(p[0]!, p[1]!);
    }
    for (const piece of this.home.getFurniture()) add(piece.getX(), piece.getY());
    if (!Number.isFinite(minX)) {
      return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
    }
    return { minX, minY, maxX, maxY };
  }

  override update(): void {
    this.root.clear();
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.grid !== null) {
      this.grid.geometry.dispose();
      this.grid = null;
    }
    const environment = this.home.getEnvironment();
    if (!(
      (environment as unknown as { isGroundVisible?(): boolean }).isGroundVisible?.() ?? true
    )) {
      return;
    }
    const bounds = this.homeBounds();
    const extentX = Math.max(bounds.maxX - bounds.minX, 200);
    const extentY = Math.max(bounds.maxY - bounds.minY, 200);
    const margin = Math.max(extentX, extentY) * 0.35 + 200;
    const size = Math.max(extentX, extentY) + 2 * margin;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(centerX, 0, centerY);
    const groundTexture = environment.getGroundTexture();
    let material: THREE.Material;
    if (groundTexture !== null) {
      const texture = this.textureCache.getTexture(groundTexture.getImage(), () => this.update());
      if (texture !== null) {
        const standardMaterial = this.materialCache
          .getMaterial({
            diffuseColor: 0xffffff,
            ambientColor: 0x000000,
            shininess: 0,
            opacity: 1,
            doubleSided: false,
          })
          .clone();
        standardMaterial.map = texture;
        standardMaterial.needsUpdate = true;
        material = standardMaterial;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(size / groundTexture.getScale(), size / groundTexture.getScale());
      } else {
        material = this.materialCache.getMaterial({
          diffuseColor: environment.getGroundColor(),
          ambientColor: 0x000000,
          shininess: 0,
          opacity: 1,
          doubleSided: false,
          polygonOffset: -2,
        });
      }
    } else {
      material = this.materialCache.getMaterial({
        diffuseColor: environment.getGroundColor(),
        ambientColor: 0x000000,
        shininess: 0,
        opacity: 1,
        doubleSided: false,
        polygonOffset: -2,
      });
    }
    this.mesh = new THREE.Mesh(geometry, material);
    // Java puts the ground slightly BELOW the floor level (HomeComponent3D
    // translates Ground3D by (0, -0.2, 0)) so room floors don't z-fight it.
    this.mesh.position.y = -0.2;
    this.root.add(this.mesh);

    // A subtle grid over the home area anchors the eye (like Java's ground grid)
    const grid = this.buildGrid(bounds, extentX, extentY);
    if (grid !== null) {
      this.grid = grid;
      this.root.add(grid);
    }
  }

  /** Line grid every 100 cm within (slightly beyond) the home bounds. */
  private buildGrid(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    extentX: number,
    extentY: number,
  ): THREE.LineSegments | null {
    const step = 100;
    const pad = Math.min(400, Math.max(extentX, extentY) * 0.1);
    const x0 = Math.floor((bounds.minX - pad) / step) * step;
    const x1 = Math.ceil((bounds.maxX + pad) / step) * step;
    const y0 = Math.floor((bounds.minY - pad) / step) * step;
    const y1 = Math.ceil((bounds.maxY + pad) / step) * step;
    const points: number[] = [];
    for (let x = x0; x <= x1; x += step) {
      points.push(x, 0.02, y0, x, 0.02, y1);
    }
    for (let y = y0; y <= y1; y += step) {
      points.push(x0, 0.02, y, x1, 0.02, y);
    }
    if (points.length === 0) {
      return null;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0x808080,
      transparent: true,
      opacity: 0.35,
    });
    return new THREE.LineSegments(geometry, material);
  }

  override destroy(): void {
    if (this.mesh !== null) {
      this.mesh.geometry.dispose();
    }
    if (this.grid !== null) {
      this.grid.geometry.dispose();
    }
    super.destroy();
  }
}
