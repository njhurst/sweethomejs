/*
 * Persistence.ts
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
 * PreferencesStore + HomeDocumentStore + Autosaver (task 7.8): persistence
 * for preferences, home documents and autosave recovery on top of
 * IndexedDBStore.
 */
import type { UserPreferences, LengthUnit } from "@sweethomejs/core";
import { IndexedDBStore, type DocumentRecord, type RecoveryRecord } from "./IndexedDBStore.js";

export interface PreferencesSnapshot {
  language: string;
  unit: string;
  magnetismEnabled: boolean;
  rulersVisible: boolean;
  gridVisible: boolean;
  furnitureViewedFromTop: boolean;
  savedAt: number;
}

/** Snapshots the persistable UserPreferences fields. */
export function snapshotPreferences(preferences: UserPreferences): PreferencesSnapshot {
  return {
    language: preferences.getLanguage(),
    unit: String(preferences.getLengthUnit().getName()),
    magnetismEnabled: preferences.isMagnetismEnabled(),
    rulersVisible: preferences.isRulersVisible(),
    gridVisible: preferences.isGridVisible(),
    furnitureViewedFromTop: preferences.isFurnitureViewedFromTop(),
    savedAt: Date.now(),
  };
}

export class PreferencesStore {
  constructor(private readonly store: IndexedDBStore) {}

  async save(preferences: UserPreferences): Promise<void> {
    await this.store.put("sh-preferences", "prefs", snapshotPreferences(preferences));
  }

  async load(): Promise<PreferencesSnapshot | null> {
    return this.store.get<PreferencesSnapshot>("sh-preferences", "prefs");
  }
}

export class HomeDocumentStore {
  constructor(private readonly store: IndexedDBStore) {}

  async save(name: string, bytes: Uint8Array): Promise<void> {
    const record: DocumentRecord = {
      name,
      bytes,
      updatedAt: Date.now(),
      size: bytes.length,
    };
    await this.store.put("sh-documents", name, record);
  }

  async load(name: string): Promise<DocumentRecord | null> {
    return this.store.get<DocumentRecord>("sh-documents", name);
  }

  async listNames(): Promise<string[]> {
    return this.store.keys("sh-documents");
  }

  async delete(name: string): Promise<void> {
    await this.store.delete("sh-documents", name);
  }
}

export interface AutosaverOptions {
  /** Autosave interval in ms (default 60s). */
  intervalMs?: number;
  onRecoveryAvailable?: (records: RecoveryRecord[]) => void;
}

/**
 * Periodically autosaves the current home bytes to the recovery store.
 */
export class Autosaver {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly store: IndexedDBStore,
    private readonly getHomeBytes: () => Promise<Uint8Array> | Uint8Array,
    private readonly getHomeName: () => string,
    private readonly options: AutosaverOptions = {},
  ) {}

  start(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => {
      void this.autosave();
    }, this.options.intervalMs ?? 60_000);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async autosave(): Promise<void> {
    const bytes = await this.getHomeBytes();
    const record: RecoveryRecord = {
      name: this.getHomeName(),
      bytes,
      savedAt: Date.now(),
    };
    await this.store.put("sh-recovery", record.name, record);
  }

  async listRecovery(): Promise<RecoveryRecord[]> {
    const names = await this.store.keys("sh-recovery");
    const records: RecoveryRecord[] = [];
    for (const name of names) {
      const record = await this.store.get<RecoveryRecord>("sh-recovery", name);
      if (record !== null) {
        records.push(record);
      }
    }
    return records.sort((a, b) => b.savedAt - a.savedAt);
  }

  async deleteRecovery(name: string): Promise<void> {
    await this.store.delete("sh-recovery", name);
  }
}

export { CloudHomeStore } from "./CloudHomeStore.js";
export type { CloudHomeStoreOptions } from "./CloudHomeStore.js";
