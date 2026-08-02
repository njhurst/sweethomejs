/*
 * LocalizedUndoableEdit.ts.ts
 *
 * Translated from Sweet Home 3D LocalizedUndoableEdit.java.java
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
 * LocalizedUndoableEdit (port of
 * com.eteks.sweethome3d.viewcontroller.LocalizedUndoableEdit, GPL v2+).
 * An undoable edit with a localized presentation name.
 */
import { AbstractUndoableEdit } from "./undo/AbstractUndoableEdit.js";
import type { UserPreferences } from "../model/UserPreferences.js";

export class LocalizedUndoableEdit extends AbstractUndoableEdit {
  constructor(
    private readonly preferences: UserPreferences,
    private readonly controllerClass: unknown,
    private readonly presentationNameKey: string,
  ) {
    super();
  }

  override getPresentationName(): string {
    return this.preferences.getLocalizedString(this.controllerClass, this.presentationNameKey);
  }
}
