/*
 * PolylineController.ts.ts
 *
 * Translated from Sweet Home 3D PolylineController.java.java
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
 * PolylineController (port of com.eteks.sweethome3d.viewcontroller.PolylineController, GPL v2+).
 * Edits the polylines of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { Polyline } from "../model/Polyline.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";

export class PolylineController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private polylineView: DialogView | null = null;
  private polylines: Polyline[] = [];
  private thickness = 0;
  private capStyle: string = "";
  private joinStyle: string = "";
  private dashStyle: string = "";
  private dashPattern: number[] | null = null;
  private dashOffset = 0;
  private startArrowStyle: string = "";
  private endArrowStyle: string = "";
  private color: number = 0;
  private elevation = 0;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.polylineView === null) {
      this.polylineView = this.viewFactory.createPolylineView(this.preferences, this);
    }
    return this.polylineView;
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
    this.polylines = Home.getSubList(this.home.getSelectedItems(), Polyline);
    if (this.polylines.length > 0) {
      const polyline = this.polylines[0]!;
      this.setThickness(polyline.getThickness());
      this.setCapStyle(polyline.getCapStyle() ?? "");
      this.setJoinStyle(polyline.getJoinStyle() ?? "");
      this.setDashStyle(polyline.getDashStyle() ?? "");
      this.setDashOffset(polyline.getDashOffset());
      this.setStartArrowStyle(polyline.getStartArrowStyle() ?? "");
      this.setEndArrowStyle(polyline.getEndArrowStyle() ?? "");
      this.setColor(polyline.getColor());
      this.setElevation(polyline.getElevation());
    }
  }

  getThickness(): number {
    return this.thickness;
  }

  setThickness(thickness: number): void {
    if (thickness !== this.thickness) {
      const oldThickness = this.thickness;
      this.thickness = thickness;
      this.propertyChangeSupport.firePropertyChange("THICKNESS", oldThickness, thickness);
    }
  }

  getCapStyle(): string {
    return this.capStyle;
  }

  setCapStyle(capStyle: string | null): void {
    if (capStyle !== this.capStyle) {
      const oldCapStyle = this.capStyle;
      this.capStyle = capStyle ?? "";
      this.propertyChangeSupport.firePropertyChange("CAP_STYLE", oldCapStyle, capStyle);
    }
  }

  getJoinStyle(): string {
    return this.joinStyle;
  }

  setJoinStyle(joinStyle: string | null): void {
    if (joinStyle !== this.joinStyle) {
      const oldJoinStyle = this.joinStyle;
      this.joinStyle = joinStyle ?? "";
      this.propertyChangeSupport.firePropertyChange("JOIN_STYLE", oldJoinStyle, joinStyle);
    }
  }

  getDashStyle(): string {
    return this.dashStyle;
  }

  setDashStyle(dashStyle: string | null): void {
    if (dashStyle !== this.dashStyle) {
      const oldDashStyle = this.dashStyle;
      this.dashStyle = dashStyle ?? "";
      this.propertyChangeSupport.firePropertyChange("DASH_STYLE", oldDashStyle, dashStyle);
    }
  }

  getDashPattern(): number[] | null {
    return this.dashPattern;
  }

  setDashPattern(dashPattern: number[] | null): void {
    if (dashPattern !== this.dashPattern) {
      const oldDashPattern = this.dashPattern;
      this.dashPattern = dashPattern;
      this.propertyChangeSupport.firePropertyChange("DASH_PATTERN", oldDashPattern, dashPattern);
    }
  }

  getDashOffset(): number {
    return this.dashOffset;
  }

  setDashOffset(dashOffset: number): void {
    if (dashOffset !== this.dashOffset) {
      const oldDashOffset = this.dashOffset;
      this.dashOffset = dashOffset;
      this.propertyChangeSupport.firePropertyChange("DASH_OFFSET", oldDashOffset, dashOffset);
    }
  }

  getStartArrowStyle(): string {
    return this.startArrowStyle;
  }

  setStartArrowStyle(startArrowStyle: string | null): void {
    if (startArrowStyle !== this.startArrowStyle) {
      const oldStartArrowStyle = this.startArrowStyle;
      this.startArrowStyle = startArrowStyle ?? "";
      this.propertyChangeSupport.firePropertyChange("START_ARROW_STYLE", oldStartArrowStyle, startArrowStyle);
    }
  }

  getEndArrowStyle(): string {
    return this.endArrowStyle;
  }

  setEndArrowStyle(endArrowStyle: string | null): void {
    if (endArrowStyle !== this.endArrowStyle) {
      const oldEndArrowStyle = this.endArrowStyle;
      this.endArrowStyle = endArrowStyle ?? "";
      this.propertyChangeSupport.firePropertyChange("END_ARROW_STYLE", oldEndArrowStyle, endArrowStyle);
    }
  }

  getColor(): number {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color ?? 0;
      this.propertyChangeSupport.firePropertyChange("COLOR", oldColor, color);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    if (elevation !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = elevation;
      this.propertyChangeSupport.firePropertyChange("ELEVATION", oldElevation, elevation);
    }
  }

  modifyPolylines(): void {
    const modifiedPolylines = Home.getSubList(this.home.getSelectedItems(), Polyline);
    const oldStates = modifiedPolylines.map((polyline) => ({
      thickness: polyline.getThickness(),
      capStyle: polyline.getCapStyle(),
      joinStyle: polyline.getJoinStyle(),
      dashStyle: polyline.getDashStyle(),
      dashPattern: polyline.getDashPattern(),
      dashOffset: polyline.getDashOffset(),
      startArrowStyle: polyline.getStartArrowStyle(),
      endArrowStyle: polyline.getEndArrowStyle(),
      color: polyline.getColor(),
      elevation: polyline.getElevation(),
    }));
    const newStates = modifiedPolylines.map(() => ({
      thickness: this.getThickness(),
      capStyle: this.getCapStyle(),
      joinStyle: this.getJoinStyle(),
      dashStyle: this.getDashStyle(),
      dashPattern: this.getDashPattern(),
      dashOffset: this.getDashOffset(),
      startArrowStyle: this.getStartArrowStyle(),
      endArrowStyle: this.getEndArrowStyle(),
      color: this.getColor(),
      elevation: this.getElevation(),
    }));
    doModifyPolylines(modifiedPolylines, newStates);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(
          this.preferences, PolylineController, "undoModifyPolylinesName",
          (states) => doModifyPolylines(modifiedPolylines, states),
          oldStates, newStates,
        ),
      );
    }
  }
}

function doModifyPolylines(
  polylines: Polyline[],
  states: Array<{ thickness: number; capStyle: string; joinStyle: string; dashStyle: string; dashPattern: number[] | null; dashOffset: number; startArrowStyle: string; endArrowStyle: string; color: number; elevation: number }>,
): void {
  for (let i = 0; i < polylines.length; i++) {
    const polyline = polylines[i]!;
    const state = states[i]!;
    polyline.setThickness(state.thickness);
    polyline.setCapStyle(state.capStyle);
    polyline.setJoinStyle(state.joinStyle);
    polyline.setDashStyle(state.dashStyle);
    polyline.setDashPattern(state.dashPattern);
    polyline.setDashOffset(state.dashOffset);
    polyline.setStartArrowStyle(state.startArrowStyle);
    polyline.setEndArrowStyle(state.endArrowStyle);
    polyline.setColor(state.color);
    polyline.setElevation(state.elevation);
  }
}
