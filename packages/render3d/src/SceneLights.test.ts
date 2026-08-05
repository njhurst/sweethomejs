/*
 * SceneLights.test.ts
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
 * Lighting + selection box tests (task 6.4): the light rig applies the
 * environment light colors, the sun light tracks the compass, and selection
 * boxes appear for selected furniture.
 */
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Home, HomeLight, HomePieceOfFurniture } from "@sweethomejs/core";
import { SceneLights } from "./SceneLights.js";
import { SelectionBoxes3D, SELECTION_BOX_COLOR } from "./SelectionBoxes3D.js";

function makePiece(x: number, y: number): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("p", {
    getName: () => "Sofa",
    getDescription: () => null,
    getInformation: () => null,
    getLicense: () => null,
    getDepth: () => 50,
    getHeight: () => 30,
    getWidth: () => 100,
    getElevation: () => 0,
    getDropOnTopElevation: () => 1,
    isMovable: () => true,
    isDoorOrWindow: () => false,
    getIcon: () => null,
    getPlanIcon: () => null,
    getModel: () => null,
    getModelFlags: () => 0,
    getModelSize: () => null,
    getModelRotation: () => [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    getStaircaseCutOutShape: () => null,
    getCreator: () => null,
    isBackFaceShown: () => false,
    getColor: () => null,
    isResizable: () => true,
    isDeformable: () => true,
    isWidthDepthDeformable: () => true,
    isTexturable: () => true,
    isHorizontallyRotatable: () => true,
    getPrice: () => null,
    getValueAddedTaxPercentage: () => null,
    getCurrency: () => null,
    getProperty: () => null,
    getPropertyNames: () => [],
    getContentProperty: () => null,
    isContentProperty: () => false,
    getLevel: () => null,
  } as never);
  piece.setX(x);
  piece.setY(y);
  return piece;
}

