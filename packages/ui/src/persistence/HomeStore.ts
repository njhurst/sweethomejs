/*
 * HomeStore.ts
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
 * HomeStore (task 7.9): an abstraction over home-document storage (local
 * IndexedDB now; cloud later). Homes are stored as raw .sh3d bytes plus
 * metadata.
 */
import { HomeFileRecorder } from "@sweethomejs/core";
import { IndexedDBStore, type DocumentRecord } from "./IndexedDBStore.js";

export interface HomeStore {
  openHome(name: string): Promise<{ name: string; bytes: Uint8Array; updatedAt: number } | null>;
  saveHome(name: string, bytes: Uint8Array): Promise<void>;
  listHomes(): Promise<Array<{ name: string; updatedAt: number; size: number }>>;
  deleteHome(name: string): Promise<void>;
}

/**
 * IndexedDBHomeStore: stores home documents in the sh-documents object store
 * and opens them through the HomeFileRecorder (validating the zip + parsing
 * the home).
 */
export class IndexedDBHomeStore implements HomeStore {
  private readonly recorder = new HomeFileRecorder();

  constructor(private readonly store: IndexedDBStore) {}

  async openHome(name: string): Promise<{ name: string; bytes: Uint8Array; updatedAt: number } | null> {
    const record = await this.store.get<DocumentRecord>("sh-documents", name);
    if (record === null) {
      return null;
    }
    return { name: record.name, bytes: record.bytes, updatedAt: record.updatedAt };
  }

  async saveHome(name: string, bytes: Uint8Array): Promise<void> {
    await this.store.put("sh-documents", name, {
      name,
      bytes,
      updatedAt: Date.now(),
      size: bytes.length,
    });
  }

  async listHomes(): Promise<Array<{ name: string; updatedAt: number; size: number }>> {
    const names = await this.store.keys("sh-documents");
    const homes: Array<{ name: string; updatedAt: number; size: number }> = [];
    for (const name of names) {
      const record = await this.store.get<DocumentRecord>("sh-documents", name);
      if (record !== null) {
        homes.push({ name: record.name, updatedAt: record.updatedAt, size: record.size });
      }
    }
    return homes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteHome(name: string): Promise<void> {
    await this.store.delete("sh-documents", name);
  }

  /** Validates that bytes are a readable home (opens through the recorder). */
  async validateHome(bytes: Uint8Array): Promise<{ name: string } | null> {
    try {
      const result = await this.recorder.readHomeFromZip(bytes);
      return { name: result.home.getName() ?? "Untitled" };
    } catch {
      return null;
    }
  }
}

/** A test-friendly in-memory HomeStore. */
export class InMemoryHomeStore implements HomeStore {
  private readonly homes = new Map<string, { name: string; bytes: Uint8Array; updatedAt: number }>();

  async openHome(name: string): Promise<{ name: string; bytes: Uint8Array; updatedAt: number } | null> {
    return this.homes.get(name) ?? null;
  }

  async saveHome(name: string, bytes: Uint8Array): Promise<void> {
    this.homes.set(name, { name, bytes, updatedAt: Date.now() });
  }

  async listHomes(): Promise<Array<{ name: string; updatedAt: number; size: number }>> {
    return [...this.homes.values()].map((h) => ({ name: h.name, updatedAt: h.updatedAt, size: h.bytes.length }));
  }

  async deleteHome(name: string): Promise<void> {
    this.homes.delete(name);
  }
}
