/*
 * FurnitureController.test.ts.ts
 *
 * Translated from Sweet Home 3D FurnitureController.test.java.java
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
 * FurnitureController tests (task 4.2): furniture add/delete/group/ungroup,
 * alignment and distribution with undo/redo via a mock view factory.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { HomeFurnitureGroup } from "../model/HomeFurnitureGroup.js";
import { FurnitureController } from "./FurnitureController.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { UndoManager } from "./undo/UndoManager.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { ViewFactory } from "./ViewFactory.js";

function makePiece(name: string, x: number, y: number, width = 100, depth = 50, height = 30): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("testPiece", {
    getName: () => name,
    getDescription: () => null,
    getInformation: () => null,
    getLicense: () => null,
    getDepth: () => depth,
    getHeight: () => height,
    getWidth: () => width,
    getElevation: () => 0,
    getDropOnTopElevation: () => 1,
    isMovable: () => true,
    isDoorOrWindow: () => false,
    getIcon: () => null,
    getPlanIcon: () => null,
    getModel: () => null,
    getModelFlags: () => 0,
    getModelSize: () => null,
    getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null,
    getCreator: () => null,
    isBackFaceShown: () => false,
    getColor: () => null,
    isResizable: () => true,
    isDeformable: () => true,
    isWidthDepthDeformable: () => true,
    isTexturable: () => true,
    isHorizontallyRotatable: () => true,
    getPrice: () => null,
    getValueAddedTaxPercentage: () => null,
    getCurrency: () => null,
    getProperty: () => null,
    getPropertyNames: () => [],
    getContentProperty: () => null,
    isContentProperty: () => false,
    getLevel: () => null,
  } as never);
  piece.setX(x);
  piece.setY(y);
  return piece;
}

const mockViewFactory: ViewFactory = {
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createPlanView: () => ({}) as never,
  createView3D: () => ({}) as never,
  createHomeView: () => ({}) as never,
  createWizardView: () => ({}) as never,
  createBackgroundImageWizardStepsView: () => ({}) as never,
  createImportedFurnitureWizardStepsView: () => ({}) as never,
  createImportedTextureWizardStepsView: () => ({}) as never,
  createThreadedTaskView: () => ({}) as never,
  createUserPreferencesView: () => ({}) as never,
  createLevelView: () => ({}) as never,
  createHomeFurnitureView: () => ({}) as never,
  createWallView: () => ({}) as never,
  createRoomView: () => ({}) as never,
  createPolylineView: () => ({}) as never,
  createDimensionLineView: () => ({}) as never,
  createLabelView: () => ({}) as never,
  createCompassView: () => ({}) as never,
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

function makeController(home: Home): { controller: FurnitureController; undoSupport: UndoableEditSupport; undoManager: UndoManager } {
  const preferences = new UserPreferences();
  const undoSupport = new UndoableEditSupport();
  const undoManager = new UndoManager();
  undoSupport.addUndoableEditListener(undoManager);
  const controller = new FurnitureController(home, preferences, mockViewFactory, null, undoSupport);
  return { controller, undoSupport, undoManager };
}

describe("FurnitureController (task 4.2)", () => {
  it("adds furniture, selects it and undoes the addition", () => {
    const home = new Home();
    const { controller, undoManager } = makeController(home);
    const piece = makePiece("Sofa", 100, 200);

    controller.addFurniture([piece]);
    expect(home.getFurniture()).toContain(piece);
    expect(home.getSelectedItems()).toContain(piece);
    expect(home.getFurniture().length).toBe(1);

    undoManager.undo();
    expect(home.getFurniture().length).toBe(0);

    undoManager.redo();
    expect(home.getFurniture().length).toBe(1);
    expect(home.getSelectedItems()).toContain(piece);
  });

  it("deletes selected furniture and restores it on undo", () => {
    const home = new Home();
    const { controller, undoManager } = makeController(home);
    const a = makePiece("A", 0, 0);
    const b = makePiece("B", 100, 0);
    controller.addFurniture([a, b]);

    controller.setSelectedFurniture([a]);
    controller.deleteSelection();
    expect(home.getFurniture()).toEqual([b]);

    undoManager.undo();
    expect(home.getFurniture()).toEqual([a, b]);
    undoManager.redo();
    expect(home.getFurniture()).toEqual([b]);
  });

  it("groups selected furniture and ungroups it on undo", () => {
    const home = new Home();
    const { controller, undoManager } = makeController(home);
    const a = makePiece("A", 0, 0);
    const b = makePiece("B", 200, 0);
    controller.addFurniture([a, b]);

    controller.setSelectedFurniture([a, b]);
    controller.groupSelectedFurniture();
    expect(home.getFurniture().length).toBe(1);
    const group = home.getFurniture()[0]!;
    expect(group).toBeInstanceOf(HomeFurnitureGroup);
    expect((group as HomeFurnitureGroup).getFurniture().length).toBe(2);

    // Undo ungroups: pieces back in home
    undoManager.undo();
    expect(home.getFurniture().length).toBe(2);
    expect(home.getFurniture()).toContain(a);
    expect(home.getFurniture()).toContain(b);

    // Redo groups again
    undoManager.redo();
    expect(home.getFurniture().length).toBe(1);
    expect(home.getFurniture()[0]).toBeInstanceOf(HomeFurnitureGroup);
  });

  it("ungroups a selected group", () => {
    const home = new Home();
    const { controller, undoManager } = makeController(home);
    const a = makePiece("A", 0, 0);
    const b = makePiece("B", 200, 0);
    controller.addFurniture([a, b]);
    controller.setSelectedFurniture([a, b]);
    controller.groupSelectedFurniture();
    const group = home.getFurniture()[0]!;

    controller.setSelectedFurniture([group as HomePieceOfFurniture]);
    controller.ungroupSelectedFurniture();
    expect(home.getFurniture().length).toBe(2);

    undoManager.undo();
    expect(home.getFurniture().length).toBe(1);
    expect(home.getFurniture()[0]).toBe(group);
  });

  it("aligns selected furniture on top of the leading piece", () => {
    const home = new Home();
    const { controller } = makeController(home);
    const a = makePiece("A", 0, 0);
    const b = makePiece("B", 0, 500);
    controller.addFurniture([a, b]);
    controller.setSelectedFurniture([a, b]);

    controller.alignSelectedFurnitureOnTop();
    expect(b.getY()).toBe(a.getY());
    // The leading piece itself doesn't move
    expect(a.getY()).toBe(0);
  });

  it("distributes furniture horizontally", () => {
    const home = new Home();
    const { controller } = makeController(home);
    const a = makePiece("A", 0, 0);
    const b = makePiece("B", 400, 0);
    const c = makePiece("C", 800, 0);
    controller.addFurniture([a, b, c]);
    controller.setSelectedFurniture([a, b, c]);

    controller.distributeSelectedFurnitureHorizontally();
    // A and C keep their positions; B is centered between them
    expect(a.getX()).toBe(0);
    expect(c.getX()).toBe(800);
    expect(b.getX()).toBe(400);
  });

  it("resets furniture elevation to the top of the piece below", () => {
    const home = new Home();
    const { controller } = makeController(home);
    const table = makePiece("Table", 0, 0, 100, 50, 75);
    const lamp = makePiece("Lamp", 0, 0, 10, 10, 30);
    lamp.setElevation(500);
    controller.addFurniture([table, lamp]);
    controller.setSelectedFurniture([lamp]);

    controller.resetFurnitureElevation();
    expect(lamp.getElevation()).toBe(75);
  });

  it("moves selected furniture before another piece (compound undo)", () => {
    const home = new Home();
    const { controller, undoManager } = makeController(home);
    const a = makePiece("A", 0, 0);
    const b = makePiece("B", 0, 100);
    const c = makePiece("C", 0, 200);
    controller.addFurniture([a, b, c]);

    controller.setSelectedFurniture([c]);
    controller.moveSelectedFurnitureBefore(a);
    expect(home.getFurniture()).toEqual([c, a, b]);

    // One compound undo restores the order
    undoManager.undo();
    expect(home.getFurniture()).toEqual([a, b, c]);
  });
});
