/**
 * .sh3d container layer (task 3.1).
 *
 * An .sh3d file is a ZIP archive (see docs/05-file-format.md §1):
 *   - `Home`         legacy Java-serialized object graph (optional)
 *   - `Home.xml`     canonical XML home document (preferred)
 *   - `ContentDigests` repair manifest (Name + SHA-1-Digest pairs)
 *   - `<index>` / `<index>/<file>` content entries (models, textures)
 *
 * The container parses only the ZIP central directory up front (names, sizes,
 * compression, local offsets) so a large home can be opened without inflating
 * every content blob; individual entries are inflated on demand with fflate.
 *
 * ZIP format per APPNOTE.TXT (PKWARE): EOCD 0x06054b50, central entries
 * 0x02014b50, local headers 0x04034b50.
 */
import { deflateSync, inflateSync } from "fflate";

export const HOME_ENTRY = "Home";
export const HOME_XML_ENTRY = "Home.xml";
export const CONTENT_DIGESTS_ENTRY = "ContentDigests";

const EOCD_SIG = 0x06054b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;

interface EntryInfo {
  name: string;
  /** Compressed size (from the central directory). */
  compressedSize: number;
  /** Uncompressed size (from the central directory). */
  size: number;
  /** 0 = stored, 8 = deflate. */
  method: number;
  /** Offset of the local file header in the archive. */
  localOffset: number;
}

export class Sh3dContainer {
  private readonly entryInfos = new Map<string, EntryInfo>();
  private readonly syncCache = new Map<string, Uint8Array>();

  private constructor(
    private readonly bytes: Uint8Array,
    readonly entryNames: string[],
    entries: EntryInfo[],
  ) {
    for (const entry of entries) {
      this.entryInfos.set(entry.name, entry);
    }
  }

  /** Opens a container by parsing the central directory (no decompression). */
  static open(bytes: Uint8Array): Sh3dContainer {
    const entries = parseCentralDirectory(bytes);
    return new Sh3dContainer(bytes, entries.map((e) => e.name), entries);
  }

  hasEntry(name: string): boolean {
    return this.entryInfos.has(name);
  }

  /** Returns the uncompressed entry size (from the central directory). */
  getEntrySize(name: string): number | undefined {
    return this.entryInfos.get(name)?.size;
  }

  getCompressedSize(name: string): number | undefined {
    return this.entryInfos.get(name)?.compressedSize;
  }

  getEntryMethod(name: string): number | undefined {
    return this.entryInfos.get(name)?.method;
  }

  /** Inflates an entry on demand. */
  async getEntry(name: string): Promise<Uint8Array | undefined> {
    const cached = this.syncCache.get(name);
    if (cached !== undefined) return cached;
    return this.inflate(name);
  }

  /** Synchronous entry read, caching the whole container's entries on first use. */
  getEntrySync(name: string): Uint8Array | undefined {
    const cached = this.syncCache.get(name);
    if (cached !== undefined) return cached;
    const data = this.inflate(name);
    if (data !== undefined) {
      this.syncCache.set(name, data);
    }
    return data;
  }

  /** Returns the raw compressed bytes of an entry (for repair flows). */
  getEntryRaw(name: string): Uint8Array | undefined {
    const info = this.entryInfos.get(name);
    if (info === undefined) return undefined;
    return this.bytes.subarray(info.localOffset + localHeaderSize(this.bytes, info.localOffset), info.localOffset + localHeaderSize(this.bytes, info.localOffset) + info.compressedSize);
  }

  /** All entry names (central-directory order, matches the Java writer). */
  getEntryNames(): string[] {
    return this.entryNames;
  }

  /** Uncompressed total size (sum of central-directory sizes). */
  getTotalUncompressedSize(): number {
    let total = 0;
    for (const info of this.entryInfos.values()) {
      total += info.size;
    }
    return total;
  }

  private inflate(name: string): Uint8Array | undefined {
    const info = this.entryInfos.get(name);
    if (info === undefined) return undefined;
    const dataStart = info.localOffset + localHeaderSize(this.bytes, info.localOffset);
    const raw = this.bytes.subarray(dataStart, dataStart + info.compressedSize);
    if (info.method === 0) {
      return new Uint8Array(raw);
    }
    try {
      return inflateSync(raw);
    } catch {
      return undefined;
    }
  }

  /** Writes a container preserving entry order (Java writes Home, Home.xml, ContentDigests, content). */
  static write(entries: Map<string, Uint8Array>, compressionLevel = 4): Uint8Array {
    // Compress each entry with deflate, then assemble local headers + central
    // directory so sizes are exact (mirrors ZipOutputStream output order).
    const prepared: Array<{ name: string; method: number; crc: number; compressed: Uint8Array; size: number }> = [];
    for (const [name, data] of entries) {
      const { compressed, crc } = deflateEntry(data, compressionLevel);
      prepared.push({ name, method: compressionLevel === 0 ? 0 : 8, crc, compressed, size: data.length });
    }
    return assembleZip(prepared);
  }
}

