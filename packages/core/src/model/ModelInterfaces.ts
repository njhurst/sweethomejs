/**
 * Port of the remaining com.eteks.sweethome3d.model interfaces and small
 * classes (GPL v2+): HomeRecorder, HomeApplication, HomeDescriptor,
 * AspectRatio, Library, Transformation and the exception hierarchy.
 */
import { CollectionChangeSupport, CollectionEvent } from "../events/CollectionChangeSupport.js";
import { f32 } from "../util/f32.js";
import type { Content } from "./Content.js";
import { Home } from "./Home.js";
import type { UserPreferences } from "./UserPreferences.js";

// --------------------------------------------------------------- exceptions

export class RecorderException extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RecorderException";
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export class InterruptedRecorderException extends RecorderException {
  constructor(message: string) {
    super(message);
    this.name = "InterruptedRecorderException";
  }
}

export class NotEnoughSpaceRecorderException extends RecorderException {
  constructor(message: string, public readonly requiredSpace: number) {
    super(message);
    this.name = "NotEnoughSpaceRecorderException";
  }
}

export class DamagedHomeRecorderException extends RecorderException {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "DamagedHomeRecorderException";
  }
}

export class IllegalHomonymException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalHomonymException";
  }
}

// ------------------------------------------------------------------ recorder

export interface HomeRecorder {
  writeHome(home: Home, name: string): void;
  readHome(name: string): Home;
  exists(name: string): boolean;
}

export namespace HomeRecorder {
  export const Type = {
    DEFAULT: "DEFAULT",
    COMPRESSED: "COMPRESSED",
  } as const;
}

// ------------------------------------------------------------- application

export abstract class HomeApplication {
  private readonly homes: Home[] = [];
  private readonly homesChangeSupport = new CollectionChangeSupport<Home>(this);
  private name: string | null = null;
  private version: string | null = null;
  private id: string | null = null;

  addHomesListener(listener: (event: { item: Home; type: string }) => void): void {
    this.homesChangeSupport.addCollectionListener({
      collectionChanged: (event: { item: Home; type: string }) => listener({ item: event.item, type: event.type }),
    });
  }

  removeHomesListener(listener: (event: { item: Home; type: string }) => void): void {
    this.homesChangeSupport.removeCollectionListener({
      collectionChanged: (event: { item: Home; type: string }) => listener({ item: event.item, type: event.type }),
    } as never);
  }

  createHome(): Home {
    return new Home();
  }

  getHomes(): Home[] {
    return this.homes;
  }

  addHome(home: Home): void {
    this.homes.push(home);
    this.homesChangeSupport.fireCollectionChangedAt(home, this.homes.length - 1, CollectionEvent.Type.ADD);
  }

  deleteHome(home: Home): void {
    const index = this.homes.indexOf(home);
    if (index !== -1) {
      this.homes.splice(index, 1);
      this.homesChangeSupport.fireCollectionChangedAt(home, index, CollectionEvent.Type.DELETE);
    }
  }

  abstract getHomeRecorder(): HomeRecorder;

  abstract getUserPreferences(): UserPreferences;

  getName(): string | null {
    return this.name;
  }

  getVersion(): string | null {
    return this.version;
  }

  getId(): string | null {
    return this.id;
  }
}

// -------------------------------------------------------------- descriptors

export class HomeDescriptor {
  private readonly name: string;
  private readonly content: Content | null;
  private readonly icon: Content | null;

  constructor(name: string, content: Content | null, icon: Content | null) {
    this.name = name;
    this.content = content;
    this.icon = icon;
  }

  getName(): string {
    return this.name;
  }

  getContent(): Content | null {
    return this.content;
  }

  getIcon(): Content | null {
    return this.icon;
  }
}

export class Library {
  private readonly id: string;
  private readonly name: string;
  private readonly type: string;
  private readonly version: string | null;
  private readonly license: string | null;
  private readonly contributor: string | null;
  private readonly content: Content | null;

  constructor(id: string, name: string, type: string, version: string | null, license: string | null, contributor: string | null, content: Content | null) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.version = version;
    this.license = license;
    this.contributor = contributor;
    this.content = content;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getType(): string {
    return this.type;
  }

  getVersion(): string | null {
    return this.version;
  }

  getLicense(): string | null {
    return this.license;
  }

  getContributor(): string | null {
    return this.contributor;
  }

  getContent(): Content | null {
    return this.content;
  }
}

export class AspectRatio {
  static readonly FREE_RATIO = "FREE_RATIO";
  static readonly RATIO_3_2 = "RATIO_3_2";
  static readonly RATIO_4_3 = "RATIO_4_3";
  static readonly RATIO_16_9 = "RATIO_16_9";
  static readonly RATIO_1_1 = "RATIO_1_1";
  static readonly RATIO_3_4 = "RATIO_3_4";
  static readonly RATIO_2_3 = "RATIO_2_3";
  static readonly RATIO_9_16 = "RATIO_9_16";

  private static readonly RATIOS: Record<string, number> = {
    [AspectRatio.RATIO_3_2]: 3 / 2,
    [AspectRatio.RATIO_4_3]: 4 / 3,
    [AspectRatio.RATIO_16_9]: 16 / 9,
    [AspectRatio.RATIO_1_1]: 1,
    [AspectRatio.RATIO_3_4]: 3 / 4,
    [AspectRatio.RATIO_2_3]: 2 / 3,
    [AspectRatio.RATIO_9_16]: 9 / 16,
  };

  static valueOf(name: string): string {
    return name;
  }

  static getValue(name: string): number | null {
    return AspectRatio.RATIOS[name] ?? null;
  }
}

export class Transformation {
  private readonly name: string;
  private readonly matrix: number[][];

  constructor(name: string, matrix: number[][]) {
    this.name = name;
    this.matrix = matrix.map((row) => row.map((v) => f32(v)));
  }

  getName(): string {
    return this.name;
  }

  getMatrix(): number[][] {
    return this.matrix.map((row) => [...row]);
  }

  equals(obj: unknown): boolean {
    if (obj === this) return true;
    if (!(obj instanceof Transformation)) return false;
    if (this.name !== obj.name) return false;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.matrix[i]![j] !== obj.matrix[i]![j]) return false;
      }
    }
    return true;
  }
}
