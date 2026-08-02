/**
 * Port of com.eteks.sweethome3d.model.HomeObject (GPL v2+).
 *
 * Base class for every named home object (furniture, walls, rooms, ...) with
 * a stable id and an arbitrary string/content property map. Property-change
 * events fire synchronously (see events/PropertyChangeSupport.ts).
 */
import { PropertyChangeSupport, type PropertyChangeListener } from "../events/PropertyChangeSupport.js";
import type { Content } from "./Content.js";

const ID_DEFAULT_PREFIX = "object";

export abstract class HomeObject {
  /** id is writable for deserialization (readObjectNoData generates defaults). */
  protected idValue: string;
  private properties: Map<string, string | Content> | null = null;
  private propertyChangeSupportValue: PropertyChangeSupport | null = null;

  constructor(id?: string | null) {
    if (id === undefined || id === null) {
      this.idValue = HomeObject.createId(ID_DEFAULT_PREFIX);
    } else {
      this.idValue = id;
    }
  }

  /** Returns a new id prefixed by the given string. */
  static createId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  /** Lazily created support, like the Java field created on the fly. */
  protected get propertyChangeSupport(): PropertyChangeSupport {
    if (this.propertyChangeSupportValue === null) {
      this.propertyChangeSupportValue = new PropertyChangeSupport(this);
    }
    return this.propertyChangeSupportValue;
  }

  // Plain-callback convenience API; adapts to the JavaBeans-style listener
  // objects the support expects (so identity-based removal keeps working).
  private readonly callbackListeners = new WeakMap<(evt: unknown) => void, PropertyChangeListener>();

  addPropertyChangeListener(listener: (evt: unknown) => void): void {
    let record = this.callbackListeners.get(listener);
    if (record === undefined) {
      record = { propertyChange: (evt) => listener(evt) };
      this.callbackListeners.set(listener, record);
    }
    this.propertyChangeSupport.addPropertyChangeListener(record);
  }

  removePropertyChangeListener(listener: (evt: unknown) => void): void {
    const record = this.callbackListeners.get(listener);
    if (record !== undefined) {
      this.propertyChangeSupport.removePropertyChangeListener(record);
    }
  }

  addPropertyChangeListenerFor(propertyName: string, listener: (evt: unknown) => void): void {
    let record = this.callbackListeners.get(listener);
    if (record === undefined) {
      record = { propertyChange: (evt) => listener(evt) };
      this.callbackListeners.set(listener, record);
    }
    this.propertyChangeSupport.addPropertyChangeListener(propertyName, record);
  }

  removePropertyChangeListenerFor(propertyName: string, listener: (evt: unknown) => void): void {
    const record = this.callbackListeners.get(listener);
    if (record !== undefined) {
      this.propertyChangeSupport.removePropertyChangeListener(propertyName, record);
    }
  }

  protected firePropertyChange(propertyName: string, oldValue: unknown, newValue: unknown): void {
    this.propertyChangeSupport.firePropertyChange(propertyName, oldValue, newValue);
  }

  getId(): string {
    return this.idValue;
  }

  setId(id: string): void {
    this.idValue = id;
  }

  getProperty(name: string): string | null {
    if (this.properties !== null) {
      const value = this.properties.get(name);
      if (typeof value === "string") {
        return value;
      }
    }
    return null;
  }

  /** Returns a content property (added in SH3D 7.2). */
  getContentProperty(name: string): Content | null {
    if (this.properties !== null) {
      const value = this.properties.get(name);
      if (value !== null && typeof value === "object") {
        return value as Content;
      }
    }
    return null;
  }

  isContentProperty(name: string): boolean {
    if (this.properties !== null) {
      const value = this.properties.get(name);
      return value !== null && typeof value === "object";
    }
    return false;
  }

  setProperty(name: string, value: string): void;
  setProperty(name: string, value: Content): void;
  setProperty(name: string, value: string | Content | null): void;
  setProperty(name: string, value: string | Content | null): void {
    if (value !== null && typeof value !== "string" && typeof value !== "object") {
      throw new Error(`Property value can be only a string or a content, not a ${typeof value}`);
    }
    const oldValue = this.properties !== null ? this.properties.get(name) : undefined;
    if (value === null) {
      if (this.properties !== null && oldValue !== undefined) {
        this.properties.delete(name);
        if (this.properties.size === 0) {
          this.properties = null;
        }
        this.firePropertyChange(name, oldValue, null);
      }
    } else {
      if (this.properties === null) {
        this.properties = new Map();
      }
      this.properties.set(name, value);
      // Event fired only if not null value changed
      this.firePropertyChange(name, oldValue, value);
    }
  }

  getPropertyNames(): string[] {
    if (this.properties !== null) {
      return [...this.properties.keys()];
    }
    return [];
  }

  /** Returns a copy of this object with a new id (like HomeObject.duplicate). */
  duplicate(): this {
    const copy = this.clone();
    let index = 0;
    while (index < this.idValue.length) {
      const c = this.idValue.charAt(index).toLowerCase();
      if (c < "a" || c > "z") break;
      index++;
    }
    const prefix = index > 0 ? this.idValue.substring(0, index) : ID_DEFAULT_PREFIX;
    copy.setId(HomeObject.createId(prefix));
    return copy as this;
  }

  /** Copies the base-class fields onto a clone (Java's super.clone() semantics). */
  protected copyBaseTo(copy: HomeObject): void {
    copy.idValue = this.idValue;
    copy.properties = this.properties !== null ? new Map(this.properties) : null;
    copy.propertyChangeSupportValue = null;
  }

  /** Returns a clone of this object (same id, no listeners). */
  clone(): HomeObject {
    const copy = Object.create(Object.getPrototypeOf(this)) as HomeObject;
    this.copyBaseTo(copy);
    return copy;
  }
}
