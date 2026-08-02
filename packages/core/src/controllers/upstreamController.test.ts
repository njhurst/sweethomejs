/*
 * upstreamController.test.ts.ts
 *
 * Translated from Sweet Home 3D upstreamController.test.java.java
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
 * Upstream-derived controller tests (task 4.9): ports the key flows of the
 * upstream PlanControllerTest/HomeControllerTest with a mock view — wall
 * creation with joining, deletion, mode switching, furniture grouping via
 * HomeController, undo/redo through the HomeController.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { Wall } from "../model/Wall.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { HomeFurnitureGroup } from "../model/HomeFurnitureGroup.js";
import { PlanController } from "./PlanController.js";
import { HomeView } from "./HomeView.js";
import { HomeController } from "./HomeController.js";
import { PlanView } from "./PlanView.js";
import { UserPreferences } from "../model/UserPreferences.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { View } from "./View.js";

class MockPlanView implements PlanView {
  scale = 1;
  xOffset = 0;
  yOffset = 0;
  cursor: PlanView.CursorType | null = null;
  feedback: number[] | null = null;
  resizeIndicatorVisible = false;

  setRectangleFeedback(x0: number, y0: number, x1: number, y1: number): void {
    this.feedback = [x0, y0, x1, y1];
  }
  makeSelectionVisible(): void {}
  makePointVisible(x: number, y: number): void {}
  getScale(): number {
    return this.scale;
  }
  setScale(scale: number): void {
    this.scale = scale;
  }
  getPrintPreferredScale(preferredWidth: number, preferredHeight: number): number {
    return 1;
  }
  moveView(dx: number, dy: number): void {
    this.xOffset += dx;
    this.yOffset += dy;
  }
  convertXPixelToModel(x: number): number {
    return (x - this.xOffset) / this.scale;
  }
  convertYPixelToModel(y: number): number {
    return (y - this.yOffset) / this.scale;
  }
  convertXModelToScreen(x: number): number {
    return x * this.scale + this.xOffset;
  }
  convertYModelToScreen(y: number): number {
    return y * this.scale + this.yOffset;
  }
  getPixelLength(): number {
    return 1 / this.scale;
  }
  getTextBounds(text: string, style: unknown, x: number, y: number): number[][] {
    return [[x, y]];
  }
  setCursor(cursorType: PlanView.CursorType): void {
    this.cursor = cursorType;
  }
  setToolTipFeedback(toolTipFeedback: string | null, x: number, y: number): void {}
  setToolTipEditedProperties(toolTipEditedProperties: unknown[] | null, toolTipText: string): void {}
  setToolTipEditedPropertyValue(toolTipEditedProperty: unknown, toolTipEditedPropertyValue: number): void {}
  deleteToolTipFeedback(): void {}
  setResizeIndicatorVisible(resizeIndicatorVisible: boolean): void {
    this.resizeIndicatorVisible = resizeIndicatorVisible;
  }
  setAlignmentFeedback(alignedObjectClass: unknown, alignmentX: number, alignmentY: number, deltaX: number, deltaY: number): void {}
  setAngleFeedback(xCenter: number, yCenter: number, angle: number, length: number): void {}
  setDraggedItemsFeedback(draggedItems: unknown[]): void {}
  setDimensionLinesFeedback(dimensionLines: unknown[]): void {}
  deleteFeedback(): void {
    this.feedback = null;
  }
  getHorizontalRuler(): View {
    return {} as View;
  }
  getVerticalRuler(): View {
    return {} as View;
  }
  canImportDraggedItems(items: unknown[], x: number, y: number): boolean {
    return false;
  }
  getPieceOfFurnitureSizeInPlan(piece: HomePieceOfFurniture): number[] {
    return [];
  }
  isFurnitureSizeInPlanSupported(): boolean {
    return false;
  }
  createTransferData(dataType: unknown): unknown {
    return null;
  }
  isFormatTypeSupported(formatType: unknown): boolean {
    return false;
  }
  exportData(out: unknown, formatType: unknown, settings: unknown): Promise<void> {
    return Promise.resolve();
  }
}

const mockViewFactory: ViewFactory = {
  createPlanView: () => new MockPlanView(),
  createHomeView: () => new (class implements HomeView {
    enabled = new Map<string, boolean>();
    setEnabled(actionType: string, enabled: boolean): void { this.enabled.set(actionType, enabled); }
    setActionEnabled(actionKey: string, enabled: boolean): void {}
    setUndoRedoName(undoText: string | null, redoText: string | null): void {}
    setTransferEnabled(enabled: boolean): void {}
    detachView(view: View): void {}
    attachView(view: View): void {}
    showOpenDialog(): string | null { return null; }
    confirmOpenDamagedHome(homeName: string, homeModified: boolean): HomeView.OpenDamagedHomeAnswer { return HomeView.OpenDamagedHomeAnswer.DO_NOT_OPEN_HOME; }
    showNewHomeFromExampleDialog(): string | null { return null; }
    showImportLanguageLibraryDialog(): string | null { return null; }
    confirmReplaceLanguageLibrary(languageLibraryName: string): boolean { return false; }
    showImportFurnitureLibraryDialog(): string | null { return null; }
    confirmReplaceFurnitureLibrary(furnitureLibraryName: string): boolean { return false; }
    showImportTexturesLibraryDialog(): string | null { return null; }
    confirmReplaceTexturesLibrary(texturesLibraryName: string): boolean { return false; }
    confirmReplacePlugin(pluginName: string): boolean { return false; }
    showSaveDialog(homeName: string | null): string | null { return null; }
    confirmSave(homeName: string): HomeView.SaveAnswer { return HomeView.SaveAnswer.CANCEL; }
    confirmSaveNewerHome(homeName: string): boolean { return true; }
    confirmDeleteCatalogSelection(): boolean { return false; }
    confirmExit(): boolean { return false; }
    showError(message: string): void {}
    showMessage(message: string): void {}
    showActionTipMessage(actionTipKey: string): boolean { return false; }
    showAboutDialog(): void {}
    showPrintDialog(): (() => void) | null { return null; }
    showPrintToPDFDialog(homeName: string): string | null { return null; }
    printToPDF(pdfFile: string): void {}
    showExportToCSVDialog(name: string): string | null { return null; }
    exportToCSV(csvName: string): void {}
    showExportToSVGDialog(name: string): string | null { return null; }
    exportToSVG(svgName: string): void {}
    showExportToOBJDialog(homeName: string): string | null { return null; }
    exportToOBJ(objFile: string): void {}
    showStoreCameraDialog(cameraName: string): string | null { return null; }
    showDeletedCamerasDialog() { return []; }
    isClipboardEmpty(): boolean { return true; }
  })(),
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createView3D: () => ({}) as never,
  createWizardView: () => ({}) as never,
  createBackgroundImageWizardStepsView: () => ({}) as never,
  createImportedFurnitureWizardStepsView: () => ({}) as never,
  createImportedTextureWizardStepsView: () => ({}) as never,
  createThreadedTaskView: () => ({}) as never,
  createUserPreferencesView: () => ({}) as never,
  createLevelView: () => ({}) as never,
  createHomeFurnitureView: () => ({}) as never,
  createWallView: () => ({}) as never,
  createRoomView: () => ({}) as never,
  createPolylineView: () => ({}) as never,
  createDimensionLineView: () => ({}) as never,
  createLabelView: () => ({}) as never,
  createCompassView: () => ({}) as never,
  createObserverCameraView: () => ({}) as never,
  createHome3DAttributesView: () => ({}) as never,
  createTextureChoiceView: () => ({}) as never,
  createBaseboardChoiceView: () => ({}) as never,
  createModelMaterialsView: () => ({}) as never,
  createPageSetupView: () => ({}) as never,
  createPrintPreviewView: () => ({}) as never,
  createPhotoView: () => ({}) as never,
  createPhotosView: () => ({}) as never,
  createVideoView: () => ({}) as never,
  createHelpView: () => ({}) as never,
};

function wallPoints(wall: Wall): string {
  return `${wall.getXStart()},${wall.getYStart()},${wall.getXEnd()},${wall.getYEnd()}`;
}

describe("Upstream controller test port (task 4.9)", () => {
  it("PlanControllerTest: draws three joined walls, then deletes the selection", () => {
    const home = new Home();
    const preferences = new UserPreferences();
    const planController = new PlanController(home, preferences, mockViewFactory, null, null);
    planController.getView();

    // Set WALL_CREATION mode
    planController.setMode(PlanController.Mode.WALL_CREATION);
    expect(planController.getMode()).toBe(PlanController.Mode.WALL_CREATION);

    // Draw a first wall: click at (20, 20)
    planController.moveMouse(20, 20);
    planController.pressMouse(20, 20, 1, false, false);
    planController.releaseMouse(20, 20);
    // Draw its end at (500, 20)
    planController.moveMouse(500, 20);
    planController.pressMouse(500, 20, 1, false, false);
    planController.releaseMouse(500, 20);
    // Second wall from (500, 20) to (500, 300)
    planController.moveMouse(500, 300);
    planController.pressMouse(500, 300, 1, false, false);
    planController.releaseMouse(500, 300);
    // Third wall from (500, 300) to (20, 300), then double-click to finish
    planController.moveMouse(20, 300);
    planController.pressMouse(20, 300, 1, false, false);
    planController.releaseMouse(20, 300);
    planController.pressMouse(20, 300, 2, false, false);
    planController.releaseMouse(20, 300);

    // Expect three walls at the corner coordinates, joined end to end
    const walls = home.getWalls();
    expect(walls.length).toBeGreaterThanOrEqual(3);
    const wall1 = walls.find((w) => wallPoints(w) === "20,20,500,20");
    const wall2 = walls.find((w) => wallPoints(w) === "500,20,500,300");
    const wall3 = walls.find((w) => wallPoints(w) === "500,300,20,300");
    expect(wall1).toBeDefined();
    expect(wall2).toBeDefined();
    expect(wall3).toBeDefined();
    // wall2 starts at wall1's end
    expect(wall2!.getWallAtStart()).toBe(wall1);
    expect(wall1!.getWallAtEnd()).toBe(wall2);
    expect(wall3!.getWallAtStart()).toBe(wall2);
    expect(wall2!.getWallAtEnd()).toBe(wall3);

    // Switch to selection mode and delete the selection
    planController.setMode(PlanController.Mode.SELECTION);
    expect(planController.getMode()).toBe(PlanController.Mode.SELECTION);
    planController.deleteSelection();
    expect(home.getWalls().length).toBe(0);
  });

  it("PlanControllerTest: a wall drawn from a wall end joins to it", () => {
    const home = new Home();
    const planController = new PlanController(home, new UserPreferences(), mockViewFactory, null, null);
    planController.getView();
    planController.setMode(PlanController.Mode.WALL_CREATION);

    planController.moveMouse(20, 20);
    planController.pressMouse(20, 20, 1, false, false);
    planController.releaseMouse(20, 20);
    planController.moveMouse(500, 20);
    planController.pressMouse(500, 20, 1, false, false);
    planController.releaseMouse(500, 20);
    // Draw a wall starting at (500, 20) — the end of the first wall
    planController.moveMouse(500, 300);
    planController.pressMouse(500, 300, 1, false, false);
    planController.releaseMouse(500, 300);
    planController.pressMouse(500, 300, 2, false, false);
    planController.releaseMouse(500, 300);

    const walls = home.getWalls();
    const wall1 = walls.find((w) => wallPoints(w) === "20,20,500,20");
    const wall2 = walls.find((w) => wallPoints(w) === "500,20,500,300");
    expect(wall1).toBeDefined();
    expect(wall2).toBeDefined();
    // The second wall starts at the first wall's end and joins it
    expect(wall2!.getWallAtStart()).toBe(wall1);
    expect(wall1!.getWallAtEnd()).toBe(wall2);
  });

  it("HomeControllerTest: undo/redo through the master controller", () => {
    const home = new Home();
    const controller = new HomeController(home, new UserPreferences(), mockViewFactory);
    controller.getView();

    // Add furniture through the furniture controller (posts an undoable edit)
    const piece = new HomePieceOfFurniture("piece", {
      getName: () => "Chair",
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => 50,
      getHeight: () => 80,
      getWidth: () => 40,
      getElevation: () => 0,
      getDropOnTopElevation: () => 1,
      isMovable: () => true,
      isDoorOrWindow: () => false,
      getIcon: () => null,
      getPlanIcon: () => null,
      getModel: () => null,
      getModelFlags: () => 0,
      getModelSize: () => null,
      getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null,
      getCreator: () => null,
      isBackFaceShown: () => false,
      getColor: () => null,
      isResizable: () => true,
      isDeformable: () => true,
      isWidthDepthDeformable: () => true,
      isTexturable: () => true,
      isHorizontallyRotatable: () => true,
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => null,
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    } as never);
    controller.getFurnitureController().addFurniture([piece]);
    expect(home.getFurniture().length).toBe(1);

    controller.undo();
    expect(home.getFurniture().length).toBe(0);
    controller.redo();
    expect(home.getFurniture().length).toBe(1);
  });

  it("HomeControllerTest: grouping selected furniture (upstream group flow)", () => {
    const home = new Home();
    const controller = new HomeController(home, new UserPreferences(), mockViewFactory);
    const furnitureController = controller.getFurnitureController();

    const a = new HomePieceOfFurniture("a", {
      getName: () => "A", getDescription: () => null, getInformation: () => null, getLicense: () => null,
      getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
      isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
      getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
      isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
      isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
      getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    } as never);
    const b = new HomePieceOfFurniture("b", {
      getName: () => "B", getDescription: () => null, getInformation: () => null, getLicense: () => null,
      getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
      isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
      getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
      isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
      isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
      getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    } as never);
    a.setX(0);
    a.setY(0);
    b.setX(200);
    b.setY(0);
    furnitureController.addFurniture([a, b]);
    furnitureController.setSelectedFurniture([a, b]);
    furnitureController.groupSelectedFurniture();

    expect(home.getFurniture().length).toBe(1);
    expect(home.getFurniture()[0]).toBeInstanceOf(HomeFurnitureGroup);
  });
});
