/*
 * CompassController.ts.ts
 *
 * Translated from Sweet Home 3D CompassController.java.java
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
 * CompassController (port of com.eteks.sweethome3d.viewcontroller.CompassController, GPL v2+).
 * Edits the compass of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { Compass } from "../model/Compass.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";


export class CompassController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private compassView: DialogView | null = null;
  private x = 0;
  private y = 0;
  private diameter = 0;
  private visible = true;
  private northDirectionInDegrees = 0;
  private latitudeInDegrees = 0;
  private longitudeInDegrees = 0;
  private timeZone: string = "";

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.compassView === null) {
      this.compassView = this.viewFactory.createCompassView(this.preferences, this);
    }
    return this.compassView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: CompassController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: CompassController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  protected updateProperties(): void {
    const compass = this.home.getCompass();
    this.setX(compass.getX());
    this.setY(compass.getY());
    this.setDiameter(compass.getDiameter());
    this.setVisible(compass.isVisible());
    this.setNorthDirectionInDegrees((Math.PI * 180 / Math.PI) * 0 + (compass.getNorthDirection() * 180) / Math.PI);
    this.setLatitudeInDegrees((compass.getLatitude() * 180) / Math.PI);
    this.setLongitudeInDegrees((compass.getLongitude() * 180) / Math.PI);
    this.setTimeZone(compass.getTimeZone() ?? "");
  }

  getX(): number {
    return this.x;
  }

  setX(x: number): void {
    if (x !== this.x) {
      const oldX = this.x;
      this.x = x;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.X, oldX, x);
    }
  }

  getY(): number {
    return this.y;
  }

  setY(y: number): void {
    if (y !== this.y) {
      const oldY = this.y;
      this.y = y;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.Y, oldY, y);
    }
  }

  getDiameter(): number {
    return this.diameter;
  }

  setDiameter(diameter: number): void {
    if (diameter !== this.diameter) {
      const oldDiameter = this.diameter;
      this.diameter = diameter;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.DIAMETER, oldDiameter, diameter);
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  setVisible(visible: boolean): void {
    if (visible !== this.visible) {
      this.visible = visible;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.VISIBLE, !visible, visible);
    }
  }

  getNorthDirectionInDegrees(): number {
    return this.northDirectionInDegrees;
  }

  setNorthDirectionInDegrees(northDirectionInDegrees: number): void {
    if (northDirectionInDegrees !== this.northDirectionInDegrees) {
      const old = this.northDirectionInDegrees;
      this.northDirectionInDegrees = northDirectionInDegrees;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.NORTH_DIRECTION_IN_DEGREES, old, northDirectionInDegrees);
    }
  }

  getLatitudeInDegrees(): number {
    return this.latitudeInDegrees;
  }

  setLatitudeInDegrees(latitudeInDegrees: number): void {
    if (latitudeInDegrees !== this.latitudeInDegrees) {
      const old = this.latitudeInDegrees;
      this.latitudeInDegrees = latitudeInDegrees;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.LATITUDE_IN_DEGREES, old, latitudeInDegrees);
    }
  }

  getLongitudeInDegrees(): number {
    return this.longitudeInDegrees;
  }

  setLongitudeInDegrees(longitudeInDegrees: number): void {
    if (longitudeInDegrees !== this.longitudeInDegrees) {
      const old = this.longitudeInDegrees;
      this.longitudeInDegrees = longitudeInDegrees;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.LONGITUDE_IN_DEGREES, old, longitudeInDegrees);
    }
  }

  getTimeZone(): string {
    return this.timeZone;
  }

  setTimeZone(timeZone: string): void {
    if (timeZone !== this.timeZone) {
      const old = this.timeZone;
      this.timeZone = timeZone;
      this.propertyChangeSupport.firePropertyChange(CompassController.Property.TIME_ZONE, old, timeZone);
    }
  }

  modifyCompass(): void {
    const compass = this.home.getCompass();
    const newState = {
      x: this.getX(),
      y: this.getY(),
      diameter: this.getDiameter(),
      visible: this.isVisible(),
      northDirection: (this.getNorthDirectionInDegrees() * Math.PI) / 180,
      latitude: (this.getLatitudeInDegrees() * Math.PI) / 180,
      longitude: (this.getLongitudeInDegrees() * Math.PI) / 180,
      timeZone: this.getTimeZone(),
    };
    const oldState = {
      x: compass.getX(),
      y: compass.getY(),
      diameter: compass.getDiameter(),
      visible: compass.isVisible(),
      northDirection: compass.getNorthDirection(),
      latitude: compass.getLatitude(),
      longitude: compass.getLongitude(),
      timeZone: compass.getTimeZone() ?? "",
    };
    doModifyCompass(compass, newState);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(
          this.preferences, CompassController, "undoModifyCompassName",
          (state) => doModifyCompass(compass, state),
          oldState, newState,
        ),
      );
    }
  }
}

function doModifyCompass(compass: Compass, state: { x: number; y: number; diameter: number; visible: boolean; northDirection: number; latitude: number; longitude: number; timeZone: string }): void {
  compass.setX(state.x);
  compass.setY(state.y);
  compass.setDiameter(state.diameter);
  compass.setVisible(state.visible);
  compass.setNorthDirection(state.northDirection);
  compass.setLatitude(state.latitude);
  compass.setLongitude(state.longitude);
  compass.setTimeZone(state.timeZone);
}


export namespace CompassController {
  export enum Property {
    X = "X",
    Y = "Y",
    DIAMETER = "DIAMETER",
    VISIBLE = "VISIBLE",
    NORTH_DIRECTION_IN_DEGREES = "NORTH_DIRECTION_IN_DEGREES",
    LATITUDE_IN_DEGREES = "LATITUDE_IN_DEGREES",
    LONGITUDE_IN_DEGREES = "LONGITUDE_IN_DEGREES",
    TIME_ZONE = "TIME_ZONE",
  }
}
