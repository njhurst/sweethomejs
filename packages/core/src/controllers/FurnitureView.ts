/**
 * FurnitureView interface (port of com.eteks.sweethome3d.viewcontroller.FurnitureView, GPL v2+).
 * A view that displays the furniture list of a home.
 */
import type { View } from "./View.js";
import type { TransferableView } from "./TransferableView.js";
import type { ExportableView } from "./ExportableView.js";
import type { Home } from "../model/Home.js";
import type { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";

export namespace FurnitureView {
  export interface FurnitureFilter {
    include(home: Home, piece: HomePieceOfFurniture): boolean;
  }
}

export interface FurnitureView extends TransferableView, ExportableView {
  setFurnitureFilter(furnitureFilter: FurnitureView.FurnitureFilter): void;
}
