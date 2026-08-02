/*
 * PlanSVGExporter.ts
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
 * PlanSVGExporter (task 5.8): exports a home's plan as a standalone SVG
 * document through the PlanPainter pipeline, mirroring PlanComponent's SVG
 * export (the Java reference is test/fixtures/ls_2819/references/ls_2819.svg).
 */
import type { Home, UserPreferences } from "@sweethomejs/core";
import { SVGPainter } from "./SVGPainter.js";
import { PlanViewport } from "./PlanViewport.js";
import { PlanPainterPipeline, DEFAULT_PLAN_COLORS, type PlanColors } from "./PlanPainterPipeline.js";
import { FurnitureIconCache } from "./FurnitureIconCache.js";
import { paintSelectionFeedback } from "./SelectionFeedbackPainter.js";

export interface PlanSVGExportOptions {
  /** Scale in pixels per cm (default 0.5 ≈ 1:200). */
  scale?: number;
  /** Margin in cm around the plan content (default 40). */
  margin?: number;
  colors?: PlanColors;
  /** Include the grid (default true). */
  includeGrid?: boolean;
  /** Include the selection feedback (default false for export). */
  includeSelection?: boolean;
}

export interface PlanSVGExportResult {
  svg: string;
  width: number;
  height: number;
  scale: number;
  planBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Computes the plan bounds of a home from its content. */
export function homePlanBounds(home: Home): { minX: number; minY: number; maxX: number; maxY: number } {
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
  for (const line of home.getDimensionLines()) {
    add([[line.getXStart(), line.getYStart()], [line.getXEnd(), line.getYEnd()]]);
  }
  for (const label of home.getLabels()) {
    add([[label.getX(), label.getY()]]);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  }
  return { minX, minY, maxX, maxY };
}

export class PlanSVGExporter {
  /**
   * Exports the home's plan as a standalone SVG document.
   */
  export(home: Home, preferences: UserPreferences, options: PlanSVGExportOptions = {}): PlanSVGExportResult {
    const scale = options.scale ?? 0.5;
    const margin = options.margin ?? 40;
    const planBounds = homePlanBounds(home);

    const viewport = new PlanViewport();
    viewport.setPlanBounds(planBounds);
    viewport.setScale(scale);
    viewport.setMargin(margin);
    const size = viewport.getPreferredSize();

    const painter = new SVGPainter();
    const pipeline = new PlanPainterPipeline(options.colors ?? DEFAULT_PLAN_COLORS, new FurnitureIconCache());

    // Background
    painter.save();
    painter.setColor((options.colors ?? DEFAULT_PLAN_COLORS).background);
    painter.fillRect(0, 0, size.width, size.height);
    painter.restore();

    // Grid (before the content, like PlanComponent)
    if (options.includeGrid ?? true) {
      painter.save();
      const t = viewport.getPaintTransform();
      painter.translate(t.translateX, t.translateY);
      painter.scale(t.scale, t.scale);
      pipeline.paintGrid(painter, preferences, planBounds.minX - margin, planBounds.minY - margin, planBounds.maxX + margin, planBounds.maxY + margin, scale);
      painter.restore();
    }

    // Content
    painter.save();
    const t = viewport.getPaintTransform();
    painter.translate(t.translateX, t.translateY);
    painter.scale(t.scale, t.scale);
    pipeline.paint(painter, home, preferences, null);
    painter.restore();

    // Selection feedback
    if (options.includeSelection ?? false) {
      painter.save();
      const ts = viewport.getPaintTransform();
      painter.translate(ts.translateX, ts.translateY);
      painter.scale(ts.scale, ts.scale);
      paintSelectionFeedback(painter, home, scale);
      painter.restore();
    }

    const svg = painter.toString({ width: Math.round(size.width), height: Math.round(size.height) });
    return { svg, width: Math.round(size.width), height: Math.round(size.height), scale, planBounds };
  }
}
