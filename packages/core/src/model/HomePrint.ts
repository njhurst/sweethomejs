/**
 * Port of com.eteks.sweethome3d.model.HomePrint (GPL v2+). Immutable value
 * object describing how a home is printed (paper, orientation, margins...).
 */
import { f32 } from "../util/f32.js";
import type { Level } from "./Level.js";

export class HomePrint {
  static readonly PaperOrientation = {
    PORTRAIT: "PORTRAIT",
    LANDSCAPE: "LANDSCAPE",
    REVERSE_LANDSCAPE: "REVERSE_LANDSCAPE",
  } as const;

  constructor(
    public readonly paperOrientation: string,
    public readonly paperWidth: number,
    public readonly paperHeight: number,
    public readonly paperTopMargin: number,
    public readonly paperLeftMargin: number,
    public readonly paperBottomMargin: number,
    public readonly paperRightMargin: number,
    public readonly furniturePrinted: boolean,
    public readonly planPrinted: boolean,
    public readonly printedLevels: Level[],
    public readonly view3DPrinted: boolean,
    public readonly planScale: number | null,
    public readonly headerFormat: string | null,
    public readonly footerFormat: string | null,
  ) {
    this.paperWidth = f32(paperWidth);
    this.paperHeight = f32(paperHeight);
    this.paperTopMargin = f32(paperTopMargin);
    this.paperLeftMargin = f32(paperLeftMargin);
    this.paperBottomMargin = f32(paperBottomMargin);
    this.paperRightMargin = f32(paperRightMargin);
  }

  getPaperOrientation(): string {
    return this.paperOrientation;
  }

  getPaperBottomMargin(): number {
    return this.paperBottomMargin;
  }

  getPaperHeight(): number {
    return this.paperHeight;
  }

  getPaperLeftMargin(): number {
    return this.paperLeftMargin;
  }

  getPaperRightMargin(): number {
    return this.paperRightMargin;
  }

  getPaperTopMargin(): number {
    return this.paperTopMargin;
  }

  getPaperWidth(): number {
    return this.paperWidth;
  }

  isFurniturePrinted(): boolean {
    return this.furniturePrinted;
  }

  isPlanPrinted(): boolean {
    return this.planPrinted;
  }

  getPrintedLevels(): Level[] {
    return this.printedLevels;
  }

  isView3DPrinted(): boolean {
    return this.view3DPrinted;
  }

  getPlanScale(): number | null {
    return this.planScale;
  }

  getHeaderFormat(): string | null {
    return this.headerFormat;
  }

  getFooterFormat(): string | null {
    return this.footerFormat;
  }
}
