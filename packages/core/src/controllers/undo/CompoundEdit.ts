/**
 * CompoundEdit (port of javax.swing.undo.CompoundEdit, GPL v2+).
 * A compound edit groups a sequence of edits into one.
 */
import { AbstractUndoableEdit } from "./AbstractUndoableEdit.js";
import type { UndoableEdit } from "./UndoableEdit.js";

export class CompoundEdit extends AbstractUndoableEdit {
  protected readonly edits: UndoableEdit[] = [];
  private inProgress = true;

  /** Starts a new compound edit. */
  begin(): void {
    this.inProgress = true;
  }

  /** Ends the compound edit (no more edits can be added). */
  end(): void {
    if (this.inProgress) {
      this.inProgress = false;
    }
  }

  override addEdit(anEdit: UndoableEdit): boolean {
    if (!this.inProgress) {
      return false;
    }
    this.edits.push(anEdit);
    return true;
  }

  // Java's CompoundEdit.canUndo/canRedo only check the compound's own state
  override canUndo(): boolean {
    return !this.isInProgress() && super.canUndo();
  }

  override canRedo(): boolean {
    return !this.isInProgress() && super.canRedo();
  }

  override undo(): void {
    if (!this.canUndo()) {
      throw new Error("Cannot undo compound edit");
    }
    for (let i = this.edits.length - 1; i >= 0; i--) {
      this.edits[i]!.undo();
    }
    super.undo();
  }

  override redo(): void {
    if (!this.canRedo()) {
      throw new Error("Cannot redo compound edit");
    }
    for (const edit of this.edits) {
      edit.redo();
    }
    super.redo();
  }

  override die(): void {
    for (const edit of this.edits) {
      edit.die();
    }
    super.die();
  }

  override isInProgress(): boolean {
    return this.inProgress;
  }

  override isSignificant(): boolean {
    return this.edits.some((edit) => edit.isSignificant());
  }

  getEdits(): UndoableEdit[] {
    return [...this.edits];
  }
}
