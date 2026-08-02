/*
 * PlanPainter.ts
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
 * PlanPainter (task 5.1): immediate-mode painting abstraction over the plan.
 *
 * Mirrors the subset of Java2D Graphics2D that PlanComponent uses
 * (translate/scale/clip, path + shape fills and strokes, text, images) so the
 * paint pipeline (task 5.3) can target either Canvas 2D or SVG.
 *
 * Coordinate space: the painter works in **device space** after the viewport
 * transform has been applied (y-down, like Canvas2D/SVG). Plan code converts
 * y-up user coordinates via the viewport (task 5.2).
 */

/** An 0xRRGGBB or 0xAARRGGBB color. */
export type Color = number;

/** A fill: solid color or a texture image repeated in user-space bounds. */
export interface PaintStyle {
  color: Color;
  /** Texture image (CanvasImageSource or an SVG href/URL). */
  texture?: unknown;
  /** Texture bounds in the painter's current space (x, y, w, h). */
  textureBounds?: [number, number, number, number];
  /** Texture scale (default 1). */
  textureScale?: number;
  /** Whether the texture is a repeating pattern (default true). */
  textureRepeated?: boolean;
}

/** A stroke: color + width in the current space + optional dash pattern. */
export interface StrokeStyle {
  color: Color;
  width: number;
  dash?: number[];
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
}

/** A font used by drawText. */
export interface FontStyle {
  name: string | null;
  size: number;
  bold: boolean;
  italic: boolean;
}

export interface PlanPainter {
  // ------------------------------------------------------------- state
  save(): void;
  restore(): void;
  translate(dx: number, dy: number): void;
  scale(sx: number, sy: number): void;
  setClip(x: number, y: number, w: number, h: number): void;
  clearClip(): void;

  // ------------------------------------------------------------- styles
  setColor(color: Color): void;
  getColor(): Color;
  setStroke(width: number, dash?: number[]): void;
  setStrokeStyle(style: StrokeStyle): void;
  setAlpha(alpha: number): void;
  setPaint(style: PaintStyle): void;
  setFont(font: FontStyle | null): void;
  getFont(): FontStyle | null;

  // ------------------------------------------------------------- paths
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  cubicCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  fillPath(): void;
  strokePath(): void;

  // ------------------------------------------------------------- shapes
  fillRect(x: number, y: number, w: number, h: number): void;
  drawRect(x: number, y: number, w: number, h: number): void;
  drawLine(x1: number, y1: number, x2: number, y2: number): void;
  fillOval(x: number, y: number, w: number, h: number): void;
  drawOval(x: number, y: number, w: number, h: number): void;
  /** Draws an arc of the given oval (angles in degrees, counter-clockwise like Java). */
  drawArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void;
  fillArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void;

  // ------------------------------------------------------------- text
  /** Draws text with the current font/color; y is the baseline. */
  drawText(text: string, x: number, y: number): void;

  // ------------------------------------------------------------- images
  /**
   * Draws an image into the given rectangle in the current space. `image` is
   * a CanvasImageSource (Canvas 2D) or an href/URL (SVG).
   */
  drawImage(image: unknown, x: number, y: number, w: number, h: number, alpha?: number): void;
}
