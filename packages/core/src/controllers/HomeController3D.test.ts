/*
 * HomeController3D.test.ts.ts
 *
 * Translated from Sweet Home 3D HomeController3D.test.java.java
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
 * HomeController3D + UserPreferencesController tests (task 4.3):
 * camera navigation, stored cameras, top-camera home-bounds following,
 * preferences property-change propagation.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { Camera } from "../model/Camera.js";
import { HomeController3D } from "./HomeController3D.js";
import { UserPreferencesController } from "./UserPreferencesController.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { ViewFactory } from "./ViewFactory.js";

const mockViewFactory: ViewFactory = {
  createView3D: () => ({}) as never,
  createUserPreferencesView: () => ({ displayView: () => {} }) as never,
  createHomeView: () => ({}) as never,
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createPlanView: () => ({}) as never,
  createWizardView: () => ({}) as never,
  createBackgroundImageWizardStepsView: () => ({}) as never,
  createImportedFurnitureWizardStepsView: () => ({}) as never,
  createImportedTextureWizardStepsView: () => ({}) as never,
  createThreadedTaskView: () => ({}) as never,
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

function makeController(home: Home): HomeController3D {
  return new HomeController3D(home, new UserPreferences(), mockViewFactory, null, null);
}

describe("HomeController3D (task 4.3)", () => {
  it("switches between top and observer camera", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.viewFromTop();
    expect(home.getCamera()).toBe(home.getTopCamera());
    controller.viewFromObserver();
    expect(home.getCamera()).toBe(home.getObserverCamera());
    controller.viewFromTop();
    expect(home.getCamera()).toBe(home.getTopCamera());
  });

  it("stores and deletes cameras, deduplicating by location", () => {
    const home = new Home();
    const controller = makeController(home);
    home.setCamera(home.getTopCamera());
    controller.storeCamera("View 1");
    controller.storeCamera("View 2");
    expect(home.getStoredCameras().length).toBe(2);
    // Same location again: replaces
    controller.storeCamera("View 2");
    expect(home.getStoredCameras().length).toBe(2);
    controller.deleteCameras([home.getStoredCameras()[0]!]);
    expect(home.getStoredCameras().length).toBe(1);
  });

  it("moves the observer camera forward along its yaw", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.viewFromObserver();
    const observer = home.getObserverCamera();
    // Default yaw is 0 → forward is +Y
    const y0 = observer.getY();
    controller.moveCamera(100);
    expect(observer.getY()).toBeCloseTo(y0 + 100, 6);
    // Sideways moves along X
    const x0 = observer.getX();
    controller.moveCameraSideways(50);
    expect(observer.getX()).toBeCloseTo(x0 - 50, 6);
  });

  it("keeps the top camera looking at the home bounds", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.viewFromTop();
    // Add a wall far from origin; the top camera should recentre
    const piece = new HomePieceOfFurniture("piece", {
      getName: () => "Sofa",
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => 100,
      getHeight: () => 50,
      getWidth: () => 200,
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
    piece.setX(5000);
    piece.setY(0);
    home.addPieceOfFurniture(piece);
    controller.viewFromTop();
    const top = home.getTopCamera();
    // Top camera recentred on the home bounds (piece at x=5000 → camera near it)
    expect(Math.abs(top.getX() - 5000)).toBeLessThan(5000);
    expect(top.getZ()).toBeGreaterThan(0);
    controller.moveCamera(10);
    expect(top.getX()).not.toBeNaN();
  });

  it("goToCamera moves to a stored camera", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.viewFromObserver();
    const observer = home.getObserverCamera();
    controller.storeCamera("Stored");
    const stored = home.getStoredCameras()[0]!;
    controller.goToCamera(stored);
    // Camera is brought back to the stored position
    expect(observer.getX()).toBe(stored.getX());
    expect(observer.getY()).toBe(stored.getY());
  });
});

describe("UserPreferencesController (task 4.3)", () => {
  it("mirrors preference values and fires property changes", () => {
    const preferences = new UserPreferences();
    const controller = new UserPreferencesController(preferences, mockViewFactory);
    let changed: string | null = null;
    controller.addPropertyChangeListener(UserPreferencesController.Property.UNIT, {
      propertyChange: (evt) => {
        changed = evt.propertyName;
      },
    });
    controller.setUnit(preferences.getLengthUnit()); // same unit: no event
    expect(changed).toBeNull();
    // Change to a different unit via a new controller instance
    const unit = new (Object.getPrototypeOf(preferences.getLengthUnit()).constructor)("INCH");
    controller.setUnit(unit);
    expect(changed).toBe(UserPreferencesController.Property.UNIT);
    expect(controller.getUnit()).toBe(unit);
  });

  it("toggles boolean preferences", () => {
    const preferences = new UserPreferences();
    const controller = new UserPreferencesController(preferences, mockViewFactory);
    controller.setMagnetismEnabled(false);
    expect(controller.isMagnetismEnabled()).toBe(false);
    controller.setRulersVisible(true);
    expect(controller.isRulersVisible()).toBe(true);
    controller.setGridVisible(false);
    expect(controller.isGridVisible()).toBe(false);
  });
});
