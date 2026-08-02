/*
 * index.ts
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
 * @sweethomejs/core
 *
 * Pure-TS port of the Sweet Home 3D model, io, controllers and geometry shim.
 * This package must never import DOM/browser-only APIs so it can run in Node
 * (unit tests, CLI) and in workers.
 *
 * Port layout (see docs/02-architecture.md §2.1):
 *   src/model/       — ported com.eteks.sweethome3d.model
 *   src/io/          — .sh3d codecs, catalogs, preferences
 *   src/controllers/ — ported com.eteks.sweethome3d.viewcontroller
 *   src/geom/        — awt.geom shim (Point2D, GeneralPath, Area, ...)
 *   src/events/      — JavaBeans-style event support
 *   src/util/        — shared helpers (f32/formatFloat, ...)
 */
export { f32, formatFloat } from "./util/f32.js";
export { readFurnitureCatalog, readFurnitureCatalogWithLocale, readTexturesCatalog, loadBundle } from "./io/CatalogReader.js";
export { HomeFileRecorder, DamagedHomeRecorderException, RecorderException } from "./io/HomeFileRecorder.js";
export { parseJavaProperties } from "./io/JavaProperties.js";
export * from "./controllers/index.js";
