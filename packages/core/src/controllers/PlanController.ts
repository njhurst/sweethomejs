/*
 * PlanController.ts.ts
 *
 * Translated from Sweet Home 3D PlanController.java.java
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
 * PlanController (port of com.eteks.sweethome3d.viewcontroller.PlanController, GPL v2+).
 * Controls the plan view: the mode state machine (selection, creation,
 * panning), mouse handling, scale/zoom, and selection editing.
 *
 * Task 4.6 ports the framework + selection/transform states; the creation
 * states (WallCreation, RoomCreation, ...) land in task 4.7, pan/zoom
 * magnetism/numeric entry in 4.8.
 */
import { PlanView } from "./PlanView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { FurnitureController } from "./FurnitureController.js";
import { LocalizedUndoableEdit } from "./LocalizedUndoableEdit.js";
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import { Home } from "../model/Home.js";
import { Wall } from "../model/Wall.js";
import { Room } from "../model/Room.js";
import { DimensionLine } from "../model/DimensionLine.js";
import { Label } from "../model/Label.js";
import { Polyline } from "../model/Polyline.js";
import { Compass } from "../model/Compass.js";
import { Camera } from "../model/Camera.js";
import { ObserverCamera } from "../model/ObserverCamera.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Selectable } from "../model/Selectable.js";
import { Area } from "../geom/Area.js";
import { GeneralPath } from "../geom/GeneralPath.js";


const PIXEL_MARGIN = 4;

/** Point-in-polygon test (ray casting, even-odd). */
function pointInRing(ring: number[][], px: number, py: number): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Signed shoelace area of a ring (positive = CCW). */
function ringArea(ring: number[][]): number {
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % n]!;
    area += p[0]! * q[1]! - q[0]! * p[1]!;
  }
  return area / 2;
}

export class PlanController extends FurnitureController {
  private readonly propertyChangeSupport = new PropertyChangeSupport(this);
  private planView: PlanView | null = null;
  private state: ControllerState;
  private previousState: ControllerState | null = null;
  private feedbackDisplayed = true;
  private lastMousePressX = 0;
  private lastMousePressY = 0;
  private lastMouseMoveX = 0;
  private lastMouseMoveY = 0;
  private pointerTypeLastMousePress: View.PointerType | null = null;
  private magnetismToggledLastMousePress = false;
  private scale = 1;

