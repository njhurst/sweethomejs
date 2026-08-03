/*
 * CloudHomeStore.ts
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
 * Cloud home store (task 9.3, post-v1 seam): a HomeStore implementation that
 * syncs documents with a server through a simple REST protocol. The server is
 * not part of this repo; this class documents the wire contract and can be
 * pointed at any endpoint implementing it (e.g. a WebDAV/nextcloud folder or
 * a small sync service).
 *
 *   GET    {base}/homes                     → list [{name, updatedAt, size}]
 *   GET    {base}/homes/{name}              → home bytes (404 → null)
 *   PUT    {base}/homes/{name}              → upsert home bytes
 *   DELETE {base}/homes/{name}              → delete
 *
 * Errors surface as exceptions; callers can fall back to IndexedDBHomeStore.
 */
import type { HomeStore } from "./HomeStore.js";

export interface CloudHomeStoreOptions {
  baseUrl: string;
  /** Auth headers (e.g. bearer token) added to every request. */
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export class CloudHomeStore implements HomeStore {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CloudHomeStoreOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.headers = options.headers ?? {};
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Cloud sync failed (${response.status}) for ${path}`);
    }
    return response;
  }

  async openHome(name: string): Promise<{ name: string; bytes: Uint8Array; updatedAt: number } | null> {
    const response = await this.request(`/homes/${encodeURIComponent(name)}`);
    if (response.status === 404) {
      return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const updatedAt = Number(response.headers.get("x-updated-at") ?? Date.now());
    return { name, bytes, updatedAt };
  }

  async saveHome(name: string, bytes: Uint8Array): Promise<void> {
    const response = await this.request(`/homes/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: bytes as unknown as BodyInit,
    });
    if (!response.ok) {
      throw new Error(`Cloud sync failed (${response.status}) saving ${name}`);
    }
  }

  async listHomes(): Promise<Array<{ name: string; updatedAt: number; size: number }>> {
    const response = await this.request("/homes");
    if (!response.ok) {
      throw new Error(`Cloud sync failed (${response.status}) listing homes`);
    }
    const homes = (await response.json()) as Array<{ name: string; updatedAt: number; size: number }>;
    return homes.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteHome(name: string): Promise<void> {
    const response = await this.request(`/homes/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`Cloud sync failed (${response.status}) deleting ${name}`);
    }
  }
}
