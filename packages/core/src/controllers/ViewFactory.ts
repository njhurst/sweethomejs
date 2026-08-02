/*
 * ViewFactory.ts.ts
 *
 * Translated from Sweet Home 3D ViewFactory.java.java
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
 * ViewFactory interface (port of com.eteks.sweethome3d.viewcontroller.ViewFactory, GPL v2+).
 * A factory that specifies how to create the views displayed in Sweet Home 3D.
 *
 * The controller parameters are typed `unknown` here; they are tightened to the
 * concrete controller types as the controllers are ported (tasks 4.2–4.8).
 */
import type { View } from "./View.js";
import type { DialogView } from "./DialogView.js";
import type { PlanView } from "./PlanView.js";
import type { ThreadedTaskView } from "./ThreadedTaskView.js";
import type { HelpView } from "./HelpView.js";
import type { TextureChoiceView } from "./TextureChoiceView.js";
import type { ImportedFurnitureWizardStepsView } from "./ImportedFurnitureWizardStepsView.js";
import type { FurnitureCatalog } from "../model/Catalogs.js";
import type { Home } from "../model/Home.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { BackgroundImage } from "../model/BackgroundImage.js";
import type { CatalogPieceOfFurniture } from "../io/CatalogClasses.js";
import type { CatalogTexture } from "../io/CatalogClasses.js";

export interface ViewFactory {
  createFurnitureCatalogView(catalog: FurnitureCatalog, preferences: UserPreferences, furnitureCatalogController: unknown): View;
  createFurnitureView(home: Home, preferences: UserPreferences, furnitureController: unknown): View;
  createPlanView(home: Home, preferences: UserPreferences, planController: unknown): PlanView;
  createView3D(home: Home, preferences: UserPreferences, homeController3D: unknown): View;
  createHomeView(home: Home, preferences: UserPreferences, homeController: unknown): View;
  createWizardView(preferences: UserPreferences, wizardController: unknown): DialogView;
  createBackgroundImageWizardStepsView(
    backgroundImage: BackgroundImage,
    preferences: UserPreferences,
    backgroundImageWizardController: unknown,
  ): View;
  createImportedFurnitureWizardStepsView(
    piece: CatalogPieceOfFurniture | null,
    modelName: string,
    importHomePiece: boolean,
    preferences: UserPreferences,
    importedFurnitureWizardController: unknown,
  ): ImportedFurnitureWizardStepsView;
  createImportedTextureWizardStepsView(
    texture: CatalogTexture | null,
    textureName: string,
    preferences: UserPreferences,
    importedTextureWizardController: unknown,
  ): View;
  createThreadedTaskView(taskMessage: string, userPreferences: UserPreferences, threadedTaskController: unknown): ThreadedTaskView;
  createUserPreferencesView(preferences: UserPreferences, userPreferencesController: unknown): DialogView;
  createLevelView(preferences: UserPreferences, levelController: unknown): DialogView;
  createHomeFurnitureView(preferences: UserPreferences, homeFurnitureController: unknown): DialogView;
  createWallView(preferences: UserPreferences, wallController: unknown): DialogView;
  createRoomView(preferences: UserPreferences, roomController: unknown): DialogView;
  createPolylineView(preferences: UserPreferences, polylineController: unknown): DialogView;
  createDimensionLineView(modification: boolean, preferences: UserPreferences, dimensionLineController: unknown): DialogView;
  createLabelView(modification: boolean, preferences: UserPreferences, labelController: unknown): DialogView;
  createCompassView(preferences: UserPreferences, compassController: unknown): DialogView;
  createObserverCameraView(preferences: UserPreferences, home3DAttributesController: unknown): DialogView;
  createHome3DAttributesView(preferences: UserPreferences, home3DAttributesController: unknown): DialogView;
  createTextureChoiceView(preferences: UserPreferences, textureChoiceController: unknown): TextureChoiceView;
  createBaseboardChoiceView(preferences: UserPreferences, baseboardChoiceController: unknown): View;
  createModelMaterialsView(preferences: UserPreferences, modelMaterialsController: unknown): View;
  createPageSetupView(preferences: UserPreferences, pageSetupController: unknown): DialogView;
  createPrintPreviewView(home: Home, preferences: UserPreferences, homeController: unknown, printPreviewController: unknown): DialogView;
  createPhotoView(home: Home, preferences: UserPreferences, photoController: unknown): DialogView;
  createPhotosView(home: Home, preferences: UserPreferences, photosController: unknown): DialogView;
  createVideoView(home: Home, preferences: UserPreferences, videoController: unknown): DialogView;
  createHelpView(preferences: UserPreferences, helpController: unknown): HelpView;
}
