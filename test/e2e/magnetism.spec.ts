/*
 * magnetism.spec.ts
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
 * Wall magnetism e2e: drawing a wall whose end passes near an existing wall
 * end snaps the new wall's end to that vertex (Java's WallPointWithAngleMagnetism).
 */
import { expect, test } from "@playwright/test";

test("wall end snaps to an existing wall end (magnetism)", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(3000);
  const target = await page.evaluate(() => {
    const pv = (globalThis as any).__planView;
    const wall = (globalThis as any).__homeController.home.getWalls()[0];
    return { x: pv.convertXModelToScreen(wall.getXEnd()), y: pv.convertYModelToScreen(wall.getYEnd()) };
  });
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  const startX = box.x + 30;
  const startY = box.y + 30;
  const endX = box.x + target.x + 1;
  const endY = box.y + target.y + 1;
  await page.mouse.click(startX, startY);
  await page.mouse.move(endX, endY, { steps: 8 });
  await page.mouse.click(endX, endY);
  await page.mouse.dblclick(endX, endY);
  await page.waitForTimeout(500);
  const result = await page.evaluate(() => {
    const home = (globalThis as any).__homeController.home;
    const existing = home.getWalls()[0];
    const newWall = home.getWalls()[home.getWalls().length - 1];
    return {
      existingEnd: [existing.getXEnd(), existing.getYEnd()],
      newWallEnd: [newWall.getXEnd(), newWall.getYEnd()],
    };
  });
  const dx = result.newWallEnd[0] - result.existingEnd[0];
  const dy = result.newWallEnd[1] - result.existingEnd[1];
  expect(Math.hypot(dx, dy)).toBeLessThan(2);
});
