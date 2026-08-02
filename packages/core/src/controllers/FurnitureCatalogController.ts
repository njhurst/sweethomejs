/*
 * FurnitureCatalogController.ts.ts
 *
 * Translated from Sweet Home 3D FurnitureCatalogController.java.java
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
 * FurnitureCatalogController (port of
 * com.eteks.sweethome3d.viewcontroller.FurnitureCatalogController, GPL v2+).
 * Controls the furniture catalog view and its selection.
 */
import type { Controller } from "./Controller.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { FurnitureCatalog } from "../model/Catalogs.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { CatalogPieceOfFurniture } from "../io/CatalogClasses.js";

export class FurnitureCatalogController implements Controller {
  private readonly catalog: FurnitureCatalog;
  private readonly preferences: UserPreferences | null;
  private readonly viewFactory: ViewFactory;
  private readonly contentManager: ContentManager | null;
  private readonly selectionListeners: Array<(ev: unknown) => void> = [];
  private selectedFurniture: CatalogPieceOfFurniture[] = [];
  private catalogView: View | null = null;

  constructor(catalog: FurnitureCatalog, viewFactory: ViewFactory);
  constructor(catalog: FurnitureCatalog, preferences: UserPreferences | null, viewFactory: ViewFactory, contentManager: ContentManager | null);
  constructor(
    readonly catalog_: FurnitureCatalog,
    readonly preferencesOrViewFactory_: UserPreferences | null | ViewFactory,
    readonly viewFactory_?: ViewFactory,
    readonly contentManager_: ContentManager | null = null,
  ) {
    this.catalog = catalog_;
    if (arguments.length === 2) {
      // (catalog, viewFactory) form
      this.preferences = null;
      this.viewFactory = preferencesOrViewFactory_ as ViewFactory;
    } else {
      this.preferences = preferencesOrViewFactory_ as UserPreferences | null;
      this.viewFactory = viewFactory_!;
    }
    this.contentManager = contentManager_;

    this.catalog.addFurnitureListener((event) => {
      if ((event as { type?: string }).type === "DELETE") {
        this.deselectPieceOfFurniture((event as { item?: unknown }).item as CatalogPieceOfFurniture);
      }
    });
    if (this.preferences !== null) {
      this.preferences.addPropertyChangeListener((evt) => {
        const propertyName = (evt as { propertyName?: string }).propertyName;
        if (propertyName === UserPreferences.Property.FURNITURE_CATALOG_VIEWED_IN_TREE) {
          this.catalogView = null;
        }
      });
    }
  }

  getView(): View {
    if (this.catalogView === null) {
      this.catalogView = this.viewFactory.createFurnitureCatalogView(this.catalog, this.preferences!, this);
    }
    return this.catalogView;
  }

  addSelectionListener(listener: (ev: unknown) => void): void {
    this.selectionListeners.push(listener);
  }

  removeSelectionListener(listener: (ev: unknown) => void): void {
    const index = this.selectionListeners.indexOf(listener);
    if (index !== -1) {
      this.selectionListeners.splice(index, 1);
    }
  }

  getSelectedFurniture(): CatalogPieceOfFurniture[] {
    return [...this.selectedFurniture];
  }

  setSelectedFurniture(selectedFurniture: CatalogPieceOfFurniture[]): void {
    this.selectedFurniture = [...selectedFurniture];
    if (this.selectionListeners.length > 0) {
      const event = { source: this, selectedItems: this.getSelectedFurniture() };
      for (const listener of [...this.selectionListeners]) {
        listener(event);
      }
    }
  }

  private deselectPieceOfFurniture(piece: CatalogPieceOfFurniture): void {
    const pieceSelectionIndex = this.selectedFurniture.indexOf(piece);
    if (pieceSelectionIndex !== -1) {
      const selectedItems = [...this.getSelectedFurniture()];
      selectedItems.splice(pieceSelectionIndex, 1);
      this.setSelectedFurniture(selectedItems);
    }
  }

  modifySelectedFurniture(): void {
    if (this.preferences !== null && this.selectedFurniture.length > 0) {
      const piece = this.selectedFurniture[0]!;
      if ((piece as unknown as { isModifiable?: () => boolean }).isModifiable?.() ?? false) {
        // ImportedFurnitureWizardController ported in task 4.5
        throw new Error("ImportedFurnitureWizardController not ported yet");
      }
    }
  }

  deleteSelection(): void {
    if (this.selectedFurniture.length > 0) {
      const pieces = [...this.selectedFurniture];
      for (const piece of pieces) {
        this.catalog.delete(piece);
      }
    }
  }
}
