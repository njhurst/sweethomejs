/*
 * PrintPreviewController.ts.ts
 *
 * Translated from Sweet Home 3D PrintPreviewController.java.java
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
 * PrintPreviewController (port of
 * com.eteks.sweethome3d.viewcontroller.PrintPreviewController, GPL v2+).
 * Displays the print preview of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { HomeController } from "./HomeController.js";
import { Home } from "../model/Home.js";
import type { UserPreferences } from "../model/UserPreferences.js";

export class PrintPreviewController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly homeController: HomeController;
  private printPreviewView: DialogView | null = null;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, homeController: HomeController) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.homeController = homeController;
  }

  getView(): DialogView {
    if (this.printPreviewView === null) {
      this.printPreviewView = this.viewFactory.createPrintPreviewView(this.home, this.preferences, this.homeController, this);
    }
    return this.printPreviewView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }
}
