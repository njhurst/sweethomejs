/**
 * ContentDigestManager + ContentDigests manifest (task 3.5).
 *
 * Mirrors com.eteks.sweethome3d.io.ContentDigestManager:
 *   - SHA-1 digests identify content and enable dedup + damaged-content repair
 *   - for multi-part content (an OBJ plus its MTL/textures stored under a
 *     directory like `3/`), the digest covers ALL sibling entries in the
 *     directory, concatenated in zip (central-directory) order
 *
 * The `ContentDigests` manifest entry format (verified against the fixtures):
 *
 *   ContentDigests-Version: 1.0
 *
 *   Name: 0
 *   SHA-1-Digest: <base64>
 *
 *   Name: 3/window-01.obj
 *   SHA-1-Digest: <base64>
 */
import type { Sh3dContainer } from "./Sh3dContainer.js";

export const DIGEST_ALGORITHM = "SHA-1";
const CONTENT_DIGESTS_VERSION = "1.0";

/** Returns the SHA-1 digest of the given bytes (base64-encoded, like the Java Base64 class). */
export async function sha1Base64(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(DIGEST_ALGORITHM, bytes);
  return base64Encode(new Uint8Array(digest));
}

export function base64Encode(bytes: Uint8Array): string {
  // btoa accepts binary strings; chunk to avoid stack limits on big buffers.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

export function base64Decode(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Parses a ContentDigests manifest into a name → base64-digest map. */
export function parseContentDigests(text: string): Map<string, string> {
  const digests = new Map<string, string>();
  let currentName: string | null = null;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Name:")) {
      currentName = trimmed.slice("Name:".length).trim();
    } else if (trimmed.startsWith("SHA-1-Digest:")) {
      if (currentName !== null) {
        digests.set(currentName, trimmed.slice("SHA-1-Digest:".length).trim());
      }
      currentName = null;
    }
  }
  return digests;
}

/** Writes a ContentDigests manifest (Java byte-for-byte compatible format). */
export function writeContentDigests(digests: Map<string, string>): string {
  const lines: string[] = [`ContentDigests-Version: ${CONTENT_DIGESTS_VERSION}`, ""];
  for (const [name, digest] of digests) {
    lines.push(`Name: ${name}`, `SHA-1-Digest: ${digest}`, "");
  }
  return lines.join("\n");
}

/**
 * Computes the digest for an entry the way the Java writer does: single-file
 * entries are digested alone; entries inside a directory digest all sibling
 * files of that directory (zip order).
 */
export async function computeEntryDigest(container: Sh3dContainer, entryName: string): Promise<string | null> {
  const slashIndex = entryName.lastIndexOf("/");
  if (slashIndex > 0) {
    const directory = entryName.slice(0, slashIndex + 1);
    const parts: Uint8Array[] = [];
    for (const name of container.entryNames) {
      if (name.startsWith(directory) && !name.endsWith("/")) {
        const data = await container.getEntry(name);
        if (data !== undefined) {
          parts.push(data);
        }
      }
    }
    return sha1Base64(concat(parts));
  }
  const data = await container.getEntry(entryName);
  return data === undefined ? null : sha1Base64(data);
}

/** Computes the digest of a directory prefix (used by the repair flow). */
export async function computeDirectoryDigest(container: Sh3dContainer, directory: string): Promise<string | null> {
  const parts: Uint8Array[] = [];
  for (const name of container.entryNames) {
    if (name.startsWith(directory) && !name.endsWith("/")) {
      const data = await container.getEntry(name);
      if (data !== undefined) {
        parts.push(data);
      }
    }
  }
  if (parts.length === 0) {
    return null;
  }
  return sha1Base64(concat(parts));
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
