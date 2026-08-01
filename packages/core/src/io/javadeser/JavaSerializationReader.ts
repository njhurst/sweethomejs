/**
 * Java object serialization stream reader (spike / foundation for task 3.4).
 *
 * Parses the Java Object Serialization wire format used by the legacy `Home`
 * entry inside `.sh3d` files. This module walks the stream structure and
 * extracts class descriptors, field tables, and object/array graph nodes.
 * Materializing typed `Home` instances from the graph is task 3.4.
 *
 * Wire format reference: Java Object Serialization Specification
 * (https://docs.oracle.com/javase/8/docs/platform/serialization/spec/protocol.html)
 *
 * Ported for SweetHomeJS (GPL v2+); the format is an open spec.
 */

export const TC_NULL = 0x70;
export const TC_REFERENCE = 0x71;
export const TC_CLASSDESC = 0x72;
export const TC_OBJECT = 0x73;
export const TC_STRING = 0x74;
export const TC_ARRAY = 0x75;
export const TC_CLASS = 0x76;
export const TC_BLOCKDATA = 0x77;
export const TC_ENDBLOCKDATA = 0x78;
export const TC_RESET = 0x79;
export const TC_BLOCKDATALONG = 0x7a;
export const TC_EXCEPTION = 0x7b;
export const TC_LONGSTRING = 0x7c;
export const TC_PROXYCLASSDESC = 0x7d;
export const TC_ENUM = 0x7e;

export const SC_WRITE_METHOD = 0x01;
export const SC_SERIALIZABLE = 0x02;
export const SC_EXTERNALIZABLE = 0x04;
export const SC_BLOCK_DATA = 0x08;
export const SC_ENUM = 0x10;

/** Primitive field type codes (java.io.ObjectStreamClass). */
export const TYPE_CODES = new Set(["B", "C", "D", "F", "I", "J", "S", "Z", "L", "["]);

export interface FieldDesc {
  name: string;
  /** Primitive type code, "L" (object), or "[" (array). */
  typeCode: string;
  /** For "L"/"[" fields: the field's class name (e.g. "java.util.List"). */
  className?: string;
}

export interface ClassDesc {
  /** Unique handle (1-based) assigned on first encounter. */
  handle: number;
  name: string;
  serialVersionUID: bigint;
  flags: number;
  fields: FieldDesc[];
  superClassDesc: ClassDesc | null;
  isProxy: boolean;
  isEnum: boolean;
  isRecord: boolean;
}

export type Node =
  | { kind: "null" }
  | { kind: "reference"; handle: number }
  | { kind: "string"; handle: number; value: string }
  | { kind: "class"; handle: number; classDesc: ClassDesc }
  | { kind: "object"; handle: number; classDesc: ClassDesc }
  | { kind: "array"; handle: number; classDesc: ClassDesc; elementCount: number }
  | { kind: "enum"; handle: number; classDesc: ClassDesc; constantName: string };

export interface WalkResult {
  /** Class descriptors in encounter order (handle 1-based index). */
  classes: ClassDesc[];
  /** All handles assigned (objects, arrays, strings, classes, enums). */
  nodeCount: number;
}

export class JavaSerializationReader {
  /** JDK ObjectOutputStream.baseWireHandle: all wire handles are offset by this. */
  static readonly BASE_WIRE_HANDLE = 0x7e0000;

  private readonly bytes: Uint8Array;
  private pos = 0;
  private readonly classes: ClassDesc[] = [];
  private readonly classesByHandle = new Map<number, ClassDesc>();
  private readonly stringsByHandle = new Map<number, string>();
  private wireHandleCounter = 0;
  private depth = 0;
  /** Object-path context for error messages (e.g. `Home.furniture[3].model`). */
  private path: string[] = [];

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  private fail(message: string): never {
    throw new Error(`${message} at offset ${this.pos} (path: ${this.path.join(".") || "<root>"})`);
  }