  // States
  private readonly selectionState: SelectionState;
  private readonly selectionMoveState: SelectionMoveState;
  private readonly rectangleSelectionState: RectangleSelectionState;
  private readonly panningState: PanningState;
  // Creation/transform states (ported in tasks 4.7/4.8)
  private readonly wallCreationState: ControllerState;
  private readonly wallDrawingState: ControllerState;
  private readonly roomCreationState: ControllerState;
  private readonly roomDrawingState: ControllerState;
  private readonly polylineCreationState: ControllerState;
  private readonly polylineDrawingState: ControllerState;
  private readonly dimensionLineCreationState: ControllerState;
  private readonly dimensionLineDrawingState: ControllerState;
  private readonly labelCreationState: ControllerState;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, contentManager: ContentManager | null, undoSupport: UndoableEditSupport | null) {
    super(home, preferences, viewFactory, contentManager, undoSupport);
    this.selectionState = new SelectionState(this);
    this.selectionMoveState = new SelectionMoveState(this);
    this.rectangleSelectionState = new RectangleSelectionState(this);
    this.panningState = new PanningState(this);
    this.wallCreationState = new WallCreationState(this);
    this.wallDrawingState = new WallDrawingState(this);
    this.roomCreationState = new RoomCreationState(this);
    this.roomDrawingState = new RoomDrawingState(this);
    this.polylineCreationState = new PolylineCreationState(this);
    this.polylineDrawingState = new PolylineDrawingState(this);
    this.dimensionLineCreationState = new DimensionLineCreationState(this);
    this.dimensionLineDrawingState = new DimensionLineDrawingState(this);
    this.labelCreationState = new LabelCreationState(this);
    this.state = this.selectionState;
    this.state.enter();
  }

  override getView(): PlanView {
    if (this.planView === null) {
      this.planView = this.viewFactory.createPlanView(this.home, this.preferences, this);
    }
    return this.planView;
  }

  /** Registers an external PlanView implementation (web UI). */
  setView(view: PlanView): void {
    this.planView = view;
  }

  /** True when the plan view has been created (Java guards enter() with getView() != null). */
  isViewCreated(): boolean {
    return this.planView !== null;
  }

  addPropertyChangeListener(property: PlanController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: PlanController.Property, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  public setState(state: ControllerState): void {
    let oldMode: PlanController.Mode | null = null;
    let oldModificationState = false;
    let oldBasePlanModificationState = false;
    if (this.state !== null) {
      oldMode = this.state.getMode();
      oldModificationState = this.state.isModificationState();
      oldBasePlanModificationState = this.state.isBasePlanModificationState();
      this.state.exit();
    }
    this.previousState = this.state;
    this.state = state;
    this.state.enter();
    if (oldMode !== state.getMode()) {
      this.propertyChangeSupport.firePropertyChange(PlanController.Property.MODE, oldMode, state.getMode());
    }
    if (oldModificationState !== state.isModificationState()) {
      this.propertyChangeSupport.firePropertyChange(PlanController.Property.MODIFICATION_STATE, oldModificationState, state.isModificationState());
    }
    if (oldBasePlanModificationState !== state.isBasePlanModificationState()) {
      this.propertyChangeSupport.firePropertyChange(PlanController.Property.BASE_PLAN_MODIFICATION_STATE, oldBasePlanModificationState, state.isBasePlanModificationState());
    }
  }

  public getState(): ControllerState {
    return this.state;
  }

  getMode(): PlanController.Mode {
    return this.state.getMode();
  }

  setMode(mode: PlanController.Mode): void {
    const oldMode = this.state.getMode();
    if (mode !== oldMode) {
      this.state.setMode(mode);
      this.propertyChangeSupport.firePropertyChange(PlanController.Property.MODE, oldMode, mode);
    }
  }

  isModificationState(): boolean {
    return this.state.isModificationState();
  }

  isBasePlanModificationState(): boolean {
    return this.state.isBasePlanModificationState();
  }

  override deleteSelection(): void {
    this.state.deleteSelection();
  }

  escape(): void {
    this.state.escape();
  }

  moveSelection(dx: number, dy: number): void {
    this.state.moveSelection(dx, dy);
  }

  toggleMagnetism(magnetismToggled: boolean): void {
    this.state.toggleMagnetism(magnetismToggled);
  }

  setAlignmentActivated(alignmentActivated: boolean): void {
    this.state.setAlignmentActivated(alignmentActivated);
  }

  setDuplicationActivated(duplicationActivated: boolean): void {
    this.state.setDuplicationActivated(duplicationActivated);
  }

  setEditionActivated(editionActivated: boolean): void {
    this.state.setEditionActivated(editionActivated);
  }

  updateEditableProperty(editableProperty: PlanController.EditableProperty, value: unknown): void {
    this.state.updateEditableProperty(editableProperty, value);
  }

  pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void;
  pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, alignmentActivated: boolean, duplicationActivated: boolean, magnetismToggled: boolean, pointerType: View.PointerType | null): void;
  pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, alignmentActivatedOrDuplicationActivated: boolean, duplicationActivatedOrPointerType?: boolean | View.PointerType | null, magnetismToggled?: boolean, pointerType?: View.PointerType | null): void {
    const resolvedPointerType = pointerType ?? (typeof duplicationActivatedOrPointerType === "object" ? duplicationActivatedOrPointerType : null);
    let alignmentActivated: boolean;
    let duplicationActivated: boolean;
    if (typeof duplicationActivatedOrPointerType === "boolean") {
      alignmentActivated = alignmentActivatedOrDuplicationActivated;
      duplicationActivated = duplicationActivatedOrPointerType;
    } else {
      alignmentActivated = alignmentActivatedOrDuplicationActivated;
      duplicationActivated = false;
    }
    this.lastMousePressX = x;
    this.lastMousePressY = y;
    this.pointerTypeLastMousePress = resolvedPointerType;
    this.magnetismToggledLastMousePress = magnetismToggled ?? false;
    this.state.pressMouse(x, y, clickCount, shiftDown, duplicationActivated);
  }

  releaseMouse(x: number, y: number): void {
    this.state.releaseMouse(x, y);
  }

  moveMouse(x: number, y: number): void {
    this.lastMouseMoveX = x;
    this.lastMouseMoveY = y;
    this.state.moveMouse(x, y);
  }

  zoom(factor: number): void {
    this.state.zoom(factor);
  }

  setFeedbackDisplayed(displayed: boolean): void {
    this.feedbackDisplayed = displayed;
  }

  isFeedbackDisplayed(): boolean {
    return this.feedbackDisplayed;
  }

  getScale(): number {
    return this.scale;
  }

  setScale(scale: number): void {
    if (scale !== this.scale) {
      const oldScale = this.scale;
      this.scale = scale;
      this.propertyChangeSupport.firePropertyChange(PlanController.Property.SCALE, oldScale, scale);
    }
  }

  getXLastMousePress(): number {
    return this.lastMousePressX;
  }

  getYLastMousePress(): number {
    return this.lastMousePressY;
  }

  getXLastMouseMove(): number {
    return this.lastMouseMoveX;
  }

  getYLastMouseMove(): number {
    return this.lastMouseMoveY;
  }

  getPointerTypeLastMousePress(): View.PointerType | null {
    return this.pointerTypeLastMousePress;
  }

  wasMagnetismToggledLastMousePress(): boolean {
    return this.magnetismToggledLastMousePress;
  }

  getPreviousState(): ControllerState | null {
    return this.previousState;
  }

  public getSelectionState(): ControllerState {
    return this.selectionState;
  }

  public getSelectionMoveState(): ControllerState {
    return this.selectionMoveState;
  }

  public getRectangleSelectionState(): ControllerState {
    return this.rectangleSelectionState;
  }

  public getPanningState(): ControllerState {
    return this.panningState;
  }

  public getWallCreationState(): ControllerState {
    return this.wallCreationState;
  }

  getWallCreationDrawingState(): ControllerState {
    return this.wallDrawingState;
  }

  public getRoomCreationState(): ControllerState {
    return this.roomCreationState;
  }

  getRoomCreationDrawingState(): ControllerState {
    return this.roomDrawingState;
  }

  public getPolylineCreationState(): ControllerState {
    return this.polylineCreationState;
  }

  getPolylineCreationDrawingState(): ControllerState {
    return this.polylineDrawingState;
  }

  public getDimensionLineCreationState(): ControllerState {
    return this.dimensionLineCreationState;
  }

  getDimensionLineCreationDrawingState(): ControllerState {
    return this.dimensionLineDrawingState;
  }

  public getLabelCreationState(): ControllerState {
    return this.labelCreationState;
  }

  /** Returns the state matching a mode (for mode switching). */
  getStateForMode(mode: PlanController.Mode): ControllerState {
    if (mode === PlanController.Mode.SELECTION) return this.selectionState;
    if (mode === PlanController.Mode.PANNING) return this.panningState;
    if (mode === PlanController.Mode.WALL_CREATION) return this.wallCreationState;
    if (mode === PlanController.Mode.ROOM_CREATION) return this.roomCreationState;
    if (mode === PlanController.Mode.POLYLINE_CREATION) return this.polylineCreationState;
    if (mode === PlanController.Mode.DIMENSION_LINE_CREATION) return this.dimensionLineCreationState;
    if (mode === PlanController.Mode.LABEL_CREATION) return this.labelCreationState;
    return this.selectionState;
  }

  /**
   * Returns the item at the given pixel coordinates, in the Java priority
   * order (walls, furniture, rooms, dimension lines, labels, polylines,
   * compass, cameras).
   */
  getClosestSelectableItemAt(x: number, y: number): Selectable | null {
    const modelX = this.convertXPixelToModel(x);
    const modelY = this.convertYPixelToModel(y);
    const margin = this.getView().getPixelLength() * PIXEL_MARGIN;
    const home = this.home;
    const at = (items: Selectable[]): Selectable | null => {
      for (const item of items) {
        if (item.getPoints().length > 0 && item.containsPoint(modelX, modelY, margin)) {
          return item;
        }
      }
      return null;
    };
    return at(home.getWalls())
      ?? at(home.getFurniture())
      ?? at(home.getRooms())
      ?? at(home.getDimensionLines())
      ?? at(home.getLabels())
      ?? at(home.getPolylines())
      ?? at([home.getCompass()]);
  }

  convertXPixelToModel(x: number): number {
    const view = this.getView();
    return view.getScale() !== 0 ? (x - view.convertXModelToScreen(0)) / view.getScale() + view.convertXPixelToModel(view.convertXModelToScreen(0)) : x;
  }

  /**
   * Returns the union area of all walls (like Java's getWallsArea).
   * Used by the room bucket fill.
   */
  private getWallsArea(): Area {
    const path = new GeneralPath();
    for (const wall of this.home.getWalls()) {
      const points = wall.getPoints();
      if (points.length < 3) {
        continue;
      }
      path.moveTo(points[0]![0]!, points[0]![1]!);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i]![0]!, points[i]![1]!);
      }
      path.closePath();
    }
    return new Area(path);
  }

  /**
   * All closed rings (outer wall outline + room holes) of the walls area, like
   * Java's getAreaPaths. The room holes are the inner boundaries of the walls.
   */
  private getRoomPathsFromWalls(): number[][][] {
    return this.getWallsArea()
      .getPolygons()
      .flat()
      .filter((ring) => ring.length >= 3);
  }

  /**
   * Detects the room enclosed by walls at (x, y) — the bucket fill. Returns the
   * innermost wall-enclosed ring containing the point (like Java's
   * computeRoomPointsAt, which returns the room path the point falls in).
   */
  computeRoomPointsAt(x: number, y: number): number[][] | null {
    let best: number[][] | null = null;
    let bestArea = Number.POSITIVE_INFINITY;
    for (const ring of this.getRoomPathsFromWalls()) {
      if (!pointInRing(ring, x, y)) {
        continue;
      }
      const area = Math.abs(ringArea(ring));
      if (area < bestArea) {
        bestArea = area;
        best = ring;
      }
    }
    return best;
  }

  convertYPixelToModel(y: number): number {
    const view = this.getView();
    return view.getScale() !== 0 ? (y - view.convertYModelToScreen(0)) / view.getScale() + view.convertYPixelToModel(view.convertYModelToScreen(0)) : y;
  }

  /** Sets the plan view scale. */
  setPlanScale(scale: number): void {
    this.getView().setScale(scale);
  }

  /** The plan view scale. */
  getPlanScale(): number {
    return this.getView().getScale();
  }

  override selectAll(): void {
    this.setSelectedFurniture(this.home.getFurniture());
  }

  /** Deletes items (used by HomeController.cut/deleteSelection). */
  deleteItems(items: Selectable[]): void {
    const previousSelection = this.home.getSelectedItems();
    this.home.setSelectedItems(items);
    this.deleteSelection();
    this.home.setSelectedItems(previousSelection);
  }

  modifySelectedItem(): void {
    const selectedItems = this.home.getSelectedItems();
    if (selectedItems.length > 0) {
      const item = selectedItems[0]!;
      if (item instanceof Wall) {
        this.modifySelectedWalls();
      } else if (item instanceof Room) {
        this.modifySelectedRooms();
      } else if (item instanceof DimensionLine) {
        this.modifySelectedDimensionLines();
      } else if (item instanceof Label) {
        this.modifySelectedLabels();
      } else if (item instanceof Polyline) {
        this.modifySelectedPolylines();
      }
    }
  }

  modifySelectedWalls(): void {
    throw new Error("PlanController.modifySelectedWalls not ported yet (task 4.4 dialog)");
  }

  modifySelectedRooms(): void {
    throw new Error("PlanController.modifySelectedRooms not ported yet");
  }

  modifySelectedDimensionLines(): void {
    throw new Error("PlanController.modifySelectedDimensionLines not ported yet");
  }

  modifySelectedLabels(): void {
    throw new Error("PlanController.modifySelectedLabels not ported yet");
  }

  modifySelectedPolylines(): void {
    throw new Error("PlanController.modifySelectedPolylines not ported yet");
  }

  lockBasePlan(): void {
    if (!this.home.isBasePlanLocked()) {
      this.home.setBasePlanLocked(true);
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(
          new LocalizedUndoableEdit(this.preferences, PlanController, "undoLockBasePlanName"),
        );
      }
    }
  }

  unlockBasePlan(): void {
    if (this.home.isBasePlanLocked()) {
      this.home.setBasePlanLocked(false);
      if (this.undoSupport !== null) {
        this.undoSupport.postEdit(
          new LocalizedUndoableEdit(this.preferences, PlanController, "undoUnlockBasePlanName"),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// State machine

export abstract class ControllerState {
  abstract getMode(): PlanController.Mode;
  setMode(mode: PlanController.Mode): void {}
  enter(): void {}
  exit(): void {}
  isModificationState(): boolean {
    return false;
  }
  isBasePlanModificationState(): boolean {
    return false;
  }
  deleteSelection(): void {}
  escape(): void {}
  moveSelection(dx: number, dy: number): void {}
  toggleMagnetism(magnetismToggled: boolean): void {}
  setAlignmentActivated(alignmentActivated: boolean): void {}
  setDuplicationActivated(duplicationActivated: boolean): void {}
  setEditionActivated(editionActivated: boolean): void {}
  updateEditableProperty(editableProperty: PlanController.EditableProperty, value: unknown): void {}
  pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {}
  releaseMouse(x: number, y: number): void {}
  moveMouse(x: number, y: number): void {}
  zoom(factor: number): void {}
}

export abstract class ControllerStateDecorator extends ControllerState {
  constructor(protected readonly state: ControllerState) {
    super();
  }

  override getMode(): PlanController.Mode {
    return this.state.getMode();
  }

  override setMode(mode: PlanController.Mode): void {
    this.state.setMode(mode);
  }

  override enter(): void {
    this.state.enter();
  }

  override exit(): void {
    this.state.exit();
  }

  override isModificationState(): boolean {
    return this.state.isModificationState();
  }

  override isBasePlanModificationState(): boolean {
    return this.state.isBasePlanModificationState();
  }
}

/** State that changes the mode when entered/exited. */
export abstract class AbstractModeChangeState extends ControllerState {
  constructor(protected readonly controller: PlanController) {
    super();
  }

  override setMode(mode: PlanController.Mode): void {
    this.switchToMode(mode);
  }

  /** Switches to the state matching the given mode. */
  protected switchToMode(mode: PlanController.Mode): void {
    this.controller.setState(this.controller.getStateForMode(mode));
  }

  override moveSelection(dx: number, dy: number): void {
    this.moveAndShowSelectedItems(dx, dy);
  }

  protected moveAndShowSelectedItems(dx: number, dy: number): void {
    for (const item of this.controller.home.getSelectedItems()) {
      if (item.getPoints().length > 0) {
        item.move(dx, dy);
      }
    }
  }

  override deleteSelection(): void {
    this.controller.deleteSelection();
  }

  override zoom(factor: number): void {
    const view = this.controller.getView();
    view.setScale(view.getScale() * factor);
  }
}

// ---------------------------------------------------------------------------
// Selection state (default)

export class SelectionState extends AbstractModeChangeState {
  private selectedItemsBeforePress: Selectable[] = [];

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.SELECTION;
  }

  override enter(): void {
    if (this.controller.isViewCreated()) {
      this.controller.getView().setResizeIndicatorVisible(
        this.controller.home.getSelectedItems().length === 1,
      );
    }
  }

  override deleteSelection(): void {
    const selectedItems = this.controller.home.getSelectedItems();
    const furniture = Home.getFurnitureSubList(selectedItems);
    const walls = Home.getSubList(selectedItems, Wall);
    const rooms = Home.getSubList(selectedItems, Room);
    const dimensionLines = Home.getSubList(selectedItems, DimensionLine);
    const labels = Home.getSubList(selectedItems, Label);
    const polylines = Home.getSubList(selectedItems, Polyline);
    if (furniture.length > 0) {
      this.controller.deleteFurniture(furniture);
    }
    for (const wall of walls) {
      this.controller.home.deleteWall(wall);
    }
    for (const room of rooms) {
      this.controller.home.deleteRoom(room);
    }
    for (const line of dimensionLines) {
      this.controller.home.deleteDimensionLine(line);
    }
    for (const label of labels) {
      this.controller.home.deleteLabel(label);
    }
    for (const polyline of polylines) {
      this.controller.home.deletePolyline(polyline);
    }
  }

  override escape(): void {
    this.controller.home.setSelectedItems([]);
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    this.selectedItemsBeforePress = this.controller.home.getSelectedItems();
    const clickedItem = this.controller.getClosestSelectableItemAt(x, y);
    if (clickedItem !== null) {
      const selectedItems = this.controller.home.getSelectedItems();
      if (shiftDown) {
        // Toggle the item in the selection
        if (selectedItems.includes(clickedItem)) {
          this.controller.home.setSelectedItems(selectedItems.filter((item) => item !== clickedItem));
        } else {
          this.controller.home.setSelectedItems(selectedItems.concat(clickedItem));
        }
      } else if (!selectedItems.includes(clickedItem) || selectedItems.length > 1) {
        this.controller.home.setSelectedItems([clickedItem]);
      }
      // Enter the move state for dragging
      if (clickCount === 1 && !duplicationActivated) {
        this.controller.setState(this.controller.getSelectionMoveState());
      }
    } else {
      // Rectangle selection (only without shift: start dragging)
      this.controller.setState(this.controller.getRectangleSelectionState());
      this.controller.getView().setResizeIndicatorVisible(false);
    }
  }

  override moveMouse(x: number, y: number): void {
    const clickedItem = this.controller.getClosestSelectableItemAt(x, y);
    this.controller.getView().setCursor(
      clickedItem !== null ? PlanView.CursorType.SELECTION : PlanView.CursorType.SELECTION,
    );
  }

  override updateEditableProperty(editableProperty: PlanController.EditableProperty, value: unknown): void {
    const selectedItems = this.controller.home.getSelectedItems();
    if (selectedItems.length === 0) {
      return;
    }
    const numberValue = typeof value === "number" ? value : 0;
    switch (editableProperty) {
      case PlanController.EditableProperty.X: {
        const lead = selectedItems[0]!;
        const referenceX = lead instanceof HomePieceOfFurniture ? lead.getX() : lead.getPoints()[0]![0]!;
        const dx = numberValue - referenceX;
        for (const item of selectedItems) {
          item.move(dx, 0);
        }
        break;
      }
      case PlanController.EditableProperty.Y: {
        const lead = selectedItems[0]!;
        const referenceY = lead instanceof HomePieceOfFurniture ? lead.getY() : lead.getPoints()[0]![1]!;
        const dy = numberValue - referenceY;
        for (const item of selectedItems) {
          item.move(0, dy);
        }
        break;
      }
      case PlanController.EditableProperty.LENGTH: {
        const walls = this.controller.home.getWalls();
        for (const wall of walls) {
          if (selectedItems.includes(wall)) {
            const dx = wall.getXEnd() - wall.getXStart();
            const dy = wall.getYEnd() - wall.getYStart();
            const length = Math.max(0.001, numberValue);
            const angle = Math.atan2(dy, dx);
            wall.setXEnd(wall.getXStart() + length * Math.cos(angle));
            wall.setYEnd(wall.getYStart() + length * Math.sin(angle));
          }
        }
        break;
      }
      case PlanController.EditableProperty.DIAGONAL: {
        for (const item of selectedItems) {
          if (item instanceof HomePieceOfFurniture) {
            const width = item.getWidth();
            const depth = item.getDepth();
            const diagonal = Math.max(0.001, numberValue);
            const factor = diagonal / Math.sqrt(width * width + depth * depth);
            item.setWidth(width * factor);
            item.setDepth(depth * factor);
          }
        }
        break;
      }
      case PlanController.EditableProperty.ANGLE: {
        for (const item of selectedItems) {
          if (item instanceof HomePieceOfFurniture) {
            item.setAngle((numberValue * Math.PI) / 180);
          } else if (item instanceof Wall) {
            const centerX = (item.getXStart() + item.getXEnd()) / 2;
            const centerY = (item.getYStart() + item.getYEnd()) / 2;
            const dx = item.getXEnd() - item.getXStart();
            const dy = item.getYEnd() - item.getYStart();
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (numberValue * Math.PI) / 180;
            item.setXEnd(centerX + (length / 2) * Math.cos(angle));
            item.setYEnd(centerY + (length / 2) * Math.sin(angle));
            item.setXStart(centerX - (length / 2) * Math.cos(angle));
            item.setYStart(centerY - (length / 2) * Math.sin(angle));
          }
        }
        break;
      }
      case PlanController.EditableProperty.THICKNESS: {
        for (const wall of this.controller.home.getWalls()) {
          if (selectedItems.includes(wall)) {
            wall.setThickness(numberValue);
          }
        }
        break;
      }
      case PlanController.EditableProperty.OFFSET: {
        for (const line of this.controller.home.getDimensionLines()) {
          if (selectedItems.includes(line)) {
            line.setOffset(numberValue);
          }
        }
        break;
      }
      case PlanController.EditableProperty.ARC_EXTENT: {
        for (const wall of this.controller.home.getWalls()) {
          if (selectedItems.includes(wall)) {
            wall.setArcExtent((numberValue * Math.PI) / 180);
          }
        }
        break;
      }
    }
  }
}

/** State that moves the selected items (mouse drag). */
export class SelectionMoveState extends AbstractModeChangeState {
  private moved = false;
  private xLastMouseMove = 0;
  private yLastMouseMove = 0;

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.SELECTION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    this.moved = false;
  }

  override exit(): void {
    if (!this.moved) {
      // Simple click without move: nothing changed
    }
  }

  override moveSelection(dx: number, dy: number): void {
    this.moveSelectedItems(dx, dy);
    this.moved = true;
  }

  private moveSelectedItems(dx: number, dy: number): void {
    for (const item of this.controller.home.getSelectedItems()) {
      const itemPoints = item.getPoints();
      if (itemPoints.length > 0) {
        item.move(dx, dy);
      }
    }
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    this.xLastMouseMove = x;
    this.yLastMouseMove = y;
  }

  override moveMouse(x: number, y: number): void {
    const dx = this.controller.getView().convertXPixelToModel(x) - this.controller.getView().convertXPixelToModel(this.xLastMouseMove);
    const dy = this.controller.getView().convertYPixelToModel(y) - this.controller.getView().convertYPixelToModel(this.yLastMouseMove);
    if (dx !== 0 || dy !== 0) {
      this.moveSelectedItems(dx, dy);
      this.moved = true;
      this.xLastMouseMove = x;
      this.yLastMouseMove = y;
    }
  }

  override releaseMouse(x: number, y: number): void {
    if (this.moved && this.controller.undoSupport !== null) {
      // Post a move undoable edit (the model moved in place; undo restores positions)
      this.controller.undoSupport.postEdit(
        new LocalizedUndoableEdit(this.controller.preferences, PlanController, "undoMoveSelectionName"),
      );
    }
    this.controller.setState(this.controller.getSelectionState());
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}

/** State that selects items inside a dragged rectangle. */
export class RectangleSelectionState extends AbstractModeChangeState {
  private xStart = 0;
  private yStart = 0;
  private xEnd = 0;
  private yEnd = 0;
  private shiftDown = false;

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.SELECTION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    // Java reads the stored press coordinates in enter()
    const x = this.controller.getXLastMousePress();
    const y = this.controller.getYLastMousePress();
    this.xStart = x;
    this.yStart = y;
    this.xEnd = x;
    this.yEnd = y;
    this.shiftDown = false;
    // The rectangle feedback is painted in model space: convert the pixels
    this.controller.getView().setRectangleFeedback(
      this.controller.convertXPixelToModel(x),
      this.controller.convertYPixelToModel(y),
      this.controller.convertXPixelToModel(x),
      this.controller.convertYPixelToModel(y),
    );
  }

  override moveMouse(x: number, y: number): void {
    this.xEnd = x;
    this.yEnd = y;
    this.controller.getView().setRectangleFeedback(
      this.controller.convertXPixelToModel(this.xStart),
      this.controller.convertYPixelToModel(this.yStart),
      this.controller.convertXPixelToModel(x),
      this.controller.convertYPixelToModel(y),
    );
  }

  override releaseMouse(x: number, y: number): void {
    this.xEnd = x;
    this.yEnd = y;
    this.controller.getView().deleteFeedback();
    const x0 = Math.min(this.xStart, this.xEnd);
    const y0 = Math.min(this.yStart, this.yEnd);
    const x1 = Math.max(this.xStart, this.xEnd);
    const y1 = Math.max(this.yStart, this.yEnd);
    const selectedItems = this.controller.home.getSelectableViewableItems().filter((item) => {
      const points = item.getPoints();
      for (const point of points) {
        const modelX = this.controller.getView().convertXPixelToModel(point[0] === undefined ? 0 : point[0]);
        void modelX;
      }
      return this.itemIntersectsRectangle(item, x0, y0, x1, y1);
    });
    const newSelection = this.shiftDown
      ? this.controller.home.getSelectedItems().filter((item) => !selectedItems.includes(item)).concat(selectedItems)
      : selectedItems;
    this.controller.home.setSelectedItems(newSelection);
    this.controller.setState(this.controller.getSelectionState());
  }

  private itemIntersectsRectangle(item: Selectable, x0: number, y0: number, x1: number, y1: number): boolean {
    const modelX0 = this.controller.getView().convertXPixelToModel(x0);
    const modelY0 = this.controller.getView().convertYPixelToModel(y0);
    const modelX1 = this.controller.getView().convertXPixelToModel(x1);
    const modelY1 = this.controller.getView().convertYPixelToModel(y1);
    for (const point of item.getPoints()) {
      if (point[0]! >= modelX0 && point[0]! <= modelX1 && point[1]! >= modelY0 && point[1]! <= modelY1) {
        return true;
      }
    }
    return false;
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}

/** State that pans the view. */
export class PanningState extends AbstractModeChangeState {
  private xLastMouseMove = 0;
  private yLastMouseMove = 0;

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.PANNING;
  }

  override isModificationState(): boolean {
    return true;
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    this.xLastMouseMove = x;
    this.yLastMouseMove = y;
    this.controller.getView().setCursor(PlanView.CursorType.PANNING);
  }

  override moveMouse(x: number, y: number): void {
    const dx = x - this.xLastMouseMove;
    const dy = y - this.yLastMouseMove;
    if (dx !== 0 || dy !== 0) {
      this.controller.getView().moveView(dx, dy);
      this.xLastMouseMove = x;
      this.yLastMouseMove = y;
    }
  }

  override releaseMouse(x: number, y: number): void {
    this.controller.getView().setCursor(PlanView.CursorType.SELECTION);
    const previousState = this.controller.getPreviousState();
    this.controller.setState(previousState instanceof SelectionState ? previousState : this.controller.getSelectionState());
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }

  override zoom(factor: number): void {
    const view = this.controller.getView();
    view.setScale(view.getScale() * factor);
  }
}

// ---------------------------------------------------------------------------
// Creation states (task 4.7)

/** Wall creation: first click enters the drawing state. */
export class WallCreationState extends AbstractModeChangeState {
  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.WALL_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    if (this.controller.isViewCreated()) {
      this.controller.getView().setCursor(PlanView.CursorType.DRAW);
    }
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    // Change state to WallDrawingState
    this.controller.setState(this.controller.getWallCreationDrawingState());
    this.controller.getState().pressMouse(x, y, clickCount, shiftDown, duplicationActivated);
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}

/** Base of wall drawing: creates walls between clicks. */
export abstract class AbstractWallState extends AbstractModeChangeState {
  override getMode(): PlanController.Mode {
    return PlanController.Mode.WALL_CREATION;
  }

  protected newWall: Wall | null = null;
  protected lastWall: Wall | null = null;
  protected createdWalls: Wall[] = [];
  protected xStart = 0;
  protected yStart = 0;
  protected wallArcExtent: number | null = null;
  protected roundWall = false;
  protected lastWallCreationTime = -1;

  constructor(controller: PlanController) {
    super(controller);
  }

  /** Creates a wall and adds it to the home, joining it to existing walls. */
  protected createWall(xStart: number, yStart: number, xEnd: number, yEnd: number, wallStartAtStart: Wall | null, wallEndAtStart: Wall | null): Wall {
    const newWall = new Wall(
      xStart, yStart, xEnd, yEnd,
      this.controller.preferences.getNewWallThickness(),
      this.controller.preferences.getNewWallHeight(),
      this.controller.preferences.getNewWallPattern() as never,
    );
    this.controller.home.addWall(newWall);
    this.createdWalls.push(newWall);
    if (wallStartAtStart !== null) {
      newWall.setWallAtStart(wallStartAtStart);
      wallStartAtStart.setWallAtStart(newWall);
    } else if (wallEndAtStart !== null) {
      newWall.setWallAtStart(wallEndAtStart);
      wallEndAtStart.setWallAtEnd(newWall);
    }
    return newWall;
  }

  /** Selects an item (used when a wall is completed). */
  protected selectItem(item: Selectable): void {
    this.controller.home.setSelectedItems([item]);
  }

  override deleteSelection(): void {
    this.endWallCreation();
  }

  /** Ends the current wall: the next wall starts at this wall's end. */
  protected endWallCreation(): void {
    if (this.newWall !== null) {
      this.lastWall = this.newWall;
      this.xStart = this.newWall.getXEnd();
      this.yStart = this.newWall.getYEnd();
      this.newWall = null;
      this.wallArcExtent = null;
    }
  }

  override escape(): void {
    // Delete the in-progress wall
    if (this.newWall !== null) {
      this.controller.home.deleteWall(this.newWall);
    }
    this.newWall = null;
    this.controller.setState(this.controller.getSelectionState());
  }

  override exit(): void {
    this.newWall = null;
    this.lastWall = null;
    this.lastWallCreationTime = -1;
    this.createdWalls = [];
  }

  /** Selects all walls created during this drawing session. */
  protected selectCreatedWalls(): void {
    if (this.createdWalls.length > 0) {
      this.controller.home.setSelectedItems(this.createdWalls);
    }
  }
}

/** Wall drawing: enter computes the start point, clicks create walls. */
export class WallDrawingState extends AbstractWallState {
  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.WALL_CREATION;
  }

  override enter(): void {
    // Convert the stored press/move pixels to model coordinates
    this.xStart = this.controller.convertXPixelToModel(this.controller.getXLastMouseMove());
    this.yStart = this.controller.convertYPixelToModel(this.controller.getYLastMouseMove());
    // Create the wall immediately (zero-length) so the preview is visible right
    // after the first click; moveMouse extends it toward the cursor.
    const wallEndAtStart = this.getWallEndAt(this.xStart, this.yStart);
    this.newWall = this.createWall(this.xStart, this.yStart, this.xStart, this.yStart, null, wallEndAtStart);
  }

  override moveMouse(x: number, y: number): void {
    const modelX = this.controller.convertXPixelToModel(x);
    const modelY = this.controller.convertYPixelToModel(y);
    if (this.newWall === null) {
      const wallEndAtStart = this.getWallEndAt(this.xStart, this.yStart);
      this.newWall = this.createWall(this.xStart, this.yStart, modelX, modelY, null, wallEndAtStart);
    } else {
      this.newWall.setXEnd(modelX);
      this.newWall.setYEnd(modelY);
    }
    if (this.controller.isFeedbackDisplayed()) {
      this.controller.getView().setAlignmentFeedback(Wall as unknown as { new (): Selectable }, modelX, modelY, 0, 0);
    }
  }

  /** Returns the wall ending at the given point (approximate). */
  private getWallEndAt(x: number, y: number): Wall | null {
    for (const wall of this.controller.home.getWalls()) {
      if (Math.abs(wall.getXEnd() - x) < 0.5 && Math.abs(wall.getYEnd() - y) < 0.5) {
        return wall;
      }
    }
    return null;
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    const modelX = this.controller.convertXPixelToModel(x);
    const modelY = this.controller.convertYPixelToModel(y);
    if (clickCount === 2) {
      // Double-click finishes the wall creation
      if (this.newWall !== null && this.newWall.getStartPointToEndPointDistance() > 0) {
        this.selectItem(this.newWall);
        this.endWallCreation();
      } else if (this.newWall !== null) {
        this.controller.home.deleteWall(this.newWall);
        this.newWall = null;
      }
      this.selectCreatedWalls();
      // Return to the selection state after a double click
      this.controller.setState(this.controller.getSelectionState());
    } else if (this.newWall !== null && this.newWall.getStartPointToEndPointDistance() > 0) {
      // Complete the current wall and continue from its end
      this.selectItem(this.newWall);
      this.endWallCreation();
      // Create the next wall starting at the current end
      const wallEndAtStart = this.getWallEndAt(this.xStart, this.yStart);
      this.newWall = this.createWall(this.xStart, this.yStart, modelX, modelY, null, wallEndAtStart);
    }
  }

  override releaseMouse(x: number, y: number): void {
    // Nothing to do on release during drawing
  }
}

/** Room creation: first click enters the drawing state. */
export class RoomCreationState extends AbstractModeChangeState {
  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.ROOM_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    if (this.controller.isViewCreated()) {
      this.controller.getView().setCursor(PlanView.CursorType.DRAW);
    }
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    this.controller.setState(this.controller.getRoomCreationDrawingState());
    this.controller.getState().pressMouse(x, y, clickCount, shiftDown, duplicationActivated);
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}

/** Room drawing: accumulate points, double-click creates the room. */
/** Room drawing: first click starts, moves build the polygon, double-click finishes. */
export class RoomDrawingState extends AbstractModeChangeState {
  private newRoom: Room | null = null;
  private xPreviousPoint = 0;
  private yPreviousPoint = 0;
  private newPointPending = false;

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.ROOM_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    // Start the room at the press that entered this state (like Java, which
    // uses getXLastMousePress).
    this.xPreviousPoint = this.controller.convertXPixelToModel(this.controller.getXLastMousePress());
    this.yPreviousPoint = this.controller.convertYPixelToModel(this.controller.getYLastMousePress());
    this.newRoom = null;
    this.newPointPending = false;
    this.controller.home.setSelectedItems([]);
  }

  override moveMouse(x: number, y: number): void {
    const modelX = this.controller.convertXPixelToModel(x);
    const modelY = this.controller.convertYPixelToModel(y);
    if (this.newRoom === null) {
      // Create the room on first move, from the previous point to the cursor
      const room = new Room("room", [
        [this.xPreviousPoint, this.yPreviousPoint],
        [modelX, modelY],
      ]);
      this.controller.home.addRoom(room);
      this.controller.home.setSelectedItems([room]);
      this.newRoom = room;
    } else if (this.newPointPending) {
      // A new side was started by a click: add a vertex at the cursor
      const points = this.newRoom.getPoints();
      this.xPreviousPoint = points[points.length - 1]![0]!;
      this.yPreviousPoint = points[points.length - 1]![1]!;
      this.newRoom.addPoint(modelX, modelY);
      this.newPointPending = false;
    } else {
      // Otherwise update the last point (rubber-band the polygon)
      this.newRoom.setPoint(modelX, modelY, this.newRoom.getPointCount() - 1);
    }
    this.controller.getView().repaint();
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    const modelX = this.controller.convertXPixelToModel(x);
    const modelY = this.controller.convertYPixelToModel(y);
    if (clickCount === 2) {
      if (this.newRoom === null) {
        // Bucket fill: detect the room enclosed by walls at the double-click point
        const roomPoints = this.controller.computeRoomPointsAt(modelX, modelY);
        if (roomPoints !== null) {
          const room = new Room("room", roomPoints);
          this.controller.home.addRoom(room);
          this.controller.home.setSelectedItems([room]);
          this.newRoom = room;
        }
      }
      this.validateDrawnRoom();
    } else {
      this.endRoomSide();
    }
  }

  private endRoomSide(): void {
    // A click commits the current side; the next move adds a new vertex.
    // Only when the last side has a non-zero length (like Java's endRoomSide).
    if (this.newRoom !== null) {
      const points = this.newRoom.getPoints();
      if (points.length >= 2) {
        const last = points[points.length - 1]!;
        const prev = points[points.length - 2]!;
        const dx = last[0]! - prev[0]!;
        const dy = last[1]! - prev[1]!;
        if (dx * dx + dy * dy > 0) {
          this.newPointPending = true;
        }
      }
    } else {
      // First click: the room starts on the next move from the press point.
      this.newPointPending = true;
    }
  }

  private validateDrawnRoom(): void {
    const room = this.newRoom;
    if (room !== null && room.getPointCount() < 3) {
      // Delete a room with fewer than 3 points
      this.controller.home.deleteRoom(room);
    }
    this.newRoom = null;
    this.newPointPending = false;
    // Back to the room creation state so the user can draw another room
    this.controller.setState(this.controller.getRoomCreationState());
  }

  override escape(): void {
    if (this.newRoom !== null) {
      this.controller.home.deleteRoom(this.newRoom);
    }
    this.newRoom = null;
    this.newPointPending = false;
    this.controller.setState(this.controller.getSelectionState());
  }

  override exit(): void {
    this.newRoom = null;
    this.newPointPending = false;
    this.controller.getView().deleteFeedback();
  }
}

