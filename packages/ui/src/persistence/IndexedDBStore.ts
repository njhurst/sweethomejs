/*
 * IndexedDBStore.ts
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
 * IndexedDBStore (task 7.8): a small promise-based IndexedDB wrapper with
 * object stores for preferences, documents, content and recovery.
 *
 * Schema:
 *   sh-preferences (key: "prefs")      — the UserPreferences snapshot
 *   sh-documents   (key: name)         — saved home documents (bytes + meta)
 *   sh-content     (key: contentName)  — cached model/texture content
 *   sh-recovery    (key: name)         — autosaved homes for recovery
 */
export const DB_NAME = "sweethomejs";
export const DB_VERSION = 1;

export interface DocumentRecord {
  name: string;
  bytes: Uint8Array;
  updatedAt: number;
  size: number;
}

export interface RecoveryRecord {
  name: string;
  bytes: Uint8Array;
  savedAt: number;
}

export type StoreName = "sh-preferences" | "sh-documents" | "sh-content" | "sh-recovery";

export class IndexedDBStore {
  private db: IDBDatabase | null = null;

  constructor(private readonly databaseName = DB_NAME) {}

  private async open(): Promise<IDBDatabase> {
    if (this.db !== null) {
      return this.db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of ["sh-preferences", "sh-documents", "sh-content", "sh-recovery"] as StoreName[]) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store);
          }
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** Puts a value under a key in a store. */
  async put<T>(store: StoreName, key: string, value: T): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Gets a value by key. */
  async get<T>(store: StoreName, key: string): Promise<T | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  /** Lists all keys in a store. */
  async keys(store: StoreName): Promise<string[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  /** Deletes a key. */
  async delete(store: StoreName, key: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async close(): Promise<void> {
    if (this.db !== null) {
      this.db.close();
      this.db = null;
    }
  }
}
