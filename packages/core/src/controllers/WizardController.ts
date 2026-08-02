/*
 * WizardController.ts.ts
 *
 * Translated from Sweet Home 3D WizardController.java.java
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
 * WizardController (port of com.eteks.sweethome3d.viewcontroller.WizardController, GPL v2+).
 * Base class of multi-step wizard controllers.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import type { UserPreferences } from "../model/UserPreferences.js";


export class WizardController {
  protected readonly preferences: UserPreferences;
  protected readonly viewFactory: ViewFactory;
  protected readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private wizardView: DialogView | null = null;
  private stepState: WizardControllerStepState | null = null;
  private backStepEnabled = false;
  private nextStepEnabled = false;
  private lastStep = false;
  private stepView: View | null = null;
  private stepIcon: string | null = null;
  private title: string | null = null;
  private resizable = false;

  constructor(preferences: UserPreferences, viewFactory: ViewFactory) {
    this.preferences = preferences;
    this.viewFactory = viewFactory;
  }

  getView(): DialogView {
    if (this.wizardView === null) {
      this.wizardView = this.viewFactory.createWizardView(this.preferences, this);
    }
    return this.wizardView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: WizardController.Property | string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property as string, listener);
  }

  removePropertyChangeListener(property: WizardController.Property | string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property as string, listener);
  }

  private setBackStepEnabled(backStepEnabled: boolean): void {
    if (backStepEnabled !== this.backStepEnabled) {
      this.backStepEnabled = backStepEnabled;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.BACK_STEP_ENABLED, !backStepEnabled, backStepEnabled);
    }
  }

  isBackStepEnabled(): boolean {
    return this.backStepEnabled;
  }

  private setNextStepEnabled(nextStepEnabled: boolean): void {
    if (nextStepEnabled !== this.nextStepEnabled) {
      this.nextStepEnabled = nextStepEnabled;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.NEXT_STEP_ENABLED, !nextStepEnabled, nextStepEnabled);
    }
  }

  isNextStepEnabled(): boolean {
    return this.nextStepEnabled;
  }

  private setLastStep(lastStep: boolean): void {
    if (lastStep !== this.lastStep) {
      this.lastStep = lastStep;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.LAST_STEP, !lastStep, lastStep);
    }
  }

  isLastStep(): boolean {
    return this.lastStep;
  }

  private setStepView(stepView: View): void {
    if (stepView !== this.stepView) {
      const oldStepView = this.stepView;
      this.stepView = stepView;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.STEP_VIEW, oldStepView, stepView);
    }
  }

  getStepView(): View | null {
    return this.stepView;
  }

  private setStepIcon(stepIcon: string | null): void {
    if (stepIcon !== this.stepIcon) {
      const oldStepIcon = this.stepIcon;
      this.stepIcon = stepIcon;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.STEP_ICON, oldStepIcon, stepIcon);
    }
  }

  getStepIcon(): string | null {
    return this.stepIcon;
  }

  setTitle(title: string | null): void {
    if (title !== this.title) {
      const oldTitle = this.title;
      this.title = title;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.TITLE, oldTitle, title);
    }
  }

  getTitle(): string | null {
    return this.title;
  }

  setResizable(resizable: boolean): void {
    if (resizable !== this.resizable) {
      this.resizable = resizable;
      this.propertyChangeSupport.firePropertyChange(WizardController.Property.RESIZABLE, !resizable, resizable);
    }
  }

  isResizable(): boolean {
    return this.resizable;
  }

  setStepState(stepState: WizardControllerStepState): void {
    this.stepState?.exit();
    this.stepState = stepState;
    this.setBackStepEnabled(!stepState.isFirstStep());
    this.setNextStepEnabled(stepState.isNextStepEnabled());
    this.setStepView(stepState.getView());
    this.setStepIcon(stepState.getIcon());
    this.setLastStep(stepState.isLastStep());
    stepState.enter();
  }

  protected getStepState(): WizardControllerStepState | null {
    return this.stepState;
  }

  goToNextStep(): void {
    this.stepState?.goToNextStep();
  }

  goBackToPreviousStep(): void {
    this.stepState?.goBackToPreviousStep();
  }

  /** True if this controller displays the last step of a wizard. */
  isLastStepOfWizard(): boolean {
    return this.stepState?.isLastStep() ?? false;
  }
}

/** The state of a wizard step. */
export abstract class WizardControllerStepState {
  private firstStep = true;
  private lastStep = false;
  private nextStepEnabled = true;

  enter(): void {}
  exit(): void {}
  abstract getView(): View;
  getIcon(): string | null {
    return null;
  }
  goBackToPreviousStep(): void {}
  goToNextStep(): void {}
  isFirstStep(): boolean {
    return this.firstStep;
  }
  setFirstStep(firstStep: boolean): void {
    this.firstStep = firstStep;
  }
  isLastStep(): boolean {
    return this.lastStep;
  }
  setLastStep(lastStep: boolean): void {
    this.lastStep = lastStep;
  }
  isNextStepEnabled(): boolean {
    return this.nextStepEnabled;
  }
  setNextStepEnabled(nextStepEnabled: boolean): void {
    this.nextStepEnabled = nextStepEnabled;
  }
}


export namespace WizardController {
  export enum Property {
    BACK_STEP_ENABLED = "BACK_STEP_ENABLED",
    NEXT_STEP_ENABLED = "NEXT_STEP_ENABLED",
    LAST_STEP = "LAST_STEP",
    STEP_VIEW = "STEP_VIEW",
    STEP_ICON = "STEP_ICON",
    TITLE = "TITLE",
    RESIZABLE = "RESIZABLE",
  }
}
