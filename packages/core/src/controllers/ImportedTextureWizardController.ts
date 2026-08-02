/*
 * ImportedTextureWizardController.ts.ts
 *
 * Translated from Sweet Home 3D ImportedTextureWizardController.java.java
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
 * ImportedTextureWizardController (port of
 * com.eteks.sweethome3d.viewcontroller.ImportedTextureWizardController, GPL v2+).
 * Wizard that imports a texture into the textures catalog.
 */
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { WizardController, WizardControllerStepState } from "./WizardController.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { CatalogTexture } from "../io/CatalogClasses.js";
import { TexturesCategory, TexturesCatalog } from "../model/Catalogs.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Content } from "../model/Content.js";

export class ImportedTextureWizardController extends WizardController {
  private readonly contentManager: ContentManager | null;
  private readonly textureName: string | null;
  private readonly texture: CatalogTexture | null;
  private image: Content | null = null;
  private name = "";
  private category: TexturesCategory | null = null;
  private creator: string | null = null;
  private width = 0;
  private height = 0;

  constructor(preferences: UserPreferences, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(textureName: string, preferences: UserPreferences, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(texture: CatalogTexture, preferences: UserPreferences, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(
    textureNameOrPreferencesOrTexture: string | CatalogTexture | UserPreferences,
    preferencesOrViewFactory: UserPreferences | ViewFactory,
    viewFactoryOrContentManager?: ViewFactory | ContentManager | null,
    contentManager?: ContentManager | null,
  ) {
    if (typeof textureNameOrPreferencesOrTexture === "string") {
      super(preferencesOrViewFactory as UserPreferences, viewFactoryOrContentManager as ViewFactory);
      this.textureName = textureNameOrPreferencesOrTexture;
      this.texture = null;
    } else if (textureNameOrPreferencesOrTexture instanceof CatalogTexture) {
      super(preferencesOrViewFactory as UserPreferences, viewFactoryOrContentManager as ViewFactory);
      this.texture = textureNameOrPreferencesOrTexture;
      this.textureName = null;
    } else {
      super(textureNameOrPreferencesOrTexture, preferencesOrViewFactory as ViewFactory);
      this.texture = null;
      this.textureName = null;
    }
    this.contentManager = contentManager ?? null;
    this.setStepState(new TextureImageStepState(this));
  }

  getContentManager(): ContentManager | null {
    return this.contentManager;
  }

  setImage(image: Content | null): void {
    if (image !== this.image) {
      const oldImage = this.image;
      this.image = image;
      this.propertyChangeSupport.firePropertyChange("IMAGE", oldImage, image);
    }
  }

  getImage(): Content | null {
    return this.image;
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.propertyChangeSupport.firePropertyChange("NAME", oldName, name);
    }
  }

  getCategory(): TexturesCategory | null {
    return this.category;
  }

  setCategory(category: TexturesCategory | null): void {
    if (category !== this.category) {
      const oldCategory = this.category;
      this.category = category;
      this.propertyChangeSupport.firePropertyChange("CATEGORY", oldCategory, category);
    }
  }

  getCreator(): string | null {
    return this.creator;
  }

  setCreator(creator: string | null): void {
    if (creator !== this.creator) {
      const oldCreator = this.creator;
      this.creator = creator;
      this.propertyChangeSupport.firePropertyChange("CREATOR", oldCreator, creator);
    }
  }

  getWidth(): number {
    return this.width;
  }

  setWidth(width: number): void {
    if (width !== this.width) {
      const oldWidth = this.width;
      this.width = width;
      this.propertyChangeSupport.firePropertyChange("WIDTH", oldWidth, width);
    }
  }

  getHeight(): number {
    return this.height;
  }

  setHeight(height: number): void {
    if (height !== this.height) {
      const oldHeight = this.height;
      this.height = height;
      this.propertyChangeSupport.firePropertyChange("HEIGHT", oldHeight, height);
    }
  }

  isTextureNameValid(): boolean {
    return this.name.trim().length > 0;
  }

  finish(): void {
    const catalog = this.preferences.getTexturesCatalog();
    const category = this.category ?? new TexturesCategory("Miscellaneous");
    const texture = new CatalogTexture(this.textureName, this.name, this.image, this.width, this.height, this.creator);
    catalog.add(category, texture);
  }
}

abstract class ImportedTextureWizardStepState extends WizardControllerStepState {
  constructor(protected readonly controller: ImportedTextureWizardController) {
    super();
  }
}

class TextureImageStepState extends ImportedTextureWizardStepState {
  constructor(controller: ImportedTextureWizardController) {
    super(controller);
    this.setFirstStep(true);
    this.setLastStep(false);
    this.setNextStepEnabled(true);
  }

  override getView(): View {
    return {} as View;
  }

  override goToNextStep(): void {
    this.controller.setStepState(new TextureAttributesStepState(this.controller));
  }
}

class TextureAttributesStepState extends ImportedTextureWizardStepState {
  constructor(controller: ImportedTextureWizardController) {
    super(controller);
    this.setFirstStep(false);
    this.setLastStep(true);
    this.setNextStepEnabled(controller.isTextureNameValid());
  }

  override getView(): View {
    return {} as View;
  }
}