/** Polyline creation: first click enters the drawing state. */
export class PolylineCreationState extends AbstractModeChangeState {
  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.POLYLINE_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    this.controller.setState(this.controller.getPolylineCreationDrawingState());
    this.controller.getState().pressMouse(x, y, clickCount, shiftDown, duplicationActivated);
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}

/** Polyline drawing: accumulate points, double-click creates the polyline. */
export class PolylineDrawingState extends AbstractModeChangeState {
  private newPolyline: Polyline | null = null;
  private xStart = 0;
  private yStart = 0;
  private newPointPending = false;

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.POLYLINE_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    // The polyline starts at the press that entered this state
    this.xStart = this.controller.convertXPixelToModel(this.controller.getXLastMousePress());
    this.yStart = this.controller.convertYPixelToModel(this.controller.getYLastMousePress());
    this.newPolyline = null;
    this.newPointPending = false;
  }

  override moveMouse(x: number, y: number): void {
    const modelX = this.controller.convertXPixelToModel(x);
    const modelY = this.controller.convertYPixelToModel(y);
    if (this.newPolyline === null) {
      // Create the polyline on the first move (live rubber-band)
      const polyline = this.createPolyline([
        [this.xStart, this.yStart],
        [modelX, modelY],
      ]);
      this.controller.home.addPolyline(polyline);
      this.controller.home.setSelectedItems([polyline]);
      this.newPolyline = polyline;
    } else if (this.newPointPending) {
      this.newPolyline.addPoint(modelX, modelY);
      this.newPointPending = false;
    } else {
      this.newPolyline.setPoint(modelX, modelY, this.newPolyline.getPointCount() - 1);
    }
    this.controller.getView().repaint();
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    if (clickCount === 2) {
      // Double-click finishes the polyline
      if (this.newPolyline !== null && this.newPolyline.getPointCount() >= 2) {
        this.controller.home.setSelectedItems([this.newPolyline]);
      } else if (this.newPolyline !== null) {
        this.controller.home.deletePolyline(this.newPolyline);
      }
      this.newPolyline = null;
      this.newPointPending = false;
      this.controller.setState(this.controller.getPolylineCreationState());
    } else if (this.newPolyline !== null) {
      // Commit the current side; the next move adds a vertex
      this.newPointPending = true;
    } else {
      this.newPointPending = true;
    }
  }

  private createPolyline(points: number[][]): Polyline {
    return new Polyline(
      "polyline", points, this.controller.preferences.getNewWallThickness(),
      Polyline.CapStyle.SQUARE, Polyline.JoinStyle.MITER, Polyline.DashStyle.SOLID, 0,
      Polyline.ArrowStyle.NONE, Polyline.ArrowStyle.NONE, false, 0,
    );
  }

  override escape(): void {
    if (this.newPolyline !== null) {
      this.controller.home.deletePolyline(this.newPolyline);
    }
    this.newPolyline = null;
    this.newPointPending = false;
    this.controller.setState(this.controller.getSelectionState());
  }

  override exit(): void {
    this.newPolyline = null;
    this.newPointPending = false;
  }
}

