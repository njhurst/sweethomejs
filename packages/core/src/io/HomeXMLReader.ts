/**
 * Home.xml reader (task 3.2): parses a Home.xml document into a Home object
 * graph, mirroring the Java SAX-based flow. Uses the `saxes` SAX parser
 * (pure TS, works in Node and browsers) so the core package stays DOM-free.
 */
import { SaxesParser } from "saxes";
import type { Content } from "../model/Content.js";
import { Home } from "../model/Home.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import { HomeContentContext } from "./HomeContentContext.js";
import { HomeXMLHandler } from "./HomeXMLHandler.js";

/** Parses an XML string and feeds SAX-style events to the handler. */
export function walkXml(xml: string, handler: HomeXMLHandler): void {
  const parser = new SaxesParser({ xmlns: false, fragment: false });
  parser.on("opentag", (tag) => {
    const attributes = new Map<string, string>();
    for (const [name, value] of Object.entries(tag.attributes)) {
      attributes.set(name, value);
    }
    handler.startElement(tag.name, attributes);
  });
  parser.on("text", (text) => {
    handler.characters(text);
  });
  parser.on("closetag", (tag) => {
    handler.endElement(tag.name);
  });
  parser.on("error", (error) => {
    throw new Error(`Malformed Home.xml: ${error.message}`);
  });
  parser.write(xml).close();
  handler.endDocument();
}

/** Reads a Home from a Home.xml string, resolving content against the container. */
export function readHomeXml(
  xml: string,
  preferences: UserPreferences | null = null,
  contentContext: HomeContentContext | null = null,
): Home {
  const handler = new HomeXMLHandler(preferences);
  handler.setContentContext(contentContext);
  walkXml(xml, handler);
  return handler.getHome();
}

/** Reads a Home from a Home.xml string with a content-name resolver. */
export function readHomeXmlWithContentResolver(
  xml: string,
  contentResolver: (contentEntryName: string) => Content,
  preferences: UserPreferences | null = null,
): Home {
  const handler = new HomeXMLHandler(preferences);
  handler.setContentContext(
    new (class extends HomeContentContext {
      override lookupContent(contentEntryName: string): Content {
        return contentResolver(contentEntryName);
      }
    })(null as never),
  );
  walkXml(xml, handler);
  return handler.getHome();
}
