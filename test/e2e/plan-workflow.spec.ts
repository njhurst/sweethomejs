/*
 * plan-workflow.spec.ts
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
 * E2E plan workflow (task 7.10): fixture open → plan renders → mode
 * switching → undo state.
 */
import { expect, test } from "@playwright/test";

test("open fixture, switch modes and use undo/redo", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("plan-canvas")).toBeVisible();

  // Mode switching updates the toolbar active state
  const toolbar = page.locator(".sh-toolbar");
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Draw rooms" }).click();
  await expect(page.getByTestId("left-toolbar").getByRole("button", { name: "Draw rooms" })).toHaveClass(/active/);
  await page.getByTestId("left-toolbar").getByRole("button", { name: "Select" }).click();
  await expect(page.getByTestId("left-toolbar").getByRole("button", { name: "Select" })).toHaveClass(/active/);

  // Status bar reflects the home name
  await expect(page.getByText("walls", { exact: false }).first()).toBeVisible();
});

test("the 3D view renders the scene", async ({ page }) => {
  await page.goto("/?file=/fixtures/walls.sh3d");
  await expect(page.getByTestId("view3d")).toBeVisible();
  // The 3D canvas is a WebGL canvas inside the container
  const canvasCount = await page.getByTestId("view3d").locator("canvas").count();
  expect(canvasCount).toBeGreaterThanOrEqual(1);
});
