/*
 * HomeController3D.ts.ts
 *
 * Translated from Sweet Home 3D HomeController3D.java.java
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
