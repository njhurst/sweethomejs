/*
 * ImportedFurnitureWizardController.ts.ts
 *
 * Translated from Sweet Home 3D ImportedFurnitureWizardController.java.java
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
 * ImportedFurnitureWizardController (port of
 * com.eteks.sweethome3d.viewcontroller.ImportedFurnitureWizardController, GPL v2+).
 * Wizard that imports a furniture model into the home and the catalog.
 */
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { WizardController, WizardControllerStepState } from "./WizardController.js";
import { ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { CatalogPieceOfFurniture, CatalogDoorOrWindow } from "../io/CatalogClasses.js";
import { FurnitureCategory } from "../model/Catalogs.js";
import type { Selectable } from "../model/Selectable.js";
import { FurnitureController } from "./FurnitureController.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Content } from "../model/Content.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";

export class ImportedFurnitureWizardController extends WizardController {
  private readonly home: Home | null;
  private readonly piece: CatalogPieceOfFurniture | null;
  private readonly modelName: string | null;
  private readonly furnitureController: FurnitureController | null;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly contentManager: ContentManager | null;
  private model: Content | null = null;
  private backFaceShown = false;
  private modelSize = 0;
  private modelRotation: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  private edgeColorMaterialHidden = false;
  private name = "";
  private creator: string | null = null;
  private width = 0;
  private depth = 0;
  private height = 0;
  private elevation = 0;
  private movable = true;
  private doorOrWindow = false;
  private staircaseCutOutShape: string | null = null;
  private color: number | null = null;
  private category: FurnitureCategory | null = null;
  private iconYaw = 0;
  private iconPitch = 0;
  private iconScale = 0;
  private proportional = false;

  constructor(
    home: Home | null,
    pieceOrModelName: CatalogPieceOfFurniture | string | null,
    modelNameOrPreferences: string | UserPreferences | null,
    preferencesOrController: UserPreferences | FurnitureController | null,
    viewFactory: ViewFactory,
    contentManager: ContentManager | null = null,
    undoSupport: UndoableEditSupport | null = null,
  ) {
    let preferences: UserPreferences;
    let furnitureController: FurnitureController | null = null;
    let modelName: string | null = null;
    if (preferencesOrController instanceof FurnitureController) {
      furnitureController = preferencesOrController;
      preferences = modelNameOrPreferences as UserPreferences;
    } else {
      preferences = preferencesOrController as UserPreferences;
    }
    super(preferences, viewFactory);
    this.home = home;
    this.piece = pieceOrModelName instanceof CatalogPieceOfFurniture ? pieceOrModelName : null;
    this.modelName = typeof pieceOrModelName === "string" ? pieceOrModelName : (typeof modelNameOrPreferences === "string" ? modelNameOrPreferences : null);
    this.furnitureController = furnitureController;
    this.undoSupport = undoSupport;
    this.contentManager = contentManager;
    this.setStepState(new ModelStepState(this));
  }

  getContentManager(): ContentManager | null {
    return this.contentManager;
  }

  override addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  override removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  getModel(): Content | null {
    return this.model;
  }

  setModel(model: Content | null): void {
    if (model !== this.model) {
      const oldModel = this.model;
      this.model = model;
      this.propertyChangeSupport.firePropertyChange("MODEL", oldModel, model);
    }
  }

  isBackFaceShown(): boolean {
    return this.backFaceShown;
  }

  setBackFaceShown(backFaceShown: boolean): void {
    if (backFaceShown !== this.backFaceShown) {
      this.backFaceShown = backFaceShown;
      this.propertyChangeSupport.firePropertyChange("BACK_FACE_SHOWN", !backFaceShown, backFaceShown);
    }
  }

  getModelSize(): number {
    return this.modelSize;
  }

  setModelSize(modelSize: number): void {
    if (modelSize !== this.modelSize) {
      const oldModelSize = this.modelSize;
      this.modelSize = modelSize;
      this.propertyChangeSupport.firePropertyChange("MODEL_SIZE", oldModelSize, modelSize);
    }
  }

  getModelRotation(): number[][] {
    return this.modelRotation;
  }

  setModelRotation(modelRotation: number[][]): void {
    if (modelRotation !== this.modelRotation) {
      const oldModelRotation = this.modelRotation;
      this.modelRotation = modelRotation;
      this.propertyChangeSupport.firePropertyChange("MODEL_ROTATION", oldModelRotation, modelRotation);
    }
  }

  isEdgeColorMaterialHidden(): boolean {
    return this.edgeColorMaterialHidden;
  }

  setEdgeColorMaterialHidden(edgeColorMaterialHidden: boolean): void {
    if (edgeColorMaterialHidden !== this.edgeColorMaterialHidden) {
      this.edgeColorMaterialHidden = edgeColorMaterialHidden;
      this.propertyChangeSupport.firePropertyChange("EDGE_COLOR_MATERIAL_HIDDEN", !edgeColorMaterialHidden, edgeColorMaterialHidden);
    }
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (name !== this.name) {
      const oldName = this.name;
      this.name = name;
      this.propertyChangeSupport.firePropertyChange("NAME", oldName, name);
    }
  }

  getCreator(): string | null {
    return this.creator;
  }

  setCreator(creator: string | null): void {
    if (creator !== this.creator) {
      const oldCreator = this.creator;
      this.creator = creator;
      this.propertyChangeSupport.firePropertyChange("CREATOR", oldCreator, creator);
    }
  }

  getWidth(): number {
    return this.width;
  }

  setWidth(width: number): void {
    if (width !== this.width) {
      const oldWidth = this.width;
      this.width = width;
      this.propertyChangeSupport.firePropertyChange("WIDTH", oldWidth, width);
    }
  }

  getDepth(): number {
    return this.depth;
  }

  setDepth(depth: number): void {
    if (depth !== this.depth) {
      const oldDepth = this.depth;
      this.depth = depth;
      this.propertyChangeSupport.firePropertyChange("DEPTH", oldDepth, depth);
    }
  }

  getHeight(): number {
    return this.height;
  }

  setHeight(height: number): void {
    if (height !== this.height) {
      const oldHeight = this.height;
      this.height = height;
      this.propertyChangeSupport.firePropertyChange("HEIGHT", oldHeight, height);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    if (elevation !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = elevation;
      this.propertyChangeSupport.firePropertyChange("ELEVATION", oldElevation, elevation);
    }
  }

  isMovable(): boolean {
    return this.movable;
  }

  setMovable(movable: boolean): void {
    if (movable !== this.movable) {
      this.movable = movable;
      this.propertyChangeSupport.firePropertyChange("MOVABLE", !movable, movable);
    }
  }

  isDoorOrWindow(): boolean {
    return this.doorOrWindow;
  }

  setDoorOrWindow(doorOrWindow: boolean): void {
    if (doorOrWindow !== this.doorOrWindow) {
      this.doorOrWindow = doorOrWindow;
      this.propertyChangeSupport.firePropertyChange("DOOR_OR_WINDOW", !doorOrWindow, doorOrWindow);
    }
  }

  getStaircaseCutOutShape(): string | null {
    return this.staircaseCutOutShape;
  }

  setStaircaseCutOutShape(staircaseCutOutShape: string | null): void {
    if (staircaseCutOutShape !== this.staircaseCutOutShape) {
      const oldStaircaseCutOutShape = this.staircaseCutOutShape;
      this.staircaseCutOutShape = staircaseCutOutShape;
      this.propertyChangeSupport.firePropertyChange("STAIRCASE_CUT_OUT_SHAPE", oldStaircaseCutOutShape, staircaseCutOutShape);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.propertyChangeSupport.firePropertyChange("COLOR", oldColor, color);
    }
  }

  getCategory(): FurnitureCategory | null {
    return this.category;
  }

  setCategory(category: FurnitureCategory | null): void {
    if (category !== this.category) {
      const oldCategory = this.category;
      this.category = category;
      this.propertyChangeSupport.firePropertyChange("CATEGORY", oldCategory, category);
    }
  }

  getIconYaw(): number {
    return this.iconYaw;
  }

  setIconYaw(iconYaw: number): void {
    if (iconYaw !== this.iconYaw) {
      const oldIconYaw = this.iconYaw;
      this.iconYaw = iconYaw;
      this.propertyChangeSupport.firePropertyChange("ICON_YAW", oldIconYaw, iconYaw);
    }
  }

  getIconPitch(): number {
    return this.iconPitch;
  }

  setIconPitch(iconPitch: number): void {
    if (iconPitch !== this.iconPitch) {
      const oldIconPitch = this.iconPitch;
      this.iconPitch = iconPitch;
      this.propertyChangeSupport.firePropertyChange("ICON_PITCH", oldIconPitch, iconPitch);
    }
  }

  getIconScale(): number {
    return this.iconScale;
  }

  setIconScale(iconScale: number): void {
    if (iconScale !== this.iconScale) {
      const oldIconScale = this.iconScale;
      this.iconScale = iconScale;
      this.propertyChangeSupport.firePropertyChange("ICON_SCALE", oldIconScale, iconScale);
    }
  }

  isProportional(): boolean {
    return this.proportional;
  }

  setProportional(proportional: boolean): void {
    if (proportional !== this.proportional) {
      this.proportional = proportional;
      this.propertyChangeSupport.firePropertyChange("PROPORTIONAL", !proportional, proportional);
    }
  }

  isPieceOfFurnitureNameValid(): boolean {
    return this.name.trim().length > 0;
  }

  finish(): void {
    const modelFlags = (this.isBackFaceShown() ? 1 : 0) | (this.isEdgeColorMaterialHidden() ? 2 : 0);
    let newPiece: CatalogPieceOfFurniture;
    if (this.isDoorOrWindow()) {
      newPiece = new CatalogDoorOrWindow(
        null, this.getName(), null, null, null, null, null, null,
        null, null, this.getModel()!,
        this.getWidth(), this.getDepth(), this.getHeight(), this.getElevation(), 1,
        this.isMovable(), null, 1, 0, true, true, [],
        this.getModelRotation(), modelFlags, this.getModelSize(), this.getCreator(),
        true, true, true, null, null, null,
      );
      void newPiece;
    } else {
      newPiece = new CatalogPieceOfFurniture(
        null, this.getName(), null, null, null, null, null, null,
        null, null, this.getModel()!,
        this.getWidth(), this.getDepth(), this.getHeight(), this.getElevation(), 1,
        this.isMovable(), this.getStaircaseCutOutShape(),
        this.getModelRotation(), modelFlags, this.getModelSize(), this.getCreator(),
        true, true, true, true, null, null, null,
      );
    }

    if (this.home !== null && this.furnitureController !== null) {
      this.addPieceOfFurniture(this.furnitureController.createHomePieceOfFurniture(newPiece));
    }
    // Remove the edited piece from catalog
    const catalog = this.preferences.getFurnitureCatalog();
    if (this.piece !== null) {
      catalog.delete(this.piece);
    }
    // If a category exists, add new piece to catalog
    if (this.category !== null) {
      catalog.add(this.category, newPiece);
    }
  }

  /** Adds a new piece to the home and posts an undoable edit. */
  addPieceOfFurniture(piece: HomePieceOfFurniture): void {
    const home = this.home!;
    const basePlanLocked = home.isBasePlanLocked();
    const allLevelsSelection = home.isAllLevelsSelection();
    const oldSelection = home.getSelectedItems();
    const pieceIndex = home.getFurniture().length;

    home.addPieceOfFurnitureAt(piece, pieceIndex);
    home.setSelectedItems([piece]);
    if (!piece.isMovable() && basePlanLocked) {
      home.setBasePlanLocked(false);
    }
    home.setAllLevelsSelection(false);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(
          this.preferences, ImportedFurnitureWizardController, "undoAddImportedFurnitureName",
          (state: { added: boolean }) => {
            if (state.added) {
              home.addPieceOfFurnitureAt(piece, pieceIndex);
              home.setSelectedItems([piece]);
            } else {
              home.deletePieceOfFurniture(piece);
            }
            home.setBasePlanLocked(basePlanLocked);
            home.setAllLevelsSelection(allLevelsSelection);
          },
          { added: false },
          { added: true },
        ),
      );
    }
  }
}

abstract class ImportedFurnitureWizardStepState extends WizardControllerStepState {
  constructor(protected readonly controller: ImportedFurnitureWizardController) {
    super();
  }
}

class ModelStepState extends ImportedFurnitureWizardStepState {
  constructor(controller: ImportedFurnitureWizardController) {
    super(controller);
    this.setFirstStep(true);
    this.setNextStepEnabled(true);
  }

  override getView(): View {
    // Step views are created by the web UI (P4); a placeholder keeps the
    // wizard state machine functional until then.
    return {} as View;
  }

  override goToNextStep(): void {
    this.controller.setStepState(new AttributesStepState(this.controller));
  }
}

class AttributesStepState extends ImportedFurnitureWizardStepState {
  constructor(controller: ImportedFurnitureWizardController) {
    super(controller);
    this.setFirstStep(false);
    this.setLastStep(true);
    this.setNextStepEnabled(controller.isPieceOfFurnitureNameValid());
  }

  override getView(): View {
    // Step views are created by the web UI (P4); a placeholder keeps the
    // wizard state machine functional until then.
    return {} as View;
  }
}
