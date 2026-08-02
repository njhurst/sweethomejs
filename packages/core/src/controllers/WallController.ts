/*
 * WallController.ts.ts
 *
 * Translated from Sweet Home 3D WallController.java.java
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
 * WallController (port of com.eteks.sweethome3d.viewcontroller.WallController, GPL v2+).
 * Edits the walls of a home. Texture/baseboard sub-controllers are simplified
 * holders until task 4.5 ports TextureChoiceController/BaseboardChoiceController.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { Wall } from "../model/Wall.js";
import { HomeTexture } from "../model/HomeTexture.js";
import { Baseboard } from "../model/ValueClasses.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";


/** Simplified baseboard holder (BaseboardChoiceController ported in 4.5). */
export class BaseboardValues {
  visible = false;
  thickness = 0;
  height = 0;
  color: number | null = null;
  texture: HomeTexture | null = null;
}

export class WallController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private wallView: DialogView | null = null;
  private walls: Wall[] = [];
  private xStart: number | null = null;
  private yStart: number | null = null;
  private xEnd: number | null = null;
  private yEnd: number | null = null;
  private length = 0;
  private distanceToEndPoint = 0;
  private editablePoints = false;
  private leftSideColor: number | null = null;
  private leftSidePaint = WallController.Paint.COLORED;
  private leftSideTexture: HomeTexture | null = null;
  private leftSideShininess: number | null = null;
  private leftSideBaseboard = new BaseboardValues();
  private rightSideColor: number | null = null;
  private rightSidePaint = WallController.Paint.COLORED;
  private rightSideTexture: HomeTexture | null = null;
  private rightSideShininess: number | null = null;
  private rightSideBaseboard = new BaseboardValues();
  private pattern: unknown = null;
  private topColor: number | null = null;
  private topPaint: WallController.Paint | null = null;
  private shape = WallController.Shape.RECTANGULAR_WALL;
  private rectangularWallHeight: number | null = null;
  private slopingWallHeightAtStart: number | null = null;
  private slopingWallHeightAtEnd: number | null = null;
  private thickness: number | null = null;
  private arcExtentInDegrees: number | null = null;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.wallView === null) {
      this.wallView = this.viewFactory.createWallView(this.preferences, this);
    }
    return this.wallView;
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
    this.walls = Home.getSubList(this.home.getSelectedItems(), Wall);
    if (this.walls.length > 0) {
      const wall = this.walls[0]!;
      this.setXStart(wall.getXStart());
      this.setYStart(wall.getYStart());
      this.setXEnd(wall.getXEnd());
      this.setYEnd(wall.getYEnd());
      this.setLeftSideColor(wall.getLeftSideColor());
      this.setLeftSidePaint(wall.getLeftSideTexture() !== null ? WallController.Paint.TEXTURED : WallController.Paint.COLORED);
      this.setLeftSideTexture(wall.getLeftSideTexture());
      this.setLeftSideShininess(wall.getLeftSideShininess());
      const leftBaseboard = wall.getLeftSideBaseboard();
      this.getLeftSideBaseboardValues().visible = leftBaseboard !== null;
      this.getLeftSideBaseboardValues().thickness = leftBaseboard !== null ? leftBaseboard.getThickness() : 0;
      this.getLeftSideBaseboardValues().height = leftBaseboard !== null ? leftBaseboard.getHeight() : 0;
      this.getLeftSideBaseboardValues().color = leftBaseboard !== null ? leftBaseboard.getColor() : null;
      this.getLeftSideBaseboardValues().texture = leftBaseboard !== null ? leftBaseboard.getTexture() : null;
      this.setRightSideColor(wall.getRightSideColor());
      this.setRightSidePaint(wall.getRightSideTexture() !== null ? WallController.Paint.TEXTURED : WallController.Paint.COLORED);
      this.setRightSideTexture(wall.getRightSideTexture());
      this.setRightSideShininess(wall.getRightSideShininess());
      const rightBaseboard = wall.getRightSideBaseboard();
      this.getRightSideBaseboardValues().visible = rightBaseboard !== null;
      this.getRightSideBaseboardValues().thickness = rightBaseboard !== null ? rightBaseboard.getThickness() : 0;
      this.getRightSideBaseboardValues().height = rightBaseboard !== null ? rightBaseboard.getHeight() : 0;
      this.getRightSideBaseboardValues().color = rightBaseboard !== null ? rightBaseboard.getColor() : null;
      this.getRightSideBaseboardValues().texture = rightBaseboard !== null ? rightBaseboard.getTexture() : null;
      this.setTopColor(wall.getTopColor());
      this.setTopPaint(wall.getTopColor() !== null ? WallController.Paint.COLORED : null);
      this.setThickness(wall.getThickness());
      this.setArcExtentInDegrees(wall.getArcExtent() !== null ? (wall.getArcExtent()! * 180) / Math.PI : null);
      const height = wall.getHeight();
      const heightAtEnd = wall.getHeightAtEnd();
      if (heightAtEnd !== null && height !== null && height !== heightAtEnd) {
        this.setShape(WallController.Shape.SLOPING_WALL);
        this.setSlopingWallHeightAtStart(height);
        this.setSlopingWallHeightAtEnd(heightAtEnd);
      } else {
        this.setShape(WallController.Shape.RECTANGULAR_WALL);
        this.setRectangularWallHeight(height ?? 0);
      }
    }
  }

  getLeftSideBaseboardValues(): BaseboardValues {
    return this.leftSideBaseboard;
  }

  getRightSideBaseboardValues(): BaseboardValues {
    return this.rightSideBaseboard;
  }

  getXStart(): number | null {
    return this.xStart;
  }

  setXStart(xStart: number | null): void {
    if (xStart !== this.xStart) {
      const oldXStart = this.xStart;
      this.xStart = xStart;
      this.propertyChangeSupport.firePropertyChange("X_START", oldXStart, xStart);
    }
  }

  getYStart(): number | null {
    return this.yStart;
  }

  setYStart(yStart: number | null): void {
    if (yStart !== this.yStart) {
      const oldYStart = this.yStart;
      this.yStart = yStart;
      this.propertyChangeSupport.firePropertyChange("Y_START", oldYStart, yStart);
    }
  }

  getXEnd(): number | null {
    return this.xEnd;
  }

  setXEnd(xEnd: number | null): void {
    if (xEnd !== this.xEnd) {
      const oldXEnd = this.xEnd;
      this.xEnd = xEnd;
      this.propertyChangeSupport.firePropertyChange("X_END", oldXEnd, xEnd);
    }
  }

  getYEnd(): number | null {
    return this.yEnd;
  }

  setYEnd(yEnd: number | null): void {
    if (yEnd !== this.yEnd) {
      const oldYEnd = this.yEnd;
      this.yEnd = yEnd;
      this.propertyChangeSupport.firePropertyChange("Y_END", oldYEnd, yEnd);
    }
  }

  getLength(): number {
    return this.length;
  }

  setLength(length: number): void {
    if (length !== this.length) {
      const oldLength = this.length;
      this.length = length;
      this.propertyChangeSupport.firePropertyChange("LENGTH", oldLength, length);
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

  isEditablePoints(): boolean {
    return this.editablePoints;
  }

  setEditablePoints(editablePoints: boolean): void {
    if (editablePoints !== this.editablePoints) {
      this.editablePoints = editablePoints;
      this.propertyChangeSupport.firePropertyChange("EDITABLE_POINTS", !editablePoints, editablePoints);
    }
  }

  getLeftSideColor(): number | null {
    return this.leftSideColor;
  }

  setLeftSideColor(leftSideColor: number | null): void {
    if (leftSideColor !== this.leftSideColor) {
      const oldLeftSideColor = this.leftSideColor;
      this.leftSideColor = leftSideColor;
      this.propertyChangeSupport.firePropertyChange("LEFT_SIDE_COLOR", oldLeftSideColor, leftSideColor);
    }
  }

  getLeftSidePaint(): WallController.Paint {
    return this.leftSidePaint;
  }

  setLeftSidePaint(leftSidePaint: WallController.Paint): void {
    if (leftSidePaint !== this.leftSidePaint) {
      const oldLeftSidePaint = this.leftSidePaint;
      this.leftSidePaint = leftSidePaint;
      this.propertyChangeSupport.firePropertyChange("LEFT_SIDE_PAINT", oldLeftSidePaint, leftSidePaint);
    }
  }

  getLeftSideTexture(): HomeTexture | null {
    return this.leftSideTexture;
  }

  setLeftSideTexture(leftSideTexture: HomeTexture | null): void {
    if (leftSideTexture !== this.leftSideTexture) {
      const oldLeftSideTexture = this.leftSideTexture;
      this.leftSideTexture = leftSideTexture;
      this.propertyChangeSupport.firePropertyChange("LEFT_SIDE_PAINT", oldLeftSideTexture, leftSideTexture);
    }
  }

  getLeftSideShininess(): number | null {
    return this.leftSideShininess;
  }

  setLeftSideShininess(leftSideShininess: number | null): void {
    if (leftSideShininess !== this.leftSideShininess) {
      const oldLeftSideShininess = this.leftSideShininess;
      this.leftSideShininess = leftSideShininess;
      this.propertyChangeSupport.firePropertyChange("LEFT_SIDE_SHININESS", oldLeftSideShininess, leftSideShininess);
    }
  }

  getRightSideColor(): number | null {
    return this.rightSideColor;
  }

  setRightSideColor(rightSideColor: number | null): void {
    if (rightSideColor !== this.rightSideColor) {
      const oldRightSideColor = this.rightSideColor;
      this.rightSideColor = rightSideColor;
      this.propertyChangeSupport.firePropertyChange("RIGHT_SIDE_COLOR", oldRightSideColor, rightSideColor);
    }
  }

  getRightSidePaint(): WallController.Paint {
    return this.rightSidePaint;
  }

  setRightSidePaint(rightSidePaint: WallController.Paint): void {
    if (rightSidePaint !== this.rightSidePaint) {
      const oldRightSidePaint = this.rightSidePaint;
      this.rightSidePaint = rightSidePaint;
      this.propertyChangeSupport.firePropertyChange("RIGHT_SIDE_PAINT", oldRightSidePaint, rightSidePaint);
    }
  }

  getRightSideTexture(): HomeTexture | null {
    return this.rightSideTexture;
  }

  setRightSideTexture(rightSideTexture: HomeTexture | null): void {
    if (rightSideTexture !== this.rightSideTexture) {
      const oldRightSideTexture = this.rightSideTexture;
      this.rightSideTexture = rightSideTexture;
      this.propertyChangeSupport.firePropertyChange("RIGHT_SIDE_PAINT", oldRightSideTexture, rightSideTexture);
    }
  }

  getRightSideShininess(): number | null {
    return this.rightSideShininess;
  }

  setRightSideShininess(rightSideShininess: number | null): void {
    if (rightSideShininess !== this.rightSideShininess) {
      const oldRightSideShininess = this.rightSideShininess;
      this.rightSideShininess = rightSideShininess;
      this.propertyChangeSupport.firePropertyChange("RIGHT_SIDE_SHININESS", oldRightSideShininess, rightSideShininess);
    }
  }

  getPattern(): unknown {
    return this.pattern;
  }

  setPattern(pattern: unknown): void {
    if (pattern !== this.pattern) {
      const oldPattern = this.pattern;
      this.pattern = pattern;
      this.propertyChangeSupport.firePropertyChange("PATTERN", oldPattern, pattern);
    }
  }

  getTopColor(): number | null {
    return this.topColor;
  }

  setTopColor(topColor: number | null): void {
    if (topColor !== this.topColor) {
      const oldTopColor = this.topColor;
      this.topColor = topColor;
      this.propertyChangeSupport.firePropertyChange("TOP_COLOR", oldTopColor, topColor);
    }
  }

  getTopPaint(): WallController.Paint | null {
    return this.topPaint;
  }

  setTopPaint(topPaint: WallController.Paint | null): void {
    if (topPaint !== this.topPaint) {
      const oldTopPaint = this.topPaint;
      this.topPaint = topPaint;
      this.propertyChangeSupport.firePropertyChange("TOP_PAINT", oldTopPaint, topPaint);
    }
  }

  getShape(): WallController.Shape {
    return this.shape;
  }

  setShape(shape: WallController.Shape): void {
    if (shape !== this.shape) {
      const oldShape = this.shape;
      this.shape = shape;
      this.propertyChangeSupport.firePropertyChange("SHAPE", oldShape, shape);
    }
  }

  getRectangularWallHeight(): number | null {
    return this.rectangularWallHeight;
  }

  setRectangularWallHeight(rectangularWallHeight: number | null): void {
    if (rectangularWallHeight !== this.rectangularWallHeight) {
      const oldRectangularWallHeight = this.rectangularWallHeight;
      this.rectangularWallHeight = rectangularWallHeight;
      this.propertyChangeSupport.firePropertyChange("RECTANGULAR_WALL_HEIGHT", oldRectangularWallHeight, rectangularWallHeight);
    }
  }

  getSlopingWallHeightAtStart(): number | null {
    return this.slopingWallHeightAtStart;
  }

  setSlopingWallHeightAtStart(slopingWallHeightAtStart: number | null): void {
    if (slopingWallHeightAtStart !== this.slopingWallHeightAtStart) {
      const oldSlopingWallHeightAtStart = this.slopingWallHeightAtStart;
      this.slopingWallHeightAtStart = slopingWallHeightAtStart;
      this.propertyChangeSupport.firePropertyChange("SLOPING_WALL_HEIGHT_AT_START", oldSlopingWallHeightAtStart, slopingWallHeightAtStart);
    }
  }

  getSlopingWallHeightAtEnd(): number | null {
    return this.slopingWallHeightAtEnd;
  }

  setSlopingWallHeightAtEnd(slopingWallHeightAtEnd: number | null): void {
    if (slopingWallHeightAtEnd !== this.slopingWallHeightAtEnd) {
      const oldSlopingWallHeightAtEnd = this.slopingWallHeightAtEnd;
      this.slopingWallHeightAtEnd = slopingWallHeightAtEnd;
      this.propertyChangeSupport.firePropertyChange("SLOPING_WALL_HEIGHT_AT_END", oldSlopingWallHeightAtEnd, slopingWallHeightAtEnd);
    }
  }

  getThickness(): number | null {
    return this.thickness;
  }

  setThickness(thickness: number | null): void {
    if (thickness !== this.thickness) {
      const oldThickness = this.thickness;
      this.thickness = thickness;
      this.propertyChangeSupport.firePropertyChange("THICKNESS", oldThickness, thickness);
    }
  }

  getArcExtentInDegrees(): number | null {
    return this.arcExtentInDegrees;
  }

  setArcExtentInDegrees(arcExtentInDegrees: number | null): void {
    if (arcExtentInDegrees !== this.arcExtentInDegrees) {
      const oldArcExtentInDegrees = this.arcExtentInDegrees;
      this.arcExtentInDegrees = arcExtentInDegrees;
      this.propertyChangeSupport.firePropertyChange("ARC_EXTENT_IN_DEGREES", oldArcExtentInDegrees, arcExtentInDegrees);
    }
  }

  modifyWalls(): void {
    const selectedWalls = Home.getSubList(this.home.getSelectedItems(), Wall);
    if (selectedWalls.length === 0) {
      return;
    }
    const oldStates = selectedWalls.map((wall) => ({
      xStart: wall.getXStart(),
      yStart: wall.getYStart(),
      xEnd: wall.getXEnd(),
      yEnd: wall.getYEnd(),
      leftSideColor: wall.getLeftSideColor(),
      leftSideTexture: wall.getLeftSideTexture(),
      leftSideShininess: wall.getLeftSideShininess(),
      leftSideBaseboard: wall.getLeftSideBaseboard(),
      rightSideColor: wall.getRightSideColor(),
      rightSideTexture: wall.getRightSideTexture(),
      rightSideShininess: wall.getRightSideShininess(),
      rightSideBaseboard: wall.getRightSideBaseboard(),
      pattern: wall.getPattern(),
      topColor: wall.getTopColor(),
      thickness: wall.getThickness(),
      arcExtent: wall.getArcExtent(),
      height: wall.getHeight(),
      heightAtEnd: wall.getHeightAtEnd(),
    }));
    const newStates = selectedWalls.map((wall) => {
      const leftSidePaint = this.getLeftSidePaint();
      const rightSidePaint = this.getRightSidePaint();
      const leftBaseboard = this.getLeftSideBaseboardValues();
      const rightBaseboard = this.getRightSideBaseboardValues();
      let height: number | null;
      let heightAtEnd: number | null;
      if (this.getShape() === WallController.Shape.SLOPING_WALL) {
        height = this.getSlopingWallHeightAtStart();
        heightAtEnd = this.getSlopingWallHeightAtEnd();
      } else {
        height = this.getRectangularWallHeight();
        heightAtEnd = this.getRectangularWallHeight();
      }
      return {
        xStart: this.getXStart() ?? wall.getXStart(),
        yStart: this.getYStart() ?? wall.getYStart(),
        xEnd: this.getXEnd() ?? wall.getXEnd(),
        yEnd: this.getYEnd() ?? wall.getYEnd(),
        leftSideColor: leftSidePaint === WallController.Paint.COLORED ? this.getLeftSideColor() : null,
        leftSideTexture: leftSidePaint === WallController.Paint.TEXTURED ? this.getLeftSideTexture() : null,
        leftSideShininess: this.getLeftSideShininess() ?? 0,
        leftSideBaseboard: leftBaseboard.visible
          ? new Baseboard(leftBaseboard.thickness, leftBaseboard.height, leftBaseboard.color, leftBaseboard.texture)
          : null,
        rightSideColor: rightSidePaint === WallController.Paint.COLORED ? this.getRightSideColor() : null,
        rightSideTexture: rightSidePaint === WallController.Paint.TEXTURED ? this.getRightSideTexture() : null,
        rightSideShininess: this.getRightSideShininess() ?? 0,
        rightSideBaseboard: rightBaseboard.visible
          ? new Baseboard(rightBaseboard.thickness, rightBaseboard.height, rightBaseboard.color, rightBaseboard.texture)
          : null,
        pattern: this.getPattern(),
        topColor: this.getTopPaint() === WallController.Paint.COLORED ? this.getTopColor() : null,
        thickness: this.getThickness() ?? wall.getThickness(),
        arcExtent: this.getArcExtentInDegrees() !== null ? (this.getArcExtentInDegrees()! * Math.PI) / 180 : null,
        height,
        heightAtEnd,
      };
    });
    const apply = (states: typeof newStates): void => doModifyWalls(selectedWalls, states);
    apply(newStates);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(this.preferences, WallController, "undoModifyWallsName", apply, oldStates, newStates),
      );
    }
  }
}

