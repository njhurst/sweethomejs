/*
 * SelectionFeedbackPainter.ts
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
 * SelectionFeedbackPainter (task 5.6): paints the selection outline + resize
 * grips for the selected items, mirroring PlanComponent's
 * selectionOutlinePaint (selection color @ 50% alpha) / selectionOutlineStroke
 * (6/scale round) and the 3×3 POINT_INDICATOR grips.
 */
import type { Home, Wall, Room, HomePieceOfFurniture, Polyline, DimensionLine, Label, Compass } from "@sweethomejs/core";
import type { PlanPainter, Color } from "./PlanPainter.js";

export interface SelectionFeedbackColors {
  selection: Color;
}

export const DEFAULT_SELECTION_COLOR: Color = 0x0057ff;

/** Paints the selection outline for the given items. */
export function paintSelectionOutline(
  painter: PlanPainter,
  items: Array<Wall | Room | HomePieceOfFurniture | Polyline | DimensionLine | Label | Compass>,
  scale: number,
  color: Color = DEFAULT_SELECTION_COLOR,
): void {
  if (items.length === 0) {
    return;
  }
  painter.save();
  // selectionOutlinePaint: color with 128 alpha (0x80)
  const outlineColor = color | 0x80000000;
  painter.setColor(outlineColor);
  painter.setStroke(6 / scale, []);
  for (const item of items) {
    const points = item.getPoints();
    if (points.length < 2) {
      continue;
    }
    painter.beginPath();
    painter.moveTo(points[0]![0]!, points[0]![1]!);
    for (let i = 1; i < points.length; i++) {
      painter.lineTo(points[i]![0]!, points[i]![1]!);
    }
    if (points.length > 2) {
      painter.closePath();
    }
    painter.strokePath();
  }
  painter.restore();
}

/** Paints 3×3 grips at the given points (POINT_INDICATOR). */
export function paintPointIndicators(painter: PlanPainter, points: number[][], color: Color = DEFAULT_SELECTION_COLOR): void {
  painter.save();
  painter.setColor(color);
  for (const point of points) {
    painter.fillOval(point[0]! - 1.5, point[1]! - 1.5, 3, 3);
  }
  painter.restore();
}

/** Paints grips at the corners of the given items (walls/furniture/dims). */
export function paintItemGrips(
  painter: PlanPainter,
  items: Array<Wall | Room | HomePieceOfFurniture | Polyline | DimensionLine | Label | Compass>,
  scale: number,
  color: Color = DEFAULT_SELECTION_COLOR,
): void {
  void scale;
  painter.save();
  painter.setColor(color);
  painter.setStroke(1, []);
  for (const item of items) {
    const points = item.getPoints();
    // Grip at each polygon vertex
    const gripPoints = points.length >= 2 ? points : [];
    for (const point of gripPoints) {
      painter.drawRect(point[0]! - 1.5, point[1]! - 1.5, 3, 3);
    }
  }
  painter.restore();
}

/** Paints the full selection feedback for the home's selected items. */
export function paintSelectionFeedback(
  painter: PlanPainter,
  home: Home,
  scale: number,
  color: Color = DEFAULT_SELECTION_COLOR,
): void {
  const selectedItems = home.getSelectedItems() as Array<Wall | Room | HomePieceOfFurniture | Polyline | DimensionLine | Label | Compass>;
  if (selectedItems.length === 0) {
    return;
  }
  paintSelectionOutline(painter, selectedItems, scale, color);
  paintItemGrips(painter, selectedItems, scale, color);
}
