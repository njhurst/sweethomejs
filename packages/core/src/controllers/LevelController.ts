/*
 * LevelController.ts.ts
 *
 * Translated from Sweet Home 3D LevelController.java.java
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
 * LevelController (port of com.eteks.sweethome3d.viewcontroller.LevelController, GPL v2+).
 * Edits the levels of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { Level } from "../model/Level.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";


export class LevelController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private levelView: DialogView | null = null;
  private levels: Level[] = [];
  private selectLevelIndex = 0;
  private name = "";
  private viewable = true;
  private elevation = 0;
  private elevationIndex = 0;
  private floorThickness = 0;
  private height = 0;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.levelView === null) {
      this.levelView = this.viewFactory.createLevelView(this.preferences, this);
    }
    return this.levelView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: LevelController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: LevelController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  protected updateProperties(): void {
    this.levels = this.home.getLevels();
    this.setLevels(this.levels);
    const selectedLevel = this.home.getSelectedLevel();
    if (selectedLevel !== null) {
      this.setSelectLevelIndex(this.levels.indexOf(selectedLevel));
      this.setName(selectedLevel.getName());
      this.setViewable(selectedLevel.isViewable());
      this.setElevation(selectedLevel.getElevation());
      this.setElevationIndex(selectedLevel.getElevationIndex());
      this.setFloorThickness(selectedLevel.getFloorThickness());
      this.setHeight(selectedLevel.getHeight());
    }
  }

  getLevels(): Level[] {
    return this.levels;
  }

  setLevels(levels: Level[]): void {
    if (levels !== this.levels) {
      const oldLevels = this.levels;
      this.levels = levels;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.LEVELS, oldLevels, levels);
    }
  }

  getSelectLevelIndex(): number {
    return this.selectLevelIndex;
  }

  setSelectLevelIndex(selectLevelIndex: number): void {
    if (selectLevelIndex !== this.selectLevelIndex) {
      const oldSelectLevelIndex = this.selectLevelIndex;
      this.selectLevelIndex = selectLevelIndex;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.SELECT_LEVEL_INDEX, oldSelectLevelIndex, selectLevelIndex);
    }
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.NAME, oldName, name);
    }
  }

  isViewable(): boolean {
    return this.viewable;
  }

  setViewable(viewable: boolean): void {
    if (viewable !== this.viewable) {
      this.viewable = viewable;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.VIEWABLE, !viewable, viewable);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    if (elevation !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = elevation;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.ELEVATION, oldElevation, elevation);
    }
  }

  getElevationIndex(): number {
    return this.elevationIndex;
  }

  setElevationIndex(elevationIndex: number): void {
    if (elevationIndex !== this.elevationIndex) {
      const oldElevationIndex = this.elevationIndex;
      this.elevationIndex = elevationIndex;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.ELEVATION_INDEX, oldElevationIndex, elevationIndex);
    }
  }

  getFloorThickness(): number {
    return this.floorThickness;
  }

  setFloorThickness(floorThickness: number): void {
    if (floorThickness !== this.floorThickness) {
      const oldFloorThickness = this.floorThickness;
      this.floorThickness = floorThickness;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.FLOOR_THICKNESS, oldFloorThickness, floorThickness);
    }
  }

  getHeight(): number {
    return this.height;
  }

  setHeight(height: number): void {
    if (height !== this.height) {
      const oldHeight = this.height;
      this.height = height;
      this.propertyChangeSupport.firePropertyChange(LevelController.Property.HEIGHT, oldHeight, height);
    }
  }

  modifyLevels(): void {
    const modifiedLevel = this.levels[this.selectLevelIndex]!;
    const oldState = {
      name: modifiedLevel.getName(),
      viewable: modifiedLevel.isViewable(),
      elevation: modifiedLevel.getElevation(),
      floorThickness: modifiedLevel.getFloorThickness(),
      height: modifiedLevel.getHeight(),
      elevationIndex: modifiedLevel.getElevationIndex(),
    };
    const newState = {
      name: this.getName(),
      viewable: this.isViewable(),
      elevation: this.getElevation(),
      floorThickness: this.getFloorThickness(),
      height: this.getHeight(),
      elevationIndex: this.getElevationIndex(),
    };
    doModifyLevel(this.home, modifiedLevel, newState);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(
          this.preferences, LevelController, "undoModifyLevelName",
          (state) => doModifyLevel(this.home, modifiedLevel, state),
          oldState, newState,
        ),
      );
    }
  }
}

function doModifyLevel(home: Home, level: Level, state: { name: string; viewable: boolean; elevation: number; floorThickness: number; height: number; elevationIndex: number }): void {
  if (state.elevationIndex >= 0 && state.elevationIndex < home.getLevels().length) {
    const otherLevel = home.getLevels()[state.elevationIndex] ?? null;
    if (otherLevel !== null && otherLevel !== level) {
      otherLevel.setElevation(state.elevation);
    }
  }
  level.setName(state.name);
  level.setViewable(state.viewable);
  level.setElevation(state.elevation);
  level.setFloorThickness(state.floorThickness);
  level.setHeight(state.height);
  level.setElevationIndex(state.elevationIndex);
}


export namespace LevelController {
  export enum Property {
    VIEWABLE = "VIEWABLE",
    NAME = "NAME",
    ELEVATION = "ELEVATION",
    ELEVATION_INDEX = "ELEVATION_INDEX",
    FLOOR_THICKNESS = "FLOOR_THICKNESS",
    HEIGHT = "HEIGHT",
    LEVELS = "LEVELS",
    SELECT_LEVEL_INDEX = "SELECT_LEVEL_INDEX",
  }
}
