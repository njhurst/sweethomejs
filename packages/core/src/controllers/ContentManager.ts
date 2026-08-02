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
