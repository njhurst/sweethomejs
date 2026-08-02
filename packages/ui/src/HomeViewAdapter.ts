/*
 * HomeViewAdapter.ts
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
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
 */

/**
 * HomeViewAdapter (task 7.1): a no-op implementation of the core HomeView
 * interface that satisfies the HomeController's action-enablement calls. The
 * HomePane provides the actual UI; this adapter receives setEnabled() calls
 * the controller makes (undo/redo names, action states).
 */
import type { View } from "@sweethomejs/core";
import { HomeView } from "@sweethomejs/core";
import type { Camera } from "@sweethomejs/core";

export class HomeViewAdapter implements HomeView {
  private readonly enabled = new Map<HomeView.ActionType, boolean>();
  undoText: string | null = null;
  redoText: string | null = null;
  /** Called when an action's enabled state changes. */
  onActionStateChange: ((action: string, enabled: boolean) => void) | null = null;
  /** Called when the undo/redo names change. */
  onUndoRedoNameChange: ((undoText: string | null, redoText: string | null) => void) | null = null;

  isActionEnabled(actionType: HomeView.ActionType): boolean {
    return this.enabled.get(actionType) ?? false;
  }

  setEnabled(actionType: HomeView.ActionType, enabled: boolean): void {
    this.enabled.set(actionType, enabled);
    this.onActionStateChange?.(actionType, enabled);
  }

  setActionEnabled(actionKey: string, enabled: boolean): void {
    this.enabled.set(actionKey as HomeView.ActionType, enabled);
    this.onActionStateChange?.(actionKey, enabled);
  }

  setUndoRedoName(undoText: string | null, redoText: string | null): void {
    this.undoText = undoText;
    this.redoText = redoText;
    this.onUndoRedoNameChange?.(undoText, redoText);
  }

  setTransferEnabled(enabled: boolean): void {}
  detachView(view: View): void {}
  attachView(view: View): void {}
  showOpenDialog(): string | null {
    return null;
  }
  confirmOpenDamagedHome(homeName: string, homeModified: boolean): HomeView.OpenDamagedHomeAnswer {
    return HomeView.OpenDamagedHomeAnswer.DO_NOT_OPEN_HOME;
  }
  showNewHomeFromExampleDialog(): string | null {
    return null;
  }
  showImportLanguageLibraryDialog(): string | null {
    return null;
  }
  confirmReplaceLanguageLibrary(languageLibraryName: string): boolean {
    return false;
  }
  showImportFurnitureLibraryDialog(): string | null {
    return null;
  }
  confirmReplaceFurnitureLibrary(furnitureLibraryName: string): boolean {
    return false;
  }
  showImportTexturesLibraryDialog(): string | null {
    return null;
  }
  confirmReplaceTexturesLibrary(texturesLibraryName: string): boolean {
    return false;
  }
  confirmReplacePlugin(pluginName: string): boolean {
    return false;
  }
  showSaveDialog(homeName: string | null): string | null {
    return null;
  }
  confirmSave(homeName: string): HomeView.SaveAnswer {
    return HomeView.SaveAnswer.CANCEL;
  }
  confirmSaveNewerHome(homeName: string): boolean {
    return true;
  }
  confirmDeleteCatalogSelection(): boolean {
    return false;
  }
  confirmExit(): boolean {
    return false;
  }
  showError(message: string): void {
    console.error(message);
  }
  showMessage(message: string): void {
    console.info(message);
  }
  showActionTipMessage(actionTipKey: string): boolean {
    return false;
  }
  showAboutDialog(): void {}
  showPrintDialog(): (() => void) | null {
    return null;
  }
  showPrintToPDFDialog(homeName: string): string | null {
    return null;
  }
  printToPDF(pdfFile: string): void {}
  showExportToCSVDialog(name: string): string | null {
    return null;
  }
  exportToCSV(csvName: string): void {}
  showExportToSVGDialog(name: string): string | null {
    return null;
  }
  exportToSVG(svgName: string): void {}
  showExportToOBJDialog(homeName: string): string | null {
    return null;
  }
  exportToOBJ(objFile: string): void {}
  showStoreCameraDialog(cameraName: string): string | null {
    return null;
  }
  showDeletedCamerasDialog(): Camera[] {
    return [];
  }
  isClipboardEmpty(): boolean {
    return true;
  }
}
