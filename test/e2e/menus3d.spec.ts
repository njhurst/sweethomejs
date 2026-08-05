/*
 * menus3d.spec.ts
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
 * Full menu bar + toolbar + 3D exterior view e2e: all Java menus present
 * (unimplemented items disabled placeholders), toolbar buttons, and the 3D
 * view defaults to an oblique exterior view framing the whole home.
 */
import { expect, test } from "@playwright/test";

test("full menus, toolbar, catalog dock and exterior 3D view", async ({ page }) => {
  await page.goto("/?file=/fixtures/example-home.sh3d");
  await page.waitForTimeout(4000);
  for (const name of ["File", "Edit", "Furniture", "Plan", "3D view", "Tools", "Catalog", "Help"]) {
    await expect(page.getByTestId(`menu-${name}`)).toBeVisible();
  }
  const toolbar = page.locator(".sh-toolbar");
  for (const label of ["Cut", "Copy", "Paste", "Zoom in", "Zoom out", "Catalog"]) {
    await expect(toolbar.getByRole("button", { name: label })).toBeVisible();
  }
  await expect(page.getByTestId("catalog-dock")).toBeVisible();
  await page.getByTestId("view3d").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(1500);
  const cam = await page.evaluate(() => {
    const c = (globalThis as any).__homeController.home.getObserverCamera();
    return { z: c.getZ(), pitch: c.getPitch() };
  });
  expect(cam.z).toBeGreaterThan(300);
  // Eye-level exterior framing: slightly looking down at the house
  expect(cam.pitch).toBeGreaterThan(0.05);
  await page.getByTestId("menu-File").click();
  await expect(page.getByTestId("menubar").getByRole("button", { name: "Save as…" })).toBeDisabled();
});