/** Parses the ZIP central directory; throws if the archive is malformed. */
function parseCentralDirectory(bytes: Uint8Array): EntryInfo[] {
  if (bytes.length < 22) {
    throw new Error("Not a ZIP archive (too small)");
  }
  // Find the end-of-central-directory record scanning backwards.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (readU32(bytes, i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) {
    throw new Error("Not a ZIP archive (no end-of-central-directory record)");
  }
  const entryCount = readU16(bytes, eocd + 10);
  let offset = readU32(bytes, eocd + 16);
  const entries: EntryInfo[] = [];
  for (let i = 0; i < entryCount; i++) {
    if (readU32(bytes, offset) !== CENTRAL_SIG) {
      throw new Error(`Malformed central directory at offset ${offset}`);
    }
    const method = readU16(bytes, offset + 10);
    const compressedSize = readU32(bytes, offset + 20);
    const size = readU32(bytes, offset + 24);
    const nameLen = readU16(bytes, offset + 28);
    const extraLen = readU16(bytes, offset + 30);
    const commentLen = readU16(bytes, offset + 32);
    const localOffset = readU32(bytes, offset + 42);
    const name = decodeUtf8(bytes, offset + 46, nameLen);
    entries.push({ name, compressedSize, size, method, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Returns the total size of a local file header (30 bytes + name + extra). */
function localHeaderSize(bytes: Uint8Array, offset: number): number {
  if (readU32(bytes, offset) !== LOCAL_SIG) {
    throw new Error(`Malformed local file header at offset ${offset}`);
  }
  const nameLen = readU16(bytes, offset + 26);
  const extraLen = readU16(bytes, offset + 28);
  return 30 + nameLen + extraLen;
}

function deflateEntry(data: Uint8Array, level: number): { compressed: Uint8Array; crc: number } {
  if (level === 0) {
    return { compressed: data, crc: crc32(data) };
  }
  return { compressed: deflateSync(data, { level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }), crc: crc32(data) };
}

function assembleZip(entries: Array<{ name: string; method: number; crc: number; compressed: Uint8Array; size: number }>): Uint8Array {
  const encoder = new TextEncoder();
  let centralSize = 0;
  const centralEntries: Uint8Array[] = [];
  let localTotal = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    localTotal += 30 + nameBytes.length + entry.compressed.length;
  }
  // Local headers + data
  const locals: Uint8Array[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const local = new Uint8Array(30 + nameBytes.length);
    writeU32(local, 0, LOCAL_SIG);
    writeU16(local, 4, 20); // version needed
    writeU16(local, 6, 0); // flags
    writeU16(local, 8, entry.method);
    writeU32(local, 14, entry.crc);
    writeU32(local, 18, entry.compressed.length);
    writeU32(local, 22, entry.size);
    writeU16(local, 26, nameBytes.length);
    writeU16(local, 28, 0); // extra len
    local.set(nameBytes, 30);
    locals.push(local, entry.compressed);

    // Central directory entry
    const central = new Uint8Array(46 + nameBytes.length);
    writeU32(central, 0, CENTRAL_SIG);
    writeU16(central, 4, 20); // version made by
    writeU16(central, 6, 20); // version needed
    writeU16(central, 10, entry.method);
    writeU32(central, 16, entry.crc);
    writeU32(central, 20, entry.compressed.length);
    writeU32(central, 24, entry.size);
    writeU16(central, 28, nameBytes.length);
    writeU32(central, 42, localOffset);
    central.set(nameBytes, 46);
    centralEntries.push(central);
    centralSize += central.length;
    localOffset += 30 + nameBytes.length + entry.compressed.length;
  }

  const centralDir = concat(centralEntries);
  const eocd = new Uint8Array(22);
  writeU32(eocd, 0, EOCD_SIG);
  writeU16(eocd, 8, entries.length);
  writeU16(eocd, 10, entries.length);
  writeU32(eocd, 12, centralDir.length);
  writeU32(eocd, 16, localTotal);

  return concat([...locals, centralDir, eocd]);
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

function readU16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function writeU16(out: Uint8Array, offset: number, value: number): void {
  out[offset] = value & 0xff;
  out[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(out: Uint8Array, offset: number, value: number): void {
  out[offset] = value & 0xff;
  out[offset + 1] = (value >>> 8) & 0xff;
  out[offset + 2] = (value >>> 16) & 0xff;
  out[offset + 3] = (value >>> 24) & 0xff;
}

function decodeUtf8(bytes: Uint8Array, offset: number, len: number): string {
  return new TextDecoder().decode(bytes.subarray(offset, offset + len));
}

// --- CRC-32 (PKZIP polynomial) --------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ (data[i] ?? 0)) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
