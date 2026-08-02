/**
 * ImportedFurnitureWizardStepsView (port of
 * com.eteks.sweethome3d.viewcontroller.ImportedFurnitureWizardStepsView, GPL v2+).
 */
import type { View } from "./View.js";
import type { Content } from "../model/Content.js";

export interface ImportedFurnitureWizardStepsView extends View {
  /** Returns the icon chosen by the user, or null. */
  getIcon(): Content | null;
  /** Returns the plan icon chosen by the user, or null. */
  getPlanIcon(): Content | null;
  /** Returns the model chosen by the user, or null. */
  getModel(): Content | null;
}
