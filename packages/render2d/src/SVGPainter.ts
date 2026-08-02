/*
 * SVGPainter.ts
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
 * SVGPainter (task 5.1): PlanPainter implemented as an SVG document builder.
 * Produces a standalone SVG string with the same paint semantics as the
 * Canvas 2D backend (used for export, task 5.8).
 */
import type { Color, PaintStyle, PlanPainter, StrokeStyle, FontStyle } from "./PlanPainter.js";

function colorToHex(color: Color): string {
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function colorToRgba(color: Color, alpha: number): string {
  // 0xRRGGBB has no alpha byte (alpha = 255); 0xAARRGGBB carries it in the top byte
  const hasAlphaByte = color > 0xffffff;
  const a = hasAlphaByte ? (color >>> 24) & 0xff : 255;
  const r = (color >>> 16) & 0xff;
  const g = (color >>> 8) & 0xff;
  const b = color & 0xff;
  const effectiveAlpha = alpha * (a / 255);
  return `rgba(${r},${g},${b},${effectiveAlpha})`;
}

interface SvgElement {
  tag: string;
  attributes: Record<string, string>;
  children: SvgElement[];
}

function el(tag: string, attributes: Record<string, string> = {}, children: SvgElement[] = []): SvgElement {
  return { tag, attributes, children };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SVGExportOptions {
  /** SVG width in px. */
  width: number;
  /** SVG height in px. */
  height: number;
}

export class SVGPainter implements PlanPainter {
  private readonly elements: SvgElement[] = [];
  private readonly stack: Array<{ transform: string; clip: string | null }> = [];
  private currentTransform = "";
  private currentClip: string | null = null;
  private currentPath = "";
  private currentColor: Color = 0x000000;
  private currentAlpha = 1;
  private currentStroke: { width: number; dash: number[]; color: Color } = { width: 1, dash: [], color: 0x000000 };
  private currentFont: FontStyle | null = null;
  private currentPaintTexture: { image: unknown; bounds: [number, number, number, number] } | null = null;

  // ------------------------------------------------------------- state
  save(): void {
    this.stack.push({ transform: this.currentTransform, clip: this.currentClip });
  }

  restore(): void {
    const state = this.stack.pop();
    if (state !== undefined) {
      this.currentTransform = state.transform;
      this.currentClip = state.clip;
    }
  }

  translate(dx: number, dy: number): void {
    this.currentTransform += ` translate(${dx} ${dy})`;
  }

  scale(sx: number, sy: number): void {
    this.currentTransform += ` scale(${sx} ${sy})`;
  }

  setClip(x: number, y: number, w: number, h: number): void {
    this.currentClip = `rect(${x},${y},${w},${h})`;
  }

  clearClip(): void {
    this.currentClip = null;
  }

  // ------------------------------------------------------------- styles
  setColor(color: Color): void {
    this.currentColor = color;
  }

  getColor(): Color {
    return this.currentColor;
  }

  setStroke(width: number, dash?: number[]): void {
    this.currentStroke = { width, dash: dash ?? [], color: this.currentColor };
  }

  setStrokeStyle(style: StrokeStyle): void {
    this.currentStroke = { width: style.width, dash: style.dash ?? [], color: style.color };
    this.currentColor = style.color;
  }

  setAlpha(alpha: number): void {
    this.currentAlpha = alpha;
  }

  setPaint(style: PaintStyle): void {
    this.currentColor = style.color;
    if (style.texture !== undefined) {
      this.currentPaintTexture = {
        image: style.texture,
        bounds: style.textureBounds ?? [0, 0, 1, 1],
      };
    } else {
      this.currentPaintTexture = null;
    }
  }

  setFont(font: FontStyle | null): void {
    this.currentFont = font;
  }

  getFont(): FontStyle | null {
    return this.currentFont;
  }

  // ------------------------------------------------------------- paths
  beginPath(): void {
    this.currentPath = "";
  }

  moveTo(x: number, y: number): void {
    this.currentPath += `M ${x} ${y} `;
  }

  lineTo(x: number, y: number): void {
    this.currentPath += `L ${x} ${y} `;
  }

  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.currentPath += `Q ${cx} ${cy} ${x} ${y} `;
  }

  cubicCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void {
    this.currentPath += `C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y} `;
  }

  closePath(): void {
    this.currentPath += "Z ";
  }

  private transformAttribute(): string {
    return this.currentTransform.trim();
  }

  fillPath(): void {
    const attributes: Record<string, string> = { d: this.currentPath.trim() };
    if (this.currentPaintTexture !== null) {
      attributes["fill"] = `url(#pattern-${this.patternCounter()})`;
    } else {
      attributes["fill"] = colorToRgba(this.currentColor, this.currentAlpha);
    }
    this.emit("path", attributes);
    this.currentPath = "";
  }

  strokePath(): void {
    const attributes: Record<string, string> = {
      d: this.currentPath.trim(),
      fill: "none",
      stroke: colorToRgba(this.currentStroke.color, this.currentAlpha),
      "stroke-width": String(this.currentStroke.width),
    };
    if (this.currentStroke.dash.length > 0) {
      attributes["stroke-dasharray"] = this.currentStroke.dash.join(",");
    }
    this.emit("path", attributes);
    this.currentPath = "";
  }

  // ------------------------------------------------------------- shapes
  private emit(tag: string, attributes: Record<string, string>): void {
    const attrs: Record<string, string> = { ...attributes };
    const transform = this.transformAttribute();
    if (transform !== "") {
      attrs["transform"] = transform;
    }
    this.elements.push(el(tag, attrs));
  }

  private patternCounterValue = 0;

  private patternCounter(): number {
    return this.patternCounterValue++;
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    if (this.currentPaintTexture !== null) {
      this.fillPathRect(x, y, w, h);
      return;
    }
    this.emit("rect", { x: String(x), y: String(y), width: String(w), height: String(h), fill: colorToRgba(this.currentColor, this.currentAlpha) });
  }

  private fillPathRect(x: number, y: number, w: number, h: number): void {
    this.beginPath();
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
    this.fillPath();
  }

  drawRect(x: number, y: number, w: number, h: number): void {
    this.emit("rect", { x: String(x), y: String(y), width: String(w), height: String(h), fill: "none", stroke: colorToRgba(this.currentStroke.color, this.currentAlpha), "stroke-width": String(this.currentStroke.width) });
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.emit("line", { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), stroke: colorToRgba(this.currentStroke.color, this.currentAlpha), "stroke-width": String(this.currentStroke.width) });
  }

  fillOval(x: number, y: number, w: number, h: number): void {
    this.emit("ellipse", { cx: String(x + w / 2), cy: String(y + h / 2), rx: String(w / 2), ry: String(h / 2), fill: colorToRgba(this.currentColor, this.currentAlpha) });
  }

  drawOval(x: number, y: number, w: number, h: number): void {
    this.emit("ellipse", { cx: String(x + w / 2), cy: String(y + h / 2), rx: String(w / 2), ry: String(h / 2), fill: "none", stroke: colorToRgba(this.currentStroke.color, this.currentAlpha), "stroke-width": String(this.currentStroke.width) });
  }

  drawArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void {
    // SVG arcs: (x1,y1) → (x2,y2) with rx/ry; approximate with a path
    const d = arcPathData(x, y, w, h, startAngle, arcExtent);
    this.emit("path", { d, fill: "none", stroke: colorToRgba(this.currentStroke.color, this.currentAlpha), "stroke-width": String(this.currentStroke.width) });
  }

  fillArc(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): void {
    const d = arcPathData(x, y, w, h, startAngle, arcExtent);
    this.emit("path", { d, fill: colorToRgba(this.currentColor, this.currentAlpha) });
  }

  // ------------------------------------------------------------- text
  drawText(text: string, x: number, y: number): void {
    const attributes: Record<string, string> = {
      x: String(x),
      y: String(y),
      fill: colorToRgba(this.currentColor, this.currentAlpha),
    };
    if (this.currentFont !== null) {
      const weight = this.currentFont.bold ? "bold" : "normal";
      const style = this.currentFont.italic ? "italic" : "normal";
      attributes["font-size"] = String(this.currentFont.size);
      attributes["font-family"] = this.currentFont.name ?? "sans-serif";
      attributes["font-weight"] = weight;
      attributes["font-style"] = style;
    }
    this.elements.push(el("text", attributes, [{ tag: "#text", attributes: {}, children: [] }]));
  }

  // ------------------------------------------------------------- images
  drawImage(image: unknown, x: number, y: number, w: number, h: number, alpha?: number): void {
    const href = typeof image === "string" ? image : "#image";
    const attributes: Record<string, string> = {
      href,
      x: String(x),
      y: String(y),
      width: String(w),
      height: String(h),
    };
    if (alpha !== undefined) {
      attributes["opacity"] = String(alpha);
    }
    this.emit("image", attributes);
  }

  // ------------------------------------------------------------- output
  /** Returns the accumulated SVG elements (for tests). */
  getElements(): SvgElement[] {
    return this.elements;
  }

  /** Serializes the accumulated elements as a standalone SVG document. */
  toString(options: SVGExportOptions = { width: 100, height: 100 }): string {
    const defs = this.collectPatternDefs();
    const body = this.elements.map((node) => serializeNode(node)).join("\n");
    const defsXml = defs.length > 0 ? `<defs>\n${defs.join("\n")}\n</defs>\n` : "";
    return `<?xml version='1.0'?>\n<svg xmlns='http://www.w3.org/2000/svg' width='${options.width}' height='${options.height}' viewBox='0 0 ${options.width} ${options.height}'>\n${defsXml}${body}\n</svg>`;
  }

  private collectPatternDefs(): string[] {
    const defs: string[] = [];
    // Textured fills reference patterns by id; collect them from emitted paths
    for (const node of this.elements) {
      if (node.tag === "path" && node.attributes["fill"]?.startsWith("url(#pattern-")) {
        const id = node.attributes["fill"].slice(5, -1);
        defs.push(`<pattern id='${id}' width='1' height='1' patternUnits='objectBoundingBox'>\n<image href='#texture' width='1' height='1'/>\n</pattern>`);
      }
    }
    return defs;
  }
}

/** Builds SVG path data for an arc (Java angles: counter-clockwise from +x). */
function arcPathData(x: number, y: number, w: number, h: number, startAngle: number, arcExtent: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const startRad = (-startAngle * Math.PI) / 180;
  const endRad = (-(startAngle + arcExtent) * Math.PI) / 180;
  const x1 = cx + rx * Math.cos(startRad);
  const y1 = cy + ry * Math.sin(startRad);
  const x2 = cx + rx * Math.cos(endRad);
  const y2 = cy + ry * Math.sin(endRad);
  const largeArc = Math.abs(arcExtent) > 180 ? 1 : 0;
  const sweep = arcExtent > 0 ? 0 : 1;
  return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

function serializeNode(node: SvgElement): string {
  if (node.tag === "#text") {
    return "";
  }
  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => `${k}='${escapeXml(v)}'`)
    .join(" ");
  if (node.children.length === 0) {
    return `<${node.tag}${attrs ? " " + attrs : ""}/>`;
  }
  const inner = node.children.map((child) => serializeNode(child)).join("");
  return `<${node.tag}${attrs ? " " + attrs : ""}>${inner}</${node.tag}>`;
}
