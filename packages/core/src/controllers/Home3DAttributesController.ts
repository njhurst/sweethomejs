/*
 * Home3DAttributesController.ts.ts
 *
 * Translated from Sweet Home 3D Home3DAttributesController.java.java
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
 * Home3DAttributesController (port of
 * com.eteks.sweethome3d.viewcontroller.Home3DAttributesController, GPL v2+).
 * Edits the 3D rendering attributes of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { HomeTexture } from "../model/HomeTexture.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";


export class Home3DAttributesController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private home3DAttributesView: DialogView | null = null;
  private groundColor = 0;
  private groundPaint = Home3DAttributesController.Paint.COLORED;
  private groundTexture: HomeTexture | null = null;
  private backgroundImageVisibleOnGround3D = true;
  private skyColor = 0;
  private skyPaint = Home3DAttributesController.Paint.COLORED;
  private skyTexture: HomeTexture | null = null;
  private lightColor = 0;
  private wallsAlpha = 0;
  private wallsTopColor: number | null = null;

  constructor(
    home: Home,
    preferences: UserPreferences,
    viewFactory: ViewFactory,
    contentManager: ContentManager | null = null,
    undoSupport: UndoableEditSupport | null = null,
  ) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.home3DAttributesView === null) {
      this.home3DAttributesView = this.viewFactory.createHome3DAttributesView(this.preferences, this);
    }
    return this.home3DAttributesView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  protected updateProperties(): void {
    const environment = this.home.getEnvironment();
    this.setGroundColor(environment.getGroundColor());
    this.setGroundPaint(environment.getGroundTexture() !== null ? Home3DAttributesController.Paint.TEXTURED : Home3DAttributesController.Paint.COLORED);
    this.setGroundTexture(environment.getGroundTexture());
    this.setBackgroundImageVisibleOnGround3D(environment.isBackgroundImageVisibleOnGround3D());
    this.setSkyColor(environment.getSkyColor());
    this.setSkyPaint(environment.getSkyTexture() !== null ? Home3DAttributesController.Paint.TEXTURED : Home3DAttributesController.Paint.COLORED);
    this.setSkyTexture(environment.getSkyTexture());
    this.setLightColor(environment.getLightColor());
    this.setWallsAlpha(environment.getWallsAlpha());

  }

  getGroundColor(): number {
    return this.groundColor;
  }

  setGroundColor(groundColor: number): void {
    if (groundColor !== this.groundColor) {
      const oldGroundColor = this.groundColor;
      this.groundColor = groundColor;
      this.propertyChangeSupport.firePropertyChange("GROUND_COLOR", oldGroundColor, groundColor);
    }
  }

  getGroundPaint(): Home3DAttributesController.Paint {
    return this.groundPaint;
  }

  setGroundPaint(groundPaint: Home3DAttributesController.Paint): void {
    if (groundPaint !== this.groundPaint) {
      const oldGroundPaint = this.groundPaint;
      this.groundPaint = groundPaint;
      this.propertyChangeSupport.firePropertyChange("GROUND_PAINT", oldGroundPaint, groundPaint);
    }
  }

  getGroundTexture(): HomeTexture | null {
    return this.groundTexture;
  }

  setGroundTexture(groundTexture: HomeTexture | null): void {
    if (groundTexture !== this.groundTexture) {
      const oldGroundTexture = this.groundTexture;
      this.groundTexture = groundTexture;
      this.propertyChangeSupport.firePropertyChange("GROUND_PAINT", oldGroundTexture, groundTexture);
    }
  }

  isBackgroundImageVisibleOnGround3D(): boolean {
    return this.backgroundImageVisibleOnGround3D;
  }

  setBackgroundImageVisibleOnGround3D(visible: boolean): void {
    if (visible !== this.backgroundImageVisibleOnGround3D) {
      this.backgroundImageVisibleOnGround3D = visible;
      this.propertyChangeSupport.firePropertyChange("BACKGROUND_IMAGE_VISIBLE_ON_GROUND_3D", !visible, visible);
    }
  }

  getSkyColor(): number {
    return this.skyColor;
  }

  setSkyColor(skyColor: number): void {
    if (skyColor !== this.skyColor) {
      const oldSkyColor = this.skyColor;
      this.skyColor = skyColor;
      this.propertyChangeSupport.firePropertyChange("SKY_COLOR", oldSkyColor, skyColor);
    }
  }

  getSkyPaint(): Home3DAttributesController.Paint {
    return this.skyPaint;
  }

  setSkyPaint(skyPaint: Home3DAttributesController.Paint): void {
    if (skyPaint !== this.skyPaint) {
      const oldSkyPaint = this.skyPaint;
      this.skyPaint = skyPaint;
      this.propertyChangeSupport.firePropertyChange("SKY_PAINT", oldSkyPaint, skyPaint);
    }
  }

  getSkyTexture(): HomeTexture | null {
    return this.skyTexture;
  }

  setSkyTexture(skyTexture: HomeTexture | null): void {
    if (skyTexture !== this.skyTexture) {
      const oldSkyTexture = this.skyTexture;
      this.skyTexture = skyTexture;
      this.propertyChangeSupport.firePropertyChange("SKY_PAINT", oldSkyTexture, skyTexture);
    }
  }

  getLightColor(): number {
    return this.lightColor;
  }

  setLightColor(lightColor: number): void {
    if (lightColor !== this.lightColor) {
      const oldLightColor = this.lightColor;
      this.lightColor = lightColor;
      this.propertyChangeSupport.firePropertyChange("LIGHT_COLOR", oldLightColor, lightColor);
    }
  }

  getWallsAlpha(): number {
    return this.wallsAlpha;
  }

  setWallsAlpha(wallsAlpha: number): void {
    if (wallsAlpha !== this.wallsAlpha) {
      const oldWallsAlpha = this.wallsAlpha;
      this.wallsAlpha = wallsAlpha;
      this.propertyChangeSupport.firePropertyChange("WALLS_ALPHA", oldWallsAlpha, wallsAlpha);
    }
  }

  modifyHome3DAttributes(): void {
    const environment = this.home.getEnvironment();
    const oldState = {
      groundColor: environment.getGroundColor(),
      groundTexture: environment.getGroundTexture(),
      backgroundImageVisibleOnGround3D: environment.isBackgroundImageVisibleOnGround3D(),
      skyColor: environment.getSkyColor(),
      skyTexture: environment.getSkyTexture(),
      lightColor: environment.getLightColor(),
      wallsAlpha: environment.getWallsAlpha(),

    };
    const newState = {
      groundColor: this.getGroundColor(),
      groundTexture: this.getGroundPaint() === Home3DAttributesController.Paint.TEXTURED ? this.getGroundTexture() : null,
      backgroundImageVisibleOnGround3D: this.isBackgroundImageVisibleOnGround3D(),
      skyColor: this.getSkyColor(),
      skyTexture: this.getSkyPaint() === Home3DAttributesController.Paint.TEXTURED ? this.getSkyTexture() : null,
      lightColor: this.getLightColor(),
      wallsAlpha: this.getWallsAlpha(),

    };
    const apply = (state: typeof newState): void => {
      environment.setGroundColor(state.groundColor);
      environment.setGroundTexture(state.groundTexture);
      environment.setBackgroundImageVisibleOnGround3D(state.backgroundImageVisibleOnGround3D);
      environment.setSkyColor(state.skyColor);
      environment.setSkyTexture(state.skyTexture);
      environment.setLightColor(state.lightColor);
      environment.setWallsAlpha(state.wallsAlpha);

    };
    apply(newState);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(this.preferences, Home3DAttributesController, "undoModifyHome3DAttributesName", apply, oldState, newState),
      );
    }
  }
}


export namespace Home3DAttributesController {
  export enum Paint {
    COLORED = "COLORED",
    TEXTURED = "TEXTURED",
    BACKGROUND_IMAGE = "BACKGROUND_IMAGE",
  }
}
