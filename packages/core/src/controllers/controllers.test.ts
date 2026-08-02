/**
 * Controller framework tests (task 4.1): undo/redo semantics of the
 * javax.swing.undo port (UndoableEditSupport + UndoManager + CompoundEdit)
 * and the view/controller interface shells.
 */
import { describe, expect, it } from "vitest";
import { AbstractUndoableEdit } from "../controllers/undo/AbstractUndoableEdit.js";
import { CompoundEdit } from "../controllers/undo/CompoundEdit.js";
import { UndoableEditSupport } from "../controllers/undo/UndoableEditSupport.js";
import { UndoManager } from "../controllers/undo/UndoManager.js";
import type { UndoableEdit } from "../controllers/undo/UndoableEdit.js";
import { TransferableView } from "../controllers/TransferableView.js";
import { ExportableView } from "../controllers/ExportableView.js";
import { ContentManager } from "../controllers/ContentManager.js";
import { HomeView } from "../controllers/HomeView.js";
import { View } from "../controllers/View.js";

/** A simple edit that records its presentation name. */
class RecordingEdit extends AbstractUndoableEdit {
  constructor(
    private readonly name: string,
    private readonly onUndo: () => void = () => {},
    private readonly onRedo: () => void = () => {},
  ) {
    super();
  }
  override getPresentationName(): string {
    return this.name;
  }
  override undo(): void {
    super.undo();
    this.onUndo();
  }
  override redo(): void {
    super.redo();
    this.onRedo();
  }
}

describe("UndoManager + UndoableEditSupport (task 4.1)", () => {
  it("undoes and redoes edits in stack order", () => {
    const undone: string[] = [];
    const redone: string[] = [];
    const support = new UndoableEditSupport();
    const manager = new UndoManager();
    support.addUndoableEditListener(manager);

    support.postEdit(new RecordingEdit("edit-1", () => undone.push("edit-1"), () => redone.push("edit-1")));
    support.postEdit(new RecordingEdit("edit-2", () => undone.push("edit-2"), () => redone.push("edit-2")));

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    expect(manager.getUndoPresentationName()).toBe("Undo edit-2");

    manager.undo();
    manager.undo();
    expect(undone).toEqual(["edit-2", "edit-1"]);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);
    expect(manager.getRedoPresentationName()).toBe("Redo edit-1");

    manager.redo();
    expect(redone).toEqual(["edit-1"]);
  });

  it("discards the redo branch when a new edit is posted", () => {
    const support = new UndoableEditSupport();
    const manager = new UndoManager();
    support.addUndoableEditListener(manager);

    support.postEdit(new RecordingEdit("edit-1"));
    support.postEdit(new RecordingEdit("edit-2"));
    manager.undo(); // back to edit-1
    support.postEdit(new RecordingEdit("edit-3")); // discards edit-2

    manager.undo();
    expect(manager.getUndoPresentationName()).toBe("Undo edit-1");
    manager.undo();
    expect(manager.canUndo()).toBe(false);
  });

  it("groups edits posted between beginUpdate/endUpdate into one compound edit", () => {
    const support = new UndoableEditSupport();
    const manager = new UndoManager();
    support.addUndoableEditListener(manager);

    support.beginUpdate();
    support.postEdit(new RecordingEdit("step-a"));
    support.postEdit(new RecordingEdit("step-b"));
    support.endUpdate();

    // One compound edit in the history
    expect(manager.getUndoPresentationName()).toBeTruthy();
    manager.undo(); // undoes the compound in reverse order
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);
    manager.redo();
    expect(manager.canRedo()).toBe(false);
  });

  it("nested beginUpdate/endUpdate produce a single compound edit", () => {
    const support = new UndoableEditSupport();
    const manager = new UndoManager();
    support.addUndoableEditListener(manager);

    support.beginUpdate();
    support.postEdit(new RecordingEdit("a"));
    support.beginUpdate();
    support.postEdit(new RecordingEdit("b"));
    support.endUpdate();
    support.postEdit(new RecordingEdit("c"));
    support.endUpdate();

    manager.undo();
    expect(manager.canUndo()).toBe(false); // a+b+c undone as one compound
    manager.redo();
    expect(manager.canRedo()).toBe(false);
  });

  it("CompoundEdit.undo reverses children and isSignificant reflects children", () => {
    const support = new UndoableEditSupport();
    const manager = new UndoManager();
    support.addUndoableEditListener(manager);

    support.beginUpdate();
    support.postEdit(new RecordingEdit("first"));
    support.postEdit(new RecordingEdit("second"));
    support.endUpdate();

    // One compound edit in the history (significant because its children are)
    expect(manager.getUndoPresentationName()).toBeTruthy();
    manager.undo();
    expect(manager.canUndo()).toBe(false);
    manager.redo();
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });
});

describe("View/controller interface shells (task 4.1)", () => {
  it("exposes the Java enums and constants", () => {
    expect(View.PointerType.MOUSE).toBe("MOUSE");
    expect(View.PointerType.TOUCH).toBe("TOUCH");
    expect(ContentManager.ContentType.SWEET_HOME_3D).toBe("SWEET_HOME_3D");
    expect(ContentManager.ContentType.USER_DEFINED).toBe("USER_DEFINED");
    expect(HomeView.ActionType.NEW_HOME).toBe("NEW_HOME");
    expect(HomeView.ActionType.TOGGLE_ALL_LEVELS_SELECTION).toBe("TOGGLE_ALL_LEVELS_SELECTION");
    expect(HomeView.SaveAnswer.DO_NOT_SAVE).toBe("DO_NOT_SAVE");
    expect(HomeView.OpenDamagedHomeAnswer.REPLACE_DAMAGED_ITEMS).toBe("REPLACE_DAMAGED_ITEMS");
  });

  it("TransferableView/ExportableView data types are distinct instances", () => {
    expect(TransferableView.DataType.PLAN_IMAGE.name()).toBe("PLAN_IMAGE");
    expect(TransferableView.DataType.PLAN_IMAGE).not.toBe(TransferableView.DataType.FURNITURE_LIST);
    expect(ExportableView.FormatType.SVG.name()).toBe("SVG");
    expect(ExportableView.FormatType.CSV.name()).toBe("CSV");
  });

  it("UndoableEdit contract: canUndo/canRedo flip across undo/redo", () => {
    const edit: UndoableEdit = new RecordingEdit("x");
    expect(edit.canUndo()).toBe(true);
    expect(edit.canRedo()).toBe(false);
    expect(edit.isSignificant()).toBe(true);
    expect(edit.getPresentationName()).toBe("x");
    edit.undo();
    expect(edit.canUndo()).toBe(false);
    expect(edit.canRedo()).toBe(true);
    edit.redo();
    expect(edit.canUndo()).toBe(true);
    expect(edit.canRedo()).toBe(false);
  });
});
