/*
 * PlanView.ts.ts
 *
 * Translated from Sweet Home 3D PlanView.java.java
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
 * PlanView interface (port of com.eteks.sweethome3d.viewcontroller.PlanView, GPL v2+).
 * A view that displays a home plan with editing feedback.
 */
import type { View } from "./View.js";
import type { TransferableView } from "./TransferableView.js";
import type { ExportableView } from "./ExportableView.js";
import type { Selectable } from "../model/Selectable.js";
import type { DimensionLine } from "../model/DimensionLine.js";
import type { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import type { TextStyle } from "../model/TextStyle.js";

export namespace PlanView {
  export enum CursorType {
    SELECTION = "SELECTION",
    PANNING = "PANNING",
    DRAW = "DRAW",
    ROTATION = "ROTATION",
    ELEVATION = "ELEVATION",
    HEIGHT = "HEIGHT",
    POWER = "POWER",
    RESIZE = "RESIZE",
    DUPLICATION = "DUPLICATION",
    MOVE = "MOVE",
  }
}

/** PlanController.EditableProperty, forward-declared until task 4.6 ports PlanController. */
export interface EditablePropertyLike {
  readonly name: string;
}

export interface PlanView extends TransferableView, ExportableView {
  setRectangleFeedback(x0: number, y0: number, x1: number, y1: number): void;
  makeSelectionVisible(): void;
  makePointVisible(x: number, y: number): void;
  getScale(): number;
  setScale(scale: number): void;
  getPrintPreferredScale(preferredWidth: number, preferredHeight: number): number;
  moveView(dx: number, dy: number): void;
  convertXPixelToModel(x: number): number;
  convertYPixelToModel(y: number): number;
  convertXModelToScreen(x: number): number;
  convertYModelToScreen(y: number): number;
  getPixelLength(): number;
  getTextBounds(text: string, style: TextStyle | null, x: number, y: number): number[][];
  setCursor(cursorType: PlanView.CursorType): void;
  setToolTipFeedback(toolTipFeedback: string | null, x: number, y: number): void;
  setToolTipEditedProperties(toolTipEditedProperties: EditablePropertyLike[] | null, toolTipText: string): void;
  setToolTipEditedPropertyValue(toolTipEditedProperty: EditablePropertyLike, toolTipEditedPropertyValue: number): void;
  deleteToolTipFeedback(): void;
  setResizeIndicatorVisible(resizeIndicatorVisible: boolean): void;
  setAlignmentFeedback(alignedObjectClass: { new (): Selectable } | null, alignmentX: number, alignmentY: number, deltaX: number, deltaY: number): void;
  setAngleFeedback(xCenter: number, yCenter: number, angle: number, length: number): void;
  setDraggedItemsFeedback(draggedItems: Selectable[]): void;
  setDimensionLinesFeedback(dimensionLines: DimensionLine[]): void;
  deleteFeedback(): void;
  getHorizontalRuler(): View;
  getVerticalRuler(): View;
  canImportDraggedItems(items: Selectable[], x: number, y: number): boolean;
  getPieceOfFurnitureSizeInPlan(piece: HomePieceOfFurniture): number[];
  isFurnitureSizeInPlanSupported(): boolean;
}
