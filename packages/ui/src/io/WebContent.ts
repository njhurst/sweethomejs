/*
 * WebContent.ts
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
 * WebContent (task 7.7): a Content implementation backed by a File or Blob
 * (the result of picking/opening a file in the browser).
 */
import type { Content } from "@sweethomejs/core";

export class WebContent implements Content {
  private readonly blob: Blob;
  private readonly name: string;

  constructor(blob: Blob, name: string) {
    this.blob = blob;
    this.name = name;
  }

  getBlob(): Blob {
    return this.blob;
  }

  getFileName(): string {
    return this.name;
  }

  async openStream(): Promise<ReadableStream<Uint8Array>> {
    return this.blob.stream();
  }

  getURL(): string {
    // A stable identity: the file name (content digests keyed by this in the
    // icon/model caches)
    return `file:${this.name}`;
  }
}

/** Reads a Content's bytes fully. */
export async function readContentBytes(content: Content): Promise<Uint8Array> {
  const reader = (await content.openStream()).getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
