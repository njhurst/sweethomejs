import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.lang.reflect.Array;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import com.eteks.sweethome3d.io.DefaultUserPreferences;
import com.eteks.sweethome3d.io.HomeFileRecorder;
import com.eteks.sweethome3d.model.Content;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.UserPreferences;
import com.eteks.sweethome3d.tools.URLContent;

/**
 * DumpHome — golden-corpus harness (task 1.4).
 *
 * Reads a .sh3d file with the real Sweet Home 3D io code and writes to an
 * output directory:
 *   - home.dump.json        full recursive field dump of the Home object graph
 *   - Home.xml              the canonical XML entry bytes, extracted verbatim
 *   - ContentDigests        the repair manifest entry, extracted verbatim
 *   - entries.txt           zip entry listing (names + sizes)
 *   - content/              every content entry, extracted verbatim
 *
 * The field dump is the parity oracle for the TypeScript model port
 * (see docs/12-testing-and-parity.md).
 *
 * Usage: java DumpHome <input.sh3d> <outputDir>
 */
public class DumpHome {
  // Global counter for normalized ids: any UUID-shaped id is rewritten to
  // `<prefix>-<ordinal>` in deterministic traversal order. The TS side must
  // apply the same normalization when comparing dumps.
  private static int normalizedIdCounter = 0;
  private static final java.util.regex.Pattern UUID_PATTERN =
      java.util.regex.Pattern.compile("^([A-Za-z]+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");
  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      System.err.println("Usage: java DumpHome <input.sh3d> <outputDir>");
      System.exit(2);
    }
    File input = new File(args[0]);
    File outputDir = new File(args[1]);
    outputDir.mkdirs();

    UserPreferences preferences = new DefaultUserPreferences();
    HomeFileRecorder recorder = new HomeFileRecorder(4, false, preferences, true, true);
    Home home = recorder.readHome(input.getPath());
    System.out.println("Read home: " + home.getName()
        + " (version " + home.getVersion()
        + ", " + home.getFurniture().size() + " furniture"
        + ", " + home.getWalls().size() + " walls"
        + ", " + home.getRooms().size() + " rooms"
        + ", " + home.getLevels().size() + " levels"
        + ", " + home.getLabels().size() + " labels"
        + ", " + home.getDimensionLines().size() + " dimension lines"
        + ", " + home.getPolylines().size() + " polylines"
        + ", repaired=" + home.isRepaired() + ")");

    // Recursive field dump
    IdentityHashMap<Object, Integer> seen = new IdentityHashMap<Object, Integer>();
    StringBuilder dump = new StringBuilder();
    dump.append("{\n");
    dumpBean(dump, home, "home", seen, 1);
    dump.append("\n}\n");
    write(outputDir, "home.dump.json", dump.toString());

    // Extract zip entries
    extractEntries(input, outputDir);

    System.out.println("Wrote dump to " + new File(outputDir, "home.dump.json"));
  }

  /** Extracts Home.xml, ContentDigests, entry listing and all content entries. */
  private static void extractEntries(File input, File outputDir) throws IOException {
    List<String> lines = new ArrayList<String>();
    ZipFile zip = new ZipFile(input);
    File contentDir = new File(outputDir, "content");
    contentDir.mkdirs();
    for (ZipEntry entry : Collections.list(zip.entries())) {
      String name = entry.getName();
      lines.add(String.format("%-40s %10d", name, entry.getSize()));
      if ("Home.xml".equals(name) || "ContentDigests".equals(name)) {
        copy(zip, entry, new File(outputDir, name));
      } else if (!"Home".equals(name)) {
        copy(zip, entry, new File(contentDir, name.replace('/', '_')));
      }
    }
    zip.close();
    write(outputDir, "entries.txt", String.join("\n", lines) + "\n");
  }

  private static void copy(ZipFile zip, ZipEntry entry, File target) throws IOException {
    java.io.InputStream in = zip.getInputStream(entry);
    FileOutputStream out = new FileOutputStream(target);
    byte[] buf = new byte[8192];
    for (int n; (n = in.read(buf)) != -1; ) {
      out.write(buf, 0, n);
    }
    in.close();
    out.close();
  }

  private static void write(File dir, String name, String content) throws IOException {
    Writer w = new OutputStreamWriter(new FileOutputStream(new File(dir, name)), "UTF-8");
    w.write(content);
    w.close();
  }

  /** Recursively dumps a bean via its public no-arg getters. */
  private static void dumpBean(StringBuilder out, Object obj, String key, IdentityHashMap<Object, Integer> seen, int depth)
      throws Exception {
    indent(out, depth);
    out.append('"').append(json(key)).append("\": ");
    dumpValue(out, obj, seen, depth);
  }

  private static void dumpValue(StringBuilder out, Object obj, IdentityHashMap<Object, Integer> seen, int depth)
      throws Exception {
    if (obj == null) {
      out.append("null");
      return;
    }
    Class<?> cls = obj.getClass();
    Integer seenId = seen.get(obj);
    if (seenId != null) {
      out.append("{\"$ref\": ").append(seenId).append('}');
      return;
    }
    // Leaf types
    if (obj instanceof Number || obj instanceof Boolean || obj instanceof String || obj instanceof Enum<?>) {
      out.append(jsonScalar(obj));
      return;
    }
    if (obj instanceof Character) {
      out.append('"').append(obj).append('"');
      return;
    }
    if (obj instanceof URLContent) {
      String url = ((URLContent)obj).getURL().toString();
      // Normalize temp-file URLs to the zip entry name: jar:file:<tmp>!/<entry>
      int bang = url.indexOf("!/");
      String entry = bang >= 0 ? url.substring(bang + 2) : url;
      out.append("{\"class\": \"").append(cls.getName()).append("\", \"entry\": \"")
         .append(json(entry)).append("\"}");
      return;
    }
    if (obj instanceof Content) {
      out.append("{\"class\": \"").append(cls.getName()).append("\", \"content\": true}");
      return;
    }
    if (obj instanceof Map<?, ?>) {
      seen.put(obj, seen.size());
      out.append("{\"$map\": [");
      List<Map.Entry<?, ?>> entries = new ArrayList<Map.Entry<?, ?>>(((Map<?, ?>)obj).entrySet());
      // Sort for deterministic output (HashMap order is not stable across JVMs)
      entries.sort((a, b) -> String.valueOf(a.getKey()).compareTo(String.valueOf(b.getKey())));
      boolean first = true;
      for (Map.Entry<?, ?> e : entries) {
        if (!first) out.append(", ");
        first = false;
        out.append('[');
        dumpValue(out, e.getKey(), seen, depth + 1);
        out.append(", ");
        dumpValue(out, e.getValue(), seen, depth + 1);
        out.append(']');
      }
      out.append("]}");
      return;
    }
    if (obj instanceof Collection<?> || cls.isArray()) {
      seen.put(obj, seen.size());
      out.append('[');
      int size = cls.isArray() ? Array.getLength(obj) : ((Collection<?>)obj).size();
      java.util.Iterator<?> it = cls.isArray() ? null : ((Iterable<?>)obj).iterator();
      for (int i = 0; i < size; i++) {
        if (i > 0) out.append(", ");
        Object item = cls.isArray() ? Array.get(obj, i) : it.next();
        dumpValue(out, item, seen, depth + 1);
      }
      out.append(']');
      return;
    }
    // Bean: iterate public no-arg getters
    seen.put(obj, seen.size());
    out.append("{\"$class\": \"").append(cls.getName()).append("\"");
    Method[] methods = cls.getMethods();
    Arrays.sort(methods, (a, b) -> a.getName().compareTo(b.getName()));
    for (Method m : methods) {
      if (m.getParameterCount() != 0 || m.getDeclaringClass() == Object.class) continue;
      String name = m.getName();
      String prop;
      if (name.startsWith("get") && name.length() > 3) {
        prop = Character.toLowerCase(name.charAt(3)) + name.substring(4);
      } else if (name.startsWith("is") && name.length() > 2 && m.getReturnType() == boolean.class) {
        prop = Character.toLowerCase(name.charAt(2)) + name.substring(3);
      } else {
        continue;
      }
      // Skip dangerous/noisy methods
      if (prop.equals("class") || prop.equals("propertyChangeListeners")
          || prop.equals("furnitureWithDoorsAndWindows") || prop.equals("furnitureWithGroups")
          || prop.equals("clone") || prop.equals("modificationState") || prop.equals("basePlanModificationState")) {
        continue;
      }
      Object value;
      try {
        value = m.invoke(obj);
      } catch (Exception ex) {
        out.append(", \"").append(prop).append("\": {\"$error\": \"").append(json(ex.getCause() != null ? ex.getCause().toString() : ex.toString())).append("\"}");
        continue;
      }
      // Normalize lazily-generated UUID ids for deterministic output.
      if ("id".equals(prop) && value instanceof String) {
        java.util.regex.Matcher matcher = UUID_PATTERN.matcher((String)value);
        if (matcher.matches()) {
          value = matcher.group(1) + "-" + (++normalizedIdCounter);
        }
      }
      if (value == null) {
        out.append(", \"").append(prop).append("\": null");
      } else {
        out.append(", ");
        dumpBean(out, value, prop, seen, depth);
      }
    }
    out.append('}');
  }

  private static void indent(StringBuilder out, int depth) {
    out.append('\n');
    for (int i = 0; i < depth * 2; i++) out.append(' ');
  }

  private static String jsonScalar(Object obj) {
    if (obj instanceof Number || obj instanceof Boolean) {
      return obj.toString();
    }
    if (obj instanceof Enum<?>) {
      return '"' + ((Enum<?>)obj).name() + '"';
    }
    return '"' + json(obj.toString()) + '"';
  }

  private static String json(String s) {
    return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
  }
}
