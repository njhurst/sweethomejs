/*
 * ImportedFurnitureWizardStepsView.ts.ts
 *
 * Translated from Sweet Home 3D ImportedFurnitureWizardStepsView.java.java
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
