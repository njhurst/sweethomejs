/*
 * wizards.test.ts.ts
 *
 * Translated from Sweet Home 3D wizards.test.java.java
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
 * Wizard controller tests (task 4.5): wizard steps, imported furniture
 * addition with undo, imported texture finish.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { ImportedFurnitureWizardController } from "./ImportedFurnitureWizardController.js";
import { ImportedTextureWizardController } from "./ImportedTextureWizardController.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { UndoManager } from "./undo/UndoManager.js";
import { FurnitureController } from "./FurnitureController.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { ViewFactory } from "./ViewFactory.js";

const mockViewFactory: ViewFactory = {
  createHomeView: () => ({}) as never,
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createPlanView: () => ({}) as never,
  createView3D: () => ({}) as never,
  createWizardView: () => ({ displayView: () => {} }) as never,
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

describe("Wizard controllers (task 4.5)", () => {
  it("imported-furniture wizard adds a piece with undo", () => {
    const home = new Home();
    const preferences = new UserPreferences();
    const undoSupport = new UndoableEditSupport();
    const undoManager = new UndoManager();
    undoSupport.addUndoableEditListener(undoManager);
    const furnitureController = new FurnitureController(home, preferences, mockViewFactory, null, undoSupport);
    const controller = new ImportedFurnitureWizardController(home, null, preferences, furnitureController, mockViewFactory, null, undoSupport);
    controller.setName("Imported sofa");
    controller.setWidth(200);
    controller.setDepth(80);
    controller.setHeight(70);
    controller.setModelSize(1234);
    controller.finish();

    expect(home.getFurniture().length).toBe(1);
    expect(home.getFurniture()[0]!.getName()).toBe("Imported sofa");

    undoManager.undo();
    expect(home.getFurniture().length).toBe(0);

    undoManager.redo();
    expect(home.getFurniture().length).toBe(1);
  });

  it("imported-texture wizard exposes name validity", () => {
    const preferences = new UserPreferences();
    const controller = new ImportedTextureWizardController(preferences, mockViewFactory, null);
    expect(controller.isTextureNameValid()).toBe(false);
    controller.setName("Wood");
    expect(controller.isTextureNameValid()).toBe(true);
  });
});
