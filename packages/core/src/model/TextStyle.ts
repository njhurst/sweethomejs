/**
 * Port of com.eteks.sweethome3d.model.TextStyle (GPL v2+). Immutable.
 */
import { f32 } from "../util/f32.js";

export class TextStyle {
  static readonly Alignment = {
    LEFT: "LEFT",
    CENTER: "CENTER",
    RIGHT: "RIGHT",
  } as const;

  static readonly DEFAULT_FONT_NAME = "Default";
  static readonly DEFAULT_FONT_SIZE = 12;
  private static readonly DEFAULT_TEXT_STYLE = new TextStyle(TextStyle.DEFAULT_FONT_SIZE, false, false);

  private readonly fontName: string | null;
  private readonly fontSize: number;
  private readonly bold: boolean;
  private readonly italic: boolean;
  private readonly alignment: string | null;

  constructor(fontSize: number);
  constructor(fontSize: number, bold: boolean, italic: boolean);
  constructor(fontName: string | null, fontSize: number, bold: boolean, italic: boolean);
  constructor(fontName: string | null, fontSize: number, bold: boolean, italic: boolean, alignment: string);
  constructor(...args: Array<number | string | boolean | null>) {
    if (typeof args[0] === "number") {
      this.fontName = null;
      this.fontSize = f32(args[0]);
      this.bold = (args[1] as boolean) ?? false;
      this.italic = (args[2] as boolean) ?? false;
      this.alignment = (args[3] as string | undefined) ?? null;
    } else {
      this.fontName = (args[0] as string | undefined) ?? null;
      this.fontSize = f32(args[1] as number);
      this.bold = args[2] as boolean;
      this.italic = args[3] as boolean;
      this.alignment = (args[4] as string | undefined) ?? null;
    }
  }

  static getDefaultTextStyle(): TextStyle {
    return TextStyle.DEFAULT_TEXT_STYLE;
  }

  getFontName(): string | null {
    return this.fontName;
  }

  getFontSize(): number {
    return this.fontSize;
  }

  isBold(): boolean {
    return this.bold;
  }

  isItalic(): boolean {
    return this.italic;
  }

  getAlignment(): string | null {
    return this.alignment;
  }

  deriveStyle(fontNameOrSizeOrAlignment: string | number): TextStyle {
    if (typeof fontNameOrSizeOrAlignment === "number") {
      return new TextStyle(this.fontName ?? TextStyle.DEFAULT_FONT_NAME, fontNameOrSizeOrAlignment, this.bold, this.italic, this.alignment ?? TextStyle.Alignment.LEFT);
    }
    return new TextStyle(fontNameOrSizeOrAlignment, this.fontSize, this.bold, this.italic, this.alignment ?? TextStyle.Alignment.LEFT);
  }

  deriveAlignmentStyle(alignment: string): TextStyle {
    return new TextStyle(this.fontName ?? TextStyle.DEFAULT_FONT_NAME, this.fontSize, this.bold, this.italic, alignment);
  }

  deriveBoldStyle(bold: boolean): TextStyle {
    return new TextStyle(this.fontName ?? TextStyle.DEFAULT_FONT_NAME, this.fontSize, bold, this.italic, this.alignment ?? TextStyle.Alignment.LEFT);
  }

  deriveItalicStyle(italic: boolean): TextStyle {
    return new TextStyle(this.fontName ?? TextStyle.DEFAULT_FONT_NAME, this.fontSize, this.bold, italic, this.alignment ?? TextStyle.Alignment.LEFT);
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof TextStyle)) return false;
    return (
      this.fontName === obj.fontName &&
      this.fontSize === obj.fontSize &&
      this.bold === obj.bold &&
      this.italic === obj.italic &&
      this.alignment === obj.alignment
    );
  }
}
