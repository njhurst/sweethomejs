/*
 * VideoController.ts
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
 * Video dialog controller (task 8.5) — port of Java's VideoController:
 * aspect ratio, frame rate, width/height, quality, speed, camera path and
 * time, renderer, ceiling light color, plus camera-path interpolation.
 */
import { Home } from "../../model/Home.js";
import { Camera } from "../../model/Camera.js";
import { UserPreferences } from "../../model/UserPreferences.js";
import { PropertyChangeSupportByString } from "../PropertyController.js";
import type { PropertyChangeListener } from "../../events/PropertyChangeSupport.js";
import type { ViewFactory } from "../ViewFactory.js";
import { AspectRatio, aspectRatioValue } from "./PhotoController.js";

/** Frame rate presets (like the Java video panel). */
export const VIDEO_FRAME_RATES: number[] = [12, 15, 24, 25, 30];

/**
 * Linear camera-path interpolation (Java's HomeComponent3D animation math):
 * each camera field (x, y, z, yaw, pitch) is lerped between consecutive path
 * cameras; the field of view is taken from the target camera.
 */
export function interpolateCamera(camera1: Camera, camera2: Camera, alpha: number): Camera {
  const clamped = Math.max(0, Math.min(1, alpha));
  return new Camera(
    camera1.getX() + (camera2.getX() - camera1.getX()) * clamped,
    camera1.getY() + (camera2.getY() - camera1.getY()) * clamped,
    camera1.getZ() + (camera2.getZ() - camera1.getZ()) * clamped,
    camera1.getYaw() + (camera2.getYaw() - camera1.getYaw()) * clamped,
    camera1.getPitch() + (camera2.getPitch() - camera1.getPitch()) * clamped,
    camera2.getFieldOfView(),
  );
}

/**
 * Returns the camera on the path at the given absolute time (ms). Cameras
 * must have increasing times; times before the first camera clamp to it.
 */
export function getCameraAt(cameraPath: Camera[], time: number): Camera {
  if (cameraPath.length === 0) {
    throw new Error("Empty camera path");
  }
  if (cameraPath.length === 1 || time <= cameraPath[0]!.getTime()) {
    return cameraPath[0]!;
  }
  const last = cameraPath[cameraPath.length - 1]!;
  if (time >= last.getTime()) {
    return last;
  }
  for (let i = 1; i < cameraPath.length; i++) {
    const previous = cameraPath[i - 1]!;
    const next = cameraPath[i]!;
    if (time <= next.getTime()) {
      const duration = next.getTime() - previous.getTime();
      const alpha = duration > 0 ? (time - previous.getTime()) / duration : 0;
      return interpolateCamera(previous, next, alpha);
    }
  }
  return last;
}

export class VideoController {
  static readonly Property = {
    ASPECT_RATIO: "aspectRatio",
    FRAME_RATE: "frameRate",
    WIDTH: "width",
    HEIGHT: "height",
    QUALITY: "quality",
    SPEED: "speed",
    CAMERA_PATH: "cameraPath",
    TIME: "time",
    RENDERER: "renderer",
    CEILING_LIGHT_COLOR: "ceilingLightColor",
  } as const;

  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();

  private aspectRatio = AspectRatio.VIEW_3D_RATIO;
  private frameRate = 24;
  private width = 800;
  private height = 600;
  private quality = 0;
  private speed = 1;
  private cameraPath: Camera[];
  private time = 0;
  private renderer = "";
  private ceilingLightColor = 0xffffff;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    const observerCamera = home.getObserverCamera();
    const cameraPath = home.getEnvironment().getVideoCameraPath();
    this.cameraPath = cameraPath.length > 0 ? cameraPath : [observerCamera];
    this.renderer = preferences.getPhotoRenderer();
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

  setAspectRatio(aspectRatio: AspectRatio): void {
    if (aspectRatio !== this.aspectRatio) {
      const oldAspectRatio = this.aspectRatio;
      this.aspectRatio = aspectRatio;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.ASPECT_RATIO, oldAspectRatio, aspectRatio);
    }
  }

  getAspectRatio(): AspectRatio {
    return this.aspectRatio;
  }

  setFrameRate(frameRate: number): void {
    if (frameRate !== this.frameRate) {
      const oldFrameRate = this.frameRate;
      this.frameRate = frameRate;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.FRAME_RATE, oldFrameRate, frameRate);
    }
  }

  getFrameRate(): number {
    return this.frameRate;
  }

  setWidth(width: number): void {
    if (width !== this.width) {
      const oldWidth = this.width;
      this.width = width;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.WIDTH, oldWidth, width);
    }
  }

  getWidth(): number {
    return this.width;
  }

  setHeight(height: number): void {
    if (height !== this.height) {
      const oldHeight = this.height;
      this.height = height;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.HEIGHT, oldHeight, height);
    }
  }

  getHeight(): number {
    return this.height;
  }

  setQuality(quality: number): void {
    if (quality !== this.quality) {
      const oldQuality = this.quality;
      this.quality = quality;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.QUALITY, oldQuality, quality);
    }
  }

  getQuality(): number {
    return this.quality;
  }

  setSpeed(speed: number): void {
    if (speed !== this.speed) {
      const oldSpeed = this.speed;
      this.speed = speed;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.SPEED, oldSpeed, speed);
    }
  }

  getSpeed(): number {
    return this.speed;
  }

  setCameraPath(cameraPath: Camera[]): void {
    if (cameraPath !== this.cameraPath) {
      const oldCameraPath = this.cameraPath;
      this.cameraPath = cameraPath;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.CAMERA_PATH, oldCameraPath, cameraPath);
    }
  }

  getCameraPath(): Camera[] {
    return this.cameraPath;
  }

  setTime(time: number): void {
    if (time !== this.time) {
      const oldTime = this.time;
      this.time = time;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.TIME, oldTime, time);
    }
  }

  getTime(): number {
    return this.time;
  }

  setRenderer(renderer: string): void {
    if (renderer !== this.renderer) {
      const oldRenderer = this.renderer;
      this.renderer = renderer;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.RENDERER, oldRenderer, renderer);
    }
  }

  getRenderer(): string {
    return this.renderer;
  }

  setCeilingLightColor(ceilingLightColor: number): void {
    if (ceilingLightColor !== this.ceilingLightColor) {
      const oldCeilingLightColor = this.ceilingLightColor;
      this.ceilingLightColor = ceilingLightColor;
      this.propertyChangeSupport.firePropertyChange(VideoController.Property.CEILING_LIGHT_COLOR, oldCeilingLightColor, ceilingLightColor);
    }
  }

  getCeilingLightColor(): number {
    return this.ceilingLightColor;
  }

  /** The video duration in ms (the camera path's last time). */
  getDuration(): number {
    return this.cameraPath[this.cameraPath.length - 1]!.getTime();
  }

  /** Updates dimensions from the aspect ratio / 3D view (Java's update). */
  update(): void {
    const value = aspectRatioValue(this.aspectRatio);
    if (value !== null && value > 0) {
      this.setHeight(Math.round(this.width / value));
    }
  }
}
