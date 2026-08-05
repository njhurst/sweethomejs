/*
 * design-style.spec.ts
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
 * 3D view style switching (task 11.11): the 3D view menu offers Technical
 * (default) and Design view (GI). Design enables furniture light sources,
 * physical materials, sun shadows, an environment map (scene capture) and
 * GTAO post-processing; Technical keeps the plain fast render.
 */
import { expect, test } from "@playwright/test";

test("switches the 3D view between Technical and Design style", async ({ page }) => {
  await page.goto("/?file=/fixtures/design-showcase.sh3d");
  await page.getByTestId("view3d").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1500);

  // Default: Technical — no point lights, no environment, standard materials
  const readStyle = (): { pointLights: number; hasEnvironment: boolean } =>
    page.evaluate(() => {
      const scene = (globalThis as unknown as { __homeScene?: unknown }).__homeScene;
      const root = (scene as { getRoot(): unknown }).getRoot() as {
        children: unknown[];
        environment: unknown;
        traverse?: (cb: (child: unknown) => void) => void;
      };
      let pointLights = 0;
      const visit = (child: unknown): void => {
        const c = child as { children?: unknown[]; isLight?: boolean; isPointLight?: boolean };
        if (c.isLight === true && c.isPointLight === true) {
          pointLights++;
        }
        for (const sub of c.children ?? []) {
          visit(sub);
        }
      };
      visit(root);
      return {
        pointLights,
        hasEnvironment: root.environment !== undefined && root.environment !== null,
      };
    });

  const technical = await readStyle();
  expect(technical.pointLights).toBe(0);
  expect(technical.hasEnvironment).toBe(false);

  // Switch to Design view (GI) from the 3D view menu
  await page.getByTestId("menu-3D view").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Design view (GI)" }).click();
  await page.waitForTimeout(2000);

  const design = await readStyle();
  // design-showcase has 3 light sources (ceiling + floor lamps)
  expect(design.pointLights).toBe(3);
  expect(design.hasEnvironment).toBe(true);

  // The preference is persisted on the model
  const style = await page.evaluate(() => {
    const prefs = (globalThis as unknown as { __preferences: { getView3DStyle(): string } })
      .__preferences;
    return prefs.getView3DStyle();
  });
  expect(style).toBe("design");

  // Switch back to Technical
  await page.getByTestId("menu-3D view").click();
  await page.getByTestId("menubar").getByRole("button", { name: "Technical view" }).click();
  await page.waitForTimeout(1500);
  const backToTechnical = await readStyle();
  expect(backToTechnical.pointLights).toBe(0);
  expect(backToTechnical.hasEnvironment).toBe(false);
});
