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
