/**
 * ExportableView (port of com.eteks.sweethome3d.viewcontroller.ExportableView, GPL v2+).
 * A view able to export data in an output stream.
 */
import type { View } from "./View.js";

export namespace ExportableView {
  /** Format types (class, not enum, to allow extension in Java). */
  export class FormatType {
    static readonly SVG = new FormatType("SVG");
    static readonly CSV = new FormatType("CSV");

    private readonly nameValue: string;

    protected constructor(name: string) {
      this.nameValue = name;
    }

    name(): string {
      return this.nameValue;
    }

    toString(): string {
      return this.nameValue;
    }
  }
}

export interface ExportableView extends View {
  /** Returns true if this view is able to export at the given format. */
  isFormatTypeSupported(formatType: ExportableView.FormatType): boolean;
  /** Exports data of the view at the given format (may be called from a separate thread). */
  exportData(out: WritableStream<Uint8Array>, formatType: ExportableView.FormatType, settings: Map<string, string>): Promise<void>;
}
