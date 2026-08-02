/**
 * Controller interface (port of com.eteks.sweethome3d.viewcontroller.Controller, GPL v2+).
 * An MVC controller.
 */
import type { View } from "./View.js";

export interface Controller {
  getView(): View;
}
