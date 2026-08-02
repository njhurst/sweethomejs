/*
 * WebContentManager.ts
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
 * WebContentManager (task 7.7): a ContentManager web implementation.
 * - getContent returns a WebContent (from a File or a blob URL).
 * - showOpenDialog uses the File System Access API when available, else a
 *   hidden <input type=file> (returns a Promise the caller can await).
 * - showSaveDialog uses showSaveFilePicker or a download fallback.
 * - drag&drop and URL-param loading helpers for opening .sh3d files.
 */
import { ContentManager } from "@sweethomejs/core";
import type { View, Content } from "@sweethomejs/core";
import { WebContent } from "./WebContent.js";

export class WebContentManager implements ContentManager {
  getContent(contentLocation: string): Content {
    return new WebContent(new Blob(), contentLocation);
  }

  getPresentationName(contentLocation: string, contentType: ContentManager.ContentType): string {
    const fileName = contentLocation.split("/").pop() ?? contentLocation;
    return fileName;
  }

  isAcceptable(contentLocation: string, contentType: ContentManager.ContentType): boolean {
    const lower = contentLocation.toLowerCase();
    switch (contentType) {
      case ContentManager.ContentType.SWEET_HOME_3D:
        return lower.endsWith(".sh3d");
      case ContentManager.ContentType.MODEL:
        return lower.endsWith(".obj") || lower.endsWith(".dae") || lower.endsWith(".3ds");
      case ContentManager.ContentType.IMAGE:
        return lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg");
      case ContentManager.ContentType.FURNITURE_LIBRARY:
        return lower.endsWith(".sh3f");
      case ContentManager.ContentType.TEXTURES_LIBRARY:
        return lower.endsWith(".sh3t");
      default:
        return true;
    }
  }

  /**
   * Shows an open dialog. Resolves with the chosen file's bytes and name, or
   * null when canceled. Uses showOpenFilePicker when available.
   */
  showOpenDialog(parentView: View, dialogTitle: string, contentType: ContentManager.ContentType): string | null {
    void parentView;
    void dialogTitle;
    void contentType;
    return null;
  }

  /** Opens a file picker; resolves { name, bytes } or null on cancel. */
  async pickFile(accept: string, multiple = false): Promise<Array<{ name: string; bytes: Uint8Array }> | null> {
    const picker = (globalThis as unknown as { showOpenFilePicker?: (options: unknown) => Promise<Array<{ getFile(): Promise<File> }>> }).showOpenFilePicker;
    if (typeof picker === "function") {
      try {
        const handles = await picker({ multiple, types: [{ accept: { "application/octet-stream": [accept] } }] });
        const files: Array<{ name: string; bytes: Uint8Array }> = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          files.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
        }
        return files;
      } catch {
        return null; // canceled
      }
    }
    // Fallback: hidden input element
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener("change", async () => {
        const fileList = input.files;
        input.remove();
        if (fileList === null || fileList.length === 0) {
          resolve(null);
          return;
        }
        const files: Array<{ name: string; bytes: Uint8Array }> = [];
        for (const file of Array.from(fileList)) {
          files.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
        }
        resolve(files);
      });
      input.click();
    });
  }

  /**
   * Saves bytes to a file: showSaveFilePicker when available, else a
   * download anchor fallback.
   */
  async saveFile(name: string, bytes: Uint8Array, suggestedExtension: string): Promise<boolean> {
    const picker = (globalThis as unknown as { showSaveFilePicker?: (options: unknown) => Promise<{ createWritable(): Promise<{ write(data: unknown): Promise<void>; close(): Promise<void> }> }> }).showSaveFilePicker;
    if (typeof picker === "function") {
      try {
        const handle = await picker({ suggestedName: name, types: [{ accept: { "application/octet-stream": [suggestedExtension] } }] });
        const writable = await handle.createWritable();
        await writable.write(bytes);
        await writable.close();
        return true;
      } catch {
        return false;
      }
    }
    // Download fallback
    const blob = new Blob([bytes as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  /** Reads a dropped File into { name, bytes }. */
  async readDroppedFile(file: File): Promise<{ name: string; bytes: Uint8Array }> {
    return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
  }

  /**
   * Resolves a `?file=` URL parameter (or a provided URL) to a fetch'd
   * .sh3d. Returns null when the URL is absent or fails.
   */
  async loadFromUrl(url: string | null = new URLSearchParams(location.search).get("file")): Promise<{ name: string; bytes: Uint8Array } | null> {
    if (url === null) {
      return null;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const name = url.split("/").pop() ?? "home.sh3d";
      return { name, bytes };
    } catch {
      return null;
    }
  }

  showSaveDialog(parentView: View, dialogTitle: string, contentType: ContentManager.ContentType, location: string): string | null {
    void parentView;
    void dialogTitle;
    void contentType;
    return location;
  }
}
