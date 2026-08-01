/**
 * Content implementations backed by an .sh3d container (task 3.2).
 *
 * Mirrors com.eteks.sweethome3d.io.HomeURLContent: a content whose bytes live
 * in a zip entry of the opened home file. Entry names are resolved lazily.
 */
import type { Content } from "../model/Content.js";
import type { Sh3dContainer } from "./Sh3dContainer.js";

export class ZipContent implements Content {
  constructor(
    private readonly container: Sh3dContainer,
    private readonly entryName: string,
  ) {}

  async openStream(): Promise<ReadableStream<Uint8Array>> {
    const data = await this.container.getEntry(this.entryName);
    if (data === undefined) {
      throw new Error(`Missing content entry ${this.entryName}`);
    }
    return new Blob([data]).stream();
  }

  getURL(): string {
    return `zip:${this.entryName}`;
  }

  getEntryName(): string {
    return this.entryName;
  }
}

/** Resolves content file names against a container (like HomeContentContext.lookupContent). */
export class HomeContentContext {
  constructor(
    private readonly container: Sh3dContainer,
    private readonly preferPreferencesContent = false,
  ) {}

  lookupContent(contentEntryName: string): Content {
    if (this.container.hasEntry(contentEntryName)) {
      return new ZipContent(this.container, contentEntryName);
    }
    throw new Error(`Missing content entry ${contentEntryName}`);
  }

  hasEntry(name: string): boolean {
    return this.container.hasEntry(name);
  }
}