/** Dimension line creation: first click enters the drawing state. */
export class DimensionLineCreationState extends AbstractModeChangeState {
  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.DIMENSION_LINE_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    this.controller.setState(this.controller.getDimensionLineCreationDrawingState());
    this.controller.getState().pressMouse(x, y, clickCount, shiftDown, duplicationActivated);
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}

/** Dimension line drawing: two clicks (start, end) create the line. */
export class DimensionLineDrawingState extends AbstractModeChangeState {
  private newLine: DimensionLine | null = null;
  private xStart = 0;
  private yStart = 0;

  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.DIMENSION_LINE_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override enter(): void {
    // The line starts at the press that entered this state
    this.xStart = this.controller.convertXPixelToModel(this.controller.getXLastMousePress());
    this.yStart = this.controller.convertYPixelToModel(this.controller.getYLastMousePress());
    this.newLine = null;
  }

  override moveMouse(x: number, y: number): void {
    const modelX = this.controller.convertXPixelToModel(x);
    const modelY = this.controller.convertYPixelToModel(y);
    if (this.newLine === null) {
      // Create the dimension line on the first move (live rubber-band)
      const line = new DimensionLine(
        "dimensionLine", this.xStart, this.yStart, modelX, modelY,
        this.controller.preferences.getNewWallThickness(),
      );
      this.controller.home.addDimensionLine(line);
      this.controller.home.setSelectedItems([line]);
      this.newLine = line;
    } else {
      this.newLine.setXEnd(modelX);
      this.newLine.setYEnd(modelY);
    }
    this.controller.getView().repaint();
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    if (this.newLine !== null) {
      // Second click finalizes the line (it is already in the home)
      this.controller.home.setSelectedItems([this.newLine]);
      this.newLine = null;
      this.controller.setState(this.controller.getSelectionState());
    }
  }

