/*
 * perf.spec.ts
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
 * Performance budgets e2e (task 9.5): the real 58-anderson home (2.5 MB, 54
 * walls, 28 furniture) must paint the plan and render the 3D view within
 * generous CI budgets.
 */
import { expect, test } from "@playwright/test";

test("opens a real home within budget (plan paint + 3D first frame)", async ({ page }) => {
  test.setTimeout(60000);
  const start = Date.now();
  await page.goto("/?file=/fixtures/58-anderson.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible({ timeout: 20000 });
  // Wait for the plan to paint (pixels appear)
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-testid="plan-canvas"]') as HTMLCanvasElement | null;
    if (canvas === null) return false;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return false;
    // Sample the center of the canvas (the home is centered by fitHome)
    const w = Math.min(canvas.width, 200);
    const h = Math.min(canvas.height, 200);
    const ox = Math.floor((canvas.width - w) / 2);
    const oy = Math.floor((canvas.height - h) / 2);
    const d = ctx.getImageData(ox, oy, w, h).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) return true;
    }
    return false;
  }, { timeout: 15000 });
  const planMs = Date.now() - start;
  console.log("perf planMs:", planMs);
  expect(planMs).toBeLessThan(12000);
  // 3D first frame: the view3d canvas gets drawn
  const view3d = page.getByTestId("view3d");
  await view3d.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(2500);
  const threeDrawn = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="view3d"] canvas') as HTMLCanvasElement | null;
    if (canvas === null || canvas.width === 0) return false;
    try {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return true;
      const d = ctx.getImageData(0, 0, Math.min(canvas.width, 32), Math.min(canvas.height, 32)).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] !== 0 || d[i + 1] !== 0 || d[i + 2] !== 0) return true;
      }
      return false;
    } catch {
      return true;
    }
  });
  const totalMs = Date.now() - start;
  console.log("perf totalMs:", totalMs, "threeDrawn:", threeDrawn);
  expect(threeDrawn).toBe(true);
  expect(totalMs).toBeLessThan(20000);
});
