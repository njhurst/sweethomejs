/**
 * HomeController3D — forward declaration (full port in task 4.3).
 * Minimal surface needed by HomeController.
 */
import type { Controller } from "./Controller.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import type { Home } from "../model/Home.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PlanController } from "./PlanController.js";

export class HomeController3D implements Controller {
  constructor(
    readonly home: Home,
    readonly planController: PlanController,
    readonly preferences: UserPreferences,
    readonly viewFactory: ViewFactory,
    readonly contentManager: ContentManager | null,
    readonly undoSupport: UndoableEditSupport | null,
  ) {}

  getView(): View {
    throw new Error("HomeController3D.getView not ported yet (task 4.3)");
  }
}
