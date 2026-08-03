/*
 * video.test.ts
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
import { Home, Camera, UserPreferences } from "@sweethomejs/core";
import { VideoController, interpolateCamera, getCameraAt } from "@sweethomejs/core";

function makePath(): Camera[] {
  return [
    new Camera(0, 0, 200, 0, 0.3, Math.PI / 3, 0),
    new Camera(1000, 500, 250, 1, 0.4, Math.PI / 4, 5000),
  ];
}

describe("video camera path (task 8.5)", () => {
  it("interpolates camera fields linearly", () => {
    const [a, b] = makePath();
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    const mid = interpolateCamera(a!, b!, 0.5);
    expect(mid.getX()).toBeCloseTo(500, 0);
    expect(mid.getY()).toBeCloseTo(250, 0);
    expect(mid.getZ()).toBeCloseTo(225, 0);
    expect(mid.getYaw()).toBeCloseTo(0.5, 6);
    // The field of view comes from the target camera
    expect(mid.getFieldOfView()).toBeCloseTo(b!.getFieldOfView(), 6);
  });

  it("clamps to path ends and picks the right segment by time", () => {
    const path = makePath();
    expect(getCameraAt(path, -100).getX()).toBe(0);
    expect(getCameraAt(path, 10000).getX()).toBe(1000);
    const quarter = getCameraAt(path, 1250);
    expect(quarter.getX()).toBeCloseTo(250, 0);
    const threeQuarters = getCameraAt(path, 3750);
    expect(threeQuarters.getX()).toBeCloseTo(750, 0);
  });

  it("VideoController exposes aspect ratio / fps / path state", () => {
    const controller = new VideoController(new Home(), new UserPreferences(), {} as never);
    expect(controller.getCameraPath().length).toBeGreaterThanOrEqual(1);
    controller.setFrameRate(30);
    expect(controller.getFrameRate()).toBe(30);
    controller.setAspectRatio("RATIO_16_9" as never);
    controller.update();
    expect(controller.getHeight()).toBe(Math.round(800 / (16 / 9)));
  });
});
