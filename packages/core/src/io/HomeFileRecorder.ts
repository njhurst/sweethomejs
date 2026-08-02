/**
 * HomeFileRecorder TS API (task 3.7): high-level .sh3d read/write facade.
 *
 * Mirrors com.eteks.sweethome3d.io.HomeFileRecorder / DefaultHomeInputStream /
 * DefaultHomeOutputStream for the web: readHomeFromZip detects the entry type
 * (prefers `Home.xml`), falls back to the legacy serialized `Home` entry, and
 * throws a DamagedHomeRecorderException when neither is present. writeHome
 * writes an XML-only archive (`Home.xml` + `ContentDigests` + content entries)
 * with entry names assigned in the XML exporter's traversal order.
 */
import { Sh3dContainer } from "./Sh3dContainer.js";
import { readHomeXml, readHomeXmlWithContentResolver } from "./HomeXMLReader.js";
import { HomeContentContext, ZipContent } from "./HomeContentContext.js";
import { HomeXMLExporter } from "./HomeXMLExporter.js";
import { XMLWriter } from "./XMLWriter.js";
import { writeContentDigests, sha1Base64 } from "./ContentDigestManager.js";
import { readFurnitureCatalog, readTexturesCatalog } from "./CatalogReader.js";
import { JavaObjectDecoder } from "./javadeser/JavaObjectDecoder.js";
import { HomeDecoder } from "./javadeser/HomeDecoder.js";
import type { Home } from "../model/Home.js";
import type { Content } from "../model/Content.js";
import type { FurnitureCatalog, TexturesCatalog } from "../model/Catalogs.js";

export class DamagedHomeRecorderException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DamagedHomeRecorderException";
  }
}

export class RecorderException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "RecorderException";
  }
}

export interface ReadHomeResult {
  home: Home;
  /** True when the file had to be repaired (Java: home.setRepaired(true)). */
  repaired: boolean;
  /** Which entry the home was read from. */
  source: "xml" | "serialized";
}

export interface WriteHomeOptions {
  compressLevel?: number;
}

const HOME_ENTRY = "Home";
const HOME_XML_ENTRY = "Home.xml";

/**
 * Walks the home graph in the XML exporter's element order, assigning zip
 * entry names (`0/<file>`, `1/<file>`, …) to each distinct Content object on
 * first encounter. Deduplicates by identity (Java dedupes by digest).
 */
class ContentNameTracker {
  private readonly names = new Map<Content, string>();
  private index = 0;

  /** Registers a content if new; returns its entry name. */
  assign(content: Content | null): string | null {
    if (content === null) {
      return null;
    }
    const existing = this.names.get(content);
    if (existing !== undefined) {
      return existing;
    }
    const url = content.getURL();
    // Derive a file-name sub-suffix like the Java tracker (subEntryName)
    let subName = "";
    const lastSlash = url.lastIndexOf("/");
    const fileName = lastSlash === -1 ? url : url.substring(lastSlash + 1);
    if (fileName.length > 0 && !/[/?&=]/.test(fileName)) {
      subName = "/" + fileName;
    }
    const name = `${this.index++}${subName}`;
    this.names.set(content, name);
    return name;
  }

  getSavedContentNames(): Map<Content, string> {
    return this.names;
  }

  /** Entry name → content (for writing the content entries). */
  getContentsInOrder(): Array<{ name: string; content: Content }> {
    const out: Array<{ name: string; content: Content }> = [];
    for (const [content, name] of this.names) {
      out.push({ name, content });
    }
    return out;
  }
}

export class HomeFileRecorder {
  /**
   * Reads a home from .sh3d zip bytes. Prefers the `Home.xml` entry; falls
   * back to the legacy serialized `Home` entry. Throws DamagedHomeRecorderException
   * when the archive contains neither (or they can't be parsed).
   */
  async readHomeFromZip(bytes: Uint8Array): Promise<ReadHomeResult> {
    const container = Sh3dContainer.open(bytes);
    const hasXml = container.hasEntry(HOME_XML_ENTRY);
    const hasSerialized = container.hasEntry(HOME_ENTRY);
    if (!hasXml && !hasSerialized) {
      throw new DamagedHomeRecorderException('Missing entry "Home" or "Home.xml"');
    }
    if (hasXml) {
      const xmlBytes = container.getEntrySync(HOME_XML_ENTRY)!;
      const home = readHomeXml(
        new TextDecoder().decode(xmlBytes),
        null,
        new HomeContentContext(container),
      );
      return { home, repaired: false, source: "xml" };
    }
    const serializedBytes = container.getEntrySync(HOME_ENTRY)!;
    const { root } = new JavaObjectDecoder(serializedBytes).decode();
    const home = new HomeDecoder((name) => {
      if (container.hasEntry(name)) {
        return new ZipContent(container, name);
      }
      return new ZipContent(container, name);
    }).decodeHome(root);
    return { home, repaired: false, source: "serialized" };
  }

  /** Reads a home from a Home.xml string (no content resolution). */
  readHomeFromXml(xml: string): Home {
    return readHomeXml(xml);
  }

  /** Reads a home from raw Java-serialized Home-entry bytes. */
  readHomeFromSerialized(bytes: Uint8Array): Home {
    const { root } = new JavaObjectDecoder(bytes).decode();
    return new HomeDecoder().decodeHome(root);
  }

  /**
   * Writes a home as an XML-only .sh3d archive: `Home.xml`, `ContentDigests`,
   * then the content entries. Content entry names are assigned in the XML
   * writer's traversal order, so the references in Home.xml always match.
   */
  async writeHome(home: Home, options: WriteHomeOptions = {}): Promise<Uint8Array> {
    const tracker = new ContentNameTracker();
    const exporter = new HomeXMLExporter();
    exporter.setSavedContentNameResolver((content) => tracker.assign(content));

    const writer = new XMLWriter();
    exporter.writeHome(writer, home);
    const homeXml = new TextEncoder().encode(writer.toString());

    const entries = new Map<string, Uint8Array>();
    entries.set(HOME_XML_ENTRY, homeXml);

    const contents = tracker.getContentsInOrder();
    if (contents.length > 0) {
      // Java writes the ContentDigests manifest before the content entries
      const digests = new Map<string, string>();
      for (const { name, content } of contents) {
        const data = await streamToBytes(await content.openStream());
        digests.set(name, await sha1Base64(data));
      }
      entries.set("ContentDigests", new TextEncoder().encode(writeContentDigests(digests)));
      for (const { name, content } of contents) {
        entries.set(name, await streamToBytes(await content.openStream()));
      }
    }

    return Sh3dContainer.write(entries, options.compressLevel ?? 4);
  }

  /** Reads a furniture catalog from .sh3f bytes (null when not a catalog). */
  readCatalogFromZip(bytes: Uint8Array): FurnitureCatalog | null {
    return readFurnitureCatalog(Sh3dContainer.open(bytes));
  }

  /** Reads a textures catalog from .sh3t bytes (null when not a catalog). */
  readTexturesCatalogFromZip(bytes: Uint8Array): TexturesCatalog | null {
    return readTexturesCatalog(Sh3dContainer.open(bytes));
  }
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
