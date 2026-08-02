/*
 * PageSetupController.ts.ts
 *
 * Translated from Sweet Home 3D PageSetupController.java.java
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
 * PageSetupController (port of com.eteks.sweethome3d.viewcontroller.PageSetupController, GPL v2+).
 * Edits the page setup of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { Home } from "../model/Home.js";
import { HomePrint } from "../model/HomePrint.js";
import type { UserPreferences } from "../model/UserPreferences.js";

export class PageSetupController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private pageSetupView: DialogView | null = null;
  private print!: HomePrint;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.print = home.getPrint() ?? new HomePrint(
      HomePrint.PaperOrientation.PORTRAIT, 21, 29.7, 1, 1, 1, 1, true, true, [], true, null, null, null,
    );
  }

  getView(): DialogView {
    if (this.pageSetupView === null) {
      this.pageSetupView = this.viewFactory.createPageSetupView(this.preferences, this);
    }
    return this.pageSetupView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  getPrint(): HomePrint {
    return this.print;
  }

  setPrint(print: HomePrint): void {
    if (print !== this.print) {
      const oldPrint = this.print;
      this.print = print;
      this.propertyChangeSupport.firePropertyChange("PRINT", oldPrint, print);
    }
  }

  modifyPrint(): void {
    const oldPrint = this.home.getPrint();
    const newPrint = this.getPrint();
    this.home.setPrint(newPrint);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit({
        canUndo: () => true,
        canRedo: () => true,
        undo: () => this.home.setPrint(oldPrint),
        redo: () => this.home.setPrint(newPrint),
        getPresentationName: () => this.preferences.getLocalizedString(PageSetupController, "undoModifyPrintName"),
        getUndoPresentationName: () => "Undo " + this.preferences.getLocalizedString(PageSetupController, "undoModifyPrintName"),
        getRedoPresentationName: () => "Redo " + this.preferences.getLocalizedString(PageSetupController, "undoModifyPrintName"),
        isSignificant: () => true,
        addEdit: () => false,
        replaceEdit: () => false,
        isInProgress: () => false,
        die: () => {},
      });
    }
  }
}
