/**
 * PlanController — forward declaration (full port in task 4.6).
 * Minimal surface needed by HomeController.
 */
import type { Controller } from "./Controller.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import type { Home } from "../model/Home.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Selectable } from "../model/Selectable.js";

export class PlanController implements Controller {
  constructor(
    readonly home: Home,
    readonly preferences: UserPreferences,
    readonly viewFactory: ViewFactory,
    readonly contentManager: ContentManager | null,
    readonly undoSupport: UndoableEditSupport | null,
  ) {}

  getView(): View {
    throw new Error("PlanController.getView not ported yet (task 4.6)");
  }

  /** Deletes items and posts an undoable edit. */
  deleteItems(items: Selectable[]): void {
    throw new Error("PlanController.deleteItems not ported yet (task 4.6)");
  }

  selectAll(): void {
    throw new Error("PlanController.selectAll not ported yet (task 4.6)");
  }
}
