/*
 * TextureChoiceController.ts.ts
 *
 * Translated from Sweet Home 3D TextureChoiceController.java.java
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
 * TextureChoiceController (port of
 * com.eteks.sweethome3d.viewcontroller.TextureChoiceController, GPL v2+).
 * Lets the user choose a texture.
 */
import type { TextureChoiceView } from "./TextureChoiceView.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { HomeTexture } from "../model/HomeTexture.js";
import type { UserPreferences } from "../model/UserPreferences.js";

export class TextureChoiceController {
  private readonly title: string | null;
  private readonly fitAreaText: string | null;
  private readonly rotationSupported: boolean;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly contentManager: ContentManager | null;
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private textureChoiceView: TextureChoiceView | null = null;
  private texture: HomeTexture | null = null;

  constructor(title: string | null, preferences: UserPreferences, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(title: string | null, rotationSupported: boolean, preferences: UserPreferences, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(
    title: string | null,
    rotationSupportedOrPreferences: boolean | UserPreferences,
    preferencesOrViewFactory: UserPreferences | ViewFactory,
    viewFactoryOrContentManager: ViewFactory | ContentManager | null = null,
    contentManager: ContentManager | null = null,
  ) {
    this.title = title;
    if (typeof rotationSupportedOrPreferences === "boolean") {
      this.rotationSupported = rotationSupportedOrPreferences;
      this.fitAreaText = null;
      this.preferences = preferencesOrViewFactory as UserPreferences;
      this.viewFactory = viewFactoryOrContentManager as ViewFactory;
      this.contentManager = contentManager;
    } else {
      this.rotationSupported = true;
      this.fitAreaText = null;
      this.preferences = rotationSupportedOrPreferences;
      this.viewFactory = preferencesOrViewFactory as ViewFactory;
      this.contentManager = viewFactoryOrContentManager as ContentManager | null;
    }
  }

  getView(): TextureChoiceView {
    if (this.textureChoiceView === null) {
      this.textureChoiceView = this.viewFactory.createTextureChoiceView(this.preferences, this);
    }
    return this.textureChoiceView;
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  setTexture(texture: HomeTexture | null): void {
    if (texture !== this.texture && (texture === null || !texture.equals(this.texture))) {
      const oldTexture = this.texture;
      this.texture = texture;
      this.propertyChangeSupport.firePropertyChange("TEXTURE", oldTexture, texture);
    }
  }

  getTexture(): HomeTexture | null {
    return this.texture;
  }
}
