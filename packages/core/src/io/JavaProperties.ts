/**
 * Java .properties file reader (task 3.6): byte-compatible with
 * java.util.Properties.load (ISO-8859-1 decoding, \uXXXX escapes, line
 * continuations, `=`/`:`/whitespace separators, `#`/`!` comments).
 */
export interface JavaProperties {
  getString(key: string): string | undefined;
  keys(): string[];
  entries(): Array<[string, string]>;
}

function decodeUnicodeEscapes(s: string): string {
  // s is a Latin-1-decoded string; replace \uXXXX sequences
  if (!s.includes("\\")) {
    return s;
  }
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "\\" && i + 1 < s.length) {
      const next = s[i + 1]!;
      switch (next) {
        case "t":
          out += "\t";
          i++;
          continue;
        case "n":
          out += "\n";
          i++;
          continue;
        case "r":
          out += "\r";
          i++;
          continue;
        case "f":
          out += "\f";
          i++;
          continue;
        case "u": {
          // \uXXXX — read 4 hex digits (possibly multiple)
          let hex = "";
          let j = i + 2;
          while (hex.length < 4 && j < s.length && /[0-9a-fA-F]/.test(s[j]!)) {
            hex += s[j]!;
            j++;
          }
          if (hex.length === 4) {
            out += String.fromCharCode(parseInt(hex, 16));
            i = j - 1;
            continue;
          }
          // fall through: treat as literal
          out += c;
          break;
        }
        case "\\":
          out += "\\";
          i++;
          continue;
        default:
          // Unknown escape: keep the character (Java drops the backslash)
          out += next;
          i++;
          continue;
      }
    } else {
      out += c;
    }
  }
  return out;
}

/**
 * Parses the raw bytes of a .properties file. Java reads these as ISO-8859-1;
 * we decode the bytes to Latin-1 first, then process escapes.
 */
export function parseJavaProperties(bytes: Uint8Array): JavaProperties {
  // Decode as Latin-1 (ISO-8859-1): byte -> code point 1:1
  let latin1 = "";
  for (let i = 0; i < bytes.length; i++) {
    latin1 += String.fromCharCode(bytes[i]!);
  }
  // Normalize line endings (Properties.load treats \r\n and \r as \n)
  latin1 = latin1.replace(/\r\n?/g, "\n");

  const lines = latin1.split("\n");
  const map = new Map<string, string>();

  let logical = ""; // accumulated continuation line (without trailing backslash)
  let i = 0;
  while (i < lines.length) {
    let line = lines[i]!;
    i++;
    // Strip trailing \r handled above; check continuation: odd count of trailing backslashes
    let continues = false;
    let backslashCount = 0;
    for (let k = line.length - 1; k >= 0 && line[k] === "\\"; k--) {
      backslashCount++;
    }
    if (backslashCount % 2 === 1) {
      continues = true;
      line = line.slice(0, line.length - 1);
    }
    // Java skips leading whitespace of continuation lines
    if (logical.length > 0) {
      line = line.replace(/^\s+/, "");
    }
    logical += line;
    if (continues) {
      continue; // keep accumulating
    }

    // Process the logical line
    let l = logical;
    logical = "";
    let idx = 0;
    while (idx < l.length && /\s/.test(l[idx]!)) {
      idx++;
    }
    if (idx < l.length && (l[idx] === "#" || l[idx] === "!")) {
      continue; // comment
    }
    // Find the first unescaped =, :, or whitespace (ends the key), like
    // java.util.Properties#load: the key stops at whitespace too, and a
    // following =/: is consumed as separator only when none was seen.
    let sep = -1;
    let hasSep = false;
    for (let k = idx; k < l.length; k++) {
      const c = l[k]!;
      if (c === "\\") {
        k++; // skip escaped char
        continue;
      }
      if (c === "=" || c === ":") {
        sep = k;
        hasSep = true;
        break;
      }
      if (/\s/.test(c)) {
        sep = k;
        break;
      }
    }
    let key: string;
    let value: string;
    if (sep === -1) {
      key = l.slice(idx);
      value = "";
    } else {
      key = l.slice(idx, sep);
      let v = sep + 1;
      // skip whitespace; if the first separator was whitespace, an optional
      // =/: is consumed as the separator (Java behavior)
      for (;;) {
        while (v < l.length && /\s/.test(l[v]!)) {
          v++;
        }
        if (!hasSep && v < l.length && (l[v] === "=" || l[v] === ":")) {
          hasSep = true;
          v++;
          continue;
        }
        break;
      }
      value = l.slice(v);
    }
    key = decodeUnicodeEscapes(key).trim();
    value = decodeUnicodeEscapes(value);
    if (key.length > 0) {
      map.set(key, value);
    }
  }

  return {
    getString(key) {
      return map.get(key);
    },
    keys() {
      return [...map.keys()];
    },
    entries() {
      return [...map.entries()];
    },
  };
}
