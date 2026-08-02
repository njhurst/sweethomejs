/*
 * dialogControllers.test.ts.ts
 *
 * Translated from Sweet Home 3D dialogControllers.test.java.java
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
 * Dialog controller tests (task 4.4): property editing + undo for the
 * compass/wall/room/label/level controllers.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { Wall } from "../model/Wall.js";
import { Room } from "../model/Room.js";
import { Level } from "../model/Level.js";
import { Label } from "../model/Label.js";
import { CompassController } from "./CompassController.js";
import { WallController } from "./WallController.js";
import { RoomController } from "./RoomController.js";
import { LevelController } from "./LevelController.js";
import { LabelController } from "./LabelController.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { UndoManager } from "./undo/UndoManager.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { ViewFactory } from "./ViewFactory.js";

const mockViewFactory: ViewFactory = {
  createCompassView: () => ({ displayView: () => {} }) as never,
  createWallView: () => ({ displayView: () => {} }) as never,
  createRoomView: () => ({ displayView: () => {} }) as never,
  createLevelView: () => ({ displayView: () => {} }) as never,
  createLabelView: () => ({ displayView: () => {} }) as never,
  createHomeView: () => ({}) as never,
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createPlanView: () => ({}) as never,
  createView3D: () => ({}) as never,
  createWizardView: () => ({}) as never,
  createBackgroundImageWizardStepsView: () => ({}) as never,
  createImportedFurnitureWizardStepsView: () => ({}) as never,
  createImportedTextureWizardStepsView: () => ({}) as never,
  createThreadedTaskView: () => ({}) as never,
  createUserPreferencesView: () => ({}) as never,
  createHomeFurnitureView: () => ({}) as never,
  createPolylineView: () => ({}) as never,
  createDimensionLineView: () => ({}) as never,
  createObserverCameraView: () => ({}) as never,
  createHome3DAttributesView: () => ({}) as never,
  createTextureChoiceView: () => ({}) as never,
  createBaseboardChoiceView: () => ({}) as never,
  createModelMaterialsView: () => ({}) as never,
  createPageSetupView: () => ({}) as never,
  createPrintPreviewView: () => ({}) as never,
  createPhotoView: () => ({}) as never,
  createPhotosView: () => ({}) as never,
  createVideoView: () => ({}) as never,
  createHelpView: () => ({}) as never,
};

function makeUndo(): { support: UndoableEditSupport; manager: UndoManager } {
  const support = new UndoableEditSupport();
  const manager = new UndoManager();
  support.addUndoableEditListener(manager);
  return { support, manager };
}

describe("Dialog controllers (task 4.4)", () => {
  it("compass controller edits and undoes compass values", () => {
    const home = new Home();
    const { support, manager } = makeUndo();
    const controller = new CompassController(home, new UserPreferences(), mockViewFactory, support);
    controller.setX(150);
    controller.setY(60);
    controller.setDiameter(120);
    controller.modifyCompass();

    const compass = home.getCompass();
    expect(compass.getX()).toBe(150);
    expect(compass.getY()).toBe(60);
    expect(compass.getDiameter()).toBe(120);

    manager.undo();
    expect(compass.getX()).toBe(0);
    expect(compass.getY()).toBe(0);

    manager.redo();
    expect(compass.getX()).toBe(150);
  });

  it("wall controller edits and undoes wall geometry and heights", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 500, 0, 10, 250);
    home.addWall(wall);
    home.setSelectedItems([wall]);
    const { support, manager } = makeUndo();
    const controller = new WallController(home, new UserPreferences(), mockViewFactory, support);
    controller.setXEnd(800);
    controller.setYEnd(100);
    controller.setThickness(20);
    controller.modifyWalls();

    expect(wall.getXEnd()).toBe(800);
    expect(wall.getYEnd()).toBe(100);
    expect(wall.getThickness()).toBe(20);

    manager.undo();
    expect(wall.getXEnd()).toBe(500);
    expect(wall.getYEnd()).toBe(0);
    expect(wall.getThickness()).toBe(10);
  });

  it("room controller edits and undoes room name and floor color", () => {
    const home = new Home();
    const room = new Room("room", [[0, 0], [100, 0], [100, 100], [0, 100]]);
    home.addRoom(room);
    home.setSelectedItems([room]);
    const { support, manager } = makeUndo();
    const controller = new RoomController(home, new UserPreferences(), mockViewFactory, support);
    controller.setName("Living");
    controller.setFloorColor(0xff0000);
    controller.modifyRooms();

    expect(room.getName()).toBe("Living");
    expect(room.getFloorColor()).toBe(0xff0000);

    manager.undo();
    expect(room.getName()).toBeNull();
  });

  it("level controller edits and undoes level elevation/height", () => {
    const home = new Home();
    const level = new Level("level", "Ground", 0, 0, 250);
    home.addLevel(level);
    home.setSelectedLevel(level);
    const { support, manager } = makeUndo();
    const controller = new LevelController(home, new UserPreferences(), mockViewFactory, support);
    controller.setElevation(300);
    controller.setHeight(280);
    controller.modifyLevels();

    expect(level.getElevation()).toBe(300);
    expect(level.getHeight()).toBe(280);

    manager.undo();
    expect(level.getElevation()).toBe(0);
  });

  it("label controller edits and undoes label text", () => {
    const home = new Home();
    const label = new Label("label", "Old", 10, 20);
    home.addLabel(label);
    home.setSelectedItems([label]);
    const { support, manager } = makeUndo();
    const controller = new LabelController(home, new UserPreferences(), mockViewFactory, support);
    controller.setText("New text");
    controller.modifyLabels();

    expect(label.getText()).toBe("New text");
    manager.undo();
    expect(label.getText()).toBe("Old");
  });
});
