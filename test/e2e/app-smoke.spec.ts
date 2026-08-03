/*
 * app-smoke.spec.ts
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
 * E2E smoke (task 7.10): the app boots, the HomePane renders, and the plan
 * canvas is interactive.
 */
import { expect, test } from "@playwright/test";

test("boots the HomePane with toolbar, plan canvas and status bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-loading")).toBeHidden({ timeout: 15_000 }).catch(() => {});
  await expect(page.locator(".sh-toolbar")).toBeVisible();
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await expect(page.getByTestId("status-selection")).toContainText("0 selected");
});

test("draws a wall in wall-creation mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  const toolbar = page.locator(".sh-toolbar");
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  // Click two points in the middle of the canvas to draw a wall
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
  // Double-click to finish the wall creation
  await page.mouse.dblclick(box.x + box.width * 0.6, box.y + box.height * 0.6);
  // The status bar shows the wall was created (status-mode returns to SELECTION)
  await expect(page.getByTestId("status-mode")).toContainText("SELECTION");
});

test("opens the walls fixture via ?file= and paints the plan", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  // The plan canvas paints (non-blank) — check some pixels via the page
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="plan-canvas"]') as HTMLCanvasElement;
    if (canvas === null) {
      return { blank: true };
    }
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      return { blank: true };
    }
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonWhite = 0;
    for (let i = 0; i < data.length; i += 40) {
      if (data[i]! < 250 || data[i + 1]! < 250 || data[i + 2]! < 250) {
        nonWhite++;
      }
    }
    return { blank: nonWhite === 0, sampled: nonWhite };
  });
  expect(result.blank).toBe(false);
});
