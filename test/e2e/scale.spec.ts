/*
 * scale.spec.ts
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
 * E2E scale regression: wall coordinates must match the click-to-model
 * conversion at the default viewport scale (0.5 px/cm), not the raw pixels.
 */
import { expect, test } from "@playwright/test";

test("drawn wall lands at click-to-model coordinates (not pixels)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  const toolbar = page.locator(".sh-toolbar");
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  const px1 = box.x + 100;
  const py1 = box.y + 100;
  const px2 = box.x + 300;
  const py2 = box.y + 200;
  await page.mouse.click(px1, py1);
  await page.mouse.click(px2, py2);
  await page.mouse.dblclick(px2, py2);
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const planView = (globalThis as any).__planView;
    const hc = (globalThis as any).__homeController;
    const wall = hc.home.getWalls()[0];
    return {
      scale: planView.viewport.getScale(),
      modelStart: [planView.convertXPixelToModel(100), planView.convertYPixelToModel(100)],
      wallStart: [wall.getXStart(), wall.getYStart()],
      wallEnd: [wall.getXEnd(), wall.getYEnd()],
    };
  });
  // The wall starts where the first click maps to model space (scale 0.5)
  expect(r.scale).toBeCloseTo(0.5, 6);
  expect(r.wallStart[0]).toBeCloseTo(r.modelStart[0], 3);
  expect(r.wallStart[1]).toBeCloseTo(r.modelStart[1], 3);
  // The end is 200px / scale = 400 model units to the right
  expect(r.wallEnd[0]).toBeCloseTo(r.modelStart[0] + 200 / r.scale, 3);
});
