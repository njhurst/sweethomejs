/**
 * Port of com.eteks.sweethome3d.model.Elevatable (GPL v2+).
 */
import type { Level } from "./Level.js";

/** An object bound to a level (wall, room, furniture, ...). */
export interface Elevatable {
  getLevel(): Level | null;
}
