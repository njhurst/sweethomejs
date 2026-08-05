/*
 * anonymise-home.mts
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
 * anonymise-home.mts — creates an anonymised fixture from the original
 * 58-anderson-st home (the author's own design work): renames the home and
 * strips all stored properties (UI window state etc.) so no identifying
 * metadata ships in the public repo. Uses the source classes so the written
 * XML tags are canonical (the dist build mangles class names).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Home } from "../packages/core/src/model/Home.ts";
import { HomeFileRecorder } from "../packages/core/src/io/HomeFileRecorder.ts";

const source = process.argv[2] ?? "/home/njh/58-anderson-st/58 anderson st.sh3d";
const target = process.argv[3] ?? "apps/web/public/fixtures/example-home.sh3d";

const bytes = readFileSync(source);
const { home } = await new HomeFileRecorder().readHomeFromZip(bytes);

// Anonymise: generic name, no stored properties (UI window state etc.)
home.setName("example-home.sh3d");
for (const propertyName of [...home.getPropertyNames()]) {
  home.setProperty(propertyName, null);
}
for (const piece of home.getFurniture()) {
  if (typeof (piece as { setCreator?: (c: string | null) => void }).setCreator === "function") {
    (piece as { setCreator: (c: string | null) => void }).setCreator(null);
  }
}

const written = await new HomeFileRecorder().writeHome(home);
writeFileSync(target, written);
console.log("wrote", target, written.length, "bytes");
console.log("walls:", home.getWalls().length, "rooms:", home.getRooms().length, "furniture:", home.getFurniture().length, "name:", home.getName());
