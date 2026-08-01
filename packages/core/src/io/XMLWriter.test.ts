import { describe, expect, it } from "vitest";
import { XMLWriter } from "./XMLWriter.js";

/**
 * Reference output captured from the Java XMLWriter (tools/java-harness
 * XmlWriterOracle): entity escaping, single-quoted attributes, float/color
 * formatting, self-closing elements and indentation must match byte-for-byte.
 */
const JAVA_REFERENCE = [
  "<?xml version='1.0'?>",
  "<home version='7400' name='Test &amp; &lt;home>&apos;&quot;&#10;' wallHeight='250.0' arcExtent='3.1415927' groundColor='00A8A8A8' repaired='true'>",
  "  <wall xStart='314.2093'/>",
  "  <empty/>text &amp; content",
  "</home>",
].join("\n");

function buildDocument(): XMLWriter {
  const xml = new XMLWriter();
  xml.writeStartElement("home");
  xml.writeAttribute("version", "7400");
  xml.writeAttribute("name", "Test & <home>'\"\n");
  xml.writeFloatAttribute("wallHeight", 250);
  xml.writeFloatAttribute("arcExtent", 3.1415927);
  xml.writeColorAttribute("groundColor", 0x00a8a8a8);
  xml.writeBooleanAttribute("basePlanLocked", false, false); // skipped (default)
  xml.writeBooleanAttribute("repaired", true, false);
  xml.writeStartElement("wall");
  xml.writeFloatAttribute("xStart", 314.2093);
  xml.writeEndElement();
  xml.writeStartElement("empty");
  xml.writeEndElement();
  xml.writeText("text & content");
  xml.writeEndElement();
  return xml;
}

describe("XMLWriter (task 3.3)", () => {
  it("matches the Java XMLWriter output byte-for-byte", () => {
    expect(buildDocument().toString()).toBe(JAVA_REFERENCE);
  });

  it("skips attributes equal to their defaults", () => {
    const xml = new XMLWriter();
    xml.writeStartElement("a");
    xml.writeIntegerAttributeDefault("n", 5, 5);
    xml.writeIntegerAttributeDefault("m", 6, 5);
    xml.writeFloatAttributeDefault("f", 1, 1);
    xml.writeFloatAttributeDefault("g", 2, 1);
    xml.writeEndElement();
    expect(xml.toString()).toContain("<a m='6' g='2.0'/>");
  });

  it("emits the XML declaration on construction", () => {
    expect(new XMLWriter().toString()).toBe("<?xml version='1.0'?>\n");
  });

  it("escapes entities in text content", () => {
    const xml = new XMLWriter();
    xml.writeStartElement("label");
    xml.writeText("a & b < c > d ' \" \n");
    xml.writeEndElement();
    expect(xml.toString()).toContain("a &amp; b &lt; c > d &apos; &quot; &#10;");
  });
});