  /** Walks the entire stream, returning the class inventory. */
  walk(): WalkResult {
    const magic = this.u16();
    const version = this.u16();
    if (magic !== 0xaced) {
      this.fail(`Not a Java serialization stream (magic 0x${magic.toString(16)})`);
    }
    if (version !== 5) {
      this.fail(`Unsupported stream version ${version}`);
    }
    while (this.pos < this.bytes.length) {
      const tag = this.peek();
      if (tag === TC_RESET) {
        // Reset clears the handle table; we keep classes (handles stay unique
        // because we never reuse them).
        this.u8();
        continue;
      }
      this.readContent();
    }
    return { classes: this.classes, nodeCount: this.wireHandleCounter };
  }

  /** content := object | blockData */
  private readContent(): Node {
    const tag = this.u8();
    switch (tag) {
      case TC_NULL:
        return { kind: "null" };
      case TC_REFERENCE: {
        const handle = this.u32();
        return { kind: "reference", handle };
      }
      case TC_STRING: {
        const value = this.utf();
        return { kind: "string", handle: this.nextWireHandle(), value };
      }
      case TC_LONGSTRING: {
        const value = this.longUtf();
        return { kind: "string", handle: this.nextWireHandle(), value };
      }
      case TC_OBJECT:
        return this.readObject();
      case TC_CLASS: {
        const classDesc = this.readClassDesc();
        this.nextWireHandle();
        return { kind: "class", handle: this.wireHandleCounter, classDesc };
      }
      case TC_ARRAY: {
        const classDesc = this.readClassDesc();
        const handle = this.nextWireHandle();
        const elementCount = this.s32();
        this.readArrayData(classDesc, elementCount);
        return { kind: "array", handle, classDesc, elementCount };
      }
      case TC_ENUM: {
        const classDesc = this.readClassDesc();
        this.nextWireHandle();
        this.readContent(); // enum constant name (TC_STRING)
        return { kind: "enum", handle: this.wireHandleCounter, classDesc, constantName: "" };
      }
      case TC_EXCEPTION: {
        this.readContent();
        return { kind: "null" };
      }
      case TC_BLOCKDATA: {
        const len = this.u8();
        this.skip(len);
        return { kind: "null" };
      }
      case TC_BLOCKDATALONG: {
        const len = this.s32();
        this.skip(len);
        return { kind: "null" };
      }
      default:
        this.fail(`Unexpected tag 0x${tag.toString(16)}`);
    }
  }

  private readObject(): Node {
    const classDesc = this.readClassDesc();
    const handle = this.nextWireHandle();
    // classdata includes the per-class objectAnnotation (TC_ENDBLOCKDATA-
    // terminated) for every class with SC_WRITE_METHOD in the hierarchy.
    this.path.push(`${classDesc.name}#${handle}`);
    this.readClassData(classDesc);
    this.path.pop();
    return { kind: "object", handle, classDesc };
  }

  private readClassDesc(): ClassDesc {
    const tag = this.peek();
    if (tag === TC_NULL) {
      this.u8();
      return this.nullClassDesc();
    }
    if (tag === TC_REFERENCE) {
      this.u8();
      const handle = this.u32();
      const cls = this.classesByHandle.get(handle);
      if (cls === undefined) {
        this.fail(`Reference to unknown class handle 0x${handle.toString(16)}`);
      }
      return cls;
    }
    if (tag === TC_CLASSDESC) {
      return this.readClassDescInner(false);
    }
    if (tag === TC_PROXYCLASSDESC) {
      return this.readClassDescInner(true);
    }
    this.fail(`Expected class descriptor, got tag 0x${tag.toString(16)}`);
  }

  private nullClassDesc(): ClassDesc {
    return {
      handle: 0,
      name: "<null>",
      serialVersionUID: 0n,
      flags: 0,
      fields: [],
      superClassDesc: null,
      isProxy: false,
      isEnum: false,
      isRecord: false,
    };
  }

