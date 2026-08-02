/**
 * DialogView interface (port of com.eteks.sweethome3d.viewcontroller.DialogView, GPL v2+).
 * A view displayed as a modal dialog.
 */
import type { View } from "./View.js";

export interface DialogView extends View {
  /** Displays the dialog over the given parent view (modal). */
  displayView(parentView: View): void;
}
