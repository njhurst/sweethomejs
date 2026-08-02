/*
 * WebContentManager.test.ts
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
 * WebContentManager tests (task 7.7): acceptability rules and byte reading.
 */
import { describe, expect, it } from "vitest";
import { ContentManager } from "@sweethomejs/core";
import { WebContentManager } from "./WebContentManager.js";
import { WebContent, readContentBytes } from "./WebContent.js";

describe("WebContentManager (task 7.7)", () => {
  it("accepts .sh3d for the home content type", () => {
    const manager = new WebContentManager();
    expect(manager.isAcceptable("home.sh3d", ContentManager.ContentType.SWEET_HOME_3D)).toBe(true);
    expect(manager.isAcceptable("home.txt", ContentManager.ContentType.SWEET_HOME_3D)).toBe(false);
  });

  it("accepts model formats and libraries", () => {
    const manager = new WebContentManager();
    expect(manager.isAcceptable("model.obj", ContentManager.ContentType.MODEL)).toBe(true);
    expect(manager.isAcceptable("model.dae", ContentManager.ContentType.MODEL)).toBe(true);
    expect(manager.isAcceptable("lib.sh3f", ContentManager.ContentType.FURNITURE_LIBRARY)).toBe(true);
    expect(manager.isAcceptable("lib.sh3t", ContentManager.ContentType.TEXTURES_LIBRARY)).toBe(true);
  });

  it("builds presentation names from the file name", () => {
    const manager = new WebContentManager();
    expect(manager.getPresentationName("/path/to/home.sh3d", ContentManager.ContentType.SWEET_HOME_3D)).toBe("home.sh3d");
  });
});

describe("WebContent (task 7.7)", () => {
  it("reads its bytes back through the stream", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const content = new WebContent(new Blob([bytes as unknown as BlobPart]), "test.bin");
    expect(content.getFileName()).toBe("test.bin");
    const read = await readContentBytes(content);
    expect(Array.from(read)).toEqual([1, 2, 3, 4]);
  });
});
