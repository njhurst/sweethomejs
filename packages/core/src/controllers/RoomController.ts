/*
 * RoomController.ts.ts
 *
 * Translated from Sweet Home 3D RoomController.java.java
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
 * RoomController (port of com.eteks.sweethome3d.viewcontroller.RoomController, GPL v2+).
 * Edits the rooms of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { Room } from "../model/Room.js";
import { HomeTexture } from "../model/HomeTexture.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";


export class RoomController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private roomView: DialogView | null = null;
  private rooms: Room[] = [];
  private name = "";
  private areaVisible = true;
  private floorVisible = true;
  private floorColor: number | null = null;
  private floorPaint = RoomController.Paint.COLORED;
  private floorTexture: HomeTexture | null = null;
  private floorShininess = 0;
  private ceilingVisible = true;
  private ceilingColor: number | null = null;
  private ceilingPaint = RoomController.Paint.COLORED;
  private ceilingTexture: HomeTexture | null = null;
  private ceilingShininess = 0;
  private ceilingFlat = true;
  private splitSurroundingWalls = false;
  private wallSidesColor: number | null = null;
  private wallSidesPaint = RoomController.Paint.COLORED;
  private wallSidesTexture: HomeTexture | null = null;
  private wallSidesShininess = 0;
  private wallSidesBaseboardVisible = false;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.roomView === null) {
      this.roomView = this.viewFactory.createRoomView(this.preferences, this);
    }
    return this.roomView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  protected updateProperties(): void {
    this.rooms = Home.getSubList(this.home.getSelectedItems(), Room);
    if (this.rooms.length > 0) {
      const room = this.rooms[0]!;
      this.setName(room.getName() ?? "");
      this.setAreaVisible(room.isAreaVisible());
      this.setFloorVisible(room.isFloorVisible());
      this.setFloorColor(room.getFloorColor());
      this.setFloorPaint(room.getFloorTexture() !== null ? RoomController.Paint.TEXTURED : RoomController.Paint.COLORED);
      this.setFloorTexture(room.getFloorTexture());
      this.setFloorShininess(room.getFloorShininess());
      this.setCeilingVisible(room.isCeilingVisible());
      this.setCeilingColor(room.getCeilingColor());
      this.setCeilingPaint(room.getCeilingTexture() !== null ? RoomController.Paint.TEXTURED : RoomController.Paint.COLORED);
      this.setCeilingTexture(room.getCeilingTexture());
      this.setCeilingShininess(room.getCeilingShininess());
      this.setCeilingFlat(room.isCeilingFlat());
      // Wall sides are applied to the surrounding walls (Java computes them in
      // getRoomsWallSides); the room model itself stores no wall-side state.
      this.setWallSidesBaseboardVisible(false);
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

  isAreaVisible(): boolean {
    return this.areaVisible;
  }

  setAreaVisible(areaVisible: boolean): void {
    if (areaVisible !== this.areaVisible) {
      this.areaVisible = areaVisible;
      this.propertyChangeSupport.firePropertyChange("AREA_VISIBLE", !areaVisible, areaVisible);
    }
  }

  isFloorVisible(): boolean {
    return this.floorVisible;
  }

  setFloorVisible(floorVisible: boolean): void {
    if (floorVisible !== this.floorVisible) {
      this.floorVisible = floorVisible;
      this.propertyChangeSupport.firePropertyChange("FLOOR_VISIBLE", !floorVisible, floorVisible);
    }
  }

  getFloorColor(): number | null {
    return this.floorColor;
  }

  setFloorColor(floorColor: number | null): void {
    if (floorColor !== this.floorColor) {
      const oldFloorColor = this.floorColor;
      this.floorColor = floorColor;
      this.propertyChangeSupport.firePropertyChange("FLOOR_COLOR", oldFloorColor, floorColor);
    }
  }

  getFloorPaint(): RoomController.Paint {
    return this.floorPaint;
  }

  setFloorPaint(floorPaint: RoomController.Paint): void {
    if (floorPaint !== this.floorPaint) {
      const oldFloorPaint = this.floorPaint;
      this.floorPaint = floorPaint;
      this.propertyChangeSupport.firePropertyChange("FLOOR_PAINT", oldFloorPaint, floorPaint);
    }
  }

  getFloorTexture(): HomeTexture | null {
    return this.floorTexture;
  }

  setFloorTexture(floorTexture: HomeTexture | null): void {
    if (floorTexture !== this.floorTexture) {
      const oldFloorTexture = this.floorTexture;
      this.floorTexture = floorTexture;
      this.propertyChangeSupport.firePropertyChange("FLOOR_PAINT", oldFloorTexture, floorTexture);
    }
  }

  getFloorShininess(): number {
    return this.floorShininess;
  }

  setFloorShininess(floorShininess: number): void {
    if (floorShininess !== this.floorShininess) {
      const oldFloorShininess = this.floorShininess;
      this.floorShininess = floorShininess;
      this.propertyChangeSupport.firePropertyChange("FLOOR_SHININESS", oldFloorShininess, floorShininess);
    }
  }

  isCeilingVisible(): boolean {
    return this.ceilingVisible;
  }

  setCeilingVisible(ceilingVisible: boolean): void {
    if (ceilingVisible !== this.ceilingVisible) {
      this.ceilingVisible = ceilingVisible;
      this.propertyChangeSupport.firePropertyChange("CEILING_VISIBLE", !ceilingVisible, ceilingVisible);
    }
  }

  getCeilingColor(): number | null {
    return this.ceilingColor;
  }

  setCeilingColor(ceilingColor: number | null): void {
    if (ceilingColor !== this.ceilingColor) {
      const oldCeilingColor = this.ceilingColor;
      this.ceilingColor = ceilingColor;
      this.propertyChangeSupport.firePropertyChange("CEILING_COLOR", oldCeilingColor, ceilingColor);
    }
  }

  getCeilingPaint(): RoomController.Paint {
    return this.ceilingPaint;
  }

  setCeilingPaint(ceilingPaint: RoomController.Paint): void {
    if (ceilingPaint !== this.ceilingPaint) {
      const oldCeilingPaint = this.ceilingPaint;
      this.ceilingPaint = ceilingPaint;
      this.propertyChangeSupport.firePropertyChange("CEILING_PAINT", oldCeilingPaint, ceilingPaint);
    }
  }

  getCeilingTexture(): HomeTexture | null {
    return this.ceilingTexture;
  }

  setCeilingTexture(ceilingTexture: HomeTexture | null): void {
    if (ceilingTexture !== this.ceilingTexture) {
      const oldCeilingTexture = this.ceilingTexture;
      this.ceilingTexture = ceilingTexture;
      this.propertyChangeSupport.firePropertyChange("CEILING_PAINT", oldCeilingTexture, ceilingTexture);
    }
  }

  getCeilingShininess(): number {
    return this.ceilingShininess;
  }

  setCeilingShininess(ceilingShininess: number): void {
    if (ceilingShininess !== this.ceilingShininess) {
      const oldCeilingShininess = this.ceilingShininess;
      this.ceilingShininess = ceilingShininess;
      this.propertyChangeSupport.firePropertyChange("CEILING_SHININESS", oldCeilingShininess, ceilingShininess);
    }
  }

  isCeilingFlat(): boolean {
    return this.ceilingFlat;
  }

  setCeilingFlat(ceilingFlat: boolean): void {
    if (ceilingFlat !== this.ceilingFlat) {
      this.ceilingFlat = ceilingFlat;
      this.propertyChangeSupport.firePropertyChange("CEILING_FLAT", !ceilingFlat, ceilingFlat);
    }
  }

  isSplitSurroundingWalls(): boolean {
    return this.splitSurroundingWalls;
  }

  setSplitSurroundingWalls(splitSurroundingWalls: boolean): void {
    if (splitSurroundingWalls !== this.splitSurroundingWalls) {
      this.splitSurroundingWalls = splitSurroundingWalls;
      this.propertyChangeSupport.firePropertyChange("SPLIT_SURROUNDING_WALLS", !splitSurroundingWalls, splitSurroundingWalls);
    }
  }

  getWallSidesColor(): number | null {
    return this.wallSidesColor;
  }

  setWallSidesColor(wallSidesColor: number | null): void {
    if (wallSidesColor !== this.wallSidesColor) {
      const oldWallSidesColor = this.wallSidesColor;
      this.wallSidesColor = wallSidesColor;
      this.propertyChangeSupport.firePropertyChange("WALL_SIDES_COLOR", oldWallSidesColor, wallSidesColor);
    }
  }

  getWallSidesPaint(): RoomController.Paint {
    return this.wallSidesPaint;
  }

  setWallSidesPaint(wallSidesPaint: RoomController.Paint): void {
    if (wallSidesPaint !== this.wallSidesPaint) {
      const oldWallSidesPaint = this.wallSidesPaint;
      this.wallSidesPaint = wallSidesPaint;
      this.propertyChangeSupport.firePropertyChange("WALL_SIDES_PAINT", oldWallSidesPaint, wallSidesPaint);
    }
  }

  getWallSidesTexture(): HomeTexture | null {
    return this.wallSidesTexture;
  }

  setWallSidesTexture(wallSidesTexture: HomeTexture | null): void {
    if (wallSidesTexture !== this.wallSidesTexture) {
      const oldWallSidesTexture = this.wallSidesTexture;
      this.wallSidesTexture = wallSidesTexture;
      this.propertyChangeSupport.firePropertyChange("WALL_SIDES_PAINT", oldWallSidesTexture, wallSidesTexture);
    }
  }

  getWallSidesShininess(): number {
    return this.wallSidesShininess;
  }

  setWallSidesShininess(wallSidesShininess: number): void {
    if (wallSidesShininess !== this.wallSidesShininess) {
      const oldWallSidesShininess = this.wallSidesShininess;
      this.wallSidesShininess = wallSidesShininess;
      this.propertyChangeSupport.firePropertyChange("WALL_SIDES_SHININESS", oldWallSidesShininess, wallSidesShininess);
    }
  }

  isWallSidesBaseboardVisible(): boolean {
    return this.wallSidesBaseboardVisible;
  }

  setWallSidesBaseboardVisible(wallSidesBaseboardVisible: boolean): void {
    if (wallSidesBaseboardVisible !== this.wallSidesBaseboardVisible) {
      this.wallSidesBaseboardVisible = wallSidesBaseboardVisible;
      this.propertyChangeSupport.firePropertyChange("WALL_SIDES_BASEBOARD", !wallSidesBaseboardVisible, wallSidesBaseboardVisible);
    }
  }

  modifyRooms(): void {
    const selectedRooms = Home.getSubList(this.home.getSelectedItems(), Room);
    if (selectedRooms.length === 0) {
      return;
    }
    const oldStates = selectedRooms.map((room) => ({
      name: room.getName(),
      areaVisible: room.isAreaVisible(),
      floorVisible: room.isFloorVisible(),
      floorColor: room.getFloorColor(),
      floorTexture: room.getFloorTexture(),
      floorShininess: room.getFloorShininess(),
      ceilingVisible: room.isCeilingVisible(),
      ceilingColor: room.getCeilingColor(),
      ceilingTexture: room.getCeilingTexture(),
      ceilingShininess: room.getCeilingShininess(),
      ceilingFlat: room.isCeilingFlat(),
      wallSidesColor: null,
      wallSidesTexture: null,
      wallSidesShininess: 0,
      wallSidesBaseboard: null,
    }));
    const newStates = selectedRooms.map(() => ({
      name: this.getName() === "" ? null : this.getName(),
      areaVisible: this.isAreaVisible(),
      floorVisible: this.isFloorVisible(),
      floorColor: this.getFloorPaint() === RoomController.Paint.COLORED ? this.getFloorColor() : null,
      floorTexture: this.getFloorPaint() === RoomController.Paint.TEXTURED ? this.getFloorTexture() : null,
      floorShininess: this.getFloorShininess(),
      ceilingVisible: this.isCeilingVisible(),
      ceilingColor: this.getCeilingPaint() === RoomController.Paint.COLORED ? this.getCeilingColor() : null,
      ceilingTexture: this.getCeilingPaint() === RoomController.Paint.TEXTURED ? this.getCeilingTexture() : null,
      ceilingShininess: this.getCeilingShininess(),
      ceilingFlat: this.isCeilingFlat(),
      wallSidesColor: this.getWallSidesPaint() === RoomController.Paint.COLORED ? this.getWallSidesColor() : null,
      wallSidesTexture: this.getWallSidesPaint() === RoomController.Paint.TEXTURED ? this.getWallSidesTexture() : null,
      wallSidesShininess: this.getWallSidesShininess(),
      wallSidesBaseboard: null,
    }));
    const apply = (states: typeof newStates): void => doModifyRooms(selectedRooms, states);
    apply(newStates);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(this.preferences, RoomController, "undoModifyRoomsName", apply, oldStates, newStates),
      );
    }
  }
}

function doModifyRooms(
  rooms: Room[],
  states: Array<{ name: string | null; areaVisible: boolean; floorVisible: boolean; floorColor: number | null; floorTexture: HomeTexture | null; floorShininess: number; ceilingVisible: boolean; ceilingColor: number | null; ceilingTexture: HomeTexture | null; ceilingShininess: number; ceilingFlat: boolean; wallSidesColor: number | null; wallSidesTexture: HomeTexture | null; wallSidesShininess: number; wallSidesBaseboard: unknown }>,
): void {
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]!;
    const state = states[i]!;
    room.setName(state.name);
    room.setAreaVisible(state.areaVisible);
    room.setFloorVisible(state.floorVisible);
    room.setFloorColor(state.floorColor);
    room.setFloorTexture(state.floorTexture);
    room.setFloorShininess(state.floorShininess);
    room.setCeilingVisible(state.ceilingVisible);
    room.setCeilingColor(state.ceilingColor);
    room.setCeilingTexture(state.ceilingTexture);
    room.setCeilingShininess(state.ceilingShininess);
    room.setCeilingFlat(state.ceilingFlat);
    // Wall-side paints are applied to surrounding walls (deferred)
  }
}


export namespace RoomController {
  export enum Paint {
    COLORED = "COLORED",
    TEXTURED = "TEXTURED",
  }
}
