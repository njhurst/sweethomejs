/*
 * ExportableView.ts.ts
 *
 * Translated from Sweet Home 3D ExportableView.java.java
 * Sweet Home 3D, Copyright (c) 2024 Space Mushrooms <info@sweethome3d.com>
 * TypeScript translation Copyright (c) 2026 SweetHomeJS contributors
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
 *
 * Porting notes:
 *   - Keep method names identical to the Java source so upstream fixes map 1:1.
 *   - Mark every float-narrowing point with f32() (see docs/05-file-format.md).
 *   - Update this file's row in TRANSLATION.md when porting status changes.
 */

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
