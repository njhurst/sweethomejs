/*
 * HomeController3D.ts.ts
 *
 * Translated from Sweet Home 3D HomeController3D.java.java
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
 * HomeController3D (port of
 * com.eteks.sweethome3d.viewcontroller.HomeController3D, GPL v2+).
 * Controls the 3D view: top/observer camera states, camera navigation,
 * stored cameras, and (deferred) 3D furniture editing.
 */
import type { Controller } from "./Controller.js";
import type { View } from "./View.js";
import type { View3D } from "./View3D.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { ContentManager } from "./ContentManager.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PlanController } from "./PlanController.js";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { HomeFurnitureGroup } from "../model/HomeFurnitureGroup.js";
import { Camera } from "../model/Camera.js";
import { ObserverCamera } from "../model/ObserverCamera.js";
import { Level } from "../model/Level.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { Selectable } from "../model/Selectable.js";
import type { Elevatable } from "../model/stubs.js";
import { Wall } from "../model/Wall.js";
import { Room } from "../model/Room.js";
import { Polyline } from "../model/Polyline.js";
import { DimensionLine } from "../model/DimensionLine.js";
import { Label } from "../model/Label.js";

export class HomeController3D implements Controller {
  readonly home: Home;
  readonly preferences: UserPreferences;
  readonly viewFactory: ViewFactory;
  readonly contentManager: ContentManager | null;
  readonly undoSupport: UndoableEditSupport | null;
  protected planController: PlanController | null = null;
  private homeView3D: View | null = null;
  private cameraState: CameraControllerState;
  private topCameraState: TopCameraState;
  private observerCameraState: ObserverCameraState;

  constructor(
    home: Home,
    planControllerOrPreferences: PlanController | UserPreferences,
    preferencesOrViewFactory: UserPreferences | ViewFactory,
    viewFactoryOrContentManager: ViewFactory | ContentManager | null = null,
    contentManager: ContentManager | null = null,
    undoSupport: UndoableEditSupport | null = null,
  ) {
    this.home = home;
    if (planControllerOrPreferences instanceof PlanController) {
      this.planController = planControllerOrPreferences;
      this.preferences = preferencesOrViewFactory as UserPreferences;
      this.viewFactory = viewFactoryOrContentManager as ViewFactory;
      this.contentManager = contentManager;
      this.undoSupport = undoSupport;
    } else {
      this.preferences = planControllerOrPreferences as UserPreferences;
      this.viewFactory = preferencesOrViewFactory as ViewFactory;
      this.contentManager = viewFactoryOrContentManager as ContentManager | null;
      this.undoSupport = undoSupport;
    }
    this.topCameraState = new TopCameraState(this);
    this.observerCameraState = new ObserverCameraState(this);
    this.cameraState = home.getCamera() === home.getTopCamera() ? this.topCameraState : this.observerCameraState;
    this.cameraState.enter();
    this.addModelListeners();
  }

  getView(): View {
    if (this.homeView3D === null) {
      this.homeView3D = this.viewFactory.createView3D(this.home, this.preferences, this);
    }
    return this.homeView3D;
  }

  viewFromTop(): void {
    this.home.setCamera(this.home.getTopCamera());
  }

  viewFromObserver(): void {
    this.home.setCamera(this.home.getObserverCamera());
  }

