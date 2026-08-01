/**
 * Port of com.eteks.sweethome3d.model.HomeDoorOrWindow (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import type { DoorOrWindow } from "./Interfaces.js";
import { HomeObject } from "./HomeObject.js";
import { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";
import type { Sash } from "./stubs.js";

export class HomeDoorOrWindow extends HomePieceOfFurniture implements DoorOrWindow {
  static override readonly Property = {
    ...HomePieceOfFurniture.Property,
    WALL_THICKNESS: "WALL_THICKNESS",
    WALL_DISTANCE: "WALL_DISTANCE",
    WALL_WIDTH: "WALL_WIDTH",
    WALL_LEFT: "WALL_LEFT",
    WALL_HEIGHT: "WALL_HEIGHT",
    WALL_TOP: "WALL_TOP",
    SASHES: "SASHES",
    CUT_OUT_SHAPE: "CUT_OUT_SHAPE",
    BOUND_TO_WALL: "BOUND_TO_WALL",
    WALL_CUT_OUT_ON_BOTH_SIDES: "WALL_CUT_OUT_ON_BOTH_SIDES",
    WIDTH_DEPTH_DEFORMABLE: "WIDTH_DEPTH_DEFORMABLE",
  } as const;

  private wallThickness: number;
  private wallDistance: number;
  private wallWidth: number;
  private wallLeft: number;
  private wallHeight: number;
  private wallTop: number;
  private wallCutOutOnBothSides = false;
  private widthDepthDeformable: boolean;
  private sashes: Sash[] = [];
  private cutOutShape: string = "M0,0 v1 h1 v-1 z";
  private boundToWall = false;

  constructor(doorOrWindow: DoorOrWindow, copiedProperties?: string[] | null);
  constructor(id: string, doorOrWindow: DoorOrWindow, copiedProperties?: string[] | null);
  constructor(idOrDoor: string | DoorOrWindow, doorOrProps?: DoorOrWindow | string[] | null, props?: string[] | null) {
    if (typeof idOrDoor === "string") {
      super(idOrDoor, doorOrProps as DoorOrWindow, props ?? null);
    } else {
      super(HomeObject.createId("doorOrWindow"), idOrDoor, (doorOrProps as string[] | null | undefined) ?? null);
    }
    const door = typeof idOrDoor === "string" ? (doorOrProps as DoorOrWindow) : idOrDoor;
    this.wallThickness = f32(door.getWallThickness());
    this.wallDistance = f32(door.getWallDistance());
    this.wallWidth = 0;
    this.wallLeft = 0;
    this.wallHeight = 0;
    this.wallTop = 0;
    this.widthDepthDeformable = door.isWidthDepthDeformable();
    this.sashes = [...door.getSashes()];
    this.cutOutShape = door.getCutOutShape();
  }

  getWallThickness(): number {
    return this.wallThickness;
  }

  setWallThickness(wallThickness: number): void {
    const narrowed = f32(wallThickness);
    if (narrowed !== this.wallThickness) {
      const oldWallThickness = this.wallThickness;
      this.wallThickness = narrowed;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_THICKNESS, oldWallThickness, narrowed);
    }
  }

  getWallDistance(): number {
    return this.wallDistance;
  }

  setWallDistance(wallDistance: number): void {
    const narrowed = f32(wallDistance);
    if (narrowed !== this.wallDistance) {
      const oldWallDistance = this.wallDistance;
      this.wallDistance = narrowed;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_DISTANCE, oldWallDistance, narrowed);
    }
  }

  getWallWidth(): number {
    return this.wallWidth;
  }

  setWallWidth(wallWidth: number): void {
    const narrowed = f32(wallWidth);
    if (narrowed !== this.wallWidth) {
      const oldWallWidth = this.wallWidth;
      this.wallWidth = narrowed;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_WIDTH, oldWallWidth, narrowed);
    }
  }

  getWallLeft(): number {
    return this.wallLeft;
  }

  setWallLeft(wallLeft: number): void {
    const narrowed = f32(wallLeft);
    if (narrowed !== this.wallLeft) {
      const oldWallLeft = this.wallLeft;
      this.wallLeft = narrowed;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_LEFT, oldWallLeft, narrowed);
    }
  }

  getWallHeight(): number {
    return this.wallHeight;
  }

  setWallHeight(wallHeight: number): void {
    const narrowed = f32(wallHeight);
    if (narrowed !== this.wallHeight) {
      const oldWallHeight = this.wallHeight;
      this.wallHeight = narrowed;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_HEIGHT, oldWallHeight, narrowed);
    }
  }

  getWallTop(): number {
    return this.wallTop;
  }

  setWallTop(wallTop: number): void {
    const narrowed = f32(wallTop);
    if (narrowed !== this.wallTop) {
      const oldWallTop = this.wallTop;
      this.wallTop = narrowed;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_TOP, oldWallTop, narrowed);
    }
  }

  isWallCutOutOnBothSides(): boolean {
    return this.wallCutOutOnBothSides;
  }

  setWallCutOutOnBothSides(wallCutOutOnBothSides: boolean): void {
    if (wallCutOutOnBothSides !== this.wallCutOutOnBothSides) {
      const oldValue = this.wallCutOutOnBothSides;
      this.wallCutOutOnBothSides = wallCutOutOnBothSides;
      this.firePropertyChange(HomeDoorOrWindow.Property.WALL_CUT_OUT_ON_BOTH_SIDES, oldValue, wallCutOutOnBothSides);
    }
  }

  override isWidthDepthDeformable(): boolean {
    return this.widthDepthDeformable;
  }

  setWidthDepthDeformable(widthDepthDeformable: boolean): void {
    this.widthDepthDeformable = widthDepthDeformable;
  }

  getSashes(): Sash[] {
    return this.sashes;
  }

  setSashes(sashes: Sash[]): void {
    if (sashes !== this.sashes) {
      const oldSashes = this.sashes;
      this.sashes = [...sashes];
      this.firePropertyChange(HomeDoorOrWindow.Property.SASHES, oldSashes, sashes);
    }
  }

  getCutOutShape(): string {
    return this.cutOutShape;
  }

  setCutOutShape(cutOutShape: string): void {
    if (cutOutShape !== this.cutOutShape) {
      const oldCutOutShape = this.cutOutShape;
      this.cutOutShape = cutOutShape;
      this.firePropertyChange(HomeDoorOrWindow.Property.CUT_OUT_SHAPE, oldCutOutShape, cutOutShape);
    }
  }

  isBoundToWall(): boolean {
    return this.boundToWall;
  }

  setBoundToWall(boundToWall: boolean): void {
    if (boundToWall !== this.boundToWall) {
      const oldBoundToWall = this.boundToWall;
      this.boundToWall = boundToWall;
      this.firePropertyChange(HomeDoorOrWindow.Property.BOUND_TO_WALL, oldBoundToWall, boundToWall);
    }
  }
}