  override escape(): void {
    if (this.newLine !== null) {
      this.controller.home.deleteDimensionLine(this.newLine);
    }
    this.newLine = null;
    this.controller.setState(this.controller.getSelectionState());
  }

  override exit(): void {
    this.newLine = null;
    this.controller.getView().deleteFeedback();
  }
}

/** Label creation: single click creates a label. */
export class LabelCreationState extends AbstractModeChangeState {
  constructor(controller: PlanController) {
    super(controller);
  }

  override getMode(): PlanController.Mode {
    return PlanController.Mode.LABEL_CREATION;
  }

  override isModificationState(): boolean {
    return true;
  }

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, duplicationActivated: boolean): void {
    const label = new Label("", this.controller.convertXPixelToModel(x), this.controller.convertYPixelToModel(y));
    this.controller.home.addLabel(label);
    this.controller.home.setSelectedItems([label]);
    // Stay in label creation mode so the user can add several labels
  }

  override escape(): void {
    this.controller.setState(this.controller.getSelectionState());
  }
}


export namespace PlanController {
  export enum Property {
    MODE = "MODE",
    MODIFICATION_STATE = "MODIFICATION_STATE",
    BASE_PLAN_MODIFICATION_STATE = "BASE_PLAN_MODIFICATION_STATE",
    SCALE = "SCALE",
  }

  /** The plan editing modes (a class in Java to allow extension). */
  export class Mode {
    static readonly SELECTION = new Mode("SELECTION");
    static readonly PANNING = new Mode("PANNING");
    static readonly WALL_CREATION = new Mode("WALL_CREATION");
    static readonly ROOM_CREATION = new Mode("ROOM_CREATION");
    static readonly POLYLINE_CREATION = new Mode("POLYLINE_CREATION");
    static readonly DIMENSION_LINE_CREATION = new Mode("DIMENSION_LINE_CREATION");
    static readonly LABEL_CREATION = new Mode("LABEL_CREATION");

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

  /** Fields that can be edited in plan view. */
  export enum EditableProperty {
    X = "X",
    Y = "Y",
    LENGTH = "LENGTH",
    DIAGONAL = "DIAGONAL",
    ANGLE = "ANGLE",
    THICKNESS = "THICKNESS",
    OFFSET = "OFFSET",
    ARC_EXTENT = "ARC_EXTENT",
  }
}
