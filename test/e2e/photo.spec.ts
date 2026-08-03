/*
 * photo.spec.ts
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
 * Photo render e2e (task 8.3): the Three.js photo renderer produces a real
 * image in the browser (WebGL), with progressive passes and non-white pixels.
 */
import { expect, test } from "@playwright/test";

test("photo renderer draws the home with progressive passes", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(3000);
  const result = await page.evaluate(async () => {
    const renderPhoto = (globalThis as any).__renderPhoto;
    const { progress, pixels } = await renderPhoto(320, 240, 0);
    let colored = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) colored++;
    }
    return { progress, colored, total: pixels.length / 4 };
  });
  // Progressive passes delivered
  expect(result.progress.length).toBeGreaterThanOrEqual(2);
  expect(result.progress[result.progress.length - 1]).toBe(1);
  // A meaningful part of the image is not the background
  expect(result.colored).toBeGreaterThan(1000);
  console.log("photo:", JSON.stringify(result));
});
