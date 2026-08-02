/*
 * FurnitureIconCache.ts
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
 * FurnitureIconCache + renderer seam (task 5.4).
 *
 * Mirrors PieceOfFurnitureTopViewIcon: furniture is drawn in plan with a
 * pre-rendered top-view image of its 3D model, cached by model identity
 * (content URL + size as a digest proxy). While an icon is missing (or while
 * the offscreen 3D render runs — the render3d package, P5), the pipeline
 * draws a placeholder (bounding rectangle + diagonals + name).
 */
import type { HomePieceOfFurniture } from "@sweethomejs/core";
import type { PlanPainter } from "./PlanPainter.js";
import type { PlanColors } from "./PlanPainterPipeline.js";

/** Implemented by the render3d package (P5): renders a top-view image. */
export interface FurnitureIconRenderer {
  /**
   * Renders the piece's 3D model viewed from above into the given size.
   * Returns a CanvasImageSource (canvas/imagebitmap) or null when the model
   * can't be loaded/rendered.
   */
  renderTopView(piece: HomePieceOfFurniture, width: number, height: number): Promise<unknown | null>;
}

interface CachedIcon {
  image: unknown;
  width: number;
  height: number;
}

/** The plan icon of a piece (planIcon content, else the model icon). */
export interface PlanIconSource {
  piece: HomePieceOfFurniture;
  /** The plan icon content URL, or null to use the top-view render. */
  planIconUrl: string | null;
}

/** A stable identity for a piece's model (digest proxy: content URL + size). */
export function getModelIdentity(piece: HomePieceOfFurniture): string {
  const model = piece.getModel();
  const url = model?.getURL() ?? "";
  const size = piece.getModelSize() ?? 0;
  return `${url}#${size}`;
}

export class FurnitureIconCache {
  private readonly cache = new Map<string, CachedIcon>();
  private renderer: FurnitureIconRenderer | null = null;
  private readonly pending = new Map<string, Promise<unknown | null>>();

  setRenderer(renderer: FurnitureIconRenderer | null): void {
    this.renderer = renderer;
  }

  getRenderer(): FurnitureIconRenderer | null {
    return this.renderer;
  }

  /** Returns the cached icon for the piece, or null. */
  getCachedIcon(piece: HomePieceOfFurniture, width: number, height: number): CachedIcon | null {
    const icon = this.cache.get(getModelIdentity(piece));
    if (icon === undefined) {
      return null;
    }
    // Reuse at any size (the painter scales it); cache at the requested size
    return icon;
  }

  /**
   * Ensures a top-view icon is being rendered for the piece; calls `onReady`
   * (and stores the icon) when the render completes. Returns the cached icon
   * if already available, else null (caller draws the placeholder).
   */
  getOrCreateIcon(
    piece: HomePieceOfFurniture,
    width: number,
    height: number,
    onReady: (icon: unknown, width: number, height: number) => void,
  ): CachedIcon | null {
    const identity = getModelIdentity(piece);
    const cached = this.cache.get(identity);
    if (cached !== undefined) {
      return cached;
    }
    if (this.renderer !== null && !this.pending.has(identity)) {
      const promise = this.renderer.renderTopView(piece, width, height);
      this.pending.set(identity, promise);
      promise.then((image) => {
        this.pending.delete(identity);
        if (image !== null) {
          this.cache.set(identity, { image, width, height });
          onReady(image, width, height);
        }
      }).catch(() => {
        this.pending.delete(identity);
      });
    }
    return null;
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}

/** Paints a furniture piece's plan icon or placeholder. */
export function paintFurniturePlanIcon(
  painter: PlanPainter,
  piece: HomePieceOfFurniture,
  colors: PlanColors,
  cache: FurnitureIconCache,
  onIconReady: () => void,
): void {
  const points = piece.getPoints();
  if (points.length === 0) {
    return;
  }
  // Compute the plan bounds of the piece
  let minX = points[0]![0]!;
  let minY = points[0]![1]!;
  let maxX = points[0]![0]!;
  let maxY = points[0]![1]!;
  for (const point of points) {
    minX = Math.min(minX, point[0]!);
    minY = Math.min(minY, point[1]!);
    maxX = Math.max(maxX, point[0]!);
    maxY = Math.max(maxY, point[1]!);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) {
    return;
  }

  // Try the plan icon content first (image URLs are drawn as-is on Canvas)
  const planIcon = piece.getPlanIcon();
  if (planIcon !== null) {
    painter.drawImage(planIcon.getURL(), minX, minY, width, height);
    return;
  }

  // Try the cached top-view icon
  const icon = cache.getOrCreateIcon(piece, Math.ceil(width * 4), Math.ceil(height * 4), () => onIconReady());
  if (icon !== null) {
    painter.drawImage(icon.image, minX, minY, width, height);
    return;
  }

  // Placeholder: outlined rectangle + diagonals + a small dot in the middle
  painter.save();
  painter.setStroke(1, []);
  painter.setColor(colors.furnitureOutline);
  painter.drawRect(minX, minY, width, height);
  painter.drawLine(minX, minY, maxX, maxY);
  painter.drawLine(minX, maxY, maxX, minY);
  painter.fillOval(minX + width / 2 - 1.5, minY + height / 2 - 1.5, 3, 3);
  painter.restore();
}
