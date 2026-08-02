/**
 * HelpView interface (port of com.eteks.sweethome3d.viewcontroller.HelpView, GPL v2+).
 * A view that displays Sweet Home 3D help.
 */
import type { View } from "./View.js";

export interface HelpView extends View {
  /** Displays the help window. */
  displayView(): void;
}
