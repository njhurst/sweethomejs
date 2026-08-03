/*
 * PrintLayout.ts
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
 * Print layout (task 8.6): paper formats, the printed plan scale (Java's
 * PlanComponent.getPrintPreferredScale — the largest integer-inverse scale
 * that fits the plan on the paper) and a painter that draws the plan at a
 * paper size through the same PlanPainterPipeline used on screen.
 */
import type { Home, UserPreferences } from "@sweethomejs/core";
import type { PlanPainter } from "./PlanPainter.js";
import { PlanPainterPipeline } from "./PlanPainterPipeline.js";
import type { PlanColors } from "./PlanPainterPipeline.js";

/** Screen rendering DPI used for print (CSS px per inch). */
export const PRINT_DPI = 96;
/** Pixels per cm at the print DPI. */
export const PX_PER_CM = PRINT_DPI / 2.54;

/** Common paper formats in portrait orientation (width × height, cm). */
export const PAPER_FORMATS: Array<{ name: string; widthCm: number; heightCm: number }> = [
  { name: "A5", widthCm: 14.8, heightCm: 21.0 },
  { name: "A4", widthCm: 21.0, heightCm: 29.7 },
  { name: "A3", widthCm: 29.7, heightCm: 42.0 },
  { name: "A2", widthCm: 42.0, heightCm: 59.4 },
  { name: "A1", widthCm: 59.4, heightCm: 84.1 },
  { name: "A0", widthCm: 84.1, heightCm: 118.9 },
  { name: "Letter", widthCm: 21.59, heightCm: 27.94 },
  { name: "Legal", widthCm: 21.59, heightCm: 35.56 },
  { name: "Tabloid", widthCm: 27.94, heightCm: 43.18 },
];

export interface PrintBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Plan bounds of the home content (walls, furniture, rooms, dims, labels, polylines). */
export function computePlanBounds(home: Home): PrintBounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const add = (points: number[][]): void => {
    for (const p of points) {
      minX = Math.min(minX, p[0]!);
      minY = Math.min(minY, p[1]!);
      maxX = Math.max(maxX, p[0]!);
      maxY = Math.max(maxY, p[1]!);
    }
  };
  for (const wall of home.getWalls()) add(wall.getPoints());
  for (const piece of home.getFurniture()) add(piece.getPoints());
  for (const room of home.getRooms()) add(room.getPoints());
  for (const polyline of home.getPolylines()) add(polyline.getPoints());
  for (const dim of home.getDimensionLines()) {
    add([[dim.getXStart(), dim.getYStart()], [dim.getXEnd(), dim.getYEnd()]]);
  }
  for (const label of home.getLabels()) add([[label.getX(), label.getY()]]);
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

/**
 * The largest integer-inverse scale (1 / N) that fits the plan bounds (plus a
 * stroke margin) in the printable zone — Java's PlanComponent.getPrintPreferredScale.
 * Returns the scale (0.5 for 1:2 … 0.01 for 1:100); 0 when there is no content.
 */
export function getPrintedPlanScale(
  bounds: PrintBounds,
  zoneWidthCm: number,
  zoneHeightCm: number,
  extraMarginCm = 1,
): number {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (width <= 0 || height <= 0) {
    return 0;
  }
  const scaleInverse = Math.ceil(
    Math.max(
      (width + 2 * extraMarginCm) / zoneWidthCm,
      (height + 2 * extraMarginCm) / zoneHeightCm,
    ),
  );
  return 1 / scaleInverse;
}

export interface PrintPaperSize {
  widthCm: number;
  heightCm: number;
}

/**
 * The paper size for a format + orientation (portrait keeps the format
 * dimensions; landscape swaps them; reverse landscape swaps + mirrors).
 */
export function paperSize(format: { widthCm: number; heightCm: number }, orientation: string): PrintPaperSize {
  if (orientation === "PORTRAIT") {
    return { widthCm: format.widthCm, heightCm: format.heightCm };
  }
  // LANDSCAPE / REVERSE_LANDSCAPE swap the axes
  return { widthCm: format.heightCm, heightCm: format.widthCm };
}

/**
 * Paints the plan onto a canvas-sized painter at the given paper geometry:
 * the pipeline is called with a transform mapping model cm to print pixels at
 * the scale (1/scaleInverse), centered within the printable zone (margins).
 * `painter` must be a Canvas2DPainter bound to a canvas of the paper pixel size.
 */
export function paintPlanForPrint(
  painter: PlanPainter,
  pipeline: PlanPainterPipeline,
  home: Home,
  preferences: UserPreferences,
  paperSizeCm: PrintPaperSize,
  marginsCm: { top: number; left: number; bottom: number; right: number },
  scaleInverse: number,
  colors?: PlanColors,
): void {
  const bounds = computePlanBounds(home);
  if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    return;
  }
  const scale = PX_PER_CM / scaleInverse;
  const widthPx = Math.round(paperSizeCm.widthCm * PX_PER_CM);
  const heightPx = Math.round(paperSizeCm.heightCm * PX_PER_CM);
  const marginLeftPx = marginsCm.left * PX_PER_CM;
  const marginTopPx = marginsCm.top * PX_PER_CM;
  const zoneWidthPx = widthPx - marginLeftPx - marginsCm.right * PX_PER_CM;
  const zoneHeightPx = heightPx - marginTopPx - marginsCm.bottom * PX_PER_CM;

  // Center the plan in the printable zone
  const contentWidthPx = (bounds.maxX - bounds.minX) * scale;
  const contentHeightPx = (bounds.maxY - bounds.minY) * scale;
  const panX = marginLeftPx + (zoneWidthPx - contentWidthPx) / 2 - bounds.minX * scale;
  const panY = marginTopPx + (zoneHeightPx - contentHeightPx) / 2 - bounds.minY * scale;

  painter.save();
  painter.setColor(colors?.background ?? 0xffffff);
  painter.fillRect(0, 0, widthPx, heightPx);
  painter.restore();

  painter.save();
  painter.translate(panX, panY);
  painter.scale(scale, scale);
  pipeline.paintGrid(painter, preferences, bounds.minX - 40, bounds.minY - 40, bounds.maxX + 40, bounds.maxY + 40, scale);
  pipeline.paint(painter, home, preferences, null, {});
  painter.restore();
}
