/*
 * ModelMaterialsController.ts.ts
 *
 * Translated from Sweet Home 3D ModelMaterialsController.java.java
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
 * ModelMaterialsController (port of
 * com.eteks.sweethome3d.viewcontroller.ModelMaterialsController, GPL v2+).
 * Edits the materials of a furniture model.
 */
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { HomeMaterial } from "../model/HomeMaterial.js";
import { TextureChoiceController } from "./TextureChoiceController.js";
import type { UserPreferences } from "../model/UserPreferences.js";

export class ModelMaterialsController {
  private readonly model: string | null;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly contentManager: ContentManager | null;
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private modelMaterialsView: View | null = null;
  private textureController: TextureChoiceController | null = null;
  private materials: HomeMaterial[] | null = null;

  constructor(model: string | null, preferences: UserPreferences, viewFactory: ViewFactory, contentManager: ContentManager | null = null) {
    this.model = model;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.contentManager = contentManager;
  }

  getView(): View {
    if (this.modelMaterialsView === null) {
      this.modelMaterialsView = this.viewFactory.createModelMaterialsView(this.preferences, this);
    }
    return this.modelMaterialsView;
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  getModel(): string | null {
    return this.model;
  }

  getMaterials(): HomeMaterial[] | null {
    return this.materials;
  }

  setMaterials(materials: HomeMaterial[] | null): void {
    if (materials !== this.materials) {
      const oldMaterials = this.materials;
      this.materials = materials;
      this.propertyChangeSupport.firePropertyChange("MATERIALS", oldMaterials, materials);
    }
  }
}
