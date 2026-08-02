/*
 * DimensionLineController.ts.ts
 *
 * Translated from Sweet Home 3D DimensionLineController.java.java
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
 * DimensionLineController (port of
 * com.eteks.sweethome3d.viewcontroller.DimensionLineController, GPL v2+).
 * Edits the dimension lines of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { DimensionLine } from "../model/DimensionLine.js";
import { TextStyle } from "../model/TextStyle.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";

export class DimensionLineController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private dimensionLineView: DialogView | null = null;
  private dimensionLines: DimensionLine[] = [];
  private xStart = 0;
  private yStart = 0;
  private elevationStart = 0;
  private xEnd = 0;
  private yEnd = 0;
  private elevationEnd = 0;
  private distanceToEndPoint = 0;
  private orientation = 0;
  private editableDistance = false;
  private offset = 0;
  private lengthFontSize = 0;
  private color: number | null = null;
  private visibleIn3D = true;
  private pitch: number | null = null;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.dimensionLineView === null) {
      this.dimensionLineView = this.viewFactory.createDimensionLineView(true, this.preferences, this);
    }
    return this.dimensionLineView;
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
    this.dimensionLines = Home.getSubList(this.home.getSelectedItems(), DimensionLine);
    if (this.dimensionLines.length > 0) {
      const line = this.dimensionLines[0]!;
      this.setXStart(line.getXStart());
      this.setYStart(line.getYStart());
      this.setElevationStart(line.getElevationStart());
      this.setXEnd(line.getXEnd());
      this.setYEnd(line.getYEnd());
      this.setElevationEnd(line.getElevationEnd());
      this.setDistanceToEndPoint(0);
      this.setOrientation(Math.atan2(line.getYEnd() - line.getYStart(), line.getXEnd() - line.getXStart()));
      this.setOffset(line.getOffset());
      this.setColor(line.getColor());
      this.setPitch(line.getPitch());
      this.setVisibleIn3D(line.isVisibleIn3D());
      const style = line.getLengthStyle();
      if (style !== null) {
        this.setLengthFontSize(style.getFontSize());
      }
    }
  }

  getXStart(): number {
    return this.xStart;
  }

  setXStart(xStart: number): void {
    if (xStart !== this.xStart) {
      const oldXStart = this.xStart;
      this.xStart = xStart;
      this.propertyChangeSupport.firePropertyChange("X_START", oldXStart, xStart);
    }
  }

  getYStart(): number {
    return this.yStart;
  }

  setYStart(yStart: number): void {
    if (yStart !== this.yStart) {
      const oldYStart = this.yStart;
      this.yStart = yStart;
      this.propertyChangeSupport.firePropertyChange("Y_START", oldYStart, yStart);
    }
  }

  getElevationStart(): number {
    return this.elevationStart;
  }

  setElevationStart(elevationStart: number): void {
    if (elevationStart !== this.elevationStart) {
      const oldElevationStart = this.elevationStart;
      this.elevationStart = elevationStart;
      this.propertyChangeSupport.firePropertyChange("ELEVATION_START", oldElevationStart, elevationStart);
    }
  }

  getXEnd(): number {
    return this.xEnd;
  }

  setXEnd(xEnd: number): void {
    if (xEnd !== this.xEnd) {
      const oldXEnd = this.xEnd;
      this.xEnd = xEnd;
      this.propertyChangeSupport.firePropertyChange("X_END", oldXEnd, xEnd);
    }
  }

  getYEnd(): number {
    return this.yEnd;
  }

  setYEnd(yEnd: number): void {
    if (yEnd !== this.yEnd) {
      const oldYEnd = this.yEnd;
      this.yEnd = yEnd;
      this.propertyChangeSupport.firePropertyChange("Y_END", oldYEnd, yEnd);
    }
  }

  getElevationEnd(): number {
    return this.elevationEnd;
  }

  setElevationEnd(elevationEnd: number): void {
    if (elevationEnd !== this.elevationEnd) {
      const oldElevationEnd = this.elevationEnd;
      this.elevationEnd = elevationEnd;
      this.propertyChangeSupport.firePropertyChange("ELEVATION_END", oldElevationEnd, elevationEnd);
    }
  }

  getDistanceToEndPoint(): number {
    return this.distanceToEndPoint;
  }

  setDistanceToEndPoint(distanceToEndPoint: number): void {
    if (distanceToEndPoint !== this.distanceToEndPoint) {
      const oldDistanceToEndPoint = this.distanceToEndPoint;
      this.distanceToEndPoint = distanceToEndPoint;
      this.propertyChangeSupport.firePropertyChange("DISTANCE_TO_END_POINT", oldDistanceToEndPoint, distanceToEndPoint);
    }
  }

  getOrientation(): number {
    return this.orientation;
  }

  setOrientation(orientation: number): void {
    if (orientation !== this.orientation) {
      const oldOrientation = this.orientation;
      this.orientation = orientation;
      this.propertyChangeSupport.firePropertyChange("ORIENTATION", oldOrientation, orientation);
    }
  }

  isEditableDistance(): boolean {
    return this.editableDistance;
  }

  setEditableDistance(editableDistance: boolean): void {
    if (editableDistance !== this.editableDistance) {
      this.editableDistance = editableDistance;
      this.propertyChangeSupport.firePropertyChange("EDITABLE_DISTANCE", !editableDistance, editableDistance);
    }
  }

  getOffset(): number {
    return this.offset;
  }

  setOffset(offset: number): void {
    if (offset !== this.offset) {
      const oldOffset = this.offset;
      this.offset = offset;
      this.propertyChangeSupport.firePropertyChange("OFFSET", oldOffset, offset);
    }
  }

  getLengthFontSize(): number {
    return this.lengthFontSize;
  }

  setLengthFontSize(lengthFontSize: number): void {
    if (lengthFontSize !== this.lengthFontSize) {
      const oldLengthFontSize = this.lengthFontSize;
      this.lengthFontSize = lengthFontSize;
      this.propertyChangeSupport.firePropertyChange("LENGTH_FONT_SIZE", oldLengthFontSize, lengthFontSize);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.propertyChangeSupport.firePropertyChange("COLOR", oldColor, color);
    }
  }

  isVisibleIn3D(): boolean {
    return this.visibleIn3D;
  }

  setVisibleIn3D(visibleIn3D: boolean): void {
    if (visibleIn3D !== this.visibleIn3D) {
      this.visibleIn3D = visibleIn3D;
      this.propertyChangeSupport.firePropertyChange("VISIBLE_IN_3D", !visibleIn3D, visibleIn3D);
    }
  }

  getPitch(): number | null {
    return this.pitch;
  }

  setPitch(pitch: number | null): void {
    if (pitch !== this.pitch) {
      const oldPitch = this.pitch;
      this.pitch = pitch;
      this.propertyChangeSupport.firePropertyChange("PITCH", oldPitch, pitch);
    }
  }

  modifyDimensionLines(): void {
    const modifiedDimensionLines = Home.getSubList(this.home.getSelectedItems(), DimensionLine);
    const oldStates = modifiedDimensionLines.map((line) => ({
      xStart: line.getXStart(),
      yStart: line.getYStart(),
      elevationStart: line.getElevationStart(),
      xEnd: line.getXEnd(),
      yEnd: line.getYEnd(),
      elevationEnd: line.getElevationEnd(),
      offset: line.getOffset(),
      color: line.getColor(),
      pitch: line.getPitch(),
      visibleIn3D: line.isVisibleIn3D(),
      style: line.getLengthStyle(),
    }));
    const newStates = modifiedDimensionLines.map((line) => {
      // Keep the same distance/offset relation: move the end point along the
      // orientation when editableDistance is set
      let xEnd = this.getXEnd();
      let yEnd = this.getYEnd();
      if (this.isEditableDistance()) {
        xEnd = this.getXStart() + Math.cos(this.getOrientation()) * this.getDistanceToEndPoint();
        yEnd = this.getYStart() + Math.sin(this.getOrientation()) * this.getDistanceToEndPoint();
      }
      return {
        xStart: this.getXStart(),
        yStart: this.getYStart(),
        elevationStart: this.getElevationStart(),
        xEnd,
        yEnd,
        elevationEnd: this.getElevationEnd(),
        offset: this.getOffset(),
        color: this.getColor(),
        pitch: this.getPitch() ?? 0,
        visibleIn3D: this.isVisibleIn3D(),
        style: new TextStyle(null, this.getLengthFontSize(), false, false),
      };
    });
    doModifyDimensionLines(modifiedDimensionLines, newStates as never);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(
          this.preferences, DimensionLineController, "undoModifyDimensionLinesName",
          (states) => doModifyDimensionLines(modifiedDimensionLines, states as never),
          oldStates as never, newStates as never,
        ),
      );
    }
  }
}

function doModifyDimensionLines(
  dimensionLines: DimensionLine[],
  states: Array<{ xStart: number; yStart: number; elevationStart: number; xEnd: number; yEnd: number; elevationEnd: number; offset: number; color: number | null; pitch: number | null; visibleIn3D: boolean; style: TextStyle }>,
): void {
  for (let i = 0; i < dimensionLines.length; i++) {
    const line = dimensionLines[i]!;
    const state = states[i]!;
    line.setXStart(state.xStart);
    line.setYStart(state.yStart);
    line.setElevationStart(state.elevationStart);
    line.setXEnd(state.xEnd);
    line.setYEnd(state.yEnd);
    line.setElevationEnd(state.elevationEnd);
    line.setOffset(state.offset);
    line.setColor(state.color);
    line.setPitch(state.pitch ?? 0);
    line.setVisibleIn3D(state.visibleIn3D);
    line.setLengthStyle(state.style);
  }
}
