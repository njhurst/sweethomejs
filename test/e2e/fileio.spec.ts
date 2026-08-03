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

  // The plan canvas must actually PAINT the opened home's walls (regression:
  // the canvas used to stay bound to the pre-open session's home/controller).
  await page.waitForTimeout(500);
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="plan-canvas"]') as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return 0;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      if (r !== 255 || g !== 255 || b !== 255) colored++;
    }
    return colored;
  });
  expect(painted).toBeGreaterThan(5000);

  // And the Wall tool must switch the canvas' controller into WALL_CREATION
  // after the session was replaced (same regression class).
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const mode = await page.evaluate(() => (globalThis as any).__homeController.getPlanController().getMode().toString());
  expect(mode).toBe("WALL_CREATION");
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