function doModifyWalls(
  walls: Wall[],
  states: Array<{ xStart: number; yStart: number; xEnd: number; yEnd: number; leftSideColor: number | null; leftSideTexture: HomeTexture | null; leftSideShininess: number; leftSideBaseboard: Baseboard | null; rightSideColor: number | null; rightSideTexture: HomeTexture | null; rightSideShininess: number; rightSideBaseboard: Baseboard | null; pattern: unknown; topColor: number | null; thickness: number; arcExtent: number | null; height: number | null; heightAtEnd: number | null }>,
): void {
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i]!;
    const state = states[i]!;
    wall.setXStart(state.xStart);
    wall.setYStart(state.yStart);
    wall.setXEnd(state.xEnd);
    wall.setYEnd(state.yEnd);
    wall.setLeftSideColor(state.leftSideColor);
    wall.setLeftSideTexture(state.leftSideTexture);
    wall.setLeftSideShininess(state.leftSideShininess);
    wall.setLeftSideBaseboard(state.leftSideBaseboard);
    wall.setRightSideColor(state.rightSideColor);
    wall.setRightSideTexture(state.rightSideTexture);
    wall.setRightSideShininess(state.rightSideShininess);
    wall.setRightSideBaseboard(state.rightSideBaseboard);
    wall.setPattern(state.pattern as never);
    wall.setTopColor(state.topColor);
    wall.setThickness(state.thickness);
    wall.setArcExtent(state.arcExtent);
    wall.setHeight(state.height);
    wall.setHeightAtEnd(state.heightAtEnd);
  }
}


export namespace WallController {
  export enum Paint {
    COLORED = "COLORED",
    TEXTURED = "TEXTURED",
  }

  export enum Shape {
    RECTANGULAR_WALL = "RECTANGULAR_WALL",
    SLOPING_WALL = "SLOPING_WALL",
  }
}
