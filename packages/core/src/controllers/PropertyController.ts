/*
 * PropertyController.ts.ts
 *
 * Translated from Sweet Home 3D PropertyController.java.java
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
 * Shared plumbing for dialog controllers (task 4.4): property-change
 * propagation and generic undoable edits, mirroring the per-property
 * boilerplate of the Java controllers.
 */
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { LocalizedUndoableEdit } from "./LocalizedUndoableEdit.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import type { UserPreferences } from "../model/UserPreferences.js";

/** Fires property changes keyed by a string property name (like Java's Property enums). */
export class PropertyChangeSupportByString {
  private readonly support = new PropertyChangeSupport(this);

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.support.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.support.removePropertyChangeListener(property, listener);
  }

  firePropertyChange(property: string, oldValue: unknown, newValue: unknown): void {
    this.support.firePropertyChange(property, oldValue, newValue);
  }
}

/**
 * A generic undoable edit that applies an old/new model state (Java defines a
 * dedicated inner edit class per controller; the semantics are identical).
 */
export class ObjectUndoableEdit<T> extends LocalizedUndoableEdit {
  constructor(
    preferences: UserPreferences,
    controllerClass: unknown,
    presentationNameKey: string,
    private readonly apply: (state: T) => void,
    private readonly oldState: T,
    private readonly newState: T,
  ) {
    super(preferences, controllerClass, presentationNameKey);
  }

  override undo(): void {
    super.undo();
    this.apply(this.oldState);
  }

  override redo(): void {
    super.redo();
    this.apply(this.newState);
  }
}

/** Post-edit helper: applies the new state and posts the edit to undo support. */
export function postEdit<T>(
  undoSupport: UndoableEditSupport | null,
  apply: (state: T) => void,
  oldState: T,
  newState: T,
  preferences: UserPreferences,
  controllerClass: unknown,
  presentationNameKey: string,
): void {
  if (undoSupport === null) {
    return;
  }
  apply(newState);
  undoSupport.postEdit(new ObjectUndoableEdit(preferences, controllerClass, presentationNameKey, apply, oldState, newState));
}
