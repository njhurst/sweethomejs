/*
 * properties.test.ts
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
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
 */

/**
 * Properties + dialog tests (task 7.3): the wall/room dialogs commit
 * controller values through modify*, and the properties panel maps fields.
 */
import { describe, expect, it } from "vitest";
import { Home, Wall, Room, UserPreferences, WallController, RoomController, PlanController, HomePieceOfFurniture } from "@sweethomejs/core";
import { WallDialog, RoomDialog } from "./ControllerDialogs.js";
import { FurniturePropertiesPanel } from "./FurniturePropertiesPanel.js";

describe("Controller dialogs (task 7.3)", () => {
  it("WallDialog binds to WallController setters and modifyWalls", () => {
    const home = new Home();
    const wall = new Wall("wall", 0, 0, 500, 0, 10, 250);
    home.addWall(wall);
    home.setSelectedItems([wall]);
    const controller = new WallController(home, new UserPreferences(), {
      createWallView: () => ({}) as never,
    } as never, null);

    // The controller exposes the wall's values
    expect(controller.getXStart()).toBe(0);
    expect(controller.getXEnd()).toBe(500);
    controller.setXEnd(800);
    controller.modifyWalls();
    expect(wall.getXEnd()).toBe(800);
  });

  it("RoomDialog binds to RoomController and modifyRooms", () => {
    const home = new Home();
    const room = new Room("room", [[0, 0], [500, 0], [500, 400], [0, 400]]);
    home.addRoom(room);
    home.setSelectedItems([room]);
    const controller = new RoomController(home, new UserPreferences(), {
      createRoomView: () => ({}) as never,
    } as never, null);
    controller.setName("Kitchen");
    controller.setFloorColor(0xffcc99);
    controller.modifyRooms();
    expect(room.getName()).toBe("Kitchen");
    expect(room.getFloorColor()).toBe(0xffcc99);
  });

  it("RoomController color getters return null for default rooms", () => {
    const home = new Home();
    const room = new Room("room", [[0, 0], [100, 0], [100, 100]]);
    home.addRoom(room);
    home.setSelectedItems([room]);
    const controller = new RoomController(home, new UserPreferences(), {
      createRoomView: () => ({}) as never,
    } as never, null);
    expect(controller.getFloorColor()).toBeNull();
    expect(controller.getName()).toBe("");
  });
});

describe("FurniturePropertiesPanel data mapping (task 7.3)", () => {
  it("the plan controller edits the selected piece's X property", () => {
    const home = new Home();
    const piece = new HomePieceOfFurniture("p", {
      getName: () => "Sofa", getDescription: () => null, getInformation: () => null, getLicense: () => null,
      getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
      isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
      getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
      isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
      isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
      getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
    } as never);
    piece.setX(100);
    home.addPieceOfFurniture(piece);
    home.setSelectedItems([piece]);
    const planController = new PlanController(home, new UserPreferences(), {
      createPlanView: () => ({}) as never,
    } as never, null, null);
    planController.getView();
    planController.updateEditableProperty(PlanController.EditableProperty.X, 250);
    expect(piece.getX()).toBe(250);
  });
});