/** A plain Light-shaped getter object for HomeLight (prototype methods are lost on spread). */
function makeLight(
  id: string,
  lightSource: { x: number; y: number; z: number; color: number } | null,
  power = 0.5,
): HomeLight {
  return new HomeLight(id, {
    getName: () => "Lamp",
    getDescription: () => null,
    getInformation: () => null,
    getLicense: () => null,
    getDepth: () => 20,
    getHeight: () => 30,
    getWidth: () => 20,
    getElevation: () => 0,
    getDropOnTopElevation: () => 1,
    isMovable: () => true,
    isDoorOrWindow: () => false,
    getIcon: () => null,
    getPlanIcon: () => null,
    getModel: () => null,
    getModelFlags: () => 0,
    getModelSize: () => null,
    getModelRotation: () => [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    getStaircaseCutOutShape: () => null,
    getCreator: () => null,
    isBackFaceShown: () => false,
    getColor: () => 0x2a2a2a,
    isResizable: () => true,
    isDeformable: () => true,
    isWidthDepthDeformable: () => true,
    isTexturable: () => true,
    isHorizontallyRotatable: () => true,
    getPrice: () => null,
    getValueAddedTaxPercentage: () => null,
    getCurrency: () => null,
    getProperty: () => null,
    getPropertyNames: () => [],
    getContentProperty: () => null,
    isContentProperty: () => false,
    getLevel: () => null,
    getPower: () => power,
    getLightSources: () =>
      lightSource === null
        ? []
        : [
            {
              getX: () => lightSource.x,
              getY: () => lightSource.y,
              getZ: () => lightSource.z,
              getColor: () => lightSource.color,
            },
          ],
    getLightSourceMaterialNames: () => [],
  } as never);
}

describe("SceneLights (task 6.4)", () => {
  it("adds a PointLight per furniture light source (Design style)", () => {
    const home = new Home();
    const light = makeLight("l1", { x: 10, y: 20, z: 30, color: 0xfff0c8 }, 0.5);
    light.setX(200);
    light.setY(100);
    light.setElevation(150);
    light.setAngle(Math.PI / 2);
    home.addPieceOfFurniture(light);

    const lights = new SceneLights({ home, addLightSources: true });
    const points = lights.getLights().filter((o) => o instanceof THREE.PointLight);
    expect(points.length).toBe(1);
    const point = points[0] as THREE.PointLight;
    // Offset (10, 20) rotated by +90°: (x,y) -> (-y, x) = (-20, 10)
    expect(point.position.x).toBeCloseTo(200 - 20, 4);
    expect(point.position.y).toBeCloseTo(150 + 30, 4);
    expect(point.position.z).toBeCloseTo(100 + 10, 4);
    expect(point.color.getHex()).toBe(0xfff0c8);
    expect(point.intensity).toBeCloseTo(0.5 * 2000, 6);
    lights.destroy();
  });

  it("ignores light sources unless addLightSources is set (Technical parity)", () => {
    const home = new Home();
    const light = makeLight("l1", { x: 0, y: 0, z: 0, color: 0xffffff });
    home.addPieceOfFurniture(light);
    const lights = new SceneLights({ home });
    expect(lights.getLights().filter((o) => o instanceof THREE.PointLight).length).toBe(0);
    lights.destroy();
  });

  it("rebuilds furniture lights when pieces are added", () => {
    const home = new Home();
    const lights = new SceneLights({ home, addLightSources: true });
    expect(lights.getLights().filter((o) => o instanceof THREE.PointLight).length).toBe(0);
    const light = makeLight("l1", { x: 0, y: 0, z: 10, color: 0xffffff });
    home.addPieceOfFurniture(light);
    expect(lights.getLights().filter((o) => o instanceof THREE.PointLight).length).toBe(1);
    lights.destroy();
  });

  it("creates a rig with ambient, directional, sun and ceiling lights", () => {
    const home = new Home();
    const lights = new SceneLights({ home });
    const objects = lights.getLights();
    const directionals = objects.filter((o) => o instanceof THREE.DirectionalLight);
    const ambients = objects.filter((o) => o instanceof THREE.AmbientLight);
    expect(directionals.length).toBeGreaterThanOrEqual(4);
    expect(ambients.length).toBe(1);
    lights.destroy();
  });

  it("applies the environment light color to the rig", () => {
    const home = new Home();
    home.getEnvironment().setLightColor(0xff8800);
    const lights = new SceneLights({ home });
    const sun = lights.getSunLight();
    // The sun color follows the environment light color
    expect(sun.color.getHexString()).toBe("ff8800");
    lights.destroy();
  });

  it("positions the sun light from the compass at the camera time", () => {
    const home = new Home();
    home.getCamera().setTime(Date.UTC(2024, 5, 21, 12, 0, 0)); // noon summer solstice
    const lights = new SceneLights({ home });
    const sun = lights.getSunLight();
    expect(sun.position.length()).toBeGreaterThan(0);
    // The sun is above the horizon at noon in June
    expect(sun.position.y).toBeGreaterThan(0);
    lights.destroy();
  });
});

describe("SelectionBoxes3D (task 6.4)", () => {
  it("adds a box for each selected furniture piece", () => {
    const home = new Home();
    const piece = makePiece(200, 100);
    home.addPieceOfFurniture(piece);
    home.setSelectedItems([piece]);
    const boxes = new SelectionBoxes3D(home);
    expect(boxes.getGroup().children.length).toBe(1);
    const box = boxes.getGroup().children[0] as THREE.LineSegments;
    expect(box.position.x).toBeCloseTo(200, 4);
    expect(box.position.z).toBeCloseTo(100, 4);
    boxes.destroy();
  });

  it("removes boxes when the selection empties", () => {
    const home = new Home();
    const piece = makePiece(0, 0);
    home.addPieceOfFurniture(piece);
    home.setSelectedItems([piece]);
    const boxes = new SelectionBoxes3D(home);
    home.setSelectedItems([]);
    expect(boxes.getGroup().children.length).toBe(0);
    boxes.destroy();
  });

  it("uses the blue selection color", () => {
    const home = new Home();
    const piece = makePiece(0, 0);
    home.addPieceOfFurniture(piece);
    home.setSelectedItems([piece]);
    const boxes = new SelectionBoxes3D(home);
    const box = boxes.getGroup().children[0] as THREE.LineSegments;
    const material = box.material as THREE.LineBasicMaterial;
    expect(material.color.getHex()).toBe(SELECTION_BOX_COLOR & 0xffffff);
    boxes.destroy();
  });
});
