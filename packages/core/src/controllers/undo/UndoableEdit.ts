/**
 * UndoableEdit interface (port of javax.swing.undo.UndoableEdit, GPL v2+).
 * An edit represents an operation that can be undone/redone.
 */
export interface UndoableEdit {
  /** True if the edit can be undone. */
  canUndo(): boolean;
  /** True if the edit can be redone. */
  canRedo(): boolean;
  /** Undoes the edit. */
  undo(): void;
  /** Redoes the edit. */
  redo(): void;
  /** The human-readable name of the edit. */
  getPresentationName(): string;
  /** The name shown for the "undo" command. */
  getUndoPresentationName(): string;
  /** The name shown for the "redo" command. */
  getRedoPresentationName(): string;
  /** True if the edit is significant (worth keeping in the undo history). */
  isSignificant(): boolean;
  /** Adds the given edit to this one (compound edits). */
  addEdit(anEdit: UndoableEdit): boolean;
  /** Replaces this edit by the given one. */
  replaceEdit(anEdit: UndoableEdit): boolean;
  /** True if this edit died (e.g. was discarded by the undo manager). */
  isInProgress(): boolean;
  /** Called when the edit should no longer be used. */
  die(): void;
}
