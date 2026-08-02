/*
 * generate-golden.mjs
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

// Regenerates the golden plan PNG from the Java SVG reference.
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
const svg = readFileSync("test/fixtures/ls_2819/references/ls_2819.svg", "utf8");
const png = new Resvg(svg, {}).render().asPng();
writeFileSync("test/fixtures/ls_2819/references/ls_2819-golden.png", png);
console.log("golden PNG:", png.length, "bytes");
