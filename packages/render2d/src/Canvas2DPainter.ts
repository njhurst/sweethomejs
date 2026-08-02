/*
 * Canvas2DPainter.ts
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
 * Canvas2DPainter (task 5.1): PlanPainter implemented on the Canvas 2D API.
 * The painter does NOT own the context transform reset — the viewport (5.2)
 * installs the base HiDPI transform and the painter composes on top.
 */
import type { Color, PaintStyle, PlanPainter, StrokeStyle, FontStyle } from "./PlanPainter.js";

const clampAlpha = (a: number): number => Math.max(0, Math.min(1, a));

function colorToCss(color: Color, alpha: number): string {
  // 0xRRGGBB has no alpha byte (alpha = 255); 0xAARRGGBB carries it in the top byte
  const hasAlphaByte = (color >>> 0) > 0xffffff;
  const a = hasAlphaByte ? (color >>> 24) & 0xff : 255;
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  const effectiveAlpha = alpha * (a / 255);
  return `rgba(${r},${g},${b},${clampAlpha(effectiveAlpha)})`;
}

export class Canvas2DPainter implements PlanPainter {
  private readonly ctx: CanvasRenderingContext2D;
  private currentColor: Color = 0x000000;
  private currentAlpha = 1;
  private currentStrokeWidth = 1;
  private currentDash: number[] = [];
  private currentFont: FontStyle | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // ------------------------------------------------------------- state
  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
    // Restore the tracked styles from the context after the pop
    this.currentColor = 0x000000;
    this.currentAlpha = 1;
    this.currentStrokeWidth = 1;
    this.currentDash = [];
    this.currentFont = null;
  }

  translate(dx: number, dy: number): void {
    this.ctx.translate(dx, dy);
  }

  scale(sx: number, sy: number): void {
    this.ctx.scale(sx, sy);
  }

  setClip(x: number, y: number, w: number, h: number): void {
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
  }

  clearClip(): void {
    this.ctx.restore();
  }

  // ------------------------------------------------------------- styles
  setColor(color: Color): void {
    this.currentColor = color;
    this.ctx.fillStyle = colorToCss(color, this.currentAlpha);
    this.ctx.strokeStyle = colorToCss(color, this.currentAlpha);
  }

  getColor(): Color {
    return this.currentColor;
  }

  setStroke(width: number, dash?: number[]): void {
    this.currentStrokeWidth = width;
    this.currentDash = dash ?? [];
    this.ctx.lineWidth = width;
    this.ctx.setLineDash(dash ?? []);
  }

  setStrokeStyle(style: StrokeStyle): void {
    this.setColor(style.color);
    this.setStroke(style.width, style.dash);
    this.ctx.lineCap = style.lineCap ?? "butt";
    this.ctx.lineJoin = style.lineJoin ?? "miter";
  }

  setAlpha(alpha: number): void {
    this.currentAlpha = alpha;
    this.ctx.globalAlpha = clampAlpha(alpha);
  }

  setPaint(style: PaintStyle): void {
    if (style.texture !== undefined) {
      const image = style.texture as CanvasImageSource;
      const [tx, ty, tw, th] = style.textureBounds ?? [0, 0, 1, 1];
      const scale = style.textureScale ?? 1;
      const pattern = this.ctx.createPattern(image, "repeat");
      if (pattern !== null) {
        pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, tx * scale, ty * scale]));
        this.ctx.fillStyle = pattern;
        this.ctx.strokeStyle = pattern;
      } else {
        this.setColor(style.color);
      }
      void tw;
      void th;
    } else {
      this.setColor(style.color);
    }
  }

  setFont(font: FontStyle | null): void {
    this.currentFont = font;
    if (font === null) {
      this.ctx.font = "10px sans-serif";
      return;
    }
    const style = `${font.italic ? "italic " : ""}${font.bold ? "bold " : ""}${font.size}px "${font.name ?? "sans-serif"}"`;
    this.ctx.font = style;
  }

  getFont(): FontStyle | null {
    return this.currentFont;
  }

  // ------------------------------------------------------------- paths
  beginPath(): void {
    this.ctx.beginPath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.ctx.quadraticCurveTo(cx, cy, x, y);
  }

  cubicCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x, y);
  }

  closePath(): void {
    this.ctx.closePath();
  }

  fillPath(): void {
    this.ctx.fill();
  }

  strokePath(): void {
    this.ctx.stroke();
  }

  // ------------------------------------------------------------- shapes
  fillRect(x: number, y: number, w: number, h: number): void {
    this.ctx.fillRect(x, y, w, h);
  }

  drawRect(x: number, y: number, w: number, h: number): void {
    this.ctx.strokeRect(x, y, w, h);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  fillOval(x: number, y: number, w: number, h: number): void {
    this.ctx.beginPath();
    this.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawOval(x: number, y: number, w: number, h: number): void {
    this.ctx.beginPath();
    this.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void {
    this.ctx.beginPath();
    // Canvas angles are clockwise from +x; Java arcs are counter-clockwise in
    // a y-down space. Java angles: 0° = +x, 90° = -y. In canvas (y-down) that
    // is also counter-clockwise from +x, so we negate.
    this.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, (-startAngle * Math.PI) / 180, (-(startAngle + arcExtent) * Math.PI) / 180, true);
    this.ctx.stroke();
  }

  fillArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void {
    this.ctx.beginPath();
    this.ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, (-startAngle * Math.PI) / 180, (-(startAngle + arcExtent) * Math.PI) / 180, true);
    this.ctx.fill();
  }

  // ------------------------------------------------------------- text
  drawText(text: string, x: number, y: number): void {
    this.ctx.fillText(text, x, y);
  }

  // ------------------------------------------------------------- images
  drawImage(image: unknown, x: number, y: number, w: number, h: number, alpha?: number): void {
    const previousAlpha = this.currentAlpha;
    if (alpha !== undefined) {
      this.ctx.globalAlpha = clampAlpha(this.currentAlpha * alpha);
    }
    this.ctx.drawImage(image as CanvasImageSource, x, y, w, h);
    if (alpha !== undefined) {
      this.ctx.globalAlpha = previousAlpha;
    }
  }
}
