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
