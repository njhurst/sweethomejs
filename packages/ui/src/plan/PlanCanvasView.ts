/*
 * PlanCanvasView.ts
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
 * PlanCanvasView (task 7.1): a Canvas2D implementation of the core PlanView
 * interface, driven by the PlanController. Hosts the render2d pipeline
 * (viewport + painter + feedback), the input adapter, and a requestAnimationFrame
 * render loop. The React component mounts this on a <canvas>.
 */
import type { Home, UserPreferences, PlanController, Selectable, HomePieceOfFurniture } from "@sweethomejs/core";
import { PlanView, type PlanView as PlanViewType, type View } from "@sweethomejs/core";
import { Canvas2DPainter, PlanViewport, PlanPainterPipeline, DEFAULT_PLAN_COLORS, PlanInputAdapter, emptyToolTip, emptyAlignmentFeedback, paintToolTip, paintAlignmentFeedback, paintSelectionFeedback, type PlanColors } from "@sweethomejs/render2d";

export interface PlanCanvasHost {
  canvas: HTMLCanvasElement;
  devicePixelRatio: number;
  /** Called when the plan needs a repaint. */
  onDirty: () => void;
}

export class PlanCanvasView implements PlanViewType {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly controller: PlanController;
  private readonly viewport: PlanViewport;
  private readonly pipeline: PlanPainterPipeline;
  private readonly colors: PlanColors;
  private readonly host: PlanCanvasHost;
  private painter: Canvas2DPainter | null = null;
  private inputAdapter: PlanInputAdapter | null = null;
  private cursor: PlanView.CursorType = PlanView.CursorType.SELECTION;
  private feedback: number[] | null = null;
  private toolTip = emptyToolTip();
  private alignmentFeedback = emptyAlignmentFeedback();
  private resizeIndicatorVisible = false;
  private dirty = true;

  constructor(home: Home, preferences: UserPreferences, controller: PlanController, host: PlanCanvasHost, colors: PlanColors = DEFAULT_PLAN_COLORS) {
    this.home = home;
    this.preferences = preferences;
    this.controller = controller;
    this.host = host;
    this.colors = colors;
    this.viewport = new PlanViewport();
    this.pipeline = new PlanPainterPipeline(colors);
    this.pipeline.setIconReadyCallback(() => this.requestPaint());
  }

  getViewport(): PlanViewport {
    return this.viewport;
  }

  /** Attaches the input adapter (binds DOM events to the controller). */
  attachInput(): void {
    if (this.inputAdapter === null) {
      this.inputAdapter = new PlanInputAdapter({
        element: this.host.canvas,
        viewport: this.viewport,
        controller: this.controller,
        updatePlanBounds: () => this.updatePlanBounds(),
        onScroll: (dx, dy) => {
          this.viewport.setPan(this.viewport.getPanX() - dx, this.viewport.getPanY() - dy);
          this.requestPaint();
        },
      });
      const adapter = this.inputAdapter as unknown as { lastPressModelX?: number; lastPressModelY?: number };
      (globalThis as unknown as Record<string, unknown>).__adapter = adapter;
    }
  }

  /** Recomputes the plan bounds from the home content and updates the viewport. */
  updatePlanBounds(): void {
    const bounds = this.computePlanBounds();
    if (Number.isFinite(bounds.minX)) {
      // Anchor the view: when the bounds shift (e.g. content added), adjust the
      // pan so existing content stays at the same screen position (Java keeps
      // the viewport stable when the plan grows).
      const old = this.viewport.getPlanBounds();
      const oldMinX = old.minX;
      const oldMinY = old.minY;
      this.viewport.setPlanBounds(bounds);
      if (oldMinX !== bounds.minX || oldMinY !== bounds.minY) {
        const scale = this.viewport.getScale();
        this.viewport.setPan(
          this.viewport.getPanX() + (bounds.minX - oldMinX) * scale,
          this.viewport.getPanY() + (bounds.minY - oldMinY) * scale,
        );
      }
    }
  }

