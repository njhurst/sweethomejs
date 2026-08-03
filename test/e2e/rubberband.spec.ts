/*
 * rubberband.spec.ts
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
 * Rubber-banding e2e: every creation tool must show a live preview while
 * dragging (not only after the gesture finishes). Regression: feedback was
 * gated behind isFeedbackDisplayed() which defaulted to false, and the
 * selection rectangle was painted in raw pixels instead of model space.
 */
import { expect, test } from "@playwright/test";

async function drawnPixels(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="plan-canvas"]') as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) colored++;
    }
    return colored;
  });
}

test("wall tool rubber-bands live while dragging", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw walls" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  const base = await drawnPixels(page);
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 400, box.y + 250, { steps: 6 });
  await page.waitForTimeout(300);
  const mid = await drawnPixels(page);
  expect(mid).toBeGreaterThan(base + 200);
  await page.mouse.up();
  await page.mouse.dblclick(box.x + 400, box.y + 250);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (globalThis as any).__homeController.home.getWalls().length)).toBe(1);
});

test("selection drag shows a rubber-band rectangle at the cursor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  const base = await drawnPixels(page);
  await page.mouse.move(box.x + 300, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 500, box.y + 400, { steps: 6 });
  await page.waitForTimeout(300);
  const mid = await drawnPixels(page);
  expect(mid).toBeGreaterThan(base + 100);
  await page.mouse.up();
});

test("dimension line rubber-bands live", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw dimensions" }).click();
  const canvas = page.getByTestId("plan-canvas");
  const box = (await canvas.boundingBox())!;
  const base = await drawnPixels(page);
  await page.mouse.click(box.x + 200, box.y + 300);
  await page.mouse.move(box.x + 400, box.y + 300, { steps: 6 });
  await page.waitForTimeout(300);
  const mid = await drawnPixels(page);
  expect(mid).toBeGreaterThan(base + 100);
  await page.mouse.click(box.x + 400, box.y + 300);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (globalThis as any).__homeController.home.getDimensionLines().length)).toBe(1);
});
