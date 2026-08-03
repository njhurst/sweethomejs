/*
 * print.spec.ts
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
 * Print preview e2e (task 8.6): the Print… menu item opens the preview, the
 * plan is painted at the paper size, and changing the format/orientation
 * repaints.
 */
import { expect, test } from "@playwright/test";

test("print preview renders the plan at paper size", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2500);
  await page.getByTestId("menu-File").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Print…" }).click();
  await expect(page.getByTestId("print-preview-overlay")).toBeVisible();
  const canvas = page.getByTestId("print-preview-canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="print-preview-canvas"]') as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return 0;
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) colored++;
    }
    return colored;
  });
  expect(painted).toBeGreaterThan(500);
  // Switch to portrait and check the canvas repaints (dimensions change)
  const sizeBefore = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="print-preview-canvas"]') as HTMLCanvasElement;
    return [canvas.width, canvas.height];
  });
  await page.getByTestId("print-preview").locator("select").nth(1).selectOption("PORTRAIT");
  await page.waitForTimeout(400);
  const sizeAfter = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="print-preview-canvas"]') as HTMLCanvasElement;
    return [canvas.width, canvas.height];
  });
  // Both orientations cap the width at 640 px; the height changes
  expect(sizeAfter[1]).not.toBe(sizeBefore[1]);
});
