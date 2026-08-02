/*
 * PlanCanvasView.test.ts
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
 * PlanCanvasView tests (task 7.1): the Canvas2D PlanView implementation maps
 * controller feedback calls to viewport/state without DOM dependencies.
 */
import { describe, expect, it } from "vitest";
import { Home, UserPreferences, PlanController, Wall } from "@sweethomejs/core";
import { PlanCanvasView, type PlanCanvasHost } from "./PlanCanvasView.js";

function makeView(): { view: PlanCanvasView; host: PlanCanvasHost; home: Home } {
  const home = new Home();
  home.addWall(new Wall("w1", 0, 0, 1000, 0, 10, 250));
  const controller = new PlanController(home, new UserPreferences(), {
    createPlanView: () => ({}) as never,
  } as never, null, null);
  const host: PlanCanvasHost = {
    canvas: { clientWidth: 800, clientHeight: 600, style: {}, getContext: () => null, setAttribute: () => {} } as never,
    devicePixelRatio: 1,
    onDirty: () => {},
  };
  const view = new PlanCanvasView(home, new UserPreferences(), controller, host);
  return { view, host, home };
}

describe("PlanCanvasView (task 7.1)", () => {
  it("converts pixels to model coordinates through the viewport", () => {
    const { view, host } = makeView();
    view.resize(800, 600);
    view.updatePlanBounds();
    view.setScale(0.5);
    // Model (0, 0) maps to the margin position: 40cm * 0.5 = 20px
    expect(view.convertXPixelToModel(20)).toBeCloseTo(0, 4);
    expect(view.convertXModelToScreen(0)).toBeCloseTo(20, 4);
    expect(view.getPixelLength()).toBeCloseTo(2, 4);
    void host;
  });

  it("stores feedback state and requests repaints", () => {
    const { view, host } = makeView();
    let dirtyCount = 0;
    const host2: PlanCanvasHost = {
      canvas: { clientWidth: 800, clientHeight: 600, style: {}, getContext: () => null, setAttribute: () => {} } as never,
      devicePixelRatio: 1,
      onDirty: () => dirtyCount++,
    };
    const view2 = new PlanCanvasView(makeView().home, new UserPreferences(), makeView().view["controller"] as never, host2);
    void view;
    view2.setRectangleFeedback(0, 0, 100, 50);
    view2.setToolTipFeedback("Length: 250 cm", 10, 10);
    view2.setCursor("DRAW" as never);
    view2.deleteFeedback();
    expect(dirtyCount).toBeGreaterThanOrEqual(3);
    view2.destroy();
  });

  it("maps cursor types to CSS cursors", () => {
    const { view, host } = makeView();
    view.setCursor("DRAW" as never);
    expect(host.canvas.style.cursor).toBe("crosshair");
    view.setCursor("PANNING" as never);
    expect(host.canvas.style.cursor).toBe("grab");
  });

  it("updates plan bounds from the home content", () => {
    const { view } = makeView();
    view.updatePlanBounds();
    const bounds = view.getViewport().getPlanBounds();
    expect(bounds.maxX).toBeCloseTo(1000, 4);
    expect(bounds.minX).toBeCloseTo(0, 4);
  });
});
