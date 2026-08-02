/*
 * ObserverCameraController.ts.ts
 *
 * Translated from Sweet Home 3D ObserverCameraController.java.java
 * Sweet Home 3D, Copyright (c) 2024 Space Mushrooms <info@sweethome3d.com>
 * TypeScript translation Copyright (c) 2026 SweetHomeJS contributors
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
 *
 * Porting notes:
 *   - Keep method names identical to the Java source so upstream fixes map 1:1.
 *   - Mark every float-narrowing point with f32() (see docs/05-file-format.md).
 *   - Update this file's row in TRANSLATION.md when porting status changes.
 */

/**
 * ObserverCameraController (port of
 * com.eteks.sweethome3d.viewcontroller.ObserverCameraController, GPL v2+).
 * Edits the observer camera of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { HomeEnvironment } from "../model/HomeEnvironment.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";

export class ObserverCameraController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private observerCameraView: DialogView | null = null;
  private x = 0;
  private y = 0;
  private z = 0;
  private minimumElevation = 0;
  private yawInDegrees = 0;
  private pitchInDegrees = 0;
  private fieldOfViewInDegrees = 0;
  private observerCameraElevationAdjusted = true;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.observerCameraView === null) {
      this.observerCameraView = this.viewFactory.createObserverCameraView(this.preferences, this);
    }
    return this.observerCameraView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  protected updateProperties(): void {
    const observerCamera = this.home.getObserverCamera();
    this.setX(observerCamera.getX());
    this.setY(observerCamera.getY());
    this.setZ(observerCamera.getZ());
    const levels = this.home.getLevels();
    this.setMinimumElevation(levels.length > 0 ? 10 + levels[0]!.getElevation() : 10);
    this.setYawInDegrees((observerCamera.getYaw() * 180) / Math.PI);
    this.setPitchInDegrees((observerCamera.getPitch() * 180) / Math.PI);
    this.setFieldOfViewInDegrees((observerCamera.getFieldOfView() * 180) / Math.PI);
    this.setObserverCameraElevationAdjusted(this.home.getEnvironment().isObserverCameraElevationAdjusted());
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    if (x !== this.x) {
      const oldX = this.x;
      this.x = x;
      this.propertyChangeSupport.firePropertyChange("X", oldX, x);
    }
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): void {
    if (y !== this.y) {
      const oldY = this.y;
      this.y = y;
      this.propertyChangeSupport.firePropertyChange("Y", oldY, y);
    }
  }

  getZ(): number {
    return this.z;
  }

  setZ(z: number): void {
    if (z !== this.z) {
      const oldZ = this.z;
      this.z = z;
      this.propertyChangeSupport.firePropertyChange("ELEVATION", oldZ, z);
    }
  }

  getMinimumElevation(): number {
    return this.minimumElevation;
  }

  setMinimumElevation(minimumElevation: number): void {
    if (minimumElevation !== this.minimumElevation) {
      const oldMinimumElevation = this.minimumElevation;
      this.minimumElevation = minimumElevation;
      this.propertyChangeSupport.firePropertyChange("MINIMUM_ELEVATION", oldMinimumElevation, minimumElevation);
    }
  }

  getYawInDegrees(): number {
    return this.yawInDegrees;
  }

  setYawInDegrees(yawInDegrees: number): void {
    if (yawInDegrees !== this.yawInDegrees) {
      const oldYawInDegrees = this.yawInDegrees;
      this.yawInDegrees = yawInDegrees;
      this.propertyChangeSupport.firePropertyChange("YAW_IN_DEGREES", oldYawInDegrees, yawInDegrees);
      this.propertyChangeSupport.firePropertyChange("YAW", oldYawInDegrees * Math.PI / 180, yawInDegrees * Math.PI / 180);
    }
  }

  getPitchInDegrees(): number {
    return this.pitchInDegrees;
  }

  setPitchInDegrees(pitchInDegrees: number): void {
    if (pitchInDegrees !== this.pitchInDegrees) {
      const oldPitchInDegrees = this.pitchInDegrees;
      this.pitchInDegrees = pitchInDegrees;
      this.propertyChangeSupport.firePropertyChange("PITCH_IN_DEGREES", oldPitchInDegrees, pitchInDegrees);
      this.propertyChangeSupport.firePropertyChange("PITCH", oldPitchInDegrees * Math.PI / 180, pitchInDegrees * Math.PI / 180);
    }
  }

  getFieldOfViewInDegrees(): number {
    return this.fieldOfViewInDegrees;
  }

  setFieldOfViewInDegrees(fieldOfViewInDegrees: number): void {
    if (fieldOfViewInDegrees !== this.fieldOfViewInDegrees) {
      const oldFieldOfViewInDegrees = this.fieldOfViewInDegrees;
      this.fieldOfViewInDegrees = fieldOfViewInDegrees;
      this.propertyChangeSupport.firePropertyChange("FIELD_OF_VIEW_IN_DEGREES", oldFieldOfViewInDegrees, fieldOfViewInDegrees);
      this.propertyChangeSupport.firePropertyChange("FIELD_OF_VIEW", oldFieldOfViewInDegrees * Math.PI / 180, fieldOfViewInDegrees * Math.PI / 180);
    }
  }

  isObserverCameraElevationAdjusted(): boolean {
    return this.observerCameraElevationAdjusted;
  }

  setObserverCameraElevationAdjusted(observerCameraElevationAdjusted: boolean): void {
    if (observerCameraElevationAdjusted !== this.observerCameraElevationAdjusted) {
      this.observerCameraElevationAdjusted = observerCameraElevationAdjusted;
      this.propertyChangeSupport.firePropertyChange("OBSERVER_CAMERA_ELEVATION_ADJUSTED", !observerCameraElevationAdjusted, observerCameraElevationAdjusted);
    }
  }

  modifyObserverCamera(): void {
    const observerCamera = this.home.getObserverCamera();
    const homeEnvironment = this.home.getEnvironment();
    const oldState = {
      x: observerCamera.getX(),
      y: observerCamera.getY(),
      z: observerCamera.getZ(),
      yaw: observerCamera.getYaw(),
      pitch: observerCamera.getPitch(),
      fieldOfView: observerCamera.getFieldOfView(),
      observerCameraElevationAdjusted: homeEnvironment.isObserverCameraElevationAdjusted(),
    };
    const newState = {
      x: this.getX(),
      y: this.getY(),
      z: Math.max(this.getZ(), this.getMinimumElevation()),
      yaw: (this.getYawInDegrees() * Math.PI) / 180,
      pitch: (this.getPitchInDegrees() * Math.PI) / 180,
      fieldOfView: (this.getFieldOfViewInDegrees() * Math.PI) / 180,
      observerCameraElevationAdjusted: this.isObserverCameraElevationAdjusted(),
    };
    const apply = (state: typeof newState): void => {
      observerCamera.setX(state.x);
      observerCamera.setY(state.y);
      observerCamera.setZ(state.z);
      observerCamera.setYaw(state.yaw);
      observerCamera.setPitch(state.pitch);
      observerCamera.setFieldOfView(state.fieldOfView);
      homeEnvironment.setObserverCameraElevationAdjusted(state.observerCameraElevationAdjusted);
    };
    apply(newState);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(this.preferences, ObserverCameraController, "undoModifyObserverCameraName", apply, oldState, newState),
      );
    }
  }
}
