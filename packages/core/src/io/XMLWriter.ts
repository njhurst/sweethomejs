/**
 * Port of com.eteks.sweethome3d.io.XMLWriter (GPL v2+).
 *
 * Produces the canonical Sweet Home 3D XML: elements are written with
 * attributes in single quotes, self-closing when empty, indented with two
 * spaces per depth. Escaping matches the Java implementation exactly
 * (`&`, `<`, `'`, `"`, newlines).
 *
 * The Java class wraps a Writer; here we accumulate into a string (the output
 * is deterministic and typically small, and byte-parity tests compare the
 * string).
 */
import { formatFloat } from "../util/f32.js";

export class XMLWriter {
  private out = "<?xml version='1.0'?>\n";
  private readonly elements: string[] = [];
  private emptyElement = false;
  private elementWithText = false;

  writeStartElement(element: string): void {
    if (this.elements.length > 0) {
      if (this.emptyElement) {
        this.out += ">";
      }
      this.writeIndentation();
    }
    this.out += `<${element}`;
    this.elements.push(element);
    this.emptyElement = true;
    this.elementWithText = false;
  }

  writeEndElement(): void {
    const element = this.elements.pop();
    if (element === undefined) {
      throw new Error("No element to close");
    }
    if (this.emptyElement) {
      this.out += "/>";
    } else {
      if (!this.elementWithText) {
        this.writeIndentation();
      }
      this.out += `</${element}>`;
    }
    this.emptyElement = false;
    this.elementWithText = false;
  }

  private writeIndentation(): void {
    this.out += "\n";
    for (let i = 0; i < this.elements.length; i++) {
      this.out += "  ";
    }
  }

  writeAttribute(name: string, value: string | null): void;
  writeAttribute(name: string, value: string | null, defaultValue: string | null): void;
  writeAttribute(name: string, value: string | null, defaultValue?: string | null): void {
    if (value === null) {
      return;
    }
    if (defaultValue === undefined) {
      this.out += ` ${name}='${replaceByEntities(value)}'`;
    } else if (value !== defaultValue) {
      this.out += ` ${name}='${replaceByEntities(value)}'`;
    }
  }

  writeAttributeDefault(name: string, value: string, defaultValue: string): void {
    if (value !== defaultValue) {
      this.writeAttribute(name, value);
    }
  }

  writeIntegerAttribute(name: string, value: number): void;
  writeIntegerAttribute(name: string, value: number, defaultValue: number): void;
  writeIntegerAttribute(name: string, value: number, defaultValue?: number): void {
    if (defaultValue === undefined || value !== defaultValue) {
      this.writeAttribute(name, String(value));
    }
  }

  writeIntegerAttributeDefault(name: string, value: number, defaultValue: number): void {
    if (value !== defaultValue) {
      this.writeAttribute(name, String(value));
    }
  }

  writeLongAttribute(name: string, value: number): void;
  writeLongAttribute(name: string, value: number, defaultValue: number): void;
  writeLongAttribute(name: string, value: number, defaultValue?: number): void {
    if (defaultValue === undefined || value !== defaultValue) {
      this.writeAttribute(name, String(value));
    }
  }

  writeLongAttributeNullable(name: string, value: number | null): void {
    if (value !== null) {
      this.writeAttribute(name, value.toString());
    }
  }

  writeFloatAttribute(name: string, value: number | null): void;
  writeFloatAttribute(name: string, value: number | null, defaultValue: number): void;
  writeFloatAttribute(name: string, value: number | null, defaultValue?: number): void {
    if (value === null) {
      return;
    }
    if (defaultValue === undefined || value !== defaultValue) {
      this.writeAttribute(name, formatFloat(value));
    }
  }

  writeFloatAttributeDefault(name: string, value: number, defaultValue: number): void {
    if (value !== defaultValue) {
      this.writeFloatAttribute(name, value);
    }
  }

  writeFloatAttributeNullable(name: string, value: number | null): void {
    if (value !== null) {
      this.writeAttribute(name, formatFloat(value));
    }
  }

  writeBigDecimalAttribute(name: string, value: number | null): void;
  writeBigDecimalAttribute(name: string, value: number | null, defaultValue: number | null): void;
  writeBigDecimalAttribute(name: string, value: number | null, defaultValue?: number | null): void {
    if (value !== null && (defaultValue === undefined || value !== defaultValue)) {
      this.writeAttribute(name, String(value));
    }
  }

  writeBooleanAttribute(name: string, value: boolean, defaultValue: boolean): void {
    if (value !== defaultValue) {
      this.writeAttribute(name, String(value));
    }
  }

  /** Colors are written as 8 uppercase hex digits, like String.format("%08X", color). */
  writeColorAttribute(name: string, color: number | null): void;
  writeColorAttribute(name: string, color: number | null, defaultValue: number | null): void;
  writeColorAttribute(name: string, color: number | null, defaultValue?: number | null): void {
    if (color !== null && (defaultValue === undefined || color !== defaultValue)) {
      this.writeAttribute(name, color.toString(16).toUpperCase().padStart(8, "0"));
    }
  }

  writeText(text: string): void {
    if (this.emptyElement) {
      this.out += ">";
      this.emptyElement = false;
      this.elementWithText = true;
    }
    this.out += replaceByEntities(text);
  }

  toString(): string {
    return this.out;
  }
}

function replaceByEntities(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("'", "&apos;").replaceAll('"', "&quot;").replaceAll("\n", "&#10;");
}
