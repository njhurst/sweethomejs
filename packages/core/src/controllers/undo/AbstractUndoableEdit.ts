/**
 * AbstractUndoableEdit (port of javax.swing.undo.AbstractUndoableEdit, GPL v2+).
 * Base implementation of UndoableEdit.
 */
import type { UndoableEdit } from "./UndoableEdit.js";

export class AbstractUndoableEdit implements UndoableEdit {
  protected static readonly UNDO_NAME = "Undo";
  protected static readonly REDO_NAME = "Redo";

  private hasBeenDone = true;
  private alive = true;

  canUndo(): boolean {
    return this.alive && this.hasBeenDone;
  }

  canRedo(): boolean {
    return this.alive && !this.hasBeenDone;
  }

  undo(): void {
    if (!this.canUndo()) {
      throw new Error("Cannot undo");
    }
    this.hasBeenDone = false;
  }

  redo(): void {
    if (!this.canRedo()) {
      throw new Error("Cannot redo");
    }
    this.hasBeenDone = true;
  }

  die(): void {
    this.alive = false;
  }

  getPresentationName(): string {
    return "";
  }

  getUndoPresentationName(): string {
    return AbstractUndoableEdit.UNDO_NAME + " " + this.getPresentationName();
  }

  getRedoPresentationName(): string {
    return AbstractUndoableEdit.REDO_NAME + " " + this.getPresentationName();
  }

  isSignificant(): boolean {
    return true;
  }

  addEdit(anEdit: UndoableEdit): boolean {
    return false;
  }

  replaceEdit(anEdit: UndoableEdit): boolean {
    return false;
  }

  isInProgress(): boolean {
    return false;
  }
}
