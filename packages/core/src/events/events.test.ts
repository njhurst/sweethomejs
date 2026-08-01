import { describe, expect, it, vi } from "vitest";
import { CollectionChangeSupport, CollectionEvent, PropertyChangeSupport } from "./index.js";

describe("CollectionChangeSupport", () => {
  it("fires ADD and DELETE with index, synchronously and in order", () => {
    const source = { name: "home" };
    const support = new CollectionChangeSupport<number>(source);
    const events: Array<{ index: number; type: CollectionEvent.Type; item: number }> = [];
    support.addCollectionListener({
      collectionChanged: (event) => {
        events.push({ index: event.index, type: event.type, item: event.item });
      },
    });
    support.fireCollectionChangedAt(42, 3, CollectionEvent.Type.ADD);
    support.fireCollectionChanged(7, CollectionEvent.Type.DELETE);
    expect(events).toEqual([
      { index: 3, type: CollectionEvent.Type.ADD, item: 42 },
      { index: -1, type: CollectionEvent.Type.DELETE, item: 7 },
    ]);
    expect(events[0]!.item).toBe(42);
  });

  it("listeners may add listeners during notification (copy-on-fire)", () => {
    const support = new CollectionChangeSupport<string>({});
    const log: string[] = [];
    const second = { collectionChanged: (): void => log.push("second") };
    const first = {
      collectionChanged: (): void => {
        log.push("first");
        support.addCollectionListener(second);
      },
    };
    support.addCollectionListener(first);
    support.fireCollectionChanged("x", CollectionEvent.Type.ADD);
    // The newly-added listener must not fire in the same notification round.
    expect(log).toEqual(["first"]);
    support.fireCollectionChanged("y", CollectionEvent.Type.ADD);
    expect(log).toEqual(["first", "first", "second"]);
  });

  it("removeCollectionListener stops notifications", () => {
    const support = new CollectionChangeSupport<number>({});
    const listener = { collectionChanged: (): void => {} };
    const spy = vi.fn();
    support.addCollectionListener({ collectionChanged: spy });
    support.addCollectionListener(listener);
    support.removeCollectionListener(listener);
    support.fireCollectionChanged(1, CollectionEvent.Type.ADD);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("PropertyChangeSupport", () => {
  it("notifies property-specific and global listeners, specific first", () => {
    const support = new PropertyChangeSupport({});
    const calls: string[] = [];
    support.addPropertyChangeListener("wallHeight", {
      propertyChange: (evt) => calls.push(`specific:${evt.propertyName}:${evt.oldValue}->${evt.newValue}`),
    });
    support.addPropertyChangeListener({
      propertyChange: (evt) => calls.push(`global:${evt.propertyName}`),
    });
    support.firePropertyChange("wallHeight", 250, 300);
    support.firePropertyChange("name", null, "home");
    expect(calls).toEqual([
      "specific:wallHeight:250->300",
      "global:wallHeight",
      "global:name",
    ]);
  });

  it("skips no-op changes (old === new)", () => {
    const support = new PropertyChangeSupport({});
    const spy = vi.fn();
    support.addPropertyChangeListener({ propertyChange: spy });
    support.firePropertyChange("wallHeight", 250, 250);
    expect(spy).not.toHaveBeenCalled();
  });

  it("delivers synchronously (mutations are visible to listeners)", () => {
    const support = new PropertyChangeSupport({});
    let seen = 0;
    support.addPropertyChangeListener({
      propertyChange: () => {
        seen += 1;
      },
    });
    support.firePropertyChange("x", 0, 1);
    expect(seen).toBe(1);
  });
});
