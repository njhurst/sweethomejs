/*
 * Object3DFactory.ts.ts
 *
 * Translated from Sweet Home 3D Object3DFactory.java.java
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
 * Object3DFactory (port of com.eteks.sweethome3d.viewcontroller.Object3DFactory, GPL v2+).
 * Creates 3D objects for the selectable items of a home (implemented by the
 * render3d package).
 */
import type { Home } from "../model/Home.js";
import type { Selectable } from "../model/Selectable.js";
import type { UserPreferences } from "../model/UserPreferences.js";

export interface Object3DFactory {
  /** Returns the 3D object matching the given item (all resources loaded when waitForLoading). */
  createObject3D(home: Home, item: Selectable, waitForLoading: boolean): unknown;
  /** Returns the 3D object matching the given item with a context. */
  createObject3D(home: Home, item: Selectable, preferences: UserPreferences, context: unknown, waitForLoading: boolean): unknown;
}
