/*
 * video.spec.ts
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
 * Video e2e (task 8.5): renders frames along the camera path (12 fps over a
 * 5s path = 60 frames) and checks the frames contain the rendered scene.
 */
import { expect, test } from "@playwright/test";

test("video renders frames along the camera path", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(3000);
  const result = await page.evaluate(async () => {
    const renderVideoFrames = (globalThis as any).__renderVideoFrames;
    return renderVideoFrames(60);
  });
  console.log("video:", JSON.stringify(result));
  expect(result.frames).toBeGreaterThanOrEqual(60);
  expect(result.colored).toBeGreaterThan(1000);
});
