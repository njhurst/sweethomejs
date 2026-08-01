/*
 * App.tsx
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

import { formatFloat } from "@sweethomejs/core";
import type { ReactElement } from "react";

/**
 * Placeholder shell for the SweetHomeJS plan/3D editor.
 * Replaced by the real HomePane implementation in phase P6 (docs/13-roadmap.md).
 */
export function App(): ReactElement {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "1rem" }}>
      <h1>SweetHomeJS</h1>
      <p>
        TypeScript port of Sweet Home 3D — scaffold running. Core f32 helper:
        <code> formatFloat(0.1) = {formatFloat(0.1)}</code>
      </p>
    </main>
  );
}