  /**
   * Fits the home content into the viewport (used the first time a home is
   * displayed, like Java's initial zoom-to-fit). Subsequent resizes keep the
   * user's zoom/pan.
   */
  fitHome(width: number, height: number): void {
    const bounds = this.computePlanBounds();
    if (!Number.isFinite(bounds.minX) || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
      return;
    }
    const margin = 40; // cm margin, like Java's PlanComponent
    const contentW = bounds.maxX - bounds.minX;
    const contentH = bounds.maxY - bounds.minY;
    const availW = Math.max(10, width - 2 * margin);
    const availH = Math.max(10, height - 2 * margin);
    const scale = Math.min(availW / contentW, availH / contentH, 50);
    this.viewport.setScale(Math.max(0.01, scale));
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    // Center the content: screen = model * scale + pan → pan = screen - model * scale
    this.viewport.setPan(width / 2 - cx * this.viewport.getScale(), height / 2 - cy * this.viewport.getScale());
    this.viewport.setPlanBounds(bounds);
  }

  /** Computes the bounding box of all plan content (walls, furniture, rooms). */
  private computePlanBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
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
    for (const wall of this.home.getWalls()) add(wall.getPoints());
    for (const piece of this.home.getFurniture()) add(piece.getPoints());
    for (const room of this.home.getRooms()) add(room.getPoints());
    for (const polyline of this.home.getPolylines()) add(polyline.getPoints());
    for (const dim of this.home.getDimensionLines()) add([[dim.getXStart(), dim.getYStart()], [dim.getXEnd(), dim.getYEnd()]]);
    for (const label of this.home.getLabels()) add([[label.getX(), label.getY()]]);
    if (!Number.isFinite(minX)) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    return { minX, minY, maxX, maxY };
  }

  /** Sets the canvas size (with HiDPI) and installs the base transform. */
  resize(width: number, height: number): void {
    const dpr = this.host.devicePixelRatio;
    this.host.canvas.width = Math.max(1, Math.round(width * dpr));
    this.host.canvas.height = Math.max(1, Math.round(height * dpr));
    this.host.canvas.style.width = `${width}px`;
    this.host.canvas.style.height = `${height}px`;
    const ctx = this.host.canvas.getContext("2d");
    if (ctx !== null) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.painter = new Canvas2DPainter(ctx);
    }
    this.dirty = true;
  }

  /** Paints the plan (background, grid, content, feedback). */
  paint(): void {
    if (this.painter === null) {
      return;
    }
    const painter = this.painter;
    const width = this.host.canvas.clientWidth || 1;
    const height = this.host.canvas.clientHeight || 1;

    painter.save();
    painter.setColor(this.colors.background);
    painter.fillRect(0, 0, width, height);
    painter.restore();

    const bounds = this.viewport.getPlanBounds();
    const margin = this.viewport.getMargin();
    const scale = this.viewport.getScale();

    // Grid
    painter.save();
    const t = this.viewport.getPaintTransform();
    painter.translate(t.translateX, t.translateY);
    painter.scale(t.scale, t.scale);
    this.pipeline.paintGrid(painter, this.preferences, bounds.minX - margin, bounds.minY - margin, bounds.maxX + margin, bounds.maxY + margin, scale);
    painter.restore();

    // Content
    painter.save();
    painter.translate(t.translateX, t.translateY);
    painter.scale(t.scale, t.scale);
    this.pipeline.paint(painter, this.home, this.preferences, null);
    painter.restore();

    // Selection feedback (in model space)
    if (this.home.getSelectedItems().length > 0) {
      painter.save();
      painter.translate(t.translateX, t.translateY);
      painter.scale(t.scale, t.scale);
      paintSelectionFeedback(painter, this.home, scale, this.colors.selection);
      painter.restore();
    }

    // Rectangle feedback (drag)
    if (this.feedback !== null) {
      painter.save();
      painter.setColor(this.colors.selection);
      painter.setStroke(1, []);
      painter.drawRect(this.feedback[0]!, this.feedback[1]!, this.feedback[2]! - this.feedback[0]!, this.feedback[3]! - this.feedback[1]!);
      painter.restore();
    }

    // Tool tip (in model space)
    if (this.toolTip.text !== null) {
      painter.save();
      painter.translate(t.translateX, t.translateY);
      painter.scale(t.scale, t.scale);
      paintToolTip(painter, this.toolTip);
      painter.restore();
    }

    // Alignment feedback (in model space)
    if (this.alignmentFeedback.segments.length > 0) {
      painter.save();
      painter.translate(t.translateX, t.translateY);
      painter.scale(t.scale, t.scale);
      paintAlignmentFeedback(painter, this.alignmentFeedback);
      painter.restore();
    }

    this.dirty = false;
  }

  /** Requests a repaint (called on model changes / input). */
  requestPaint(): void {
    this.dirty = true;
    this.host.onDirty();
  }

  isDirty(): boolean {
    return this.dirty;
  }

  // ------------------------------------------------------------- PlanView

  repaint(): void {
    this.requestPaint();
  }

  setRectangleFeedback(x0: number, y0: number, x1: number, y1: number): void {
    this.feedback = [x0, y0, x1, y1];
    this.requestPaint();
  }

  makeSelectionVisible(): void {}

  makePointVisible(x: number, y: number): void {}

  getScale(): number {
    return this.viewport.getScale();
  }

  setScale(scale: number): void {
    this.viewport.setScale(scale);
    this.requestPaint();
  }

  getPrintPreferredScale(preferredWidth: number, preferredHeight: number): number {
    return this.viewport.getScale();
  }

  moveView(dx: number, dy: number): void {
    this.viewport.moveView(dx, dy);
    this.requestPaint();
  }

  convertXPixelToModel(x: number): number {
    return this.viewport.convertXPixelToModel(x);
  }

  convertYPixelToModel(y: number): number {
    return this.viewport.convertYPixelToModel(y);
  }

  convertXModelToScreen(x: number): number {
    return this.viewport.convertXModelToPixel(x);
  }

  convertYModelToScreen(y: number): number {
    return this.viewport.convertYModelToPixel(y);
  }

  getPixelLength(): number {
    return this.viewport.getPixelLength();
  }

  getTextBounds(text: string, style: unknown, x: number, y: number): number[][] {
    return [[x, y]];
  }

  setCursor(cursorType: PlanView.CursorType): void {
    this.cursor = cursorType;
    const css = PlanInputAdapter.cursorToCss(cursorType);
    this.host.canvas.style.cursor = css;
  }

  setToolTipFeedback(toolTipFeedback: string | null, x: number, y: number): void {
    this.toolTip.text = toolTipFeedback;
    this.toolTip.x = x;
    this.toolTip.y = y;
    this.requestPaint();
  }

  setToolTipEditedProperties(toolTipEditedProperties: unknown[] | null, toolTipText: string): void {
    this.toolTip.editableProperties = (toolTipEditedProperties ?? []).map((p) => String(p));
    this.toolTip.text = toolTipText;
    this.requestPaint();
  }

  setToolTipEditedPropertyValue(toolTipEditedProperty: unknown, toolTipEditedPropertyValue: number): void {
    this.requestPaint();
  }

  deleteToolTipFeedback(): void {
    this.toolTip = emptyToolTip();
    this.requestPaint();
  }

  setResizeIndicatorVisible(resizeIndicatorVisible: boolean): void {
    this.resizeIndicatorVisible = resizeIndicatorVisible;
    this.requestPaint();
  }

  setAlignmentFeedback(alignedObjectClass: unknown, alignmentX: number, alignmentY: number, deltaX: number, deltaY: number): void {
    this.alignmentFeedback.segments = [[alignmentX, alignmentY, alignmentX + deltaX, alignmentY + deltaY]];
    this.requestPaint();
  }

  setAngleFeedback(xCenter: number, yCenter: number, angle: number, length: number): void {
    this.alignmentFeedback.segments = [[xCenter, yCenter, xCenter + length * Math.cos(angle), yCenter + length * Math.sin(angle)]];
    this.requestPaint();
  }

  setDraggedItemsFeedback(draggedItems: Selectable[]): void {
    this.requestPaint();
  }

  setDimensionLinesFeedback(dimensionLines: unknown[]): void {
    this.requestPaint();
  }

  deleteFeedback(): void {
    this.feedback = null;
    this.alignmentFeedback = emptyAlignmentFeedback();
    this.requestPaint();
  }

  getHorizontalRuler(): View {
    return {} as View;
  }

  getVerticalRuler(): View {
    return {} as View;
  }

  canImportDraggedItems(items: Selectable[], x: number, y: number): boolean {
    return false;
  }

  getPieceOfFurnitureSizeInPlan(piece: HomePieceOfFurniture): number[] {
    return [piece.getWidth(), piece.getDepth()];
  }

  isFurnitureSizeInPlanSupported(): boolean {
    return true;
  }

  createTransferData(dataType: unknown): unknown {
    return null;
  }

  isFormatTypeSupported(formatType: unknown): boolean {
    return false;
  }

  exportData(out: unknown, formatType: unknown, settings: unknown): Promise<void> {
    return Promise.reject(new Error("Plan export not supported yet"));
  }

  destroy(): void {
    this.inputAdapter?.detach();
  }
}
