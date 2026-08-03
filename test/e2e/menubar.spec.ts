/*
 * menubar.spec.ts
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
 * Menu bar e2e: the Plan menu switches modes / zooms / toggles magnetism,
 * and the Help menu opens the help overlay.
 */
import { expect, test } from "@playwright/test";

test("menu bar: Plan menu switches modes, zooms, toggles magnetism, help opens", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(page.getByTestId("menubar")).toBeVisible();

  await page.getByTestId("menu-Plan").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Draw walls" }).click();
  const mode = await page.evaluate(() => (globalThis as any).__homeController.getPlanController().getMode().toString());
  expect(mode).toBe("WALL_CREATION");

  await page.getByTestId("menu-Plan").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Zoom in" }).click();
  const scale = await page.evaluate(() => (globalThis as any).__planView.viewport.getScale());
  expect(scale).toBeGreaterThan(0.5);

  await page.getByTestId("menu-Plan").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Magnetism" }).click();
  const mag = await page.evaluate(() => (globalThis as any).__preferences.isMagnetismEnabled());
  expect(mag).toBe(false);

  await page.getByTestId("menu-Help").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Help…" }).click();
  await expect(page.getByTestId("help-overlay")).toBeVisible();
});
