/*
 * WebViewFactory.ts
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
 * WebViewFactory (task 7.1): implements the core ViewFactory by returning
 * React-backed view wrappers. The concrete HomePane is the only fully wired
 * view so far; other views return lightweight adapters until their tasks
 * (7.2–7.4) land.
 */
import type { View, ViewFactory, HomeView, PlanView, DialogView, HelpView, TextureChoiceView, ImportedFurnitureWizardStepsView, ThreadedTaskView, FurnitureCatalog, Home, UserPreferences, BackgroundImage } from "@sweethomejs/core";
import type { CatalogPieceOfFurniture, CatalogTexture } from "@sweethomejs/core";
import { HomePane } from "./HomePane.js";

export interface WebViewFactoryOptions {
  /** Renders the HomePane (react root mounting is handled by the caller). */
  mountHomePane: (element: HTMLElement, props: { home: Home; preferences: UserPreferences; homeController: unknown }) => void;
}

/**
 * A View implementation backed by a DOM element (rendered by the caller).
 */
export class ElementView implements View {
  constructor(private readonly element: HTMLElement) {}

  getElement(): HTMLElement {
    return this.element;
  }
}

export class WebViewFactory implements ViewFactory {
  constructor(private readonly options: WebViewFactoryOptions) {}

  createHomeView(home: Home, preferences: UserPreferences, homeController: unknown): View {
    // The caller mounts the HomePane into the app's root; we return a
    // placeholder element view that the HomeController can hold.
    const element = document.createElement("div");
    element.className = "sh-home-host";
    this.options.mountHomePane(element, { home, preferences, homeController });
    return new ElementView(element);
  }

  createFurnitureCatalogView(catalog: FurnitureCatalog, preferences: UserPreferences, furnitureCatalogController: unknown): View {
    return this.placeholderView("furniture-catalog");
  }

  createFurnitureView(home: Home, preferences: UserPreferences, furnitureController: unknown): View {
    return this.placeholderView("furniture-list");
  }

  createPlanView(home: Home, preferences: UserPreferences, planController: unknown): PlanView {
    // The PlanCanvas component implements PlanView; this adapter is replaced
    // by the actual canvas wiring in HomePane.
    return this.placeholderView("plan") as unknown as PlanView;
  }

  createView3D(home: Home, preferences: UserPreferences, homeController3D: unknown): View {
    return this.placeholderView("view3d");
  }

  createWizardView(preferences: UserPreferences, wizardController: unknown): DialogView {
    return this.placeholderView("wizard") as unknown as DialogView;
  }

  createBackgroundImageWizardStepsView(backgroundImage: BackgroundImage, preferences: UserPreferences, backgroundImageWizardController: unknown): View {
    return this.placeholderView("background-image-wizard");
  }

  createImportedFurnitureWizardStepsView(piece: CatalogPieceOfFurniture | null, modelName: string, importHomePiece: boolean, preferences: UserPreferences, importedFurnitureWizardController: unknown): ImportedFurnitureWizardStepsView {
    return this.placeholderView("imported-furniture-wizard") as unknown as ImportedFurnitureWizardStepsView;
  }

  createImportedTextureWizardStepsView(texture: CatalogTexture | null, textureName: string, preferences: UserPreferences, importedTextureWizardController: unknown): View {
    return this.placeholderView("imported-texture-wizard");
  }

  createThreadedTaskView(taskMessage: string, userPreferences: UserPreferences, threadedTaskController: unknown): ThreadedTaskView {
    return this.placeholderView("threaded-task") as unknown as ThreadedTaskView;
  }

  createUserPreferencesView(preferences: UserPreferences, userPreferencesController: unknown): DialogView {
    return this.placeholderView("user-preferences") as unknown as DialogView;
  }

  createLevelView(preferences: UserPreferences, levelController: unknown): DialogView {
    return this.placeholderView("level") as unknown as DialogView;
  }

  createHomeFurnitureView(preferences: UserPreferences, homeFurnitureController: unknown): DialogView {
    return this.placeholderView("furniture") as unknown as DialogView;
  }

  createWallView(preferences: UserPreferences, wallController: unknown): DialogView {
    return this.placeholderView("wall") as unknown as DialogView;
  }

  createRoomView(preferences: UserPreferences, roomController: unknown): DialogView {
    return this.placeholderView("room") as unknown as DialogView;
  }

  createPolylineView(preferences: UserPreferences, polylineController: unknown): DialogView {
    return this.placeholderView("polyline") as unknown as DialogView;
  }

  createDimensionLineView(modification: boolean, preferences: UserPreferences, dimensionLineController: unknown): DialogView {
    return this.placeholderView("dimension-line") as unknown as DialogView;
  }

  createLabelView(modification: boolean, preferences: UserPreferences, labelController: unknown): DialogView {
    return this.placeholderView("label") as unknown as DialogView;
  }

  createCompassView(preferences: UserPreferences, compassController: unknown): DialogView {
    return this.placeholderView("compass") as unknown as DialogView;
  }

  createObserverCameraView(preferences: UserPreferences, home3DAttributesController: unknown): DialogView {
    return this.placeholderView("observer-camera") as unknown as DialogView;
  }

  createHome3DAttributesView(preferences: UserPreferences, home3DAttributesController: unknown): DialogView {
    return this.placeholderView("home3d-attributes") as unknown as DialogView;
  }

  createTextureChoiceView(preferences: UserPreferences, textureChoiceController: unknown): TextureChoiceView {
    return this.placeholderView("texture-choice") as unknown as TextureChoiceView;
  }

  createBaseboardChoiceView(preferences: UserPreferences, baseboardChoiceController: unknown): View {
    return this.placeholderView("baseboard-choice");
  }

  createModelMaterialsView(preferences: UserPreferences, modelMaterialsController: unknown): View {
    return this.placeholderView("model-materials");
  }

  createPageSetupView(preferences: UserPreferences, pageSetupController: unknown): DialogView {
    return this.placeholderView("page-setup") as unknown as DialogView;
  }

  createPrintPreviewView(home: Home, preferences: UserPreferences, homeController: unknown, printPreviewController: unknown): DialogView {
    return this.placeholderView("print-preview") as unknown as DialogView;
  }

  createPhotoView(home: Home, preferences: UserPreferences, photoController: unknown): DialogView {
    return this.placeholderView("photo") as unknown as DialogView;
  }

  createPhotosView(home: Home, preferences: UserPreferences, photosController: unknown): DialogView {
    return this.placeholderView("photos") as unknown as DialogView;
  }

  createVideoView(home: Home, preferences: UserPreferences, videoController: unknown): DialogView {
    return this.placeholderView("video") as unknown as DialogView;
  }

  createHelpView(preferences: UserPreferences, helpController: unknown): HelpView {
    return this.placeholderView("help") as unknown as HelpView;
  }

  private placeholderView(name: string): View {
    const element = document.createElement("div");
    element.className = `sh-placeholder sh-${name}`;
    element.textContent = `${name} view (task pending)`;
    return new ElementView(element);
  }
}
