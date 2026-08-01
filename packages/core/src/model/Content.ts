/**
 * Port of com.eteks.sweethome3d.model.Content (GPL v2+).
 *
 * A content is a blob (3D model, texture image, background image...) that can
 * be opened as a stream. Web implementations back it with asset URLs, blobs,
 * or zip entries (see docs/05-file-format.md §4).
 */

export interface Content {
  /** Opens a readable stream over the content bytes. */
  openStream(): Promise<ReadableStream<Uint8Array>>;
  /** Returns a URL that identifies this content (may be synthetic). */
  getURL(): string;
}
