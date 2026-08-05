/*
 * persistence.test.ts
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
 * Persistence tests (task 7.8): IndexedDB store CRUD, preferences snapshot,
 * document save/load, autosave + recovery (using fake-indexeddb).
 */
import { beforeAll } from "vitest";
import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { Home, UserPreferences } from "@sweethomejs/core";
import { IndexedDBStore } from "./IndexedDBStore.js";
import { InMemoryHomeStore, IndexedDBHomeStore } from "./HomeStore.js";
import {
  PreferencesStore,
  HomeDocumentStore,
  Autosaver,
  snapshotPreferences,
} from "./Persistence.js";

describe("IndexedDBStore (task 7.8)", () => {
  it("puts, gets and deletes values across stores", async () => {
    const store = new IndexedDBStore("test-db");
    await store.put("sh-preferences", "prefs", { language: "fr", savedAt: 1 });
    const value = await store.get<{ language: string }>("sh-preferences", "prefs");
    expect(value?.language).toBe("fr");
    expect(await store.get("sh-preferences", "missing")).toBeNull();
    await store.delete("sh-preferences", "prefs");
    expect(await store.get("sh-preferences", "prefs")).toBeNull();
    await store.close();
  });

  it("lists keys in a store", async () => {
    const store = new IndexedDBStore("test-db2");
    await store.put("sh-documents", "a.sh3d", { name: "a" });
    await store.put("sh-documents", "b.sh3d", { name: "b" });
    const keys = await store.keys("sh-documents");
    expect(keys.sort()).toEqual(["a.sh3d", "b.sh3d"]);
    await store.close();
  });
});

describe("PreferencesStore (task 7.8)", () => {
  it("snapshots and restores preferences", async () => {
    const store = new IndexedDBStore("test-prefs");
    const preferences = new UserPreferences();
    preferences.setUnit(new LengthUnitLike("INCH") as never);
    const prefsStore = new PreferencesStore(store);
    await prefsStore.save(preferences);
    const snapshot = await prefsStore.load();
    expect(snapshot?.unit).toBe("INCH");
    expect(snapshot?.language).toBe("en");
    await store.close();
  });

  it("snapshotPreferences captures the persistable fields", () => {
    const preferences = new UserPreferences();
    preferences.setLanguage("fr");
    preferences.setView3DStyle("design");
    const snapshot = snapshotPreferences(preferences);
    expect(snapshot.language).toBe("fr");
    expect(snapshot.view3DStyle).toBe("design");
    expect(typeof snapshot.savedAt).toBe("number");
  });

  it("persists the 3D view style across save/load", async () => {
    const store = new IndexedDBStore("test-prefs-style");
    const preferences = new UserPreferences();
    preferences.setView3DStyle("design");
    const prefsStore = new PreferencesStore(store);
    await prefsStore.save(preferences);
    const snapshot = await prefsStore.load();
    expect(snapshot?.view3DStyle).toBe("design");
    await store.close();
  });
});

class LengthUnitLike {
  constructor(private readonly name: string) {}
  getName(): string {
    return this.name;
  }
}

describe("HomeDocumentStore (task 7.8)", () => {
  it("saves and loads home documents", async () => {
    const store = new IndexedDBStore("test-docs");
    const docs = new HomeDocumentStore(store);
    const bytes = new Uint8Array([1, 2, 3]);
    await docs.save("test.sh3d", bytes);
    const record = await docs.load("test.sh3d");
    expect(record).not.toBeNull();
    expect(record!.size).toBe(3);
    expect(Array.from(record!.bytes)).toEqual([1, 2, 3]);
    expect(await docs.listNames()).toContain("test.sh3d");
    await store.close();
  });
});

describe("Autosaver (task 7.8)", () => {
  it("autosaves to the recovery store and lists recoveries", async () => {
    const store = new IndexedDBStore("test-recovery");
    const home = new Home();
    home.setName("recover-me.sh3d");
    const autosaver = new Autosaver(
      store,
      () => new Uint8Array([9, 9]),
      () => home.getName() ?? "untitled.sh3d",
    );
    await autosaver.autosave();
    const recoveries = await autosaver.listRecovery();
    expect(recoveries.length).toBe(1);
    expect(recoveries[0]!.name).toBe("recover-me.sh3d");
    await autosaver.deleteRecovery("recover-me.sh3d");
    expect(await autosaver.listRecovery()).toHaveLength(0);
    await store.close();
  });
});

describe("HomeStore (task 7.9)", () => {
  it("InMemoryHomeStore saves, lists and deletes homes", async () => {
    const store = new InMemoryHomeStore();
    await store.saveHome("a.sh3d", new Uint8Array([1]));
    await store.saveHome("b.sh3d", new Uint8Array([2]));
    expect((await store.listHomes()).map((h) => h.name).sort()).toEqual(["a.sh3d", "b.sh3d"]);
    expect(await store.openHome("a.sh3d")).not.toBeNull();
    await store.deleteHome("a.sh3d");
    expect(await store.openHome("a.sh3d")).toBeNull();
  });

  it("IndexedDBHomeStore persists across instances", async () => {
    const store = new IndexedDBStore("test-homestore");
    const homeStore = new IndexedDBHomeStore(store);
    await homeStore.saveHome("test.sh3d", new Uint8Array([7]));
    const reopened = new IndexedDBHomeStore(store);
    const record = await reopened.openHome("test.sh3d");
    expect(record).not.toBeNull();
    expect(Array.from(record!.bytes)).toEqual([7]);
    await store.close();
  });

  it("validates home bytes through the recorder", async () => {
    const store = new IndexedDBStore("test-homestore2");
    const homeStore = new IndexedDBHomeStore(store);
    expect(await homeStore.validateHome(new TextEncoder().encode("not a zip"))).toBeNull();
    await store.close();
  });
});
