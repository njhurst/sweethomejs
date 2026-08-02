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
