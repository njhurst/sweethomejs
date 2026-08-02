/*
 * PlanInputAdapter.test.ts
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
 * PlanInputAdapter tests (task 5.5): pointer/keyboard/wheel events are
 * translated into PlanController calls with the Java modifier mapping.
 */
import { describe, expect, it } from "vitest";
import { Home, PlanController, UserPreferences } from "@sweethomejs/core";
import { PlanInputAdapter } from "./PlanInputAdapter.js";
import { PlanViewport } from "./PlanViewport.js";

class FakeElement {
  readonly handlers = new Map<string, (event: never) => void>();
  style: Record<string, string> = { position: "", cursor: "" };
  pointerCaptureId: number | null = null;

  addEventListener(type: string, handler: (event: never) => void): void {
    this.handlers.set(type, handler);
  }

  removeEventListener(type: string): void {
    this.handlers.delete(type);
  }

  setPointerCapture(id: number): void {
    this.pointerCaptureId = id;
  }

  getBoundingClientRect(): { left: number; top: number } {
    return { left: 0, top: 0 };
  }

  setAttribute(): void {}

  fire(type: string, event: Record<string, unknown>): void {
    const handler = this.handlers.get(type);
    if (handler !== undefined) {
      handler(event as never);
    }
  }
}

class FakePlanView {
  scale = 1;
  xOffset = 0;
  yOffset = 0;
  getScale(): number {
    return this.scale;
  }
  setScale(scale: number): void {
    this.scale = scale;
  }
  moveView(dx: number, dy: number): void {
    this.xOffset += dx;
    this.yOffset += dy;
  }
  convertXPixelToModel(x: number): number {
    return x;
  }
  convertYPixelToModel(y: number): number {
    return y;
  }
  convertXModelToScreen(x: number): number {
    return x;
  }
  convertYModelToScreen(y: number): number {
    return y;
  }
  getPixelLength(): number {
    return 1 / this.scale;
  }
  setResizeIndicatorVisible(_visible: boolean): void {}
  setCursor(_cursor: unknown): void {}
  setRectangleFeedback(): void {}
  deleteFeedback(): void {}
  setAlignmentFeedback(): void {}
}

function makeSetup(): { element: FakeElement; home: Home; controller: PlanController; viewport: PlanViewport; adapter: PlanInputAdapter } {
  const element = new FakeElement();
  const home = new Home();
  const planView = new FakePlanView();
  const controller = new PlanController(home, new UserPreferences(), {
    createPlanView: () => planView,
  } as never, null, null);
  const viewport = new PlanViewport();
  viewport.setScale(1);
  const adapter = new PlanInputAdapter({
    element: element as never,
    viewport,
    controller,
    updatePlanBounds: () => {},
  });
  return { element, home, controller, viewport, adapter };
}

describe("PlanInputAdapter (task 5.5)", () => {
  it("translates pointer down into a controller press with model coordinates", () => {
    const { element, controller, viewport } = makeSetup();
    viewport.setPlanBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
    // Model (100, 200) is at pixel (140, 240) with margin 40 and scale 1
    let pressed: { x: number; y: number; clickCount: number; shiftDown: boolean; duplicationActivated: boolean } | null = null;
    const originalPress = controller.pressMouse.bind(controller);
    controller.pressMouse = ((x: number, y: number, clickCount: number, shiftDown: boolean, _alignment: boolean, duplicationActivated: boolean) => {
      pressed = { x, y, clickCount, shiftDown, duplicationActivated };
      originalPress(x, y, clickCount, shiftDown, _alignment, duplicationActivated, false, null);
    }) as never;

    element.fire("pointerdown", { clientX: 140, clientY: 240, pointerId: 1, pointerType: "mouse", button: 0, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false });
    expect(pressed).not.toBeNull();
    expect(pressed!.x).toBeCloseTo(100, 6);
    expect(pressed!.y).toBeCloseTo(200, 6);
    expect(pressed!.clickCount).toBe(1);
    expect(pressed!.shiftDown).toBe(false);
  });

  it("maps modifiers like PlanComponent (Ctrl = duplication)", () => {
    const { element, controller } = makeSetup();
    let duplication = false;
    const originalPress = controller.pressMouse.bind(controller);
    controller.pressMouse = ((x: number, y: number, clickCount: number, shiftDown: boolean, _alignment: boolean, duplicationActivated: boolean) => {
      duplication = duplicationActivated;
      originalPress(x, y, clickCount, shiftDown, _alignment, duplicationActivated, false, null);
    }) as never;

    element.fire("pointerdown", { clientX: 0, clientY: 0, pointerId: 1, pointerType: "mouse", button: 0, shiftKey: false, altKey: false, ctrlKey: true, metaKey: false });
    expect(duplication).toBe(true);
  });

  it("counts double clicks within the interval", () => {
    const { element, controller } = makeSetup();
    const clickCounts: number[] = [];
    const originalPress = controller.pressMouse.bind(controller);
    controller.pressMouse = ((x: number, y: number, clickCount: number) => {
      clickCounts.push(clickCount);
      originalPress(x, y, clickCount, false, false, false, false, null);
    }) as never;

    const press = (): void => {
      element.fire("pointerdown", { clientX: 0, clientY: 0, pointerId: 1, pointerType: "mouse", button: 0, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false });
      element.fire("pointerup", { clientX: 0, clientY: 0 });
    };
    press();
    press();
    expect(clickCounts).toEqual([1, 2]);
  });

  it("translates arrow keys into moveSelection nudges (1px / fast 10px)", () => {
    const { element, controller, viewport } = makeSetup();
    viewport.setScale(2);
    const moves: Array<[number, number]> = [];
    controller.moveSelection = ((dx: number, dy: number) => {
      moves.push([dx, dy]);
    }) as never;

    element.fire("keydown", { key: "ArrowRight", shiftKey: false, preventDefault: () => {} });
    expect(moves[0]![0]).toBeCloseTo(0.5, 6); // 1px / scale
    element.fire("keydown", { key: "ArrowLeft", shiftKey: true, preventDefault: () => {} });
    expect(moves[1]![0]).toBeCloseTo(-5, 6); // -10px / scale
    element.fire("keydown", { key: "Delete", shiftKey: false, preventDefault: () => {} });
  });

  it("zooms at the cursor point on ctrl+wheel", () => {
    const { element, viewport } = makeSetup();
    viewport.setPlanBounds({ minX: 0, minY: 0, maxX: 1000, maxY: 1000 });
    viewport.setScale(1);
    const cursorX = 140;
    const cursorY = 240;
    const modelXBefore = viewport.convertXPixelToModel(cursorX);
    const modelYBefore = viewport.convertYPixelToModel(cursorY);

    element.fire("wheel", { clientX: cursorX, clientY: cursorY, deltaY: -100, ctrlKey: true, metaKey: false, preventDefault: () => {} });
    expect(viewport.getScale()).toBeGreaterThan(1);
    expect(viewport.convertXPixelToModel(cursorX)).toBeCloseTo(modelXBefore, 4);
    expect(viewport.convertYPixelToModel(cursorY)).toBeCloseTo(modelYBefore, 4);
  });

  it("maps plan cursor types to CSS cursors", () => {
    expect(PlanInputAdapter.cursorToCss("DRAW")).toBe("crosshair");
    expect(PlanInputAdapter.cursorToCss("PANNING")).toBe("grab");
    expect(PlanInputAdapter.cursorToCss("SELECTION")).toBe("default");
  });
});
