/*
 * PhotoController.ts
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
 * Photo dialog controller (task 8.1) — port of Java's
 * AbstractPhotoController/PhotoController: camera time & lens, renderer
 * choice, image aspect ratio / size, quality level, ceiling light color, and
 * the property-change events the dialog binds to.
 */
import { Home } from "../../model/Home.js";
import { Camera } from "../../model/Camera.js";
import { UserPreferences } from "../../model/UserPreferences.js";
import { PropertyChangeSupportByString } from "../PropertyController.js";
import type { PropertyChangeListener } from "../../events/PropertyChangeSupport.js";
import type { ViewFactory } from "../ViewFactory.js";

/** Photo aspect ratios (Java's AspectRatio enum). */
export enum AspectRatio {
  FREE_RATIO = "FREE_RATIO",
  VIEW_3D_RATIO = "VIEW_3D_RATIO",
  RATIO_4_3 = "RATIO_4_3",
  RATIO_3_2 = "RATIO_3_2",
  RATIO_16_9 = "RATIO_16_9",
  RATIO_2_1 = "RATIO_2_1",
  RATIO_24_10 = "RATIO_24_10",
  SQUARE_RATIO = "SQUARE_RATIO",
}

export function aspectRatioValue(aspectRatio: AspectRatio): number | null {
  switch (aspectRatio) {
    case AspectRatio.RATIO_4_3:
      return 4 / 3;
    case AspectRatio.RATIO_3_2:
      return 1.5;
    case AspectRatio.RATIO_16_9:
      return 16 / 9;
    case AspectRatio.RATIO_2_1:
      return 2;
    case AspectRatio.RATIO_24_10:
      return 2.4;
    case AspectRatio.SQUARE_RATIO:
      return 1;
    default:
      return null;
  }
}

/** Image size presets (like the Java photo panel's width choices). */
export const PHOTO_WIDTHS: number[] = [320, 640, 800, 1024, 1280, 1920, 2560, 3840, 7680];

export class PhotoController {
  static readonly Property = {
    TIME: "time",
    LENS: "lens",
    RENDERER: "renderer",
    ASPECT_RATIO: "aspectRatio",
    WIDTH: "width",
    HEIGHT: "height",
    QUALITY: "quality",
    CEILING_LIGHT_COLOR: "ceilingLightColor",
    VIEW_3D_ASPECT_RATIO: "view3DAspectRatio",
  } as const;

  static readonly AspectRatio = AspectRatio;

  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();

  private time = 0;
  private lens: string = Camera.Lens.PINHOLE;
  private renderer = "";
  private aspectRatio = AspectRatio.VIEW_3D_RATIO;
  private width = 800;
  private height = 600;
  private quality = 0;
  private qualityLevelCount = 3;
  private ceilingLightColor = 0xffffff;
  private view3DAspectRatio = 1;
  private observerCameraSelected: boolean;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.observerCameraSelected = preferences.isObserverCameraSelectedAtChange();
    this.time = this.home.getCamera()?.getTime() ?? 0;
    const observerCamera = this.home.getObserverCamera();
    this.view3DAspectRatio = observerCamera.getWidth() / observerCamera.getHeight();
  }

  getHome(): Home {
    return this.home;
  }

  getViewFactory(): ViewFactory {
    return this.viewFactory;
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  // ------------------------------------------------------------ time & lens

  setTime(time: number): void {
    if (time !== this.time) {
      const oldTime = this.time;
      this.time = time;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.TIME, oldTime, time);
    }
  }

  getTime(): number {
    return this.time;
  }

  setLens(lens: string): void {
    if (lens !== this.lens) {
      const oldLens = this.lens;
      this.lens = lens;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.LENS, oldLens, lens);
    }
  }

  getLens(): string {
    return this.lens;
  }

  setRenderer(renderer: string): void {
    if (renderer !== this.renderer) {
      const oldRenderer = this.renderer;
      this.renderer = renderer;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.RENDERER, oldRenderer, renderer);
    }
  }

  getRenderer(): string {
    return this.renderer;
  }

  // --------------------------------------------------------- image geometry

  setAspectRatio(aspectRatio: AspectRatio): void {
    if (aspectRatio !== this.aspectRatio) {
      const oldAspectRatio = this.aspectRatio;
      this.aspectRatio = aspectRatio;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.ASPECT_RATIO, oldAspectRatio, aspectRatio);
    }
  }

  getAspectRatio(): AspectRatio {
    return this.aspectRatio;
  }

  setWidth(width: number): void {
    if (width !== this.width) {
      const oldWidth = this.width;
      this.width = width;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.WIDTH, oldWidth, width);
    }
  }

  getWidth(): number {
    return this.width;
  }

  setHeight(height: number): void {
    if (height !== this.height) {
      const oldHeight = this.height;
      this.height = height;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.HEIGHT, oldHeight, height);
    }
  }

  getHeight(): number {
    return this.height;
  }

  // --------------------------------------------------------------- quality

  setQuality(quality: number): void {
    if (quality !== this.quality) {
      const oldQuality = this.quality;
      this.quality = quality;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.QUALITY, oldQuality, quality);
    }
  }

  getQuality(): number {
    return this.quality;
  }

  setQualityLevelCount(qualityLevelCount: number): void {
    this.qualityLevelCount = qualityLevelCount;
  }

  getQualityLevelCount(): number {
    return this.qualityLevelCount;
  }

  // ------------------------------------------------------- environment bits

  setCeilingLightColor(ceilingLightColor: number): void {
    if (ceilingLightColor !== this.ceilingLightColor) {
      const oldCeilingLightColor = this.ceilingLightColor;
      this.ceilingLightColor = ceilingLightColor;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.CEILING_LIGHT_COLOR, oldCeilingLightColor, ceilingLightColor);
    }
  }

  getCeilingLightColor(): number {
    return this.ceilingLightColor;
  }

  set3DViewAspectRatio(view3DAspectRatio: number): void {
    if (view3DAspectRatio !== this.view3DAspectRatio) {
      const oldView3DAspectRatio = this.view3DAspectRatio;
      this.view3DAspectRatio = view3DAspectRatio;
      this.propertyChangeSupport.firePropertyChange(PhotoController.Property.VIEW_3D_ASPECT_RATIO, oldView3DAspectRatio, view3DAspectRatio);
    }
  }

  get3DViewAspectRatio(): number {
    return this.view3DAspectRatio;
  }

  isObserverCameraSelected(): boolean {
    return this.observerCameraSelected;
  }

  /** Updates the controller from the home camera / environment (Java's update). */
  update(): void {
    const camera = this.home.getCamera();
    if (camera !== null && camera.getTime() !== this.time) {
      this.setTime(camera.getTime());
    }
    const observerCamera = this.home.getObserverCamera();
    if (observerCamera.getWidth() > 0) {
      const aspectRatio = observerCamera.getWidth() / observerCamera.getHeight();
      if (aspectRatio !== this.view3DAspectRatio) {
        this.set3DViewAspectRatio(aspectRatio);
      }
    }
  }
}