  private readClassDescInner(isProxy: boolean): ClassDesc {
    // Consume the TC_CLASSDESC / TC_PROXYCLASSDESC tag (already peeked).
    this.u8();
    // The JDK assigns the descriptor handle first (ObjectOutputStream
    // writeClassDesc), before the name and field class-name strings.
    const descriptorHandle = this.nextWireHandle();
    let name: string;
    let serialVersionUID = 0n;
    let flags = 0;
    if (isProxy) {
      name = "[proxy]";
      const interfaceCount = this.s32();
      for (let i = 0; i < interfaceCount; i++) {
        this.utf();
      }
    } else {
      name = this.utf();
      serialVersionUID = this.u64();
    }
    flags = this.u8();
    const fieldCount = this.u16();
    const fields: FieldDesc[] = [];
    for (let i = 0; i < fieldCount; i++) {
      fields.push(this.readFieldDesc());
    }
    // classAnnotation
    this.readAnnotations();
    // superClassDesc (may be TC_NULL for java.lang.Object)
    const superTag = this.peek();
    let superClassDesc: ClassDesc | null = null;
    if (superTag === TC_NULL) {
      this.u8();
    } else {
      superClassDesc = this.readClassDesc();
    }
    const classDesc: ClassDesc = {
      handle: descriptorHandle,
      name,
      serialVersionUID,
      flags,
      fields,
      superClassDesc,
      isProxy,
      isEnum: (flags & SC_ENUM) !== 0,
      isRecord: false,
    };
    this.classes.push(classDesc);
    this.classesByHandle.set(classDesc.handle, classDesc);
    return classDesc;
  }

  private readFieldDesc(): FieldDesc {
    const typeCode = String.fromCharCode(this.u8());
    const name = this.utf();
    if (!TYPE_CODES.has(typeCode)) {
      this.fail(`Unknown field type code "${typeCode}" for field "${name}"`);
    }
    if (typeCode === "L" || typeCode === "[") {
      // The class name is written via writeTypeString: a bare UTF with a new
      // handle on first occurrence, or a TC_REFERENCE to it on repeats.
      const tag = this.u8();
      let className: string;
      if (tag === TC_STRING) {
        className = this.utf();
        this.stringsByHandle.set(this.nextWireHandle(), className);
      } else if (tag === TC_REFERENCE) {
        const handle = this.u32();
        const resolved = this.stringsByHandle.get(handle);
        if (resolved === undefined) {
          this.fail(`Reference to unknown string handle 0x${handle.toString(16)}`);
        }
        className = resolved;
      } else {
        this.fail(`Expected TC_STRING or TC_REFERENCE for field class name, got 0x${tag.toString(16)}`);
      }
      return { name, typeCode, className };
    }
    return { name, typeCode };
  }
  private readAnnotations(): void {
    for (;;) {
      const tag = this.peek();
      if (tag === TC_ENDBLOCKDATA) {
        this.u8();
        return;
      }
      this.readContent();
    }
  }

  private readClassData(classDesc: ClassDesc): void {
    // Superclass data first, then this class's fields.
    if (classDesc.superClassDesc !== null && classDesc.superClassDesc.handle !== 0) {
      this.readClassData(classDesc.superClassDesc);
    }
    if ((classDesc.flags & SC_EXTERNALIZABLE) !== 0) {
      // Externalizable writes raw data; can't introspect statically.
      this.fail(`Externalizable class ${classDesc.name} not supported`);
    }
    if ((classDesc.flags & SC_WRITE_METHOD) !== 0) {
      // Custom writeObject: the stream contains the fields declared in the
      // descriptor followed by an annotation block.
      for (const field of classDesc.fields) {
        this.readFieldValue(field);
      }
      this.readAnnotations();
      return;
    }
    for (const field of classDesc.fields) {
      this.readFieldValue(field);
    }
  }

  private readFieldValue(field: FieldDesc): void {
    switch (field.typeCode) {
      case "B":
        this.u8();
        break;
      case "C":
        this.u16();
        break;
      case "D":
        this.f64();
        break;
      case "F":
        this.f32();
        break;
      case "I":
        this.s32();
        break;
      case "J":
        this.u64();
        break;
      case "S":
        this.s16();
        break;
      case "Z":
        this.u8();
        break;
      default:
        // Object or array field: a content element.
        this.readContent();
    }
  }

