/*
 * BackgroundImageWizardController.ts.ts
 *
 * Translated from Sweet Home 3D BackgroundImageWizardController.java.java
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
 * BackgroundImageWizardController (port of
 * com.eteks.sweethome3d.viewcontroller.BackgroundImageWizardController, GPL v2+).
 * Wizard that sets the background image of a home.
 */
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { WizardController, WizardControllerStepState } from "./WizardController.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { BackgroundImage } from "../model/BackgroundImage.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Content } from "../model/Content.js";

export class BackgroundImageWizardController extends WizardController {
  private readonly home: Home;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly contentManager: ContentManager | null;
  private referenceBackgroundImage: BackgroundImage | null = null;
  private image: Content | null = null;
  private scaleDistance: number | null = null;
  private scaleDistancePoints: number[][] | null = null;
  private xOrigin = 0;
  private yOrigin = 0;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, contentManager: ContentManager | null = null, undoSupport: UndoableEditSupport | null = null) {
    super(preferences, viewFactory);
    this.home = home;
    this.contentManager = contentManager;
    this.undoSupport = undoSupport;
    this.setStepState(new ImageChoiceStepState(this));
  }

  getContentManager(): ContentManager | null {
    return this.contentManager;
  }

  getReferenceBackgroundImage(): BackgroundImage | null {
    return this.referenceBackgroundImage;
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

  setScaleDistance(scaleDistance: number | null): void {
    if (scaleDistance !== this.scaleDistance) {
      const oldScaleDistance = this.scaleDistance;
      this.scaleDistance = scaleDistance;
      this.propertyChangeSupport.firePropertyChange("SCALE_DISTANCE", oldScaleDistance, scaleDistance);
    }
  }

  getScaleDistance(): number | null {
    return this.scaleDistance;
  }

  setScaleDistancePoints(scaleDistanceXStart: number, scaleDistanceYStart: number, scaleDistanceXEnd: number, scaleDistanceYEnd: number): void {
    this.scaleDistancePoints = [[scaleDistanceXStart, scaleDistanceYStart], [scaleDistanceXEnd, scaleDistanceYEnd]];
    this.propertyChangeSupport.firePropertyChange("SCALE_DISTANCE_POINTS", null, this.scaleDistancePoints);
  }

  getScaleDistancePoints(): number[][] | null {
    return this.scaleDistancePoints;
  }

  setOrigin(xOrigin: number, yOrigin: number): void {
    if (xOrigin !== this.xOrigin || yOrigin !== this.yOrigin) {
      this.xOrigin = xOrigin;
      this.yOrigin = yOrigin;
      this.propertyChangeSupport.firePropertyChange("ORIGIN", null, [xOrigin, yOrigin]);
    }
  }

  getXOrigin(): number {
    return this.xOrigin;
  }

  getYOrigin(): number {
    return this.yOrigin;
  }

  finish(): void {
    const backgroundImage = this.home.getBackgroundImage();
    const oldBackgroundImage = backgroundImage;
    const newBackgroundImage = new BackgroundImage(
      this.getImage() ?? backgroundImage?.getImage() ?? null,
      this.getScaleDistance() ?? backgroundImage?.getScaleDistance() ?? 1,
      backgroundImage?.getScaleDistanceXStart() ?? 0,
      backgroundImage?.getScaleDistanceYStart() ?? 0,
      backgroundImage?.getScaleDistanceXEnd() ?? 1,
      backgroundImage?.getScaleDistanceYEnd() ?? 1,
      this.getXOrigin(),
      this.getYOrigin(),
      backgroundImage?.isVisible() ?? true,
    );
    const apply = (state: BackgroundImage): void => this.home.setBackgroundImage(state);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit<BackgroundImage | null>(this.preferences, BackgroundImageWizardController, "undoImportBackgroundImageName", apply as (s: BackgroundImage | null) => void, oldBackgroundImage, newBackgroundImage),
      );
    } else {
      apply(newBackgroundImage);
    }
  }
}

abstract class BackgroundImageWizardStepState extends WizardControllerStepState {
  constructor(protected readonly controller: BackgroundImageWizardController) {
    super();
  }
}

class ImageChoiceStepState extends BackgroundImageWizardStepState {
  constructor(controller: BackgroundImageWizardController) {
    super(controller);
    this.setFirstStep(true);
    this.setLastStep(false);
    this.setNextStepEnabled(true);
  }

  override getView(): View {
    return {} as View;
  }

  override goToNextStep(): void {
    this.controller.setStepState(new ImageScaleStepState(this.controller));
  }
}

class ImageScaleStepState extends BackgroundImageWizardStepState {
  constructor(controller: BackgroundImageWizardController) {
    super(controller);
    this.setFirstStep(false);
    this.setLastStep(false);
    this.setNextStepEnabled(true);
  }

  override getView(): View {
    return {} as View;
  }

  override goToNextStep(): void {
    this.controller.setStepState(new ImageOriginStepState(this.controller));
  }
}

class ImageOriginStepState extends BackgroundImageWizardStepState {
  constructor(controller: BackgroundImageWizardController) {
    super(controller);
    this.setFirstStep(false);
    this.setLastStep(true);
    this.setNextStepEnabled(true);
  }

  override getView(): View {
    return {} as View;
  }
}
