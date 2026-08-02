/*
 * TransferableView.ts.ts
 *
 * Translated from Sweet Home 3D TransferableView.java.java
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
 * TransferableView (port of com.eteks.sweethome3d.viewcontroller.TransferableView, GPL v2+).
 * A view able to transfer data.
 */
import type { View } from "./View.js";

export namespace TransferableView {
  /** Data types (class, not enum, to allow extension in Java). */
  export class DataType {
    static readonly PLAN_IMAGE = new DataType("PLAN_IMAGE");
    static readonly FURNITURE_LIST = new DataType("FURNITURE_LIST");

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

  /** An observer to follow the data created for transfer. */
  export interface TransferObserver {
    dataReady(data: unknown[]): void;
  }
}

export interface TransferableView extends View {
  /** Returns data at given types for transfer purpose (may be called from a separate thread). */
  createTransferData(dataType: TransferableView.DataType): unknown;
}
