/**
 * PlanPainter tests (task 5.1): Canvas2D and SVG backends produce equivalent
 * output for the paint primitives.
 */
import { describe, expect, it } from "vitest";
import { SVGPainter } from "./SVGPainter.js";
import { Canvas2DPainter } from "./Canvas2DPainter.js";

/** A recording mock of CanvasRenderingContext2D. */
class MockContext {
  readonly calls: string[] = [];
  fillStyle: unknown = null;
  strokeStyle: unknown = null;
  lineWidth = 1;
  globalAlpha = 1;
  font = "";
  lineCap = "butt";
  lineJoin = "miter";

  save(): void {
    this.calls.push("save");
  }
  restore(): void {
    this.calls.push("restore");
  }
  translate(dx: number, dy: number): void {
    this.calls.push(`translate(${dx},${dy})`);
  }
  scale(sx: number, sy: number): void {
    this.calls.push(`scale(${sx},${sy})`);
  }
  beginPath(): void {
    this.calls.push("beginPath");
  }
  moveTo(x: number, y: number): void {
    this.calls.push(`moveTo(${x},${y})`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`lineTo(${x},${y})`);
  }
  closePath(): void {
    this.calls.push("closePath");
  }
  fill(): void {
    this.calls.push("fill");
  }
  stroke(): void {
    this.calls.push("stroke");
  }
  rect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`rect(${x},${y},${w},${h})`);
  }
  clip(): void {
    this.calls.push("clip");
  }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number, ccw: boolean): void {
    this.calls.push(`ellipse(${x},${y},${rx},${ry},${rot},${a0},${a1},${ccw})`);
  }
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`fillRect(${x},${y},${w},${h})`);
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    this.calls.push(`strokeRect(${x},${y},${w},${h})`);
  }
  setLineDash(dash: number[]): void {
    this.calls.push(`setLineDash(${dash.join(",")})`);
  }
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText(${text},${x},${y})`);
  }
  createPattern(image: unknown, repetition: string): unknown {
    return { image, repetition };
  }
  drawImage(image: unknown, x: number, y: number, w: number, h: number): void {
    this.calls.push(`drawImage(${String(image)},${x},${y},${w},${h})`);
  }
}

describe("PlanPainter (task 5.1)", () => {
  it("Canvas2DPainter emits the expected context calls", () => {
    const ctx = new MockContext();
    const painter = new Canvas2DPainter(ctx as never);

    painter.setColor(0x336699);
    painter.setStroke(2, [4, 2]);
    painter.beginPath();
    painter.moveTo(0, 0);
    painter.lineTo(100, 0);
    painter.closePath();
    painter.strokePath();
    painter.fillRect(10, 20, 30, 40);
    painter.drawText("Room", 50, 60);
    painter.drawLine(0, 0, 100, 100);

    expect(ctx.calls).toContain("setLineDash(4,2)");
    expect(ctx.calls).toContain("fillRect(10,20,30,40)");
    expect(ctx.calls).toContain("fillText(Room,50,60)");
    expect(ctx.calls).toContain("moveTo(0,0)");
    expect(ctx.lineWidth).toBe(2);
  });

  it("SVGPainter serializes primitives to an SVG document", () => {
    const painter = new SVGPainter();
    painter.setColor(0x336699);
    painter.setStroke(2, [4, 2]);
    painter.beginPath();
    painter.moveTo(0, 0);
    painter.lineTo(100, 0);
    painter.closePath();
    painter.strokePath();
    painter.fillRect(10, 20, 30, 40);
    painter.drawText("Room", 50, 60);
    painter.drawLine(0, 0, 100, 100);
    painter.fillOval(0, 0, 50, 50);

    const svg = painter.toString({ width: 800, height: 600 });
    expect(svg.startsWith("<?xml version='1.0'?>")).toBe(true);
    expect(svg).toContain("<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'");
    expect(svg).toContain("fill='rgba(51,102,153,1)'");
    expect(svg).toContain("stroke-dasharray='4,2'");
    expect(svg).toContain("<rect x='10' y='20' width='30' height='40'");
    expect(svg).toContain("<text x='50' y='60'");
    expect(svg).toContain("<ellipse cx='25' cy='25' rx='25' ry='25'");
  });

  it("SVGPainter applies transforms to emitted elements", () => {
    const painter = new SVGPainter();
    painter.translate(100, 50);
    painter.scale(2, 2);
    painter.fillRect(0, 0, 10, 10);
    const svg = painter.toString();
    expect(svg).toContain("transform='translate(100 50) scale(2 2)'");
  });

  it("both backends share the arc convention (counter-clockwise from +x)", () => {
    const ctx = new MockContext();
    const canvasPainter = new Canvas2DPainter(ctx as never);
    canvasPainter.drawArc(0, 0, 100, 100, 0, 90);
    expect(ctx.calls.some((c) => c.startsWith("ellipse(") && c.includes(",true)"))).toBe(true);

    const painter = new SVGPainter();
    painter.setStroke(1);
    painter.drawArc(0, 0, 100, 100, 0, 90);
    const svg = painter.toString();
    expect(svg).toContain("<path d='M 100 50 A 50 50 0 0 0 50 0'");
  });
});
