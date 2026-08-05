/*
 * view3d.spec.ts
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
 * 3D view e2e: the default camera settles at a 3/4 exterior view (not the
 * home's stored camera, which can point at the sky), the canvas fits its
 * container at high DPI (no window overflow), and switching plan/3D tabs
 * keeps the view instead of resetting it. Regression: a malformed observer
 * camera listener crashed the camera property-change dispatch on every
 * update, freezing the view at a sky-facing frame.
 */
import { expect, test } from "@playwright/test";

test("3D view: correct angle, canvas fits, tab-switch stable", async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto("/?file=/fixtures/example-home.sh3d");
  await page.waitForTimeout(9000);
  await page.getByTestId("view3d").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(3000);
  const cam = await page.evaluate(() => {
    const c = (globalThis as any).__homeController.home.getObserverCamera();
    return { z: Math.round(c.getZ()), pitch: +c.getPitch().toFixed(2), yaw: +c.getYaw().toFixed(2) };
  });
  expect(cam.z).toBeGreaterThan(500);
  expect(cam.pitch).toBeGreaterThan(0.25);
  expect(cam.yaw).toBeGreaterThan(0.3);
  expect(cam.yaw).toBeLessThan(1.2);
  const size = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="view3d"] canvas') as HTMLCanvasElement;
    return {
      css: [canvas.clientWidth, canvas.clientHeight],
      buffer: [canvas.width, canvas.height],
      body: [document.body.scrollWidth, document.body.scrollHeight],
      win: [window.innerWidth, window.innerHeight],
    };
  });
  expect(size.css[0]).toBeLessThanOrEqual(size.win[0]);
  expect(size.body[0]).toBeLessThanOrEqual(size.win[0] + 2);
  expect(size.buffer[0]).toBeGreaterThanOrEqual(size.css[0] * 1.9);
  await page.locator(".sh-view3d-select").selectOption("tab");
  await page.waitForTimeout(300);
  await page.locator(".sh-tab-bar").getByRole("button", { name: "3D" }).click();
  await page.waitForTimeout(3000);
  const cam2 = await page.evaluate(() => {
    const c = (globalThis as any).__homeController.home.getObserverCamera();
    return { z: Math.round(c.getZ()), pitch: +c.getPitch().toFixed(2) };
  });
  expect(cam2.z).toBeGreaterThan(500);
  expect(cam2.pitch).toBeGreaterThan(0.25);
  await context.close();
});
