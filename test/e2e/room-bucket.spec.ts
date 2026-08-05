/*
 * room-bucket.spec.ts
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
 * Room bucket fill e2e: with the Draw rooms tool active, double-clicking
 * inside an area enclosed by walls detects the room (like Java's
 * computeRoomPointsAt) instead of showing a selection rectangle.
 */
import { expect, test } from "@playwright/test";

test("double-click inside walls bucket-fills the room", async ({ page }) => {
  await page.goto("/?file=/fixtures/example-home.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(5000);
  const before = await page.evaluate(() => (globalThis as any).__homeController.home.getRooms().length);
  expect(before).toBeGreaterThan(0);

  // The wall-enclosed ring at model (440, 487) is a ~233600 cm² room
  const p = await page.evaluate(() => {
    const pv = (globalThis as any).__planView;
    return { x: pv.convertXModelToScreen(440), y: pv.convertYModelToScreen(487) };
  });
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw rooms" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.dblclick(box.x + p.x, box.y + p.y);
  await page.waitForTimeout(700);

  const after = await page.evaluate(() => {
    const rooms = (globalThis as any).__homeController.home.getRooms();
    const pts = rooms[rooms.length - 1].getPoints();
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      area += a[0] * b[1] - b[0] * a[1];
    }
    return { count: rooms.length, area: Math.abs(area) / 2, npts: pts.length };
  });
  expect(after.count).toBe(before + 1);
  // The detected room matches the wall-enclosed region (~233600 cm²)
  expect(after.area).toBeGreaterThan(100000);
  expect(after.npts).toBeGreaterThanOrEqual(4);
});
