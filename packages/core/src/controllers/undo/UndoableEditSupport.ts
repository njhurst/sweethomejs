/**
 * UndoableEditSupport (port of javax.swing.undo.UndoableEditSupport, GPL v2+).
 * Fires UndoableEdit events to listeners (typically an UndoManager).
 */
import type { UndoableEdit } from "./UndoableEdit.js";
import { CompoundEdit } from "./CompoundEdit.js";

export interface UndoableEditListener {
  undoableEditHappened(edit: UndoableEdit): void;
}

export class UndoableEditSupport {
  private readonly listeners: UndoableEditListener[] = [];
  private compoundEdit: CompoundEdit | null = null;
  private updateLevel = 0;
  private realSource: unknown;

  constructor(realSource: unknown = null) {
    this.realSource = realSource;
  }

  addUndoableEditListener(listener: UndoableEditListener): void {
    this.listeners.push(listener);
  }

  removeUndoableEditListener(listener: UndoableEditListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /** Starts grouping edits into a compound edit (re-entrant). */
  beginUpdate(): void {
    this.updateLevel++;
    if (this.compoundEdit === null) {
      this.compoundEdit = this.createCompoundEdit();
    }
  }

  /** Ends grouping; the compound edit is posted when the outermost ends. */
  endUpdate(): void {
    this.updateLevel--;
    if (this.updateLevel === 0) {
      const compound = this.compoundEdit;
      this.compoundEdit = null; // clear first so postEdit doesn't add to itself
      if (compound !== null) {
        compound.end();
        this.postEdit(compound);
      }
    }
  }

  /** Posts an edit, wrapping it in the current compound edit if one is in progress. */
  postEdit(edit: UndoableEdit): void {
    if (this.compoundEdit !== null) {
      this.compoundEdit.addEdit(edit);
    } else {
      this._postEdit(edit);
    }
  }

  protected createCompoundEdit(): CompoundEdit {
    return new CompoundEdit();
  }

  protected _postEdit(edit: UndoableEdit): void {
    for (const listener of [...this.listeners]) {
      listener.undoableEditHappened(edit);
    }
  }
}

/** The undo support seam controllers use (UndoableEditSupport implements it). */
export interface UndoSupport {
  addUndoableEditListener(listener: UndoableEditListener): void;
  removeUndoableEditListener(listener: UndoableEditListener): void;
  postEdit(edit: UndoableEdit): void;
}
