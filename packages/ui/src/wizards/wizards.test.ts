/*
 * wizards.test.ts
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
 * Wizards tests (task 7.4): the wizard controllers expose the state the React
 * views bind to; finish() commits to the home/catalog.
 */
import { describe, expect, it } from "vitest";
import { Home, UserPreferences, ImportedTextureWizardController, ImportedFurnitureWizardController, FurnitureController, BackgroundImageWizardController } from "@sweethomejs/core";

const mockViewFactory = {
  createWizardView: () => ({ displayView: () => {} }),
  createHomeView: () => ({}) as never,
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createPlanView: () => ({}) as never,
  createView3D: () => ({}) as never,
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
} as never;

describe("Wizard controllers (task 7.4)", () => {
  it("furniture wizard finish adds a piece to the home", () => {
    const home = new Home();
    const preferences = new UserPreferences();
    const furnitureController = new FurnitureController(home, preferences, mockViewFactory, null, null);
    const controller = new ImportedFurnitureWizardController(home, null, preferences, furnitureController, mockViewFactory, null, null);
    controller.setName("Imported table");
    controller.setWidth(120);
    controller.setDepth(60);
    controller.setHeight(75);
    controller.finish();
    expect(home.getFurniture().length).toBe(1);
    expect(home.getFurniture()[0]!.getName()).toBe("Imported table");
    expect(home.getFurniture()[0]!.getWidth()).toBe(120);
  });

  it("furniture wizard name validity gates the next step", () => {
    const preferences = new UserPreferences();
    const controller = new ImportedFurnitureWizardController(null, null, preferences, null, mockViewFactory, null, null);
    expect(controller.isPieceOfFurnitureNameValid()).toBe(false);
    controller.setName("Sofa");
    expect(controller.isPieceOfFurnitureNameValid()).toBe(true);
  });

  it("texture wizard finish adds a texture to the catalog", () => {
    const preferences = new UserPreferences();
    const controller = new ImportedTextureWizardController(preferences, mockViewFactory, null);
    controller.setName("Oak");
    controller.setWidth(200);
    controller.setHeight(50);
    controller.finish();
    const catalog = preferences.getTexturesCatalog();
    expect(catalog.getCategories().flatMap((c) => c.getTextures()).length).toBe(1);
  });

  it("background image wizard exposes scale/origin fields", () => {
    const home = new Home();
    const controller = new BackgroundImageWizardController(home, new UserPreferences(), mockViewFactory, null, null);
    controller.setScaleDistance(2.5);
    expect(controller.getScaleDistance()).toBe(2.5);
    controller.setOrigin(100, 200);
    expect(controller.getXOrigin()).toBe(100);
    expect(controller.getYOrigin()).toBe(200);
  });
});
