/*
 * furniture.spec.ts
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
 * Furniture catalog e2e: the built-in catalog dock lists furniture, search
 * filters it, and double-click adds a piece to the home.
 */
import { expect, test } from "@playwright/test";

test("catalog adds furniture to the home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("catalog-dock")).toBeVisible();
  await page.getByTestId("catalog-search").fill("sofa");
  const rows = page.getByTestId("catalog-tree").locator(".sh-catalog-piece");
  expect(await rows.count()).toBeGreaterThan(0);
  await rows.first().dblclick();
  await page.waitForTimeout(500);
  const furniture = await page.evaluate(() => (globalThis as any).__homeController.home.getFurniture().length);
  expect(furniture).toBeGreaterThan(0);
});
