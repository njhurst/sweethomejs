/**
 * Port of com.eteks.sweethome3d.model.CollectionEvent / CollectionListener /
 * CollectionChangeSupport (GPL v2+, transcribed from Sweet Home 3D).
 *
 * Java semantics preserved:
 *   - listeners fire synchronously, in registration order
 *   - the listener list is copied before firing so listeners may safely
 *     modify the listener list during notification
 */
import { f32 } from "../util/f32.js";

/** A change in a model collection (item added or deleted at an index). */
export class CollectionEvent<T> {
  /** Event types (like the Java nested enum CollectionEvent.Type). */
  static readonly Type = {
    ADD: "ADD",
    DELETE: "DELETE",
  } as const;

  constructor(
    public readonly source: object,
    public readonly item: T,
    public readonly index: number,
    public readonly type: (typeof CollectionEvent.Type)[keyof typeof CollectionEvent.Type],
  ) {}
}

export type CollectionEventType = (typeof CollectionEvent.Type)[keyof typeof CollectionEvent.Type];

export interface CollectionListener<T> {
  collectionChanged(event: CollectionEvent<T>): void;
}

export class CollectionChangeSupport<T> {
  private readonly source: object;
  private readonly collectionListeners: CollectionListener<T>[] = [];

  constructor(source: object) {
    this.source = source;
  }

  addCollectionListener(listener: CollectionListener<T>): void {
    this.collectionListeners.push(listener);
  }

  removeCollectionListener(listener: CollectionListener<T>): void {
    const index = this.collectionListeners.indexOf(listener);
    if (index >= 0) {
      this.collectionListeners.splice(index, 1);
    }
  }

  fireCollectionChanged(item: T, eventType: CollectionEventType): void {
    this.fireCollectionChangedAt(item, -1, eventType);
  }

  fireCollectionChangedAt(item: T, index: number, eventType: CollectionEventType): void {
    if (this.collectionListeners.length > 0) {
      const event = new CollectionEvent<T>(this.source, item, index, eventType);
      // Work on a copy to ensure a listener can safely modify the listener list.
      const listeners = [...this.collectionListeners];
      for (const listener of listeners) {
        listener.collectionChanged(event);
      }
    }
  }
}
