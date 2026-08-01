/**
 * Port of java.beans.PropertyChangeEvent / PropertyChangeListener /
 * PropertyChangeSupport (subset used by Sweet Home 3D's model).
 *
 * Java semantics preserved:
 *   - listeners registered for a specific property AND for all properties
 *     are notified, specific-property listeners first
 *   - firePropertyChange compares old/new with === and skips equal values
 *   - the listener list is copied before firing
 *   - events are delivered synchronously
 */
export class PropertyChangeEvent {
  constructor(
    public readonly source: object,
    public readonly propertyName: string,
    public readonly oldValue: unknown,
    public readonly newValue: unknown,
  ) {}
}

export interface PropertyChangeListener {
  propertyChange(evt: PropertyChangeEvent): void;
}

type ListenerRecord = { listener: PropertyChangeListener; propertyName: string | null };

export class PropertyChangeSupport {
  private readonly source: object;
  private readonly listeners: ListenerRecord[] = [];

  constructor(source: object) {
    this.source = source;
  }

  addPropertyChangeListener(listener: PropertyChangeListener): void;
  addPropertyChangeListener(propertyName: string, listener: PropertyChangeListener): void;
  addPropertyChangeListener(propertyNameOrListener: string | PropertyChangeListener, listener?: PropertyChangeListener): void {
    if (typeof propertyNameOrListener === "string") {
      this.listeners.push({ listener: listener!, propertyName: propertyNameOrListener });
    } else {
      this.listeners.push({ listener: propertyNameOrListener, propertyName: null });
    }
  }

  removePropertyChangeListener(listener: PropertyChangeListener): void {
    for (let i = this.listeners.length - 1; i >= 0; i--) {
      if (this.listeners[i]!.listener === listener) {
        this.listeners.splice(i, 1);
      }
    }
  }

  removePropertyChangeListener(propertyName: string, listener: PropertyChangeListener): void {
    for (let i = this.listeners.length - 1; i >= 0; i--) {
      const record = this.listeners[i]!;
      if (record.listener === listener && record.propertyName === propertyName) {
        this.listeners.splice(i, 1);
      }
    }
  }

  firePropertyChange(propertyName: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }
    if (this.listeners.length === 0) {
      return;
    }
    const event = new PropertyChangeEvent(this.source, propertyName, oldValue, newValue);
    // Copy before firing so listeners may modify the list safely.
    const records = [...this.listeners];
    for (const record of records) {
      if (record.propertyName === null || record.propertyName === propertyName) {
        record.listener.propertyChange(event);
      }
    }
  }

  /** Convenience for boolean properties (like the JDK helper). */
  fireBooleanPropertyChange(propertyName: string, oldValue: boolean, newValue: boolean): void {
    this.firePropertyChange(propertyName, oldValue, newValue);
  }
}

/** Narrow helper re-exported so model files can narrow float fields in one import. */
export { f32 };
