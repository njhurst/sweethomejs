/**
 * UndoManager (port of javax.swing.undo.UndoManager, GPL v2+).
 * Maintains a stack of undoable edits and dispatches undo/redo.
 */
import type { UndoableEdit } from "./UndoableEdit.js";
import type { UndoableEditListener } from "./UndoableEditSupport.js";

export class UndoManager implements UndoableEditListener {
  private readonly edits: UndoableEdit[] = [];
  private indexOfNextAdd = 0;

  undoableEditHappened(edit: UndoableEdit): void {
    // Discard edits after the current position (redo branch)
    this.edits.length = this.indexOfNextAdd;
    this.edits.push(edit);
    this.indexOfNextAdd = this.edits.length;
  }

  canUndo(): boolean {
    return this.indexOfNextAdd > 0 && this.edits[this.indexOfNextAdd - 1]!.canUndo();
  }

  canRedo(): boolean {
    return this.indexOfNextAdd < this.edits.length && this.edits[this.indexOfNextAdd]!.canRedo();
  }

  undo(): void {
    if (this.canUndo()) {
      const edit = this.edits[this.indexOfNextAdd - 1]!;
      edit.undo();
      this.indexOfNextAdd--;
      this.discardDeadEdits();
    } else {
      throw new Error("Cannot undo");
    }
  }

  redo(): void {
    if (this.canRedo()) {
      const edit = this.edits[this.indexOfNextAdd]!;
      edit.redo();
      this.indexOfNextAdd++;
      this.discardDeadEdits();
    } else {
      throw new Error("Cannot redo");
    }
  }

  /** The name shown for the undo command, or null when nothing to undo. */
  getUndoPresentationName(): string | null {
    if (!this.canUndo()) {
      return null;
    }
    return this.edits[this.indexOfNextAdd - 1]!.getUndoPresentationName();
  }

  /** The name shown for the redo command, or null when nothing to redo. */
  getRedoPresentationName(): string | null {
    if (!this.canRedo()) {
      return null;
    }
    return this.edits[this.indexOfNextAdd]!.getRedoPresentationName();
  }

  discardAllEdits(): void {
    for (const edit of this.edits) {
      edit.die();
    }
    this.edits.length = 0;
    this.indexOfNextAdd = 0;
  }

  private discardDeadEdits(): void {
    while (this.edits.length > 0) {
      const last = this.edits[this.edits.length - 1]!;
      if (last.isInProgress()) {
        this.edits.pop();
        last.die();
      } else {
        break;
      }
    }
  }
}


