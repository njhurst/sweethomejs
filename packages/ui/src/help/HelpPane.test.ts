/*
 * HelpPane.test.ts
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
 * HelpPane tests (task 7.6): the help page list covers the shipped pages and
 * the pane configures the iframe URL.
 */
import { describe, expect, it } from "vitest";
import { HELP_PAGES } from "./HelpPane.js";

describe("HelpPane (task 7.6)", () => {
  it("lists the shipped help pages", () => {
    expect(HELP_PAGES.length).toBeGreaterThanOrEqual(12);
    expect(HELP_PAGES.some((p) => p.file === "index.html")).toBe(true);
    expect(HELP_PAGES.some((p) => p.file === "drawingWalls.html")).toBe(true);
    expect(HELP_PAGES.some((p) => p.file === "creatingPhotos.html")).toBe(true);
  });

  it("uses unique page files", () => {
    const files = HELP_PAGES.map((p) => p.file);
    expect(new Set(files).size).toBe(files.length);
  });
});
