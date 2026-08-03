/*
 * PrintPreviewView.tsx
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
 * Print preview (task 8.6): paper format / orientation / margins / scale with
 * a live preview painted by the plan pipeline at the paper size, and a Print
 * button that renders the plan into a print-only layer and calls
 * window.print() (the browser's paper dialog).
 */
import { useEffect, useRef, useState } from "react";
import type { Home, UserPreferences } from "@sweethomejs/core";
import {
  PAPER_FORMATS,
  PX_PER_CM,
  computePlanBounds,
  getPrintedPlanScale,
  paperSize,
  paintPlanForPrint,
} from "@sweethomejs/render2d";
import { Canvas2DPainter } from "@sweethomejs/render2d";
import { PlanPainterPipeline } from "@sweethomejs/render2d";

export interface PrintPreviewViewProps {
  home: Home;
  preferences: UserPreferences;
  onClose: () => void;
}

export function PrintPreviewView(props: PrintPreviewViewProps): React.JSX.Element {
  const { home, preferences } = props;
  const [formatIndex, setFormatIndex] = useState(1); // A4
  const [orientation, setOrientation] = useState("LANDSCAPE");
  const [marginCm, setMarginCm] = useState(1.5);
  const [autoScale, setAutoScale] = useState(true);
  const [scaleInverse, setScaleInverse] = useState(100);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const format = PAPER_FORMATS[formatIndex]!;
  const size = paperSize(format, orientation);
  const bounds = computePlanBounds(home);
  const autoScaleInverse = getPrintedPlanScale(
    bounds,
    size.widthCm - 2 * marginCm,
    size.heightCm - 2 * marginCm,
  );
  const effectiveScaleInverse = autoScale ? (autoScaleInverse > 0 ? Math.round(1 / autoScaleInverse) : scaleInverse) : scaleInverse;

  // Paint the preview when settings change
  useEffect(() => {
    const canvas = previewRef.current;
    if (canvas === null) {
      return;
    }
    // Fit the paper into the preview box (max 640 px wide)
    const maxWidth = 640;
    const scalePx = Math.min(maxWidth / (size.widthCm * PX_PER_CM), 1);
    canvas.width = Math.max(1, Math.round(size.widthCm * PX_PER_CM * scalePx));
    canvas.height = Math.max(1, Math.round(size.heightCm * PX_PER_CM * scalePx));
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      return;
    }
    ctx.save();
    ctx.scale(scalePx, scalePx);
    const painter = new Canvas2DPainter(ctx);
    const pipeline = new PlanPainterPipeline();
    paintPlanForPrint(
      painter,
      pipeline,
      home,
      preferences,
      size,
      { top: marginCm, left: marginCm, bottom: marginCm, right: marginCm },
      effectiveScaleInverse,
    );
    ctx.restore();
  }, [home, preferences, size.widthCm, size.heightCm, marginCm, effectiveScaleInverse]);

  const print = (): void => {
    // Render the plan at full paper resolution into the print layer
    const width = Math.round(size.widthCm * PX_PER_CM);
    const height = Math.round(size.heightCm * PX_PER_CM);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      const painter = new Canvas2DPainter(ctx);
      const pipeline = new PlanPainterPipeline();
      paintPlanForPrint(
        painter,
        pipeline,
        home,
        preferences,
        size,
        { top: marginCm, left: marginCm, bottom: marginCm, right: marginCm },
        effectiveScaleInverse,
      );
    }
    const layer = document.getElementById("sh-print-layer");
    if (layer !== null) {
      layer.innerHTML = "";
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.style.width = "100%";
      layer.appendChild(img);
    }
    window.print();
  };

  return (
    <div className="sh-print-preview" data-testid="print-preview">
      <div className="sh-print-controls">
        <label>
          Format
          <select value={formatIndex} onChange={(event) => setFormatIndex(Number(event.target.value))}>
            {PAPER_FORMATS.map((paper, index) => (
              <option key={paper.name} value={index}>{paper.name}</option>
            ))}
          </select>
        </label>
        <label>
          Orientation
          <select value={orientation} onChange={(event) => setOrientation(event.target.value)}>
            <option value="PORTRAIT">Portrait</option>
            <option value="LANDSCAPE">Landscape</option>
            <option value="REVERSE_LANDSCAPE">Reverse landscape</option>
          </select>
        </label>
        <label>
          Margin (cm)
          <input
            type="number"
            min="0"
            step="0.5"
            value={marginCm}
            onChange={(event) => setMarginCm(Number(event.target.value))}
          />
        </label>
        <label>
          <input type="checkbox" checked={autoScale} onChange={(event) => setAutoScale(event.target.checked)} />
          Fit to paper
        </label>
        <label>
          Scale 1:
          <input
            type="number"
            min="1"
            value={effectiveScaleInverse}
            disabled={autoScale}
            onChange={(event) => setScaleInverse(Number(event.target.value))}
          />
        </label>
        <div className="sh-print-buttons">
          <button className="sh-toolbar-button" onClick={print}>Print…</button>
          <button className="sh-toolbar-button" onClick={props.onClose}>Close</button>
        </div>
      </div>
      <div className="sh-print-canvas-wrap">
        <canvas ref={previewRef} data-testid="print-preview-canvas" />
      </div>
    </div>
  );
}
