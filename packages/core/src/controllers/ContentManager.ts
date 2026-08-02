/*
 * ContentManager.ts.ts
 *
 * Translated from Sweet Home 3D ContentManager.java.java
 * Sweet Home 3D, Copyright (c) 2024 Space Mushrooms <info@sweethome3d.com>
 * TypeScript translation Copyright (c) 2026 SweetHomeJS contributors
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
 *
 * Porting notes:
 *   - Keep method names identical to the Java source so upstream fixes map 1:1.
 *   - Mark every float-narrowing point with f32() (see docs/05-file-format.md).
 *   - Update this file's row in TRANSLATION.md when porting status changes.
 */

/**
 * ContentManager interface (port of
 * com.eteks.sweethome3d.viewcontroller.ContentManager, GPL v2+).
 * Resolves content locations and presents open/save dialogs.
 */
import type { Content } from "../model/Content.js";
import type { View } from "./View.js";

export namespace ContentManager {
  export enum ContentType {
    SWEET_HOME_3D = "SWEET_HOME_3D",
    MODEL = "MODEL",
    IMAGE = "IMAGE",
    CSV = "CSV",
    SVG = "SVG",
    OBJ = "OBJ",
    PNG = "PNG",
    JPEG = "JPEG",
    MOV = "MOV",
    PDF = "PDF",
    LANGUAGE_LIBRARY = "LANGUAGE_LIBRARY",
    TEXTURES_LIBRARY = "TEXTURES_LIBRARY",
    FURNITURE_LIBRARY = "FURNITURE_LIBRARY",
    PLUGIN = "PLUGIN",
    PHOTOS_DIRECTORY = "PHOTOS_DIRECTORY",
    USER_DEFINED = "USER_DEFINED",
  }
}

export interface ContentManager {
  /** Returns a Content object that references a given content location. */
  getContent(contentLocation: string): Content;
  /** Returns a human readable string for a given content location. */
  getPresentationName(contentLocation: string, contentType: ContentManager.ContentType): string;
  /** Returns true if the content location is accepted for the given type. */
  isAcceptable(contentLocation: string, contentType: ContentManager.ContentType): boolean;
  /** Shows an open dialog; returns the chosen location or null if canceled. */
  showOpenDialog(parentView: View, dialogTitle: string, contentType: ContentManager.ContentType): string | null;
  /** Shows a save dialog; returns the chosen location or null if canceled. */
  showSaveDialog(parentView: View, dialogTitle: string, contentType: ContentManager.ContentType, location: string): string | null;
}
