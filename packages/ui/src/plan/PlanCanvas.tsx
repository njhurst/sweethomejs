/*
 * PlanCanvas.tsx
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
 * PlanCanvas (task 7.1): React component hosting the interactive plan view.
 * Creates the PlanCanvasView on a <canvas>, wires the render loop and the
 * input adapter, and re-renders on model changes.
 */
import { useEffect, useRef } from "react";
import type { Home, UserPreferences, PlanController } from "@sweethomejs/core";
import { PlanCanvasView } from "./PlanCanvasView.js";

export interface PlanCanvasProps {
  home: Home;
  preferences: UserPreferences;
  controller: PlanController;
  onReady?: (view: PlanCanvasView) => void;
}

export function PlanCanvas(props: PlanCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<PlanCanvasView | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const view = new PlanCanvasView(props.home, props.preferences, props.controller, {
      canvas,
      devicePixelRatio: window.devicePixelRatio || 1,
      onDirty: () => {
        // Schedule a paint on the next frame
        requestAnimationFrame(() => {
          if (viewRef.current !== null && viewRef.current.isDirty()) {
            viewRef.current.paint();
          }
        });
      },
    });
    viewRef.current = view;

    // Size the canvas to its container and attach input
    const resize = (): void => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect !== undefined && rect !== null) {
        view.resize(rect.width, rect.height);
        view.updatePlanBounds();
        view.paint();
      }
    };
    resize();
    // Zoom-to-fit the home content on first display (like Java's initial view)
    {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect !== undefined && rect !== null) {
        view.fitHome(rect.width, rect.height);
      }
    }
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement !== null) {
      observer.observe(canvas.parentElement);
    }
    view.attachInput();
    props.controller.setView(view);
    props.onReady?.(view);

    // Repaint on model changes
    const homeListener = (): void => view.requestPaint();
    const subscription = { collectionChanged: homeListener };
    props.home.addFurnitureListener(subscription);
    props.home.addWallsListener(subscription);
    props.home.addRoomsListener(subscription);
    props.home.addSelectionListener(homeListener);

    return () => {
      observer.disconnect();
      view.destroy();
      props.home.removeFurnitureListener(subscription);
      props.home.removeWallsListener(subscription);
      props.home.removeRoomsListener(subscription);
      viewRef.current = null;
    };
    // Re-create the view when the session's home/controller changes (Open/New).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.home, props.controller, props.preferences]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%", outline: "none" }}
      data-testid="plan-canvas"
    />
  );
}
