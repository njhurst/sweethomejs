/*
 * PlanInputAdapter.ts
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
 * PlanInputAdapter (task 5.5): translates DOM Pointer/Keyboard/Wheel events
 * into PlanController calls, mapping modifiers the way PlanComponent does
 * (alignment = Shift, duplication = Ctrl, magnetism toggle = Shift+Alt), and
 * provides a custom cursor overlay.
 */
import { PlanController, View } from "@sweethomejs/core";
import type { PlanViewport } from "./PlanViewport.js";
import type { PlanController as PlanControllerType } from "@sweethomejs/core";

const ZOOM_IN_FACTOR = 1.05;
const ZOOM_OUT_FACTOR = 0.95;

export interface PlanInputAdapterOptions {
  /** The element receiving pointer events. */
  element: HTMLElement;
  viewport: PlanViewport;
  controller: PlanController;
  /** Called when the mouse wheel pans/scrolls (non-ctrl). */
  onScroll?: (deltaX: number, deltaY: number) => void;
  /** Custom cursor renderer (paints the current PlanView.CursorType shape). */
  cursorRenderer?: (cursor: string, ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  /** Recompute the plan bounds before converting coordinates. */
  updatePlanBounds?: () => void;
}

export class PlanInputAdapter {
  private readonly element: HTMLElement;
  private readonly viewport: PlanViewport;
  private readonly controller: PlanController;
  private readonly onScroll: ((dx: number, dy: number) => void) | null;
  private readonly cursorRenderer: ((cursor: string, ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null;
  private readonly updatePlanBounds: (() => void) | null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastPressTime = 0;
  private lastPressX = 0;
  private lastPressY = 0;
  private clickCount = 0;
  private pointerDown = false;
  private cursorCanvas: HTMLCanvasElement | null = null;

  constructor(options: PlanInputAdapterOptions) {
    this.element = options.element;
    this.viewport = options.viewport;
    this.controller = options.controller;
    this.onScroll = options.onScroll ?? null;
    this.cursorRenderer = options.cursorRenderer ?? null;
    this.updatePlanBounds = options.updatePlanBounds ?? null;
    this.attach();
  }

  private attach(): void {
    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointercancel", this.onPointerUp);
    this.element.addEventListener("wheel", this.onWheel, { passive: false });
    this.element.addEventListener("keydown", this.onKeyDown);
    this.element.setAttribute("tabindex", "0");
  }

  detach(): void {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointercancel", this.onPointerUp);
    this.element.removeEventListener("wheel", this.onWheel);
    this.element.removeEventListener("keydown", this.onKeyDown);
  }

  private refreshBounds(): void {
    this.updatePlanBounds?.();
  }

  private convertX(event: { clientX: number }): number {
    const rect = this.element.getBoundingClientRect();
    return this.viewport.convertXPixelToModel(event.clientX - rect.left);
  }

  private convertY(event: { clientY: number }): number {
    const rect = this.element.getBoundingClientRect();
    return this.viewport.convertYPixelToModel(event.clientY - rect.top);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.pointerDown) {
      this.refreshBounds();
    }
    this.pointerDown = true;
    this.element.setPointerCapture?.(event.pointerId);
    const x = event.clientX - this.element.getBoundingClientRect().left;
    const y = event.clientY - this.element.getBoundingClientRect().top;
    // Click-count detection (double click within 500 ms and 10 px)
    const now = Date.now();
    if (now - this.lastPressTime < 500 && Math.abs(x - this.lastPressX) < 10 && Math.abs(y - this.lastPressY) < 10) {
      this.clickCount = Math.min(2, this.clickCount + 1);
    } else {
      this.clickCount = 1;
    }
    this.lastPressTime = now;
    this.lastPressX = x;
    this.lastPressY = y;
    this.lastPointerX = x;
    this.lastPointerY = y;

    const shift = event.shiftKey;
    const alt = event.altKey;
    const ctrl = event.ctrlKey;
    const meta = event.metaKey;
    // Linux/Windows mapping from PlanComponent: alignment = Shift,
    // duplication = Ctrl, magnetism toggle = Shift+Alt
    const alignmentActivated = shift && !alt;
    const duplicationActivated = ctrl;
    const magnetismToggled = shift && alt;
    const pointerType = event.pointerType === "touch" ? View.PointerType.TOUCH : View.PointerType.MOUSE;

    this.controller.pressMouse(
      this.convertX(event), this.convertY(event),
      this.clickCount,
      shift && !ctrl && !alt && !meta,
      alignmentActivated, duplicationActivated, magnetismToggled, pointerType,
    );
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.refreshBounds();
    const x = event.clientX - this.element.getBoundingClientRect().left;
    const y = event.clientY - this.element.getBoundingClientRect().top;
    this.lastPointerX = x;
    this.lastPointerY = y;
    this.controller.moveMouse(this.convertX(event), this.convertY(event));
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointerDown = false;
    this.controller.releaseMouse(this.convertX(event), this.convertY(event));
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      // Zoom at the cursor point, keeping it fixed (like PlanComponent)
      this.refreshBounds();
      const x = event.clientX - this.element.getBoundingClientRect().left;
      const y = event.clientY - this.element.getBoundingClientRect().top;
      const factor = event.deltaY < 0
        ? Math.pow(ZOOM_IN_FACTOR, Math.min(10, -event.deltaY / 100))
        : Math.pow(ZOOM_OUT_FACTOR, Math.min(10, event.deltaY / 100));
      this.viewport.zoomAt(factor, x, y);
      this.controller.zoom(factor);
    } else {
      this.onScroll?.(event.deltaX, event.deltaY);
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const fast = event.shiftKey;
    const pixelNudge = fast ? 10 : 1;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        this.controller.moveSelection(-pixelNudge / this.viewport.getScale(), 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        this.controller.moveSelection(pixelNudge / this.viewport.getScale(), 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.controller.moveSelection(0, -pixelNudge / this.viewport.getScale());
        break;
      case "ArrowDown":
        event.preventDefault();
        this.controller.moveSelection(0, pixelNudge / this.viewport.getScale());
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        this.controller.deleteSelection();
        break;
      case "Escape":
        event.preventDefault();
        this.controller.escape();
        break;
    }
  };

  // ------------------------------------------------------------- cursor

  /** The CSS cursor for a plan cursor type (fallback when no custom painter). */
  static cursorToCss(cursor: string): string {
    switch (cursor) {
      case "SELECTION":
        return "default";
      case "PANNING":
        return "grab";
      case "DRAW":
        return "crosshair";
      case "ROTATION":
        return "alias";
      case "RESIZE":
      case "HEIGHT":
      case "ELEVATION":
        return "ns-resize";
      case "MOVE":
        return "move";
      default:
        return "default";
    }
  }

  /**
   * Creates an overlay canvas that paints the custom cursor shape. Returns a
   * function to update the cursor type; call with null to hide.
   */
  createCursorOverlay(): (cursor: string | null) => void {
    if (this.cursorRenderer === null) {
      return (cursor) => {
        this.element.style.cursor = cursor === null ? "default" : PlanInputAdapter.cursorToCss(cursor);
      };
    }
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "10";
    canvas.style.left = "0";
    canvas.style.top = "0";
    this.element.style.position = this.element.style.position || "relative";
    this.element.style.cursor = "none";
    this.element.appendChild(canvas);
    this.cursorCanvas = canvas;
    const ctx = canvas.getContext("2d")!;
    return (cursor) => {
      const rect = this.element.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (cursor !== null) {
        this.cursorRenderer!(cursor, ctx, canvas.width, canvas.height);
      }
    };
  }
}
