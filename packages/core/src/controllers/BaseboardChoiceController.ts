/*
 * BaseboardChoiceController.ts.ts
 *
 * Translated from Sweet Home 3D BaseboardChoiceController.java.java
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
 * BaseboardChoiceController (port of
 * com.eteks.sweethome3d.viewcontroller.BaseboardChoiceController, GPL v2+).
 * Lets the user choose a baseboard for a wall side.
 */
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { HomeTexture } from "../model/HomeTexture.js";
import { TextureChoiceController } from "./TextureChoiceController.js";
import type { UserPreferences } from "../model/UserPreferences.js";


export class BaseboardChoiceController {
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly contentManager: ContentManager | null;
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private baseboardView: View | null = null;
  private textureController: TextureChoiceController | null = null;
  private visible: boolean | null = null;
  private thickness: number | null = null;
  private height: number | null = null;
  private color: number | null = null;
  private paint: BaseboardChoiceController.BaseboardPaint | null = null;

  constructor(preferences: UserPreferences, viewFactory: ViewFactory, contentManager: ContentManager | null = null) {
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.contentManager = contentManager;
  }

  getTextureController(): TextureChoiceController {
    if (this.textureController === null) {
      this.textureController = new TextureChoiceController(
        this.preferences.getLocalizedString(BaseboardChoiceController, "baseboardTextureTitle"),
        this.preferences, this.viewFactory, this.contentManager,
      );
      this.textureController.addPropertyChangeListener("TEXTURE", {
        propertyChange: () => this.setPaint(BaseboardChoiceController.BaseboardPaint.TEXTURED),
      });
    }
    return this.textureController;
  }

  getView(): View {
    if (this.baseboardView === null) {
      this.baseboardView = this.viewFactory.createBaseboardChoiceView(this.preferences, this);
    }
    return this.baseboardView;
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  getVisible(): boolean | null {
    return this.visible;
  }

  setVisible(baseboardVisible: boolean | null): void {
    if (baseboardVisible !== this.visible) {
      const oldVisible = this.visible;
      this.visible = baseboardVisible;
      this.propertyChangeSupport.firePropertyChange("VISIBLE", oldVisible, baseboardVisible);
    }
  }

  getThickness(): number | null {
    return this.thickness;
  }

  setThickness(thickness: number | null): void {
    if (thickness !== this.thickness) {
      const oldThickness = this.thickness;
      this.thickness = thickness;
      this.propertyChangeSupport.firePropertyChange("THICKNESS", oldThickness, thickness);
    }
  }

  getHeight(): number | null {
    return this.height;
  }

  setHeight(height: number | null): void {
    if (height !== this.height) {
      const oldHeight = this.height;
      this.height = height;
      this.propertyChangeSupport.firePropertyChange("HEIGHT", oldHeight, height);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.propertyChangeSupport.firePropertyChange("COLOR", oldColor, color);
    }
  }

  getPaint(): BaseboardChoiceController.BaseboardPaint | null {
    return this.paint;
  }

  setPaint(paint: BaseboardChoiceController.BaseboardPaint | null): void {
    if (paint !== this.paint) {
      const oldPaint = this.paint;
      this.paint = paint;
      this.propertyChangeSupport.firePropertyChange("PAINT", oldPaint, paint);
    }
  }

  getTexture(): HomeTexture | null {
    return this.getTextureController().getTexture();
  }
}


export namespace BaseboardChoiceController {
  export enum BaseboardPaint {
    DEFAULT = "DEFAULT",
    COLORED = "COLORED",
    TEXTURED = "TEXTURED",
  }
}
