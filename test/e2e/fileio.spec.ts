/*
 * fileio.spec.ts
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
 * E2E file I/O (task 7.10 follow-up): the Open button prompts for a file
 * (mocked picker) and loads the home; Save produces a download.
 */
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("Open button loads a home from a picked file", async ({ page }) => {
  const fixture = readFileSync("apps/web/public/fixtures/walls.sh3d");
  await page.addInitScript(({ bytes, fileName }) => {
    // Mock the File System Access picker
    (globalThis as any).showOpenFilePicker = async () => {
      return [{
        getFile: async () => new File([Uint8Array.from(bytes)], fileName),
      }];
    };
  }, { bytes: Array.from(fixture), fileName: "walls.sh3d" });

  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.locator(".sh-toolbar").getByRole("button", { name: "Open" }).click();
  await page.waitForTimeout(2000);
  // The home name reflects the loaded fixture (walls.sh3d)
  await expect(page.locator(".sh-home-name")).toContainText("walls", { timeout: 5000 });
  const wallCount = await page.evaluate(() => (globalThis as any).__homeController.home.getWalls().length);
  expect(wallCount).toBeGreaterThan(0);
});

test("trackpad scroll pans the plan and repaints", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  // Scroll the canvas (non-ctrl wheel → pan)
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(300);
  const panY = await page.evaluate(() => (globalThis as any).__planView.viewport.getPanY());
  expect(panY).not.toBe(0);
});
