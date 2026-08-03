/*
 * PDFPainter.ts
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
 * PDF painter (task 8.7): implements the PlanPainter interface with pdf-lib,
 * turning the plan pipeline's model-space drawing into vector PDF operators.
 * Y is flipped (canvas-style y-down → PDF y-up); the current transform maps
 * model units (cm) to PDF points.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import type { PlanPainter, FontStyle } from "@sweethomejs/render2d";

interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function multiply(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function apply(matrix: Matrix, x: number, y: number): [number, number] {
  return [matrix.a * x + matrix.c * y + matrix.e, matrix.b * x + matrix.d * y + matrix.f];
}

/** Maps a color number (0xRRGGBB) to a pdf-lib RGB. */
function toRgb(color: number): RGB {
  return rgb(((color >> 16) & 0xff) / 255, ((color >> 8) & 0xff) / 255, (color & 0xff) / 255);
}

export class PDFPainter implements PlanPainter {
  private readonly page: PDFPage;
  private readonly document: PDFDocument;
  private readonly fonts = new Map<string, PDFFont>();
  private readonly pageHeight: number;
  private readonly matrix: Matrix[] = [IDENTITY];
  private color = 0x000000;
  private strokeWidth = 1;
  private dash: number[] = [];
  private font: FontStyle | null = null;
  private path: Array<[number, number, number, number]> = []; // command, params

  constructor(document: PDFDocument, page: PDFPage) {
    this.document = document;
    this.page = page;
    this.pageHeight = page.getHeight();
  }

  /** Pre-embeds the standard fonts so drawText can run synchronously. */
  static async create(document: PDFDocument, page: PDFPage): Promise<PDFPainter> {
    const painter = new PDFPainter(document, page);
    const variants: Array<[string, StandardFonts]> = [
      ["helvetica", StandardFonts.Helvetica],
      ["helvetica-bold", StandardFonts.HelveticaBold],
      ["times", StandardFonts.TimesRoman],
      ["times-bold", StandardFonts.TimesRomanBold],
      ["courier", StandardFonts.Courier],
      ["courier-bold", StandardFonts.CourierBold],
    ];
    for (const [key, standard] of variants) {
      painter.fonts.set(key, await document.embedFont(standard));
    }
    return painter;
  }

  private fontFor(name: string | null, bold: boolean): PDFFont {
    const lower = (name ?? "helvetica").toLowerCase();
    const key = lower.includes("times") || lower.includes("serif")
      ? bold ? "times-bold" : "times"
      : lower.includes("courier") || lower.includes("mono")
        ? bold ? "courier-bold" : "courier"
        : bold ? "helvetica-bold" : "helvetica";
    return this.fonts.get(key)!;
  }

  // ------------------------------------------------------------- state

  save(): void {
    this.matrix.push(this.matrix[this.matrix.length - 1]!);
  }

  restore(): void {
    if (this.matrix.length > 1) {
      this.matrix.pop();
    }
  }

  translate(dx: number, dy: number): void {
    this.matrix[this.matrix.length - 1] = multiply(this.matrix[this.matrix.length - 1]!, {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: dx,
      f: dy,
    });
  }

  scale(sx: number, sy: number): void {
    this.matrix[this.matrix.length - 1] = multiply(this.matrix[this.matrix.length - 1]!, {
      a: sx,
      b: 0,
      c: 0,
      d: sy,
      e: 0,
      f: 0,
    });
  }

  setClip(): void {}
  clearClip(): void {}

  // ------------------------------------------------------------- styles

  setColor(color: number): void {
    this.color = color;
  }

  getColor(): number {
    return this.color;
  }

  setStroke(width: number, dash?: number[]): void {
    this.strokeWidth = width;
    this.dash = dash ?? [];
  }

  setStrokeStyle(style: { color: number; width: number; dash: number[] }): void {
    this.color = style.color;
    this.strokeWidth = style.width;
    this.dash = style.dash;
  }

  setAlpha(): void {}

  setPaint(style: { color: number }): void {
    this.color = style.color;
  }

  setFont(font: FontStyle | null): void {
    this.font = font;
  }

  getFont(): FontStyle | null {
    return this.font;
  }

  // ------------------------------------------------------------- paths

  private toPdf(x: number, y: number): [number, number] {
    const m = this.matrix[this.matrix.length - 1]!;
    const [px, py] = apply(m, x, y);
    return [px, this.pageHeight - py];
  }

  beginPath(): void {
    this.path = [];
  }

  moveTo(x: number, y: number): void {
    this.path.push([0, x, y, 0]);
  }

  lineTo(x: number, y: number): void {
    this.path.push([1, x, y, 0]);
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    // Approximate with the quad as two cubics is complex; emit as lines (the
    // plan pipeline only draws straight segments today).
    this.path.push([1, cx, cy, 0], [1, x, y, 0]);
  }

  cubicCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.path.push([1, c1x, c1y, 0], [1, c2x, c2y, 0], [1, x, y, 0]);
  }

  closePath(): void {
    this.path.push([2, 0, 0, 0]);
  }

  private pathSvg(): string {
    let d = "";
    for (const [command, x, y] of this.path) {
      const [px, py] = this.toPdf(x, y);
      if (command === 0) {
        d += `M${px.toFixed(3)} ${py.toFixed(3)} `;
      } else if (command === 1) {
        d += `L${px.toFixed(3)} ${py.toFixed(3)} `;
      } else {
        d += "Z ";
      }
    }
    return d;
  }

  fillPath(): void {
    const d = this.pathSvg();
    if (d.length === 0) return;
    this.page.drawSvgPath(d, { color: toRgb(this.color), borderWidth: 0 });
  }

  strokePath(): void {
    const d = this.pathSvg();
    if (d.length === 0) return;
    const options: { borderColor: RGB; borderWidth: number; borderDashArray?: number[] } = {
      borderColor: toRgb(this.color),
      borderWidth: this.strokeWidth,
    };
    if (this.dash.length > 0) {
      options.borderDashArray = this.dash;
    }
    this.page.drawSvgPath(d, options);
  }

  // ------------------------------------------------------------- shapes

  fillRect(x: number, y: number, w: number, h: number): void {
    const [px, py] = this.toPdf(x, y);
    const [, py2] = this.toPdf(x + w, y + h);
    this.page.drawRectangle({
      x: Math.min(px, px),
      y: Math.min(py2, py),
      width: Math.abs(w * this.matrix[this.matrix.length - 1]!.a || 1),
      height: Math.abs(h * this.matrix[this.matrix.length - 1]!.d || 1),
      color: toRgb(this.color),
    });
  }

  drawRect(x: number, y: number, w: number, h: number): void {
    const [px, py] = this.toPdf(x, y);
    const [, py2] = this.toPdf(x + w, y + h);
    this.page.drawRectangle({
      x: px,
      y: Math.min(py2, py),
      width: Math.abs(w * this.matrix[this.matrix.length - 1]!.a || 1),
      height: Math.abs(h * this.matrix[this.matrix.length - 1]!.d || 1),
      borderColor: toRgb(this.color),
      borderWidth: this.strokeWidth,
    });
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const [px1, py1] = this.toPdf(x1, y1);
    const [px2, py2] = this.toPdf(x2, y2);
    const options: { start: { x: number; y: number }; end: { x: number; y: number }; thickness: number; color: RGB; dashArray?: number[] } = {
      start: { x: px1, y: py1 },
      end: { x: px2, y: py2 },
      thickness: this.strokeWidth,
      color: toRgb(this.color),
    };
    if (this.dash.length > 0) {
      options.dashArray = this.dash;
    }
    this.page.drawLine(options);
  }

  fillOval(x: number, y: number, w: number, h: number): void {
    const [px, py] = this.toPdf(x, y);
    const [, py2] = this.toPdf(x + w, y + h);
    this.page.drawEllipse({
      x: px + Math.abs(w * this.matrix[this.matrix.length - 1]!.a || 1) / 2,
      y: Math.min(py2, py) + Math.abs(h * this.matrix[this.matrix.length - 1]!.d || 1) / 2,
      xScale: Math.abs(w * this.matrix[this.matrix.length - 1]!.a || 1) / 2,
      yScale: Math.abs(h * this.matrix[this.matrix.length - 1]!.d || 1) / 2,
      color: toRgb(this.color),
    });
  }

  drawOval(x: number, y: number, w: number, h: number): void {
    const [px, py] = this.toPdf(x, y);
    const [, py2] = this.toPdf(x + w, y + h);
    this.page.drawEllipse({
      x: px + Math.abs(w * this.matrix[this.matrix.length - 1]!.a || 1) / 2,
      y: Math.min(py2, py) + Math.abs(h * this.matrix[this.matrix.length - 1]!.d || 1) / 2,
      xScale: Math.abs(w * this.matrix[this.matrix.length - 1]!.a || 1) / 2,
      yScale: Math.abs(h * this.matrix[this.matrix.length - 1]!.d || 1) / 2,
      borderColor: toRgb(this.color),
      borderWidth: this.strokeWidth,
    });
  }

  drawArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void {
    // Approximate arcs with line segments (the pipeline only emits straight
    // segments today; kept for completeness).
    const steps = Math.max(4, Math.ceil(Math.abs(arcExtent) / 15));
    this.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (startAngle + (arcExtent * i) / steps) * (Math.PI / 180);
      const px = x + w / 2 + (w / 2) * Math.cos(angle);
      const py = y + h / 2 - (h / 2) * Math.sin(angle);
      if (i === 0) this.moveTo(px, py);
      else this.lineTo(px, py);
    }
    this.strokePath();
  }

  fillArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void {
    const steps = Math.max(4, Math.ceil(Math.abs(arcExtent) / 15));
    this.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (startAngle + (arcExtent * i) / steps) * (Math.PI / 180);
      const px = x + w / 2 + (w / 2) * Math.cos(angle);
      const py = y + h / 2 - (h / 2) * Math.sin(angle);
      if (i === 0) this.moveTo(px, py);
      else this.lineTo(px, py);
    }
    this.closePath();
    this.fillPath();
  }

  // ------------------------------------------------------------- text

  drawText(text: string, x: number, y: number): void {
    if (text.length === 0) return;
    const font = this.font;
    const size = (font?.size ?? 10) * Math.abs(this.matrix[this.matrix.length - 1]!.a || 1);
    const [px, py] = this.toPdf(x, y);
    this.page.drawText(text, {
      x: px,
      y: py,
      size,
      font: this.fontFor(font?.name ?? null, font?.bold ?? false),
      color: toRgb(this.color),
    });
  }

  drawImage(): void {}
}
