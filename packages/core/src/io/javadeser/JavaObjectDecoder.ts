/**
 * Java Object Serialization decoder (task 3.4).
 *
 * Parses the legacy serialized `Home` entry of an .sh3d file into a generic
 * object graph (Java objects, lists, maps, strings, primitives, arrays) with
 * back-references resolved. A separate HomeDecoder maps the graph to typed
 * model objects (see HomeDecoder.ts).
 *
 * Builds on the stream walker from task 1.9 (JavaSerializationReader), now
 * capturing field values instead of skipping them.
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

export interface FieldDesc {
  name: string;
  typeCode: string;
  className?: string;
}

export interface ClassDesc {
  handle: number;
  name: string;
  serialVersionUID: bigint;
  flags: number;
  fields: FieldDesc[];
  superClassDesc: ClassDesc | null;
  isProxy: boolean;
  isEnum: boolean;
}

export type JavaNode =
  | { kind: "null" }
  | { kind: "primitive"; typeCode: string; value: number | boolean }
  | { kind: "reference"; handle: number }
  | { kind: "string"; handle: number; value: string }
  | { kind: "object"; handle: number; classDesc: ClassDesc; fields: Map<string, JavaNode>; listItems?: JavaNode[]; mapEntries?: JavaNode[] }
  | { kind: "list"; handle: number; items: JavaNode[] }
  | { kind: "map"; handle: number; entries: Array<[JavaNode, JavaNode]> }
  | { kind: "array"; handle: number; componentType: string; values: Array<number | boolean | JavaNode> }
  | { kind: "enum"; handle: number; classDesc: ClassDesc; constantName: string };

export interface DecodedGraph {
  root: JavaNode;
  classes: ClassDesc[];
}

export interface JavaObjectNode extends Extract<JavaNode, { kind: "object" }> {
  listItems?: JavaNode[];
  mapEntries?: JavaNode[];
}

/** Object-array nodes carry `items` in addition to primitive values. */
export interface JavaObjectArrayNode extends Omit<Extract<JavaNode, { kind: "array" }>, "values"> {
  values: Array<number | boolean | JavaNode>;
  items?: JavaNode[];
}

const BASE_WIRE_HANDLE = 0x7e0000;

export class JavaObjectDecoder {
  private bytes: Uint8Array;
  private pos = 0;
  private readonly classes: ClassDesc[] = [];
  private readonly classesByHandle = new Map<number, ClassDesc>();
  private readonly nodesByHandle = new Map<number, JavaNode>();
  private wireHandleCounter = 0;
  /** Stack of handles being decoded (for cycle-safe pre-registration). */
  private readonly activeObjects = new Set<number>();
  private readonly stringsByHandle = new Map<number, string>();

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  private fail(message: string): never {
    throw new Error(`${message} at offset ${this.pos}`);
  }

  /** Decodes the stream, returning the root object graph node. */
  decode(): DecodedGraph {
    const magic = this.u16();
    const version = this.u16();
    if (magic !== 0xaced) {
      throw new Error(`Not a Java serialization stream (magic 0x${magic.toString(16)})`);
    }
    if (version !== 5) {
      throw new Error(`Unsupported stream version ${version}`);
    }
    // The first content is the root object.
    let root: JavaNode = { kind: "null" };
    while (this.pos < this.bytes.length) {
      const tag = this.peek();
      if (tag === TC_RESET) {
        this.u8();
        continue;
      }
      root = this.readContent();
      break;
    }
    return { root: this.resolveReferences(root), classes: this.classes };
  }

  /** Replaces `reference` nodes with their targets (cycle-safe). */
  private resolveReferences(root: JavaNode): JavaNode {
    const resolved = new Set<JavaNode>();
    const resolve = (node: JavaNode): JavaNode => {
      if (node.kind === "reference") {
        const target = this.nodesByHandle.get(node.handle);
        return target !== undefined ? resolve(target) : node;
      }
      if (node.kind !== "object" && node.kind !== "list" && node.kind !== "map" && node.kind !== "array") {
        return node;
      }
      if (resolved.has(node)) {
        return node;
      }
      resolved.add(node);
      if (node.kind === "object") {
        for (const key of [...node.fields.keys()]) {
          node.fields.set(key, resolve(node.fields.get(key)!));
        }
        if (node.listItems !== undefined) {
          for (let i = 0; i < node.listItems.length; i++) {
            node.listItems[i] = resolve(node.listItems[i]!);
          }
        }
        if (node.mapEntries !== undefined) {
          for (let i = 0; i < node.mapEntries.length; i++) {
            node.mapEntries[i] = resolve(node.mapEntries[i]!);
          }
        }
      } else if (node.kind === "list") {
        for (let i = 0; i < node.items.length; i++) {
          node.items[i] = resolve(node.items[i]!);
        }
      } else if (node.kind === "map") {
        for (const entry of node.entries) {
          entry[0] = resolve(entry[0]);
          entry[1] = resolve(entry[1]);
        }
      } else if (node.kind === "array") {
        const items = (node as { items?: JavaNode[] }).items;
        if (items !== undefined) {
          for (let i = 0; i < items.length; i++) {
            items[i] = resolve(items[i]!);
          }
        }
      }
      return node;
    };
    return resolve(root);
  }

