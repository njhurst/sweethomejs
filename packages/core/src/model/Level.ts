/**
 * Port of com.eteks.sweethome3d.model.Level (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import type { BackgroundImage } from "./BackgroundImage.js";
import { HomeObject } from "./HomeObject.js";

export class Level extends HomeObject {
  static readonly Property = {
    NAME: "NAME",
    ELEVATION: "ELEVATION",
    HEIGHT: "HEIGHT",
    FLOOR_THICKNESS: "FLOOR_THICKNESS",
    BACKGROUND_IMAGE: "BACKGROUND_IMAGE",
    VISIBLE: "VISIBLE",
    VIEWABLE: "VIEWABLE",
    ELEVATION_INDEX: "ELEVATION_INDEX",
  } as const;

  private name: string;
  private elevation: number;
  private floorThickness: number;
  private height: number;
  private backgroundImage: BackgroundImage | null = null;
  private visible = true;
  private viewable = true;
  private elevationIndex = 0;

  constructor(name: string, elevation: number, floorThickness: number, height: number);
  constructor(id: string, name: string, elevation: number, floorThickness: number, height: number);
  constructor(
    nameOrId: string,
    nameOrElevation: string | number,
    elevationOrThickness: number,
    floorThicknessOrHeight: number,
    height = 0,
  ) {
    if (typeof nameOrElevation === "string") {
      super(nameOrId);
      this.name = nameOrElevation;
      this.elevation = f32(elevationOrThickness);
      this.floorThickness = f32(floorThicknessOrHeight);
      this.height = f32(height);
    } else {
      super(HomeObject.createId("level"));
      this.name = nameOrId;
      this.elevation = f32(nameOrElevation);
      this.floorThickness = f32(elevationOrThickness);
      this.height = f32(floorThicknessOrHeight);
    }
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.firePropertyChange(Level.Property.NAME, oldName, name);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    const narrowed = f32(elevation);
    if (narrowed !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = narrowed;
      this.firePropertyChange(Level.Property.ELEVATION, oldElevation, narrowed);
    }
  }

  getFloorThickness(): number {
    return this.floorThickness;
  }

  setFloorThickness(floorThickness: number): void {
    const narrowed = f32(floorThickness);
    if (narrowed !== this.floorThickness) {
      const oldFloorThickness = this.floorThickness;
      this.floorThickness = narrowed;
      this.firePropertyChange(Level.Property.FLOOR_THICKNESS, oldFloorThickness, narrowed);
    }
  }

  getHeight(): number {
    return this.height;
  }

  setHeight(height: number): void {
    const narrowed = f32(height);
    if (narrowed !== this.height) {
      const oldHeight = this.height;
      this.height = narrowed;
      this.firePropertyChange(Level.Property.HEIGHT, oldHeight, narrowed);
    }
  }

  getBackgroundImage(): BackgroundImage | null {
    return this.backgroundImage;
  }

  setBackgroundImage(backgroundImage: BackgroundImage | null): void {
    if (backgroundImage !== this.backgroundImage) {
      const oldBackgroundImage = this.backgroundImage;
      this.backgroundImage = backgroundImage;
      this.firePropertyChange(Level.Property.BACKGROUND_IMAGE, oldBackgroundImage, backgroundImage);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    if (visible !== this.visible) {
      const oldVisible = this.visible;
      this.visible = visible;
      this.firePropertyChange(Level.Property.VISIBLE, oldVisible, visible);
    }
  }

  isViewable(): boolean {
    return this.viewable;
  }

  setViewable(viewable: boolean): void {
    if (viewable !== this.viewable) {
      const oldViewable = this.viewable;
      this.viewable = viewable;
      this.firePropertyChange(Level.Property.VIEWABLE, oldViewable, viewable);
    }
  }

  isViewableAndVisible(): boolean {
    return this.viewable && this.visible;
  }

  getElevationIndex(): number {
    return this.elevationIndex;
  }

  setElevationIndex(elevationIndex: number): void {
    this.elevationIndex = elevationIndex;
  }

  override clone(): Level {
    const copy = Object.create(Level.prototype) as Level;
    this.copyBaseTo(copy);
    copy.name = this.name;
    copy.elevation = this.elevation;
    copy.floorThickness = this.floorThickness;
    copy.height = this.height;
    copy.backgroundImage = this.backgroundImage;
    copy.visible = this.visible;
    copy.viewable = this.viewable;
    copy.elevationIndex = this.elevationIndex;
    return copy;
  }
}
