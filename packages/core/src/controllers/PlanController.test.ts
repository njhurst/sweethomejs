/*
 * PlanController.test.ts.ts
 *
 * Translated from Sweet Home 3D PlanController.test.java.java
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
 * PlanController tests (task 4.6): state machine, mode switching, selection
 * by click and rectangle, panning.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { Wall } from "../model/Wall.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { PlanController } from "./PlanController.js";
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
  createHomeView: () => ({}) as never,
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

function makeController(home: Home): PlanController {
  return new PlanController(home, new UserPreferences(), mockViewFactory, null, null);
}

describe("PlanController (task 4.6)", () => {
  it("defaults to selection mode", () => {
    const controller = makeController(new Home());
    expect(controller.getMode()).toBe(PlanController.Mode.SELECTION);
    expect(controller.isModificationState()).toBe(false);
  });

  it("switches modes and fires property changes", () => {
    const home = new Home();
    const controller = makeController(home);
    let modeChanged: PlanController.Mode | null = null;
    controller.addPropertyChangeListener(PlanController.Property.MODE, {
      propertyChange: (evt) => {
        modeChanged = evt.newValue as PlanController.Mode;
      },
    });
    controller.setMode(PlanController.Mode.WALL_CREATION);
    expect(controller.getMode()).toBe(PlanController.Mode.WALL_CREATION);
    expect(modeChanged).toBe(PlanController.Mode.WALL_CREATION);
    expect(controller.isModificationState()).toBe(true);
    controller.setMode(PlanController.Mode.SELECTION);
    expect(controller.getMode()).toBe(PlanController.Mode.SELECTION);
  });

  it("selects a wall on click", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 100, 0, 10, 250);
    home.addWall(wall);
    const controller = makeController(home);
    controller.getView(); // create the view (scale 1, offset 0)
    controller.pressMouse(50, 0, 1, false, false, false, false, null);
    expect(home.getSelectedItems()).toContain(wall);
  });

  it("rectangle-selects furniture", () => {
    const home = new Home();
    const piece = (name: string, x: number, y: number): HomePieceOfFurniture => {
      const p = new HomePieceOfFurniture("piece-" + name, {
        getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
        getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
        isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
        getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
        isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
        isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
        getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
      } as never);
      p.setX(x);
      p.setY(y);
      return p;
    };
    const a = piece("A", 300, 0);
    const b = piece("B", 500, 0);
    home.addPieceOfFurniture(a);
    home.addPieceOfFurniture(b);
    const controller = makeController(home);
    controller.getView();
    // Drag a rectangle covering A only (model coords 250..350 × -50..50)
    controller.pressMouse(250, -50, 1, false, false, false, false, null);
    controller.moveMouse(350, 50);
    controller.releaseMouse(350, 50);
    expect(home.getSelectedItems()).toEqual([a]);
  });

  it("moves selected items via keyboard nudge", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 100, 0, 10, 250);
    home.addWall(wall);
    home.setSelectedItems([wall]);
    const controller = makeController(home);
    controller.getView();
    controller.moveSelection(10, 0);
    expect(wall.getXStart()).toBe(10);
    expect(wall.getXEnd()).toBe(110);
  });

  it("pans the view in panning mode", () => {
    const home = new Home();
    const controller = makeController(home);
    const view = controller.getView() as MockPlanView;
    controller.setMode(PlanController.Mode.PANNING);
    controller.pressMouse(0, 0, 1, false, false, false, false, null);
    controller.moveMouse(30, 40);
    controller.releaseMouse(30, 40);
    expect(view.xOffset).toBe(30);
    expect(view.yOffset).toBe(40);
  });

  it("creates a wall by clicking twice in wall creation mode", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.getView();
    controller.setMode(PlanController.Mode.WALL_CREATION);
    expect(controller.getMode()).toBe(PlanController.Mode.WALL_CREATION);
    // First click enters drawing state
    controller.pressMouse(0, 0, 1, false, false, false, false, null);
    controller.moveMouse(100, 0);
    // Second click completes the wall (a wall exists with the drawn extent)
    controller.pressMouse(100, 0, 1, false, false, false, false, null);
    expect(home.getWalls().length).toBeGreaterThanOrEqual(1);
    const wall = home.getWalls()[0]!;
    expect(wall.getXStart()).toBe(0);
    expect(wall.getYStart()).toBe(0);
    expect(wall.getXEnd()).toBeCloseTo(100, 4);
  });

  it("creates a room by double-clicking after adding points", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.getView();
    controller.setMode(PlanController.Mode.ROOM_CREATION);
    controller.pressMouse(0, 0, 1, false, false, false, false, null);
    controller.pressMouse(100, 0, 1, false, false, false, false, null);
    controller.pressMouse(100, 100, 1, false, false, false, false, null);
    controller.pressMouse(0, 0, 2, false, false, false, false, null);
    expect(home.getRooms().length).toBe(1);
    expect(home.getRooms()[0]!.getPointCount()).toBeGreaterThanOrEqual(3);
  });

  it("creates a label with a single click in label creation mode", () => {
    const home = new Home();
    const controller = makeController(home);
    controller.getView();
    controller.setMode(PlanController.Mode.LABEL_CREATION);
    controller.pressMouse(50, 60, 1, false, false, false, false, null);
    expect(home.getLabels().length).toBe(1);
    expect(home.getLabels()[0]!.getX()).toBe(50);
    expect(home.getLabels()[0]!.getY()).toBe(60);
  });

  it("edits the X property of a selected wall via numeric entry", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 100, 0, 10, 250);
    home.addWall(wall);
    home.setSelectedItems([wall]);
    const controller = makeController(home);
    controller.getView();
    controller.updateEditableProperty(PlanController.EditableProperty.X, 50);
    // The wall moves so its start x becomes 50
    expect(wall.getXStart()).toBe(50);
    expect(wall.getXEnd()).toBe(150);
    controller.updateEditableProperty(PlanController.EditableProperty.LENGTH, 200);
    expect(Math.sqrt(Math.pow(wall.getXEnd() - wall.getXStart(), 2) + Math.pow(wall.getYEnd() - wall.getYStart(), 2))).toBeCloseTo(200, 4);
  });

  it("zooms via the abstract mode-change state", () => {
    const home = new Home();
    const controller = makeController(home);
    const view = controller.getView() as MockPlanView;
    expect(view.scale).toBe(1);
    controller.zoom(2);
    expect(view.scale).toBe(2);
    controller.zoom(0.5);
    expect(view.scale).toBe(1);
  });

  it("deletes the selected furniture via deleteSelection", () => {
    const home = new Home();
    const piece = new HomePieceOfFurniture("p", {
      getName: () => "Table", getDescription: () => null, getInformation: () => null, getLicense: () => null,
      getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
      isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
      getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
      isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
      isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
      getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    } as never);
    home.addPieceOfFurniture(piece);
    home.setSelectedItems([piece]);
    const controller = makeController(home);
    controller.deleteSelection();
    expect(home.getFurniture().length).toBe(0);
  });
});
