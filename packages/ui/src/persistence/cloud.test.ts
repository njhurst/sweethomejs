/*
 * cloud.test.ts
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
import { describe, expect, it } from "vitest";
import { CloudHomeStore } from "./CloudHomeStore.js";

/** A tiny in-memory server implementing the CloudHomeStore wire contract. */
function fakeServer(): { store: Map<string, { bytes: Uint8Array; updatedAt: number }>; fetchImpl: typeof fetch } {
  const store = new Map<string, { bytes: Uint8Array; updatedAt: number }>();
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const path = url.replace("https://sync.test", "");
    if (init?.method === "PUT") {
      store.set(path, { bytes: new Uint8Array(init.body as ArrayBuffer), updatedAt: 1000 });
      return new Response(null, { status: 200 });
    }
    if (init?.method === "DELETE") {
      store.delete(path);
      return new Response(null, { status: 200 });
    }
    if (path === "/homes") {
      const homes = [...store.entries()].map(([name, record]) => ({
        name: name.replace("/homes/", ""),
        updatedAt: record.updatedAt,
        size: record.bytes.length,
      }));
      return new Response(JSON.stringify(homes), { status: 200, headers: { "content-type": "application/json" } });
    }
    const record = store.get(path);
    if (record === undefined) {
      return new Response(null, { status: 404 });
    }
    return new Response(record.bytes as unknown as BodyInit, { status: 200, headers: { "x-updated-at": String(record.updatedAt) } });
  }) as typeof fetch;
  return { store, fetchImpl };
}

describe("CloudHomeStore (task 9.3)", () => {
  it("round-trips homes through the REST contract", async () => {
    const { fetchImpl } = fakeServer();
    const cloud = new CloudHomeStore({ baseUrl: "https://sync.test", fetchImpl });
    const bytes = new Uint8Array([1, 2, 3, 4]) as Uint8Array<ArrayBuffer>;
    await cloud.saveHome("kitchen.sh3d", bytes as unknown as Uint8Array<ArrayBuffer>);
    const opened = await cloud.openHome("kitchen.sh3d");
    expect(opened).not.toBeNull();
    expect(opened!.bytes).toEqual(bytes);
    expect(await cloud.listHomes()).toHaveLength(1);
    await cloud.deleteHome("kitchen.sh3d");
    expect(await cloud.openHome("kitchen.sh3d")).toBeNull();
  });

  it("returns null for missing homes and throws on server errors", async () => {
    const { fetchImpl } = fakeServer();
    const cloud = new CloudHomeStore({ baseUrl: "https://sync.test", fetchImpl });
    expect(await cloud.openHome("nope.sh3d")).toBeNull();
    const failing = new CloudHomeStore({
      baseUrl: "https://sync.test",
      fetchImpl: (async () => new Response(null, { status: 500 })) as typeof fetch,
    });
    await expect(failing.listHomes()).rejects.toThrow();
  });
});