  storeCamera(name: string): void {
    const camera = this.home.getCamera().duplicate() as Camera;
    camera.setName(name);
    const homeStoredCameras = this.home.getStoredCameras();
    const storedCameras = [...homeStoredCameras];
    // Don't keep two cameras with the same name or the same location
    for (let i = storedCameras.length - 1; i >= 0; i--) {
      const storedCamera = storedCameras[i]!;
      if (
        name === storedCamera.getName()
        || (camera.getX() === storedCamera.getX()
          && camera.getY() === storedCamera.getY()
          && camera.getZ() === storedCamera.getZ()
          && camera.getPitch() === storedCamera.getPitch()
          && camera.getYaw() === storedCamera.getYaw()
          && camera.getFieldOfView() === storedCamera.getFieldOfView()
          && camera.getTime() === storedCamera.getTime()
          && camera.getLens() === storedCamera.getLens()
          && (camera.getRenderer() === storedCamera.getRenderer()
            || (camera.getRenderer() !== null && camera.getRenderer() === storedCamera.getRenderer())))
      ) {
        storedCameras.splice(i, 1);
      }
    }
    storedCameras.unshift(camera);
    // Ensure home stored cameras don't contain more cameras than allowed
    while (storedCameras.length > this.preferences.getStoredCamerasMaxCount()) {
      storedCameras.pop();
    }
    this.home.setStoredCameras(storedCameras);
  }

  goToCamera(camera: Camera): void {
    if (camera instanceof ObserverCamera) {
      this.viewFromObserver();
    } else {
      this.viewFromTop();
    }
    this.cameraState.goToCamera(camera);
    const storedCameras = this.home.getStoredCameras().filter((storedCamera) => storedCamera !== camera);
    storedCameras.unshift(camera);
    this.home.setStoredCameras(storedCameras);
  }

  deleteCameras(cameras: Camera[]): void {
    this.home.setStoredCameras(this.home.getStoredCameras().filter((camera) => !cameras.includes(camera)));
  }

  displayAllLevels(): void {
    this.home.getEnvironment().setAllLevelsVisible(true);
  }

  displaySelectedLevel(): void {
    this.home.getEnvironment().setAllLevelsVisible(false);
  }

  modifyAttributes(): void {
    // Home3DAttributesController ported in task 4.4
    throw new Error("Home3DAttributesController not ported yet (task 4.4)");
  }

  setCameraState(state: CameraControllerState): void {
    this.cameraState.exit();
    this.cameraState = state;
    this.cameraState.enter();
  }

  moveCamera(delta: number): void {
    this.cameraState.moveCamera(delta);
  }

  moveCameraSideways(delta: number): void {
    this.cameraState.moveCameraSideways(delta);
  }

  elevateCamera(delta: number): void {
    this.cameraState.elevateCamera(delta);
  }

  rotateCameraYaw(delta: number): void {
    this.cameraState.rotateCameraYaw(delta);
  }

  rotateCameraPitch(delta: number): void {
    this.cameraState.rotateCameraPitch(delta);
  }

  modifyFieldOfView(delta: number): void {
    this.cameraState.modifyFieldOfView(delta);
  }

  pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, alignmentActivated: boolean, duplicationActivated: boolean, magnetismToggled: boolean, pointerType: View.PointerType): void {
    this.cameraState.pressMouse(x, y, clickCount, shiftDown, alignmentActivated, duplicationActivated, magnetismToggled, pointerType);
  }

  releaseMouse(x: number, y: number): void {
    this.cameraState.releaseMouse(x, y);
  }

  moveMouse(x: number, y: number): void {
    this.cameraState.moveMouse(x, y);
  }

  isEditingState(): boolean {
    return this.cameraState.isEditingState();
  }

  escape(): void {
    this.cameraState.escape();
  }

  toggleMagnetism(magnetismToggled: boolean): void {
    this.cameraState.toggleMagnetism(magnetismToggled);
  }

  setAlignmentActivated(alignmentActivated: boolean): void {
    this.cameraState.setAlignmentActivated(alignmentActivated);
  }

  setDuplicationActivated(duplicationActivated: boolean): void {
    this.cameraState.setDuplicationActivated(duplicationActivated);
  }

  private addModelListeners(): void {
    this.home.addPropertyChangeListener("CAMERA", {
      propertyChange: () => {
        this.setCameraState(this.home.getCamera() === this.home.getTopCamera() ? this.topCameraState : this.observerCameraState);
      },
    });
    // Adjust observer camera elevation when the selected level elevation changes
    const levelElevationChangeListener = (evt: unknown) => {
      const propertyName = (evt as { propertyName?: string }).propertyName;
      if (propertyName === "ELEVATION" && this.home.getEnvironment().isObserverCameraElevationAdjusted()) {
        const event = evt as { oldValue?: number; newValue?: number };
        this.home.getObserverCamera().setZ(
          Math.max(
            getObserverCameraMinimumElevation(this.home),
            this.home.getObserverCamera().getZ() + (event.newValue ?? 0) - (event.oldValue ?? 0),
          ),
        );
      }
    };
    let selectedLevel = this.home.getSelectedLevel();
    if (selectedLevel !== null) {
      selectedLevel.addPropertyChangeListener(levelElevationChangeListener);
    }
    this.home.addPropertyChangeListener("SELECTED_LEVEL", {
      propertyChange: (evt) => {
        const oldSelectedLevel = (evt as { oldValue?: Level | null }).oldValue ?? null;
        const newSelectedLevel = this.home.getSelectedLevel();
        if (this.home.getEnvironment().isObserverCameraElevationAdjusted()) {
          this.home.getObserverCamera().setZ(
            Math.max(
              getObserverCameraMinimumElevation(this.home),
              this.home.getObserverCamera().getZ()
              + (newSelectedLevel === null ? 0 : newSelectedLevel.getElevation())
              - (oldSelectedLevel === null ? 0 : oldSelectedLevel.getElevation()),
            ),
          );
        }
        oldSelectedLevel?.removePropertyChangeListener(levelElevationChangeListener);
        if (newSelectedLevel !== null) {
          newSelectedLevel.addPropertyChangeListener(levelElevationChangeListener);
        }
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Camera states

export abstract class CameraControllerState {
  enter(): void {}
  exit(): void {}
  moveCamera(delta: number): void {}
  moveCameraSideways(delta: number): void {}
  elevateCamera(delta: number): void {}
  rotateCameraYaw(delta: number): void {}
  rotateCameraPitch(delta: number): void {}
  modifyFieldOfView(delta: number): void {}
  goToCamera(camera: Camera): void {}
  isEditingState(): boolean {
    return false;
  }
  pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, alignmentActivated: boolean, duplicationActivated: boolean, magnetismToggled: boolean, pointerType: View.PointerType): void {}
  releaseMouse(x: number, y: number): void {}
  moveMouse(x: number, y: number): void {}
  escape(): void {}
  toggleMagnetism(magnetismToggled: boolean): void {}
  setAlignmentActivated(alignmentActivated: boolean): void {}
  setDuplicationActivated(duplicationActivated: boolean): void {}
}

/** Editing camera state: 3D furniture move/resize (structure; PlanController-dependent flow). */
export class EditingCameraState extends CameraControllerState {
  constructor(protected readonly controller: HomeController3D) {
    super();
  }

  override isEditingState(): boolean {
    return false;
  }

  override moveCamera(delta: number): void {}
  override moveCameraSideways(delta: number): void {}
  override elevateCamera(delta: number): void {}
  override rotateCameraYaw(delta: number): void {}
  override rotateCameraPitch(delta: number): void {}
  override modifyFieldOfView(delta: number): void {}
  override goToCamera(camera: Camera): void {}

  override pressMouse(x: number, y: number, clickCount: number, shiftDown: boolean, alignmentActivated: boolean, duplicationActivated: boolean, magnetismToggled: boolean, pointerType: View.PointerType): void {
    // 3D furniture editing is deferred until PlanController (4.6) lands
    void x;
    void y;
    void clickCount;
  }

  override releaseMouse(x: number, y: number): void {
    void x;
    void y;
  }

  override moveMouse(x: number, y: number): void {
    void x;
    void y;
  }

  override escape(): void {}
  override toggleMagnetism(magnetismToggled: boolean): void {}
  override setAlignmentActivated(alignmentActivated: boolean): void {}
  override setDuplicationActivated(duplicationActivated: boolean): void {}
}

/** Top camera state: camera follows the home bounds at a distance. */
export class TopCameraState extends EditingCameraState {
  private readonly MIN_WIDTH = 100;
  private readonly MIN_DEPTH = this.MIN_WIDTH;
  private readonly MIN_HEIGHT = 20;
  private topCamera: Camera | null = null;
  private aerialViewBoundsLowerPoint: number[] | null = null;
  private aerialViewBoundsUpperPoint: number[] | null = null;
  private minDistanceToAerialViewCenter = 0;
  private maxDistanceToAerialViewCenter = 0;
  private aerialViewCenteredOnSelectionEnabled = false;
  private previousSelectionEmpty = true;
  private distanceToCenterWithSelection = -1;

  constructor(controller: HomeController3D) {
    super(controller);
  }

  override enter(): void {
    this.topCamera = this.controller.home.getCamera();
    this.previousSelectionEmpty = this.controller.home.getSelectedItems().length === 0;
    this.aerialViewCenteredOnSelectionEnabled = this.controller.preferences.isAerialViewCenteredOnSelectionEnabled();
    this.updateCameraFromHomeBounds(false, false);
    // Follow home changes: object moves/resizes and collection changes
    for (const level of this.controller.home.getLevels()) {
      level.addPropertyChangeListener(this.objectChangeListener);
    }
    for (const wall of this.controller.home.getWalls()) {
      wall.addPropertyChangeListener(this.objectChangeListener);
    }
    for (const piece of this.controller.home.getFurniture()) {
      piece.addPropertyChangeListener(this.objectChangeListener);
    }
    for (const room of this.controller.home.getRooms()) {
      room.addPropertyChangeListener(this.objectChangeListener);
    }
    this.homeFurnitureListener = {
      collectionChanged: (event) => {
        const type = event.type as string;
        if (type === "ADD") {
          (event.item as HomePieceOfFurniture).addPropertyChangeListener(this.objectChangeListener);
          this.updateCameraFromHomeBounds(this.controller.home.getFurniture().length === 1
            && this.controller.home.getWalls().length === 0
            && this.controller.home.getRooms().length === 0, false);
        } else if (type === "DELETE") {
          (event.item as HomePieceOfFurniture).removePropertyChangeListener(this.objectChangeListener);
          this.updateCameraFromHomeBounds(false, false);
        }
      },
    };
    this.homeWallsListener = {
      collectionChanged: () => this.updateCameraFromHomeBounds(false, false),
    };
    this.homeRoomsListener = {
      collectionChanged: () => this.updateCameraFromHomeBounds(false, false),
    };
    this.controller.home.addFurnitureListener(this.homeFurnitureListener);
    this.controller.home.addWallsListener(this.homeWallsListener);
    this.controller.home.addRoomsListener(this.homeRoomsListener);
    this.homeSelectionListener = () => this.updateCameraFromHomeBounds(false, true);
    this.controller.home.addSelectionListener(this.homeSelectionListener);
  }

  override exit(): void {
    this.topCamera = null;
    for (const wall of this.controller.home.getWalls()) {
      wall.removePropertyChangeListener(this.objectChangeListener);
    }
    for (const piece of this.controller.home.getFurniture()) {
      piece.removePropertyChangeListener(this.objectChangeListener);
    }
    for (const room of this.controller.home.getRooms()) {
      room.removePropertyChangeListener(this.objectChangeListener);
    }
    if (this.homeFurnitureListener !== null) {
      this.controller.home.removeFurnitureListener(this.homeFurnitureListener);
    }
    if (this.homeWallsListener !== null) {
      this.controller.home.removeWallsListener(this.homeWallsListener);
    }
    if (this.homeRoomsListener !== null) {
      this.controller.home.removeRoomsListener(this.homeRoomsListener);
    }
    if (this.homeSelectionListener !== null) {
      this.controller.home.removeSelectionListener(this.homeSelectionListener);
    }
  }

  private objectChangeListener: (evt: unknown) => void = () => this.updateCameraFromHomeBounds(false, false);
  private homeFurnitureListener: { collectionChanged: (event: { item: HomePieceOfFurniture; type: string }) => void } | null = null;
  private homeWallsListener: { collectionChanged: (event: { item: Wall; type: string }) => void } | null = null;
  private homeRoomsListener: { collectionChanged: (event: { item: Room; type: string }) => void } | null = null;
  private homeSelectionListener: (() => void) | null = null;

  private updateCameraFromHomeBounds(firstPieceOfFurnitureAddedToEmptyHome: boolean, selectionChange: boolean): void {
    if (!this.isEditingState() && this.topCamera !== null) {
      if (this.aerialViewBoundsLowerPoint === null) {
        this.updateAerialViewBoundsFromHomeBounds(this.aerialViewCenteredOnSelectionEnabled);
      }
      let distanceToCenter: number;
      if (selectionChange && this.controller.preferences.isAerialViewCenteredOnSelectionEnabled() && this.distanceToCenterWithSelection !== -1) {
        distanceToCenter = this.distanceToCenterWithSelection;
      } else {
        distanceToCenter = this.getCameraToAerialViewCenterDistance();
      }
      if (this.controller.home.getSelectedItems().length > 0) {
        this.distanceToCenterWithSelection = distanceToCenter;
      }
      this.updateAerialViewBoundsFromHomeBounds(this.aerialViewCenteredOnSelectionEnabled);
      this.updateCameraIntervalToAerialViewCenter();
      this.placeCameraAt(distanceToCenter, firstPieceOfFurnitureAddedToEmptyHome);
    }
  }

  private getCameraToAerialViewCenterDistance(): number {
    const lower = this.aerialViewBoundsLowerPoint!;
    const upper = this.aerialViewBoundsUpperPoint!;
    return Math.sqrt(
      Math.pow((lower[0]! + upper[0]!) / 2 - this.topCamera!.getX(), 2)
      + Math.pow((lower[1]! + upper[1]!) / 2 - this.topCamera!.getY(), 2)
      + Math.pow((lower[2]! + upper[2]!) / 2 - this.topCamera!.getZ(), 2),
    );
  }

  private updateAerialViewBoundsFromHomeBounds(centerOnSelection: boolean): void {
    this.aerialViewBoundsLowerPoint = null;
    this.aerialViewBoundsUpperPoint = null;
    let selectedItems: Selectable[] = [];
    if (centerOnSelection) {
      selectedItems = this.controller.home.getSelectedItems().filter((item) => {
        const elevatable = item as unknown as Elevatable;
        return elevatable.getLevel !== undefined
          && this.isItemAtVisibleLevel(elevatable)
          && (!(item instanceof HomePieceOfFurniture) || item.isVisible())
          && (!(item instanceof Polyline) || item.isVisibleIn3D())
          && (!(item instanceof DimensionLine) || item.isVisibleIn3D())
          && (!(item instanceof Label) || item.getPitch() !== null);
      });
    }
    const selectionEmpty = selectedItems.length === 0;

    for (const wall of selectionEmpty ? this.controller.home.getWalls() : Home.getSubList(selectedItems, Wall)) {
      if (this.isItemAtVisibleLevel(wall)) {
        const wallElevation = wall.getLevel() !== null ? wall.getLevel()!.getElevation() : 0;
        const minZ = selectionEmpty ? 0 : wallElevation;
        const height = wall.getHeight();
        let maxZ: number;
        if (height !== null) {
          maxZ = wallElevation + height;
        } else {
          maxZ = wallElevation + this.controller.home.getWallHeight();
        }
        const heightAtEnd = wall.getHeightAtEnd();
        if (heightAtEnd !== null) {
          maxZ = Math.max(maxZ, wallElevation + heightAtEnd);
        }
        for (const point of wall.getPoints()) {
          this.updateAerialViewBounds(point[0]!, point[1]!, minZ, maxZ);
        }
      }
    }
    for (const piece of selectionEmpty ? this.controller.home.getFurniture() : Home.getFurnitureSubList(selectedItems)) {
      if (piece.isVisible() && this.isItemAtVisibleLevel(piece)) {
        let minZ: number;
        let maxZ: number;
        if (selectionEmpty) {
          minZ = Math.max(0, piece.getGroundElevation());
          maxZ = Math.max(0, piece.getGroundElevation() + piece.getHeightInPlan());
        } else {
          minZ = piece.getGroundElevation();
          maxZ = piece.getGroundElevation() + piece.getHeightInPlan();
        }
        for (const point of piece.getPoints()) {
          this.updateAerialViewBounds(point[0]!, point[1]!, minZ, maxZ);
        }
      }
    }
    for (const room of selectionEmpty ? this.controller.home.getRooms() : Home.getSubList(selectedItems, Room)) {
      if (this.isItemAtVisibleLevel(room)) {
        const minZ = 0;
        const maxZ = this.MIN_HEIGHT;
        const roomLevel = room.getLevel();
        const elevation = roomLevel !== null ? roomLevel.getElevation() : 0;
        for (const point of room.getPoints()) {
          this.updateAerialViewBounds(point[0]!, point[1]!, minZ + elevation, maxZ + elevation);
        }
      }
    }
    if (this.aerialViewBoundsLowerPoint === null) {
      // Empty home: keep a small default bounds around the origin
      this.aerialViewBoundsLowerPoint = [-100, -100, 0];
      this.aerialViewBoundsUpperPoint = [100, 100, this.MIN_HEIGHT];
    }
  }

  private updateAerialViewBounds(x: number, y: number, minZ: number, maxZ: number): void {
    if (this.aerialViewBoundsLowerPoint === null) {
      this.aerialViewBoundsLowerPoint = [x, y, minZ];
      this.aerialViewBoundsUpperPoint = [x, y, maxZ];
    } else {
      const lower = this.aerialViewBoundsLowerPoint!;
      const upper = this.aerialViewBoundsUpperPoint!;
      lower[0] = Math.min(lower[0]!, x);
      upper[0] = Math.max(upper[0]!, x);
      lower[1] = Math.min(lower[1]!, y);
      upper[1] = Math.max(upper[1]!, y);
      lower[2] = Math.min(lower[2]!, minZ);
      upper[2] = Math.max(upper[2]!, maxZ);
    }
  }

  private isItemAtVisibleLevel(item: Elevatable): boolean {
    return item.getLevel() === null || item.getLevel()!.isViewableAndVisible();
  }

  private updateCameraIntervalToAerialViewCenter(): void {
    const lower = this.aerialViewBoundsLowerPoint!;
    const upper = this.aerialViewBoundsUpperPoint!;
    const homeBoundsWidth = upper[0]! - lower[0]!;
    const homeBoundsDepth = upper[1]! - lower[1]!;
    const homeBoundsHeight = upper[2]! - lower[2]!;
    const halfDiagonal = Math.sqrt(homeBoundsWidth * homeBoundsWidth + homeBoundsDepth * homeBoundsDepth + homeBoundsHeight * homeBoundsHeight) / 2;
    this.minDistanceToAerialViewCenter = halfDiagonal * 1.05;
    this.maxDistanceToAerialViewCenter = Math.max(5 * this.minDistanceToAerialViewCenter, 5000);
  }

  override moveCamera(delta: number): void {
    super.moveCamera(delta);
    delta *= 5;
    const newDistanceToCenter = this.getCameraToAerialViewCenterDistance() - delta;
    this.placeCameraAt(newDistanceToCenter, false);
  }

  private placeCameraAt(distanceToCenter: number, firstPieceOfFurnitureAddedToEmptyHome: boolean): void {
    const topCamera = this.topCamera!;
    distanceToCenter = Math.max(distanceToCenter, this.minDistanceToAerialViewCenter);
    distanceToCenter = Math.min(distanceToCenter, this.maxDistanceToAerialViewCenter);
    if (firstPieceOfFurnitureAddedToEmptyHome) {
      distanceToCenter = Math.min(distanceToCenter, 3 * this.minDistanceToAerialViewCenter);
    }
    const distanceToCenterAtGroundLevel = distanceToCenter * Math.cos(topCamera.getPitch());
    const lower = this.aerialViewBoundsLowerPoint ?? [0, 0, 0];
    const upper = this.aerialViewBoundsUpperPoint ?? [0, 0, 0];
    topCamera.setX((lower[0]! + upper[0]!) / 2 + Math.sin(topCamera.getYaw()) * distanceToCenterAtGroundLevel);
    topCamera.setY((lower[1]! + upper[1]!) / 2 - Math.cos(topCamera.getYaw()) * distanceToCenterAtGroundLevel);
    topCamera.setZ((lower[2]! + upper[2]!) / 2 + Math.sin(topCamera.getPitch()) * distanceToCenter);
  }

  override rotateCameraYaw(delta: number): void {
    super.rotateCameraYaw(delta);
    const topCamera = this.topCamera!;
    const newYaw = topCamera.getYaw() + delta;
    const distanceToCenterAtGroundLevel = this.getCameraToAerialViewCenterDistance() * Math.cos(topCamera.getPitch());
    topCamera.setYaw(newYaw);
    const lower = this.aerialViewBoundsLowerPoint!;
    const upper = this.aerialViewBoundsUpperPoint!;
    const lower1 = this.aerialViewBoundsLowerPoint ?? [0, 0, 0];
    const upper1 = this.aerialViewBoundsUpperPoint ?? [0, 0, 0];
    topCamera.setX((lower1[0]! + upper1[0]!) / 2 + Math.sin(newYaw) * distanceToCenterAtGroundLevel);
    topCamera.setY((lower1[1]! + upper1[1]!) / 2 - Math.cos(newYaw) * distanceToCenterAtGroundLevel);
  }

  override rotateCameraPitch(delta: number): void {
    super.rotateCameraPitch(delta);
    const topCamera = this.topCamera!;
    let newPitch = topCamera.getPitch() + delta;
    newPitch = Math.max(newPitch, 0);
    newPitch = Math.min(newPitch, Math.PI / 2);
    const distanceToCenter = this.getCameraToAerialViewCenterDistance();
    const distanceToCenterAtGroundLevel = distanceToCenter * Math.cos(newPitch);
    topCamera.setPitch(newPitch);
    const lower2 = this.aerialViewBoundsLowerPoint ?? [0, 0, 0];
    const upper2 = this.aerialViewBoundsUpperPoint ?? [0, 0, 0];
    topCamera.setX((lower2[0]! + upper2[0]!) / 2 + Math.sin(topCamera.getYaw()) * distanceToCenterAtGroundLevel);
    topCamera.setY((lower2[1]! + upper2[1]!) / 2 - Math.cos(topCamera.getYaw()) * distanceToCenterAtGroundLevel);
    topCamera.setZ((lower2[2]! + upper2[2]!) / 2 + distanceToCenter * Math.sin(newPitch));
  }

  override goToCamera(camera: Camera): void {
    super.goToCamera(camera);
    const topCamera = this.topCamera!;
    topCamera.setCamera(camera);
    topCamera.setTime(camera.getTime());
    topCamera.setLens(camera.getLens());
    topCamera.setRenderer(camera.getRenderer());
    this.updateCameraFromHomeBounds(false, false);
  }

  override releaseMouse(x: number, y: number): void {
    super.releaseMouse(x, y);
    this.updateCameraFromHomeBounds(false, false);
  }
}

/** Observer camera state: first-person navigation. */
export class ObserverCameraState extends EditingCameraState {
  private observerCamera: ObserverCamera | null = null;

  constructor(controller: HomeController3D) {
    super(controller);
  }

  override enter(): void {
    this.observerCamera = this.controller.home.getCamera() as ObserverCamera;
    this.selectCamera();
  }

  override exit(): void {
    const selectedItems = this.controller.home.getSelectedItems();
    const observerAsSelectable = this.observerCamera as unknown as Selectable;
    if (this.observerCamera !== null && selectedItems.includes(observerAsSelectable)) {
      this.controller.home.setSelectedItems(selectedItems.filter((item) => item !== observerAsSelectable));
    }
    this.observerCamera = null;
  }

  private selectCamera(): void {
    if (this.controller.preferences.isObserverCameraSelectedAtChange() && this.observerCamera !== null) {
      const selectedItems = this.controller.home.getSelectedItems();
      const observerAsSelectable = this.observerCamera as unknown as Selectable;
      if (
        !this.controller.preferences.isEditingIn3DViewEnabled()
        || selectedItems.length === 0
        || (selectedItems.length === 1 && selectedItems[0] === observerAsSelectable)
      ) {
        this.controller.home.setSelectedItems([this.observerCamera as unknown as Selectable]);
      }
    }
  }

  override moveCamera(delta: number): void {
    super.moveCamera(delta);
    const observerCamera = this.observerCamera!;
    observerCamera.setX(observerCamera.getX() - Math.sin(observerCamera.getYaw()) * delta);
    observerCamera.setY(observerCamera.getY() + Math.cos(observerCamera.getYaw()) * delta);
    this.selectCamera();
  }

  override moveCameraSideways(delta: number): void {
    super.moveCameraSideways(delta);
    const observerCamera = this.observerCamera!;
    observerCamera.setX(observerCamera.getX() - Math.cos(observerCamera.getYaw()) * delta);
    observerCamera.setY(observerCamera.getY() - Math.sin(observerCamera.getYaw()) * delta);
    this.selectCamera();
  }

  override elevateCamera(delta: number): void {
    super.elevateCamera(delta);
    const observerCamera = this.observerCamera!;
    const newElevation = Math.min(Math.max(observerCamera.getZ() + delta, this.getMinimumElevation()), this.controller.preferences.getLengthUnit().getMaximumElevation());
    observerCamera.setZ(newElevation);
    this.selectCamera();
  }

  override rotateCameraYaw(delta: number): void {
    super.rotateCameraYaw(delta);
    this.observerCamera!.setYaw(this.observerCamera!.getYaw() + delta);
    this.selectCamera();
  }

  override rotateCameraPitch(delta: number): void {
    super.rotateCameraPitch(delta);
    let newPitch = this.observerCamera!.getPitch() + delta;
    newPitch = Math.min(Math.max(-Math.PI / 2, newPitch), Math.PI / 2);
    this.observerCamera!.setPitch(newPitch);
    this.selectCamera();
  }

  override modifyFieldOfView(delta: number): void {
    super.modifyFieldOfView(delta);
    let newFieldOfView = this.observerCamera!.getFieldOfView() + delta;
    newFieldOfView = Math.min(Math.max(Math.PI * 2 / 180, newFieldOfView), Math.PI * 120 / 180);
    this.observerCamera!.setFieldOfView(newFieldOfView);
    this.selectCamera();
  }

  override goToCamera(camera: Camera): void {
    super.goToCamera(camera);
    const observerCamera = this.observerCamera!;
    observerCamera.setCamera(camera);
    observerCamera.setTime(camera.getTime());
    observerCamera.setLens(camera.getLens());
    observerCamera.setRenderer(camera.getRenderer());
  }

  private getMinimumElevation(): number {
    const levels = this.controller.home.getLevels();
    if (levels.length > 0) {
      return 10 + levels[0]!.getElevation();
    }
    return 10;
  }
}

/** Returns the minimum elevation of the observer camera. */
export function getObserverCameraMinimumElevation(home: Home): number {
  const levels = home.getLevels();
  if (levels.length > 0) {
    return 10 + levels[0]!.getElevation();
  }
  return 10;
}