  private nextWireHandle(): number {
    return BASE_WIRE_HANDLE + this.wireHandleCounter++;
  }

  private readContent(): JavaNode {
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
        const handle = this.nextWireHandle();
        const node: JavaNode = { kind: "string", handle, value };
        this.nodesByHandle.set(handle, node);
        return node;
      }
      case TC_LONGSTRING: {
        const value = this.longUtf();
        const handle = this.nextWireHandle();
        const node: JavaNode = { kind: "string", handle, value };
        this.nodesByHandle.set(handle, node);
        return node;
      }
      case TC_OBJECT:
        return this.readObject();
      case TC_CLASS: {
        const classDesc = this.readClassDesc();
        this.nextWireHandle();
        return { kind: "null" };
      }
      case TC_ARRAY: {
        const classDesc = this.readClassDesc();
        const handle = this.nextWireHandle();
        const elementCount = this.s32();
        return this.readArray(classDesc, handle, elementCount);
      }
      case TC_ENUM: {
        const classDesc = this.readClassDesc();
        const handle = this.nextWireHandle();
        const constant = this.readContent();
        const node: JavaNode = {
          kind: "enum",
          handle,
          classDesc,
          constantName: constant.kind === "string" ? constant.value : "",
        };
        this.nodesByHandle.set(handle, node);
        return node;
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

  private readObject(): JavaNode {
    const classDesc = this.readClassDesc();
    const handle = this.nextWireHandle();
    // Pre-register the node so cycles resolve to it.
    const node: JavaNode = { kind: "object", handle, classDesc, fields: new Map() };
    this.nodesByHandle.set(handle, node);
    this.activeObjects.add(handle);
    try {
      const isList = classDesc.name.startsWith("java.util.") && (classDesc.name.includes("List") || classDesc.name.includes("EmptyList") || classDesc.name.includes("Unmodifiable") || classDesc.name.includes("Singleton"));
      const isMap = classDesc.name.startsWith("java.util.") && (classDesc.name.includes("Map") || classDesc.name.includes("HashMap"));
      const listItems: JavaNode[] = [];
      const mapEntries: JavaNode[] = [];
      if (isList) {
        (node as JavaObjectNode).listItems = listItems;
      }
      if (isMap) {
        (node as JavaObjectNode).mapEntries = mapEntries;
      }
      this.readClassData(classDesc, node.fields, isList ? listItems : undefined, isMap ? mapEntries : undefined);
    } finally {
      this.activeObjects.delete(handle);
    }
    return node;
  }

  private readClassData(classDesc: ClassDesc, fields: Map<string, JavaNode>, listItems?: JavaNode[], mapEntries?: JavaNode[]): void {
    if (classDesc.superClassDesc !== null && classDesc.superClassDesc.handle !== 0) {
      this.readClassData(classDesc.superClassDesc, fields, listItems, mapEntries);
    }
    if ((classDesc.flags & SC_EXTERNALIZABLE) !== 0) {
      this.fail(`Externalizable class ${classDesc.name} not supported`);
    }
    for (const field of classDesc.fields) {
      fields.set(field.name, this.readFieldValue(field));
    }
    if ((classDesc.flags & SC_WRITE_METHOD) !== 0) {
      if (listItems !== undefined) {
        // java.util lists write [size int][elements...] as transparent
        // block-data in the annotation.
        const sizeField = fields.get("size");
        const count = sizeField !== undefined && sizeField.kind === "primitive" && typeof sizeField.value === "number" ? sizeField.value : 0;
        this.readListAnnotation(listItems, 4, count);
      } else if (mapEntries !== undefined) {
        // java.util maps write [capacity int][size int][entries...].
        const sizeField = fields.get("size");
        const count = sizeField !== undefined && sizeField.kind === "primitive" && typeof sizeField.value === "number" ? sizeField.value : 0;
        this.readListAnnotation(mapEntries, 8, count);
      } else {
        // writeObject annotation: contents until TC_ENDBLOCKDATA. Home writes
        // only defaultWriteObject, so the annotation is empty.
        this.readAnnotations();
      }
    }
  }

  /**
   * Reads an annotation containing collection elements. The JDK writes the
   * element stream as transparent block-data chunks (boundaries don't align
   * with elements); we concatenate the chunk payloads and decode `count`
   * elements from the shared handle table.
   */
  private readListAnnotation(items: JavaNode[], skipLeadingBytes: number, count: number): void {
    const payloads: Uint8Array[] = [];
    for (;;) {
      const tag = this.peek();
      if (tag === TC_ENDBLOCKDATA) {
        this.u8();
        break;
      }
      if (tag === TC_BLOCKDATA || tag === TC_BLOCKDATALONG) {
        // Consume the tag byte (peek does not advance).
        this.u8();
        const len = tag === TC_BLOCKDATA ? this.u8() : this.s32();
        if (len > 0) {
          payloads.push(this.bytes.subarray(this.pos, this.pos + len));
        }
        this.pos += len;
      } else {
        items.push(this.readContent());
      }
    }
    if (payloads.length === 0) {
      return;
    }
    const total = payloads.reduce((n, p) => n + p.length, 0);
    if (total <= skipLeadingBytes) {
      return;
    }
    const payload = new Uint8Array(total);
    let offset = 0;
    for (const part of payloads) {
      payload.set(part, offset);
      offset += part.length;
    }
    // The element count is the trailing int in the leading bytes (HashMap has
    // no size field, so the annotation's own size int is authoritative).
    let elementCount = count;
    if (elementCount <= 0 && skipLeadingBytes >= 8 && total >= skipLeadingBytes) {
      elementCount = new DataView(payload.buffer, payload.byteOffset + skipLeadingBytes - 4, 4).getInt32(0, false);
    }
    // Decode `elementCount` elements from the payload after the leading ints,
    // sharing this decoder's handle table.
    const savedBytes = this.bytes;
    const savedPos = this.pos;
    this.bytes = payload.subarray(skipLeadingBytes);
    this.pos = 0;
    try {
      for (let i = 0; i < elementCount; i++) {
        if (this.pos >= this.bytes.length) {
          break;
        }
        items.push(this.readContent());
      }
    } finally {
      this.bytes = savedBytes;
      this.pos = savedPos;
    }
  }

  private readFieldValue(field: FieldDesc): JavaNode {
    switch (field.typeCode) {
      case "B": {
        return { kind: "primitive", typeCode: "B", value: this.u8() };
      }
      case "C": {
        return { kind: "primitive", typeCode: "C", value: this.u16() };
      }
      case "D": {
        return { kind: "primitive", typeCode: "D", value: this.f64() };
      }
      case "F": {
        return { kind: "primitive", typeCode: "F", value: this.f32() };
      }
      case "I": {
        return { kind: "primitive", typeCode: "I", value: this.s32() };
      }
      case "J": {
        return { kind: "primitive", typeCode: "J", value: Number(this.u64()) };
      }
      case "S": {
        return { kind: "primitive", typeCode: "S", value: this.s16() };
      }
      case "Z": {
        return { kind: "primitive", typeCode: "Z", value: this.u8() !== 0 };
      }
      default:
        return this.readContent();
    }
  }

  private readArray(classDesc: ClassDesc, handle: number, elementCount: number): JavaNode {
    const component = classDesc.name.startsWith("[")
      ? classDesc.name.charAt(1)
      : classDesc.name.startsWith("L")
        ? "L"
        : classDesc.name;
    const node: JavaNode = { kind: "array", handle, componentType: component, values: [] };
    this.nodesByHandle.set(handle, node);
    if (component === "B") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.u8());
      node.values = values;
    } else if (component === "C") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.u16());
      node.values = values;
    } else if (component === "D") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.f64());
      node.values = values;
    } else if (component === "F") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.f32());
      node.values = values;
    } else if (component === "I") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.s32());
      node.values = values;
    } else if (component === "J") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(Number(this.u64()));
      node.values = values;
    } else if (component === "S") {
      const values: number[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.s16());
      node.values = values;
    } else if (component === "Z") {
      const values: boolean[] = [];
      for (let i = 0; i < elementCount; i++) values.push(this.u8() !== 0);
      node.values = values;
    } else {
      const items: JavaNode[] = [];
      for (let i = 0; i < elementCount; i++) {
        const item = this.readContent();
        items.push(item);
      }
      (node as JavaObjectArrayNode).items = items;
    }
    return node;
  }

  private readClassDesc(): ClassDesc {
    const tag = this.peek();
    if (tag === TC_NULL) {
      this.u8();
      return {
        handle: 0,
        name: "<null>",
        serialVersionUID: 0n,
        flags: 0,
        fields: [],
        superClassDesc: null,
        isProxy: false,
        isEnum: false,
      };
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

  private readClassDescInner(isProxy: boolean): ClassDesc {
    this.u8();
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
    this.readAnnotations();
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
    };
    this.classes.push(classDesc);
    this.classesByHandle.set(descriptorHandle, classDesc);
    return classDesc;
  }

  private readFieldDesc(): FieldDesc {
    const typeCode = String.fromCharCode(this.u8());
    const name = this.utf();
    if (typeCode === "L" || typeCode === "[") {
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

  private peek(): number {
    return this.bytes[this.pos] ?? 0;
  }

  private u8(): number {
    if (this.pos >= this.bytes.length) {
      this.fail("read past end of stream");
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

  private utf(): string {
    const len = this.u16();
    return this.decodeModifiedUtf8(len);
  }

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
    let out = "";
    let i = start;
    const end = start + len;
    while (i < end) {
      const b0 = this.bytes[i] ?? 0;
      if (b0 <= 0x7f) {
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