  private readArrayData(classDesc: ClassDesc, elementCount: number): void {
    const component = classDesc.name.startsWith("[")
      ? classDesc.name.charAt(1)
      : classDesc.name.startsWith("L")
        ? "L"
        : classDesc.name;
    switch (component) {
      case "B":
        this.skip(elementCount);
        break;
      case "C":
        this.skip(elementCount * 2);
        break;
      case "D":
        this.skip(elementCount * 8);
        break;
      case "F":
        this.skip(elementCount * 4);
        break;
      case "I":
        this.skip(elementCount * 4);
        break;
      case "J":
        this.skip(elementCount * 8);
        break;
      case "S":
        this.skip(elementCount * 2);
        break;
      case "Z":
        this.skip(elementCount);
        break;
      default:
        // Object array: elementCount content elements.
        for (let i = 0; i < elementCount; i++) {
          this.readContent();
        }
    }
  }

  private nextWireHandle(): number {
    return JavaSerializationReader.BASE_WIRE_HANDLE + this.wireHandleCounter++;
  }

  private newHandle(): number {
    return this.nextWireHandle();
  }

  private peek(): number {
    return this.bytes[this.pos] ?? 0;
  }

  private u8(): number {
    if (this.pos >= this.bytes.length) {
      this.fail(`read past end of stream`);
    }
    const v = this.bytes[this.pos] ?? 0;
    this.pos += 1;
    return v;
  }

  private u16(): number {
    const v = ((this.bytes[this.pos] ?? 0) << 8) | (this.bytes[this.pos + 1] ?? 0);
    this.pos += 2;
    return v;
  }

  private s16(): number {
    return this.u16() << 16 >> 16;
  }

  private u32(): number {
    const v =
      ((this.bytes[this.pos] ?? 0) << 24) |
      ((this.bytes[this.pos + 1] ?? 0) << 16) |
      ((this.bytes[this.pos + 2] ?? 0) << 8) |
      (this.bytes[this.pos + 3] ?? 0);
    this.pos += 4;
    return v >>> 0;
  }

  private s32(): number {
    return this.u32() | 0;
  }

  private u64(): bigint {
    const hi = BigInt(this.u32());
    const lo = BigInt(this.u32());
    return (hi << 32n) | lo;
  }

  private f32(): number {
    const v = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, 4).getFloat32(0, false);
    this.pos += 4;
    return v;
  }

  private f64(): number {
    const v = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, 8).getFloat64(0, false);
    this.pos += 8;
    return v;
  }

  /** Modified UTF-8 string (2-byte length prefix). */
  private utf(): string {
    const len = this.u16();
    return this.decodeModifiedUtf8(len);
  }

  /** Long UTF-8 string (8-byte length prefix). */
  private longUtf(): string {
    const len = Number(this.u64());
    return this.decodeModifiedUtf8(len);
  }

  private decodeModifiedUtf8(len: number): string {
    const start = this.pos;
    if (start + len > this.bytes.length) {
      this.fail(`string length ${len} past end of stream`);
    }
    this.pos += len;
    // Modified UTF-8: null is 0xC0 0x80; supplementary chars as surrogate pairs.
    // TextDecoder handles standard UTF-8; convert modified sequences first.
    let out = "";
    let i = start;
    const end = start + len;
    while (i < end) {
      const b0 = this.bytes[i] ?? 0;
      if (b0 >= 0x00 && b0 <= 0x7f) {
        out += String.fromCharCode(b0);
        i += 1;
      } else if ((b0 & 0xe0) === 0xc0) {
        const b1 = this.bytes[i + 1] ?? 0;
        out += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
        i += 2;
      } else if ((b0 & 0xf0) === 0xe0) {
        const b1 = this.bytes[i + 1] ?? 0;
        const b2 = this.bytes[i + 2] ?? 0;
        out += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
        i += 3;
      } else {
        // Malformed; skip a byte.
        i += 1;
      }
    }
    return out;
  }

  private skip(n: number): void {
    if (this.pos + n > this.bytes.length) {
      this.fail(`skip past end of stream (${n} bytes)`);
    }
    this.pos += n;
  }
}
