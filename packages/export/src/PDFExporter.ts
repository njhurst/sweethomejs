/*
 * PDFExporter.ts
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
 * PDF export (task 8.7): draws the plan as vector content into a PDF page at
 * the chosen paper size, using the PDFPainter + the plan pipeline. The scale
 * fits the plan on the paper (Java's getPrintPreferredScale).
 */
import { PDFDocument } from "pdf-lib";
import type { Home, UserPreferences } from "@sweethomejs/core";
import {
  PAPER_FORMATS,
  PX_PER_CM,
  PlanPainterPipeline,
  computePlanBounds,
  getPrintedPlanScale,
  paperSize,
} from "@sweethomejs/render2d";
import { PDFPainter } from "./PDFPainter.js";

export interface PDFExportOptions {
  /** Paper format name from PAPER_FORMATS (default "A4"). */
  format?: string;
  /** Orientation: PORTRAIT | LANDSCAPE | REVERSE_LANDSCAPE (default LANDSCAPE). */
  orientation?: string;
  /** Margins in cm (default 1.5). */
  marginsCm?: { top: number; left: number; bottom: number; right: number };
  /** Scale inverse (1:N); when omitted the largest fitting scale is used. */
  scaleInverse?: number;
}

/** Exports the plan to a PDF byte array (vector). */
export async function exportPlanToPdf(
  home: Home,
  preferences: UserPreferences,
  options: PDFExportOptions = {},
): Promise<Uint8Array> {
  const format = PAPER_FORMATS.find((f) => f.name === (options.format ?? "A4")) ?? PAPER_FORMATS[1]!;
  const orientation = options.orientation ?? "LANDSCAPE";
  const size = paperSize(format, orientation);
  const marginsCm = options.marginsCm ?? { top: 1.5, left: 1.5, bottom: 1.5, right: 1.5 };

  const document = await PDFDocument.create();
  const page = document.addPage([size.widthCm * PX_PER_CM, size.heightCm * PX_PER_CM]);
  const painter = await PDFPainter.create(document, page);
  const pipeline = new PlanPainterPipeline();

  const bounds = computePlanBounds(home);
  const autoScaleInverse = getPrintedPlanScale(
    bounds,
    size.widthCm - marginsCm.left - marginsCm.right,
    size.heightCm - marginsCm.top - marginsCm.bottom,
  );
  const scaleInverse = options.scaleInverse ?? (autoScaleInverse > 0 ? Math.round(1 / autoScaleInverse) : 100);

  const scale = PX_PER_CM / scaleInverse;
  const marginLeft = marginsCm.left * PX_PER_CM;
  const marginTop = marginsCm.top * PX_PER_CM;
  const zoneWidth = page.getWidth() - marginLeft - marginsCm.right * PX_PER_CM;
  const zoneHeight = page.getHeight() - marginTop - marginsCm.bottom * PX_PER_CM;
  const contentWidth = (bounds.maxX - bounds.minX) * scale;
  const contentHeight = (bounds.maxY - bounds.minY) * scale;
  const panX = marginLeft + (zoneWidth - contentWidth) / 2 - bounds.minX * scale;
  const panY = marginTop + (zoneHeight - contentHeight) / 2 - bounds.minY * scale;

  painter.save();
  painter.setColor(0xffffff);
  painter.fillRect(0, 0, page.getWidth(), page.getHeight());
  painter.restore();

  painter.save();
  painter.translate(panX, panY);
  painter.scale(scale, scale);
  pipeline.paintGrid(painter, preferences, bounds.minX - 40, bounds.minY - 40, bounds.maxX + 40, bounds.maxY + 40, scale);
  pipeline.paint(painter, home, preferences, null, {});
  painter.restore();

  return document.save();
}
