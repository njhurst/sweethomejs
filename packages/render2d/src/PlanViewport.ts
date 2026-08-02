/*
 * PlanViewport.ts
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
 * PlanViewport (task 5.2): model↔pixel transforms for the plan component.
 *
 * Mirrors PlanComponent's math exactly:
 *   pixelX = insets.left + (MARGIN - planBounds.minX + modelX) * scale
 *   modelX  = (pixelX - insets.left) / scale - MARGIN + planBounds.minX
 * with MARGIN = 40 cm, scale in pixels-per-cm (already including HiDPI).
 *
 * The plan paints with y-down (like Java2D): model y maps directly to canvas y
 * with the same formula as x. Zoom-at-point keeps the model point under the
 * cursor fixed.
 */
export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const DEFAULT_MARGIN = 40;

export class PlanViewport {
  private scaleValue = 0.5; // pixels per cm (default 1:200)
  private planBoundsValue: Rect = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  private marginValue = DEFAULT_MARGIN;
  private insetsValue: Insets = { left: 0, top: 0, right: 0, bottom: 0 };
  private panX = 0;
  private panY = 0;

  /** The scale in pixels per cm (CSS pixels). */
  getScale(): number {
    return this.scaleValue;
  }

  setScale(scale: number): void {
    this.scaleValue = scale;
  }

  /** The plan content bounds in model units (cm), WITHOUT margin. */
  getPlanBounds(): Rect {
    return this.planBoundsValue;
  }

  setPlanBounds(bounds: Rect): void {
    this.planBoundsValue = bounds;
  }

  /** The margin in model units (cm) around the plan content. */
  getMargin(): number {
    return this.marginValue;
  }

  setMargin(margin: number): void {
    this.marginValue = margin;
  }

  getInsets(): Insets {
    return this.insetsValue;
  }

  setInsets(insets: Insets): void {
    this.insetsValue = insets;
  }

  /** Pan offset in CSS pixels (0 = plan origin at the margin position). */
  getPanX(): number {
    return this.panX;
  }

  getPanY(): number {
    return this.panY;
  }

  setPan(panX: number, panY: number): void {
    this.panX = panX;
    this.panY = panY;
  }

  /** The length in cm of one pixel at the current scale. */
  getPixelLength(): number {
    return 1 / this.scaleValue;
  }

  convertPixelToLength(size: number): number {
    return size * this.getPixelLength();
  }

  convertLengthToPixel(size: number): number {
    return size * this.scaleValue;
  }

  convertXPixelToModel(x: number): number {
    return this.convertPixelToLength(x - this.insetsValue.left - this.panX) - this.marginValue + this.planBoundsValue.minX;
  }

  convertYPixelToModel(y: number): number {
    return this.convertPixelToLength(y - this.insetsValue.top - this.panY) - this.marginValue + this.planBoundsValue.minY;
  }

  convertXModelToPixel(x: number): number {
    return this.convertLengthToPixel(x - this.planBoundsValue.minX + this.marginValue) + this.insetsValue.left + this.panX;
  }

  convertYModelToPixel(y: number): number {
    return this.convertLengthToPixel(y - this.planBoundsValue.minY + this.marginValue) + this.insetsValue.top + this.panY;
  }

  convertXModelToScreen(x: number): number {
    return this.convertXModelToPixel(x);
  }

  convertYModelToScreen(y: number): number {
    return this.convertYModelToPixel(y);
  }

  /**
   * Moves the view by the given model-space delta (the plan pans by the
   * opposite amount on screen, like PlanComponent.moveView).
   */
  moveView(dx: number, dy: number): void {
    this.panX -= this.convertLengthToPixel(dx);
    this.panY -= this.convertLengthToPixel(dy);
  }

  /**
   * Zooms by `factor` keeping the model point under (pixelX, pixelY) fixed.
   */
  zoomAt(factor: number, pixelX: number, pixelY: number): void {
    if (factor <= 0) {
      return;
    }
    const modelX = this.convertXPixelToModel(pixelX);
    const modelY = this.convertYPixelToModel(pixelY);
    this.scaleValue *= factor;
    // Recompute the pan so the cursor's model point stays under the cursor
    this.panX = pixelX - this.insetsValue.left - this.convertLengthToPixel(modelX - this.planBoundsValue.minX + this.marginValue);
    this.panY = pixelY - this.insetsValue.top - this.convertLengthToPixel(modelY - this.planBoundsValue.minY + this.marginValue);
  }

  /** The preferred viewport size for the current bounds + margin + insets. */
  getPreferredSize(): { width: number; height: number } {
    const width = this.convertLengthToPixel(this.planBoundsValue.maxX - this.planBoundsValue.minX + this.marginValue * 2) + this.insetsValue.left + this.insetsValue.right;
    const height = this.convertLengthToPixel(this.planBoundsValue.maxY - this.planBoundsValue.minY + this.marginValue * 2) + this.insetsValue.top + this.insetsValue.bottom;
    return { width, height };
  }

  /**
   * The base transform for painting: `translate(insets.left + (MARGIN -
   * minX) * scale, insets.top + (MARGIN - minY) * scale); scale(scale, scale)`
   * — exactly like PlanComponent.paintComponent.
   */
  getPaintTransform(): { translateX: number; translateY: number; scale: number } {
    const scale = this.scaleValue;
    return {
      translateX: this.insetsValue.left + (this.marginValue - this.planBoundsValue.minX) * scale + this.panX,
      translateY: this.insetsValue.top + (this.marginValue - this.planBoundsValue.minY) * scale + this.panY,
      scale,
    };
  }
}
