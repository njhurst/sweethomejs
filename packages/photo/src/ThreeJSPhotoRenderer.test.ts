/*
 * ThreeJSPhotoRenderer.test.ts
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
import { describe, expect, it } from "vitest";
import { Home, Wall, Room, UserPreferences, PhotoQuality, HomePieceOfFurniture } from "@sweethomejs/core";
import { ThreeJSPhotoRenderer } from "./ThreeJSPhotoRenderer.js";

function makePiece(name: string, x: number, y: number): HomePieceOfFurniture {
  const piece = new HomePieceOfFurniture("p-" + name, {
    getName: () => name, getDescription: () => null, getInformation: () => null, getLicense: () => null,
    getDepth: () => 50, getHeight: () => 30, getWidth: () => 100, getElevation: () => 0, getDropOnTopElevation: () => 1,
    isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
    getModelFlags: () => 0, getModelSize: () => 1, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
    isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
    isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
    getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
  } as never);
  piece.setX(x);
  piece.setY(y);
  return piece;
}

function buildPhotoHome(): Home {
  const home = new Home();
  // A simple box room
  home.addWall(new Wall("w1", 0, 0, 1000, 0, 20, 250));
  home.addWall(new Wall("w2", 1000, 0, 1000, 600, 20, 250));
  home.addWall(new Wall("w3", 1000, 600, 0, 600, 20, 250));
  home.addWall(new Wall("w4", 0, 600, 0, 0, 20, 250));
  const room = new Room("room", [[10, 10], [990, 10], [990, 590], [10, 590]]);
  home.addRoom(room);
  home.addPieceOfFurniture(makePiece("sofa", 500, 300));
  return home;
}

describe("ThreeJSPhotoRenderer (task 8.3)", () => {
  it("renders a home from the observer camera with progressive passes", async () => {
    const home = buildPhotoHome();
    const renderer = new ThreeJSPhotoRenderer(home, new UserPreferences(), PhotoQuality.LOW);
    // WebGL is unavailable in the node test runner: the real render is covered
    // by the Playwright e2e (photo.spec.ts). Skip if no GL context exists.
    if (!renderer.isAvailable()) {
      renderer.dispose();
      return;
    }
    expect(renderer.getName()).toBe("Three.js renderer");
    const width = 320;
    const height = 240;
    const image = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    const progress: number[] = [];
    let ended = false;
    let colored = 0;
    await renderer.render(image, home.getObserverCamera(), null, {
      photoRenderingProgress: (p, partial) => {
        progress.push(p);
        if (partial !== null) {
          let count = 0;
          for (let i = 0; i < partial.data.length; i += 4) {
            if (partial.data[i]! < 250 || partial.data[i + 1]! < 250 || partial.data[i + 2]! < 250) count++;
          }
          colored = Math.max(colored, count);
        }
      },
      photoRenderingEnded: () => {
        ended = true;
      },
      photoRenderingCanceled: () => {},
      photoRenderingFailed: (error) => {
        console.error(error);
      },
    });
    expect(progress.length).toBeGreaterThanOrEqual(2);
    expect(progress[progress.length - 1]).toBe(1);
    expect(ended).toBe(true);
    // The image must contain the rendered scene (not all-white)
    expect(colored).toBeGreaterThan(1000);
    // Final image has non-white pixels
    let finalColored = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i]! < 250 || image.data[i + 1]! < 250 || image.data[i + 2]! < 250) finalColored++;
    }
    expect(finalColored).toBeGreaterThan(1000);
    renderer.dispose();
  });

  it("cancel stops rendering before completion", async () => {
    const home = buildPhotoHome();
    const renderer = new ThreeJSPhotoRenderer(home, new UserPreferences(), PhotoQuality.LOW);
    if (!renderer.isAvailable()) {
      renderer.dispose();
      return;
    }
    const width = 320;
    const height = 240;
    const image = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    let canceled = false;
    const promise = renderer.render(image, home.getObserverCamera(), null, {
      photoRenderingProgress: (p) => {
        if (p > 0.4) renderer.stop();
      },
      photoRenderingEnded: () => {},
      photoRenderingCanceled: () => {
        canceled = true;
      },
      photoRenderingFailed: () => {},
    });
    await promise;
    expect(canceled).toBe(true);
    renderer.dispose();
  });
});
