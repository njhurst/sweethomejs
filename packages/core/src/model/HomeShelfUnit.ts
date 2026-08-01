/**
 * Port of com.eteks.sweethome3d.model.HomeShelfUnit (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";
import type { ShelfUnit } from "./Interfaces.js";

export class HomeShelfUnit extends HomePieceOfFurniture implements ShelfUnit {
  static override readonly Property = {
    ...HomePieceOfFurniture.Property,
    SHELF_ELEVATIONS: "SHELF_ELEVATIONS",
    SHELF_BOXES: "SHELF_BOXES",
  } as const;

  private shelfElevations: number[] = [];
  private shelfBoxes: unknown[] = [];

  constructor(shelfUnit: ShelfUnit, copiedProperties?: string[] | null);
  constructor(id: string, shelfUnit: ShelfUnit, copiedProperties?: string[] | null);
  constructor(idOrShelf: string | ShelfUnit, shelfOrProps?: ShelfUnit | string[] | null, props?: string[] | null) {
    if (typeof idOrShelf === "string") {
      super(idOrShelf, shelfOrProps as ShelfUnit, props ?? null);
    } else {
      super(HomeObject.createId("shelfUnit"), idOrShelf, (shelfOrProps as string[] | null | undefined) ?? null);
    }
    const shelfUnit = typeof idOrShelf === "string" ? (shelfOrProps as ShelfUnit) : idOrShelf;
    this.shelfElevations = [...shelfUnit.getShelfElevations()];
    this.shelfBoxes = [...shelfUnit.getShelfBoxes()];
  }

  getShelfElevations(): number[] {
    return this.shelfElevations;
  }

  setShelfElevations(shelfElevations: number[]): void {
    if (shelfElevations !== this.shelfElevations) {
      const oldShelfElevations = this.shelfElevations;
      this.shelfElevations = [...shelfElevations];
      this.firePropertyChange(HomeShelfUnit.Property.SHELF_ELEVATIONS, oldShelfElevations, shelfElevations);
    }
  }

  getShelfBoxes(): unknown[] {
    return this.shelfBoxes;
  }

  setShelfBoxes(shelfBoxes: unknown[]): void {
    if (shelfBoxes !== this.shelfBoxes) {
      const oldShelfBoxes = this.shelfBoxes;
      this.shelfBoxes = [...shelfBoxes];
      this.firePropertyChange(HomeShelfUnit.Property.SHELF_BOXES, oldShelfBoxes, shelfBoxes);
    }
  }

  override clone(): HomeShelfUnit {
    const copy = Object.create(HomeShelfUnit.prototype) as HomeShelfUnit;
    this.copyBaseTo(copy);
    copy.shelfElevations = [...this.shelfElevations];
    copy.shelfBoxes = [...this.shelfBoxes];
    return copy;
  }
}
