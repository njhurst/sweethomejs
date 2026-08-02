/**
 * HomeDecoder (task 3.4): maps the generic Java-serialization graph (from
 * JavaObjectDecoder) to typed SweetHomeJS model objects, replicating the
 * model classes' readObject post-processing (legacy field restoration,
 * backward-compat merges).
 */
import { Home } from "../../model/Home.js";
import { HomeObject } from "../../model/HomeObject.js";
import { Wall } from "../../model/Wall.js";
import { Room } from "../../model/Room.js";
import { Level } from "../../model/Level.js";
import { Polyline } from "../../model/Polyline.js";
import { DimensionLine } from "../../model/DimensionLine.js";
import { Label } from "../../model/Label.js";
import { Camera } from "../../model/Camera.js";
import { ObserverCamera } from "../../model/ObserverCamera.js";
import { Compass } from "../../model/Compass.js";
import { HomeEnvironment } from "../../model/HomeEnvironment.js";
import { HomePrint } from "../../model/HomePrint.js";
import { HomeTexture } from "../../model/HomeTexture.js";
import { HomeMaterial } from "../../model/HomeMaterial.js";
import { HomePieceOfFurniture } from "../../model/HomePieceOfFurniture.js";
import { HomeDoorOrWindow } from "../../model/HomeDoorOrWindow.js";
import { HomeLight } from "../../model/HomeLight.js";
import { HomeShelfUnit } from "../../model/HomeShelfUnit.js";
import { HomeFurnitureGroup } from "../../model/HomeFurnitureGroup.js";
import { BackgroundImage } from "../../model/BackgroundImage.js";
import { TextStyle } from "../../model/TextStyle.js";
import { Baseboard, LightSource, Sash } from "../../model/ValueClasses.js";
import type { Content } from "../../model/Content.js";
import type { JavaNode } from "./JavaObjectDecoder.js";

type NodeOrNull = JavaNode | null | undefined;

/** Content implementation backed by a zip entry name (from the home file). */
export class SerializedContent implements Content {
  constructor(private readonly entryName: string) {}

  async openStream(): Promise<ReadableStream<Uint8Array>> {
    throw new Error(`Content ${this.entryName} not available without a container`);
  }

  getURL(): string {
    return `jar:file:temp!/${this.entryName}`;
  }

  getEntryName(): string {
    return this.entryName;
  }
}

export class HomeDecoder {
  private readonly levels = new Map<string, Level>();

  private readonly decoding = new Set<number>();

  constructor(
    private readonly resolveContent: (entryName: string) => Content = (name) => new SerializedContent(name),
  ) {}

  /** Decodes the root node into a Home. */
  decodeHome(root: NodeOrNull): Home {
    const node = unwrap(root);
    const home = this.decodeObject(node) as Home;
    return home;
  }

  // ------------------------------------------------------------ dispatchers

  decodeObject(node: NodeOrNull): unknown {
    node = unwrap(node);
    if (node === null) return null;
    if (node.kind === "primitive") return node.value;
    if (node.kind === "string") return node.value;
    if (node.kind === "enum") return node.constantName;
    if (node.kind === "array") {
      return this.decodeArray(node);
    }
    if (node.kind === "object") {
      return this.decodeTyped(node);
    }
    return null;
  }

  private decodeArray(node: Extract<JavaNode, { kind: "array" }>): unknown {
    const items = (node as { items?: JavaNode[] }).items;
    if (items !== undefined) {
      return items.map((item) => this.decodeObject(item));
    }
    if (node.componentType === "Z") {
      return node.values as boolean[];
    }
    return node.values as number[];
  }

  private decodeTyped(node: Extract<JavaNode, { kind: "object" }>): unknown {
    if (this.decoding.has(node.handle)) {
      return null;
    }
    this.decoding.add(node.handle);
    try {
      return this.decodeTypedInner(node);
    } finally {
      this.decoding.delete(node.handle);
    }
  }

  private decodeTypedInner(node: Extract<JavaNode, { kind: "object" }>): unknown {
    const className = node.classDesc.name;
    if (className === "java.lang.String") {
      return this.decodeObject(node.fields.get("value"));
    }
    if (className === "java.lang.Float" || className === "java.lang.Double") {
      return this.decodeObject(node.fields.get("value")) as number;
    }
    if (className === "java.lang.Integer" || className === "java.lang.Long" || className === "java.lang.Short" || className === "java.lang.Byte") {
      return this.decodeObject(node.fields.get("value")) as number;
    }
    if (className === "java.lang.Boolean") {
      return this.decodeObject(node.fields.get("value")) as boolean;
    }
    if (className.startsWith("java.util.") && (className.includes("List") || className.includes("ArrayList") || className.includes("Empty") || className.includes("Unmodifiable") || className.includes("Singleton"))) {
      const items = node.listItems ?? [];
      return items.map((item) => this.decodeObject(item));
    }
    if (className.startsWith("java.util.") && (className.includes("Map") || className.includes("HashMap") || className.includes("singleton"))) {
      const entries = node.mapEntries ?? [];
      const map = new Map<unknown, unknown>();
      for (const entryNode of entries) {
        const entry = unwrap(entryNode);
        if (entry !== null && entry.kind === "object") {
          const key = this.decodeObject(entry.fields.get("key"));
          const value = this.decodeObject(entry.fields.get("value"));
          map.set(key, value);
        }
      }
      return map;
    }
    if (className.startsWith("java.util.TimeZone") || className.startsWith("sun.util.calendar.ZoneInfo")) {
      const idNode = node.fields.get("ID");
      return idNode !== undefined ? (this.decodeObject(idNode) as string) : null;
    }
    if (className === "java.net.URL" || className === "java.net.URI") {
      // The URL's protocol/file fields reconstruct the string.
      const file = this.decodeObject(node.fields.get("file")) as string | null;
      return file ?? null;
    }
    if (className.endsWith("URLContent") || className.includes("URLContent")) {
      return this.decodeURLContent(node);
    }
    if (className === "java.util.Date") {
      const time = this.decodeObject(node.fields.get("fastTime")) as number | undefined;
      return time ?? null;
    }

    // Model classes
    if (className.endsWith(".Home")) return this.decodeHomeObject(node);
    if (className.endsWith(".HomeObject")) return this.decodeHomeObjectBase(node);
    if (className.endsWith(".Level")) return this.decodeLevel(node);
    if (className.endsWith(".Wall")) return this.decodeWall(node);
    if (className.endsWith(".Room")) return this.decodeRoom(node);
    if (className.endsWith(".Polyline")) return this.decodePolyline(node);
    if (className.endsWith(".DimensionLine")) return this.decodeDimensionLine(node);
    if (className.endsWith(".Label")) return this.decodeLabel(node);
    if (className.endsWith(".Compass")) return this.decodeCompass(node);
    if (className.endsWith(".HomeEnvironment")) return this.decodeEnvironment(node);
    if (className.endsWith(".Camera") || className.endsWith(".ObserverCamera")) return this.decodeCamera(node);
    if (className.endsWith(".HomePrint")) return this.decodePrint(node);
    if (className.endsWith(".HomeTexture")) return this.decodeTexture(node);
    if (className.endsWith(".HomeMaterial")) return this.decodeMaterial(node);
    if (className.endsWith(".Baseboard")) return this.decodeBaseboard(node);
    if (className.endsWith(".LightSource")) return this.decodeLightSource(node);
    if (className.endsWith(".Sash")) return this.decodeSash(node);
    if (className.endsWith(".TextStyle")) return this.decodeTextStyle(node);
    if (className.endsWith(".BackgroundImage")) return this.decodeBackgroundImage(node);
    if (className.endsWith(".HomePieceOfFurniture")) return this.decodeFurniture(node);
    if (className.endsWith(".HomeDoorOrWindow")) return this.decodeDoorOrWindow(node);
    if (className.endsWith(".HomeLight")) return this.decodeLight(node);
    if (className.endsWith(".HomeShelfUnit")) return this.decodeShelfUnit(node);
    if (className.endsWith(".HomeFurnitureGroup")) return this.decodeFurnitureGroup(node);
    if (className.endsWith(".ObjectProperty") || className.endsWith("$SortableProperty") || className.endsWith("$DrawingMode") || className.endsWith("$Lens")) {
      return null;
    }

    // Unknown classes: return null gracefully (the fixture has some, e.g. patterns).
    return null;
  }

  private decodeURLContent(node: Extract<JavaNode, { kind: "object" }>): Content | null {
    // URLContent serializes its URL (java.net.URL with protocol/file).
    const urlNode = node.fields.get("url");
    if (urlNode === null || urlNode === undefined) {
      return null;
    }
    const url = unwrap(urlNode);
    if (url === null) return null;
    if (url.kind === "object") {
      const protocol = this.decodeObject(url.fields.get("protocol")) as string | null;
      const file = this.decodeObject(url.fields.get("file")) as string | null;
      const full = protocol !== null ? `${protocol}:${file ?? ""}` : (file ?? "");
      // Content names inside the home look like "jar:file:temp!/<entry>"
      const bang = full.indexOf("!/");
      if (bang >= 0) {
        const entryName = full.slice(bang + 2);
        return this.resolveContent(entryName);
      }
      return new SerializedContent(full);
    }
    return null;
  }

  // ------------------------------------------------------------ model decode

  private decodeHomeObject(node: Extract<JavaNode, { kind: "object" }>): Home {
    const f = node.fields;
    const wallHeight = this.num(f.get("wallHeight"), 250);
    const home = new Home(wallHeight);
    const version = this.num(f.get("version"), 7400);
    home.setVersion(version);
    home.setName(this.str(f.get("name")));
    home.setBasePlanLocked(this.bool(f.get("basePlanLocked"), false));
    home.setFurnitureDescendingSorted(this.bool(f.get("furnitureDescendingSorted"), false));
    home.setFurnitureSortedPropertyName(this.str(f.get("furnitureSortedPropertyName")));
    home.setFurnitureVisiblePropertyNames((this.asList(f.get("furnitureVisiblePropertyNames")) ?? []).map((s) => String(s)));

    // Backward-compat: furniture lists
    const furnitureWithDoorsAndWindows = this.asList(f.get("furnitureWithDoorsAndWindows"));
    const furnitureWithGroups = this.asList(f.get("furnitureWithGroups"));
    const furniture = this.asList(f.get("furniture"));
    const restoredFurniture = furnitureWithGroups ?? furnitureWithDoorsAndWindows ?? furniture ?? [];
    for (const piece of restoredFurniture) {
      if (piece instanceof HomePieceOfFurniture) {
        home.addPieceOfFurniture(piece);
      }
    }

    // Levels
    for (const level of this.asList(f.get("levels")) ?? []) {
      home.addLevel(level as Level);
    }
    // Walls
    for (const wall of this.asList(f.get("walls")) ?? []) {
      home.addWall(wall as Wall);
    }
    // Rooms, polylines, dimension lines, labels
    for (const room of this.asList(f.get("rooms")) ?? []) home.addRoom(room as Room);
    for (const polyline of this.asList(f.get("polylines")) ?? []) home.addPolyline(polyline as Polyline);
    for (const dl of this.asList(f.get("dimensionLines")) ?? []) home.addDimensionLine(dl as DimensionLine);
    for (const label of this.asList(f.get("labels")) ?? []) home.addLabel(label as Label);

    // Environment
    const environment = this.decodeObject(f.get("environment")) as HomeEnvironment | null;
    if (environment !== null) {
      home.getEnvironment().setGroundColor(environment.getGroundColor());
      home.getEnvironment().setGroundTexture(environment.getGroundTexture());
      home.getEnvironment().setSkyColor(environment.getSkyColor());
      home.getEnvironment().setLightColor(environment.getLightColor());
      home.getEnvironment().setWallsAlpha(environment.getWallsAlpha());
    }

    // Print, background image, cameras
    const print = this.decodeObject(f.get("print"));
    if (print instanceof HomePrint) {
      home.setPrint(print);
    }
    const backgroundImage = this.decodeObject(f.get("backgroundImage"));
    if (backgroundImage instanceof BackgroundImage) {
      home.setBackgroundImage(backgroundImage);
    }
    const camera = this.decodeObject(f.get("camera"));
    if (camera instanceof Camera) {
      home.setCamera(camera);
    }
    const topCamera = this.decodeObject(f.get("topCamera"));
    if (topCamera instanceof Camera) {
      home.getTopCamera().setCamera(topCamera);
      home.getTopCamera().setTime(topCamera.getTime());
      home.getTopCamera().setLens(topCamera.getLens());
    }
    const observerCamera = this.decodeObject(f.get("observerCamera"));
    if (observerCamera instanceof ObserverCamera) {
      home.getObserverCamera().setCamera(observerCamera);
      home.getObserverCamera().setTime(observerCamera.getTime());
      home.getObserverCamera().setLens(observerCamera.getLens());
      home.getObserverCamera().setFixedSize(observerCamera.isFixedSize());
    }
    const compass = this.decodeObject(f.get("compass"));
    if (compass instanceof Compass) {
      home.getCompass().setX(compass.getX());
      home.getCompass().setY(compass.getY());
      home.getCompass().setDiameter(compass.getDiameter());
      home.getCompass().setVisible(compass.isVisible());
      home.getCompass().setNorthDirection(compass.getNorthDirection());
      home.getCompass().setLatitude(compass.getLatitude());
      home.getCompass().setLongitude(compass.getLongitude());
      home.getCompass().setTimeZone(compass.getTimeZone());
    }
    // Stored cameras
    for (const stored of this.asList(f.get("storedCameras")) ?? []) {
      const cam = stored as Camera;
      home.setStoredCameras([...home.getStoredCameras(), cam]);
    }

    // Level indices (readObject post-processing)
    if (home.getLevels().length > 0) {
      let previousLevel = home.getLevels()[0]!;
      if (previousLevel.getElevationIndex() === -1) {
        previousLevel.setElevationIndex(0);
      }
      for (let i = 1; i < home.getLevels().length; i++) {
        const level = home.getLevels()[i]!;
        if (level.getElevationIndex() === -1) {
          level.setElevationIndex(previousLevel.getElevation() === level.getElevation() ? previousLevel.getElevationIndex() + 1 : 0);
        }
        previousLevel = level;
      }
    }
    return home;
  }

  private decodeHomeObjectBase(node: Extract<JavaNode, { kind: "object" }>): HomeObject | null {
    return null; // handled by subclass decoders
  }

  private idAndProperties(node: Extract<JavaNode, { kind: "object" }>): { id: string; properties: Map<string, unknown> } {
    const idNode = node.fields.get("id");
    const id = idNode !== undefined ? String(this.decodeObject(idNode) ?? "") : "";
    const properties = new Map<string, unknown>();
    const propsNode = node.fields.get("properties");
    const props = unwrap(propsNode);
    if (props !== null && props.kind === "object") {
      for (const entry of props.mapEntries ?? []) {
        const entryObj = unwrap(entry);
        if (entryObj !== null && entryObj.kind === "object") {
          const key = this.decodeObject(entryObj.fields.get("key"));
          const value = this.decodeObject(entryObj.fields.get("value"));
          if (key !== null && key !== undefined) {
            properties.set(String(key), value);
          }
        }
      }
    }
    return { id, properties };
  }

  private decodeLevel(node: Extract<JavaNode, { kind: "object" }>): Level {
    const { id } = this.idAndProperties(node);
    const name = this.str(node.fields.get("name")) ?? "";
    const elevation = this.num(node.fields.get("elevation"), 0);
    const floorThickness = this.num(node.fields.get("floorThickness"), 0);
    const height = this.num(node.fields.get("height"), 0);
    const level = new Level(this.idOrGenerate(id, "level"), name, elevation, floorThickness, height);
    const index = this.num(node.fields.get("elevationIndex"), -1);
    level.setElevationIndex(index);
    level.setVisible(this.bool(node.fields.get("visible"), true));
    level.setViewable(this.bool(node.fields.get("viewable"), true));
    this.levels.set(id, level);
    return level;
  }

  private decodeWall(node: Extract<JavaNode, { kind: "object" }>): Wall {
    const { id, properties } = this.idAndProperties(node);
    const wall = new Wall(this.idOrGenerate(id, "wall"), this.num(node.fields.get("xStart"), 0), this.num(node.fields.get("yStart"), 0), this.num(node.fields.get("xEnd"), 0), this.num(node.fields.get("yEnd"), 0), this.num(node.fields.get("thickness"), 0), 0);
    const height = node.fields.get("height");
    if (height !== undefined && unwrap(height) !== null) {
      wall.setHeight(this.num(height, 0));
    }
    const heightAtEnd = node.fields.get("heightAtEnd");
    if (heightAtEnd !== undefined && unwrap(heightAtEnd) !== null) {
      wall.setHeightAtEnd(this.num(heightAtEnd, 0));
    }
    const arcExtent = node.fields.get("arcExtent");
    if (arcExtent !== undefined && unwrap(arcExtent) !== null) {
      wall.setArcExtent(this.num(arcExtent, 0));
    }
    wall.setLeftSideColor(this.int(node.fields.get("leftSideColor")));
    wall.setRightSideColor(this.int(node.fields.get("rightSideColor")));
    wall.setTopColor(this.int(node.fields.get("topColor")));
    wall.setLeftSideShininess(this.num(node.fields.get("leftSideShininess"), 0));
    wall.setRightSideShininess(this.num(node.fields.get("rightSideShininess"), 0));
    const leftTexture = this.decodeObject(node.fields.get("leftSideTexture"));
    if (leftTexture instanceof HomeTexture) wall.setLeftSideTexture(leftTexture);
    const rightTexture = this.decodeObject(node.fields.get("rightSideTexture"));
    if (rightTexture instanceof HomeTexture) wall.setRightSideTexture(rightTexture);
    const leftBaseboard = this.decodeObject(node.fields.get("leftSideBaseboard"));
    if (leftBaseboard instanceof Baseboard) wall.setLeftSideBaseboard(leftBaseboard);
    const rightBaseboard = this.decodeObject(node.fields.get("rightSideBaseboard"));
    if (rightBaseboard instanceof Baseboard) wall.setRightSideBaseboard(rightBaseboard);
    const wallAtStart = this.decodeObject(node.fields.get("wallAtStart"));
    if (wallAtStart instanceof Wall) {
      wall.setWallAtStart(wallAtStart);
    }
    const wallAtEnd = this.decodeObject(node.fields.get("wallAtEnd"));
    if (wallAtEnd instanceof Wall) {
      wall.setWallAtEnd(wallAtEnd);
    }
    this.applyProperties(wall, properties);
    return wall;
  }

  private decodeRoom(node: Extract<JavaNode, { kind: "object" }>): Room {
    const { id, properties } = this.idAndProperties(node);
    const points = this.asFloatArray(node.fields.get("points")) ?? [];
    const room = new Room(this.idOrGenerate(id, "room"), points);
    room.setName(this.str(node.fields.get("name")));
    room.setFloorColor(this.int(node.fields.get("floorColor")));
    room.setCeilingColor(this.int(node.fields.get("ceilingColor")));
    room.setFloorShininess(this.num(node.fields.get("floorShininess"), 0));
    room.setCeilingShininess(this.num(node.fields.get("ceilingShininess"), 0));
    room.setFloorVisible(this.bool(node.fields.get("floorVisible"), true));
    room.setCeilingVisible(this.bool(node.fields.get("ceilingVisible"), true));
    room.setCeilingFlat(this.bool(node.fields.get("ceilingFlat"), false));
    room.setAreaVisible(this.bool(node.fields.get("areaVisible"), false));
    const floorTexture = this.decodeObject(node.fields.get("floorTexture"));
    if (floorTexture instanceof HomeTexture) room.setFloorTexture(floorTexture);
    const ceilingTexture = this.decodeObject(node.fields.get("ceilingTexture"));
    if (ceilingTexture instanceof HomeTexture) room.setCeilingTexture(ceilingTexture);
    const level = node.fields.get("level");
    if (unwrap(level) !== null) {
      room.setLevel(this.levels.get(this.str(level) ?? "") ?? null);
    }
    this.applyProperties(room, properties);
    return room;
  }

  private decodePolyline(node: Extract<JavaNode, { kind: "object" }>): Polyline {
    const { id, properties } = this.idAndProperties(node);
    const points = this.asFloatArray(node.fields.get("points")) ?? [];
    const polyline = new Polyline(this.idOrGenerate(id, "polyline"), points);
    polyline.setThickness(this.num(node.fields.get("thickness"), 0));
    const capStyle = this.str(node.fields.get("capStyleName"));
    if (capStyle !== null) polyline.setCapStyle(capStyle);
    const joinStyle = this.str(node.fields.get("joinStyleName"));
    if (joinStyle !== null) polyline.setJoinStyle(joinStyle);
    const dashStyle = this.str(node.fields.get("dashStyleName"));
    if (dashStyle !== null) polyline.setDashStyle(dashStyle);
    const dashPattern = node.fields.get("dashPattern");
    if (unwrap(dashPattern) !== null) {
      polyline.setDashPattern((this.asNumberArray(dashPattern) ?? []).map((v) => v as number));
    }
    polyline.setDashOffset(this.num(node.fields.get("dashOffset"), 0));
    const startArrow = this.str(node.fields.get("startArrowStyleName"));
    if (startArrow !== null) polyline.setStartArrowStyle(startArrow);
    const endArrow = this.str(node.fields.get("endArrowStyleName"));
    if (endArrow !== null) polyline.setEndArrowStyle(endArrow);
    polyline.setClosedPath(this.bool(node.fields.get("closedPath"), false));
    polyline.setColor(this.num(node.fields.get("color"), 0xffffff));
    const elevation = node.fields.get("elevation");
    if (unwrap(elevation) !== null) {
      polyline.setElevation(this.num(elevation, 0));
      polyline.setVisibleIn3D(this.bool(node.fields.get("visibleIn3D"), true));
    }
    const level = node.fields.get("level");
    if (unwrap(level) !== null) {
      polyline.setLevel(this.levels.get(this.str(level) ?? "") ?? null);
    }
    this.applyProperties(polyline, properties);
    return polyline;
  }

  private decodeDimensionLine(node: Extract<JavaNode, { kind: "object" }>): DimensionLine {
    const { id, properties } = this.idAndProperties(node);
    const dl = new DimensionLine(
      this.idOrGenerate(id, "dimensionLine"),
      this.num(node.fields.get("xStart"), 0),
      this.num(node.fields.get("yStart"), 0),
      this.num(node.fields.get("elevationStart"), 0),
      this.num(node.fields.get("xEnd"), 0),
      this.num(node.fields.get("yEnd"), 0),
      this.num(node.fields.get("elevationEnd"), 0),
      this.num(node.fields.get("offset"), 0),
    );
    dl.setEndMarkSize(this.num(node.fields.get("endMarkSize"), 10));
    dl.setPitch(this.num(node.fields.get("pitch"), 0));
    dl.setColor(this.int(node.fields.get("color")));
    dl.setVisibleIn3D(this.bool(node.fields.get("visibleIn3D"), false));
    const level = node.fields.get("level");
    if (unwrap(level) !== null) {
      dl.setLevel(this.levels.get(this.str(level) ?? "") ?? null);
    }
    this.applyProperties(dl, properties);
    return dl;
  }

  private decodeLabel(node: Extract<JavaNode, { kind: "object" }>): Label {
    const { id, properties } = this.idAndProperties(node);
    const label = new Label(this.idOrGenerate(id, "label"), this.str(node.fields.get("text")) ?? "", this.num(node.fields.get("x"), 0), this.num(node.fields.get("y"), 0));
    label.setAngle(this.num(node.fields.get("angle"), 0));
    const elevation = node.fields.get("elevation");
    if (unwrap(elevation) !== null) {
      label.setElevation(this.num(elevation, 0));
    }
    const pitch = node.fields.get("pitch");
    if (unwrap(pitch) !== null) {
      label.setPitch(this.num(pitch, 0));
    }
    label.setColor(this.int(node.fields.get("color")));
    label.setOutlineColor(this.int(node.fields.get("outlineColor")));
    const level = node.fields.get("level");
    if (unwrap(level) !== null) {
      label.setLevel(this.levels.get(this.str(level) ?? "") ?? null);
    }
    this.applyProperties(label, properties);
    return label;
  }

  private decodeCompass(node: Extract<JavaNode, { kind: "object" }>): Compass {
    const { id, properties } = this.idAndProperties(node);
    const compass = new Compass(this.idOrGenerate(id, "compass"), this.num(node.fields.get("x"), 0), this.num(node.fields.get("y"), 0), this.num(node.fields.get("diameter"), 100));
    compass.setNorthDirection(this.num(node.fields.get("northDirection"), 0));
    compass.setLatitude(this.num(node.fields.get("latitude"), 0));
    compass.setLongitude(this.num(node.fields.get("longitude"), 0));
    const timeZone = this.decodeObject(node.fields.get("timeZone"));
    if (typeof timeZone === "string") {
      compass.setTimeZone(timeZone);
    }
    compass.setVisible(this.bool(node.fields.get("visible"), true));
    this.applyProperties(compass, properties);
    return compass;
  }

  private decodeEnvironment(node: Extract<JavaNode, { kind: "object" }>): HomeEnvironment {
    const { id, properties } = this.idAndProperties(node);
    const env = new HomeEnvironment(this.idOrGenerate(id, "doorOrWindow"));
    env.setGroundColor(this.num(node.fields.get("groundColor"), 0xa8a8a8));
    env.setSkyColor(this.num(node.fields.get("skyColor"), 0xcce4fc));
    env.setLightColor(this.num(node.fields.get("lightColor"), 0xd0d0d0));
    env.setCeillingLightColor(this.num(node.fields.get("ceilingLightColor"), 0xd0d0d0));
    env.setWallsAlpha(this.num(node.fields.get("wallsAlpha"), 0));
    env.setSubpartSizeUnderLight(this.num(node.fields.get("subpartSizeUnderLight"), 0));
    env.setAllLevelsVisible(this.bool(node.fields.get("allLevelsVisible"), true));
    env.setObserverCameraElevationAdjusted(this.bool(node.fields.get("observerCameraElevationAdjusted"), true));
    env.setPhotoWidth(this.num(node.fields.get("photoWidth"), 400));
    env.setPhotoHeight(this.num(node.fields.get("photoHeight"), 300));
    env.setPhotoQuality(this.num(node.fields.get("photoQuality"), 0));
    env.setVideoWidth(this.num(node.fields.get("videoWidth"), 320));
    env.setVideoQuality(this.num(node.fields.get("videoQuality"), 0));
    env.setVideoSpeed(this.num(node.fields.get("videoSpeed"), 2400 / 3600));
    env.setVideoFrameRate(this.num(node.fields.get("videoFrameRate"), 25));
    const drawingMode = this.str(node.fields.get("drawingModeName"));
    if (drawingMode !== null) {
      env.setDrawingMode(drawingMode);
    }
    const groundTexture = this.decodeObject(node.fields.get("groundTexture"));
    if (groundTexture instanceof HomeTexture) env.setGroundTexture(groundTexture);
    const skyTexture = this.decodeObject(node.fields.get("skyTexture"));
    if (skyTexture instanceof HomeTexture) env.setSkyTexture(skyTexture);
    this.applyProperties(env, properties);
    return env;
  }

  private decodeCamera(node: Extract<JavaNode, { kind: "object" }>): Camera {
    const { id, properties } = this.idAndProperties(node);
    const x = this.num(node.fields.get("x"), 0);
    const y = this.num(node.fields.get("y"), 0);
    const z = this.num(node.fields.get("z"), 0);
    const yaw = this.num(node.fields.get("yaw"), 0);
    const pitch = this.num(node.fields.get("pitch"), 0);
    const fov = this.num(node.fields.get("fieldOfView"), Math.PI * 63 / 180);
    const isObserver = node.classDesc.name.endsWith(".ObserverCamera");
    const camera: Camera = isObserver
      ? new ObserverCamera(this.idOrGenerate(id, "observerCamera"), x, y, z, yaw, pitch, fov)
      : new Camera(this.idOrGenerate(id, "doorOrWindow"), x, y, z, yaw, pitch, fov);
    camera.setTime(this.num(node.fields.get("time"), 0));
    const lens = this.str(node.fields.get("lensName"));
    if (lens !== null) camera.setLens(lens);
    camera.setName(this.str(node.fields.get("name")));
    const renderer = this.str(node.fields.get("renderer"));
    if (renderer !== null) camera.setRenderer(renderer);
    if (camera instanceof ObserverCamera) {
      camera.setFixedSize(this.bool(node.fields.get("fixedSize"), false));
    }
    this.applyProperties(camera, properties);
    return camera;
  }

  private decodePrint(node: Extract<JavaNode, { kind: "object" }>): HomePrint {
    const orientation = this.str(node.fields.get("paperOrientation")) ?? HomePrint.PaperOrientation.PORTRAIT;
    return new HomePrint(
      orientation,
      this.num(node.fields.get("paperWidth"), 0),
      this.num(node.fields.get("paperHeight"), 0),
      this.num(node.fields.get("paperTopMargin"), 0),
      this.num(node.fields.get("paperLeftMargin"), 0),
      this.num(node.fields.get("paperBottomMargin"), 0),
      this.num(node.fields.get("paperRightMargin"), 0),
      this.bool(node.fields.get("furniturePrinted"), true),
      this.bool(node.fields.get("planPrinted"), true),
      [],
      this.bool(node.fields.get("view3DPrinted"), true),
      this.numOrNull(node.fields.get("planScale")),
      this.str(node.fields.get("headerFormat")),
      this.str(node.fields.get("footerFormat")),
    );
  }

  private decodeTexture(node: Extract<JavaNode, { kind: "object" }>): HomeTexture | null {
    const textureNode = unwrap(node.fields.get("texture"));
    if (textureNode === null) {
      return null;
    }
    if (textureNode.kind === "object") {
      // HomeTexture wraps a TextureImage (the texture's image content)
      const image = this.decodeObject(textureNode.fields.get("image"));
      const width = this.num(textureNode.fields.get("width"), 1);
      const height = this.num(textureNode.fields.get("height"), 1);
      const name = this.str(textureNode.fields.get("name"));
      const creator = this.str(textureNode.fields.get("creator"));
      const imageContent = isContent(image) ? image : null;
      return new HomeTexture(
        {
          getCatalogId: () => null,
          getName: () => name,
          getCreator: () => creator,
          getImage: () => imageContent ?? new SerializedContent(""),
          getWidth: () => width,
          getHeight: () => height,
        },
        this.num(node.fields.get("xOffset"), 0),
        this.num(node.fields.get("yOffset"), 0),
        this.num(node.fields.get("angle"), 0),
        this.num(node.fields.get("scale"), 1),
        this.bool(node.fields.get("fittingArea"), false),
        this.bool(node.fields.get("leftToRightOriented"), true),
      );
    }
    return null;
  }

  private decodeMaterial(node: Extract<JavaNode, { kind: "object" }>): HomeMaterial {
    const texture = this.decodeObject(node.fields.get("texture"));
    return new HomeMaterial(
      this.str(node.fields.get("name")) ?? "",
      this.str(node.fields.get("key")) ?? null,
      this.int(node.fields.get("color")),
      texture instanceof HomeTexture ? texture : null,
      this.numOrNull(node.fields.get("shininess")),
    );
  }

  private decodeBaseboard(node: Extract<JavaNode, { kind: "object" }>): Baseboard {
    const texture = this.decodeObject(node.fields.get("texture"));
    return Baseboard.fromFields(
      this.num(node.fields.get("thickness"), 0),
      this.num(node.fields.get("height"), 0),
      this.int(node.fields.get("color")),
      texture instanceof HomeTexture ? texture : null,
    );
  }

  private decodeLightSource(node: Extract<JavaNode, { kind: "object" }>): LightSource {
    return new LightSource(
      this.num(node.fields.get("x"), 0),
      this.num(node.fields.get("y"), 0),
      this.num(node.fields.get("z"), 0),
      this.num(node.fields.get("color"), 0xffffff),
      this.numOrNull(node.fields.get("diameter")),
    );
  }

  private decodeSash(node: Extract<JavaNode, { kind: "object" }>): Sash {
    return new Sash(
      this.num(node.fields.get("xAxis"), 0),
      this.num(node.fields.get("yAxis"), 0),
      this.num(node.fields.get("width"), 0),
      this.num(node.fields.get("startAngle"), 0),
      this.num(node.fields.get("endAngle"), 0),
      this.bool(node.fields.get("horizontal"), false),
    );
  }

  private decodeTextStyle(node: Extract<JavaNode, { kind: "object" }>): TextStyle {
    const fontSize = this.num(node.fields.get("fontSize"), 12);
    return new TextStyle(
      this.str(node.fields.get("fontName")) ?? null,
      fontSize,
      this.bool(node.fields.get("bold"), false),
      this.bool(node.fields.get("italic"), false),
      this.str(node.fields.get("alignment")) ?? TextStyle.Alignment.CENTER,
    );
  }

  private decodeBackgroundImage(node: Extract<JavaNode, { kind: "object" }>): BackgroundImage {
    const image = this.decodeObject(node.fields.get("image"));
    return new BackgroundImage(
      isContent(image) ? image : null,
      this.num(node.fields.get("scaleDistance"), 0),
      this.num(node.fields.get("scaleDistanceXStart"), 0),
      this.num(node.fields.get("scaleDistanceYStart"), 0),
      this.num(node.fields.get("scaleDistanceXEnd"), 0),
      this.num(node.fields.get("scaleDistanceYEnd"), 0),
      this.num(node.fields.get("xOrigin"), 0),
      this.num(node.fields.get("yOrigin"), 0),
      this.bool(node.fields.get("visible"), true),
    );
  }

  private decodeFurniture(node: Extract<JavaNode, { kind: "object" }>): HomePieceOfFurniture {
    const { id, properties } = this.idAndProperties(node);
    const piece = new HomePieceOfFurniture(id.length > 0 ? id : "pieceOfFurniture", {
      getName: () => this.str(node.fields.get("name")),
      getDescription: () => this.str(node.fields.get("description")),
      getInformation: () => this.str(node.fields.get("information")),
      getLicense: () => this.str(node.fields.get("license")),
      getDepth: () => this.num(node.fields.get("depth"), 0),
      getHeight: () => this.num(node.fields.get("height"), 0),
      getWidth: () => this.num(node.fields.get("width"), 0),
      getElevation: () => this.num(node.fields.get("elevation"), 0),
      getDropOnTopElevation: () => this.num(node.fields.get("dropOnTopElevation"), 1),
      isMovable: () => this.bool(node.fields.get("movable"), true),
      isDoorOrWindow: () => this.bool(node.fields.get("doorOrWindow"), false),
      getIcon: () => this.content(node.fields.get("icon")),
      getPlanIcon: () => this.content(node.fields.get("planIcon")),
      getModel: () => this.content(node.fields.get("model")),
      getModelFlags: () => this.num(node.fields.get("modelFlags"), 0),
      getModelSize: () => this.numOrNull(node.fields.get("modelSize")),
      getModelRotation: () => {
        const rotation = this.asFloatArray(node.fields.get("modelRotation"));
        if (rotation !== null && rotation.length >= 3) {
          return [rotation[0] ?? [1, 0, 0], rotation[1] ?? [0, 1, 0], rotation[2] ?? [0, 0, 1]];
        }
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      },
      getStaircaseCutOutShape: () => this.str(node.fields.get("staircaseCutOutShape")),
      getCreator: () => this.str(node.fields.get("creator")),
      isBackFaceShown: () => this.bool(node.fields.get("backFaceShown"), false),
      getColor: () => this.int(node.fields.get("color")),
      isResizable: () => this.bool(node.fields.get("resizable"), true),
      isDeformable: () => this.bool(node.fields.get("deformable"), true),
      isWidthDepthDeformable: () => this.bool(node.fields.get("widthDepthDeformable"), true),
      isTexturable: () => this.bool(node.fields.get("texturable"), true),
      isHorizontallyRotatable: () => this.bool(node.fields.get("horizontallyRotatable"), true),
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => this.str(node.fields.get("currency")),
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    });
    this.applyFurnitureCommon(node, piece);
    this.applyProperties(piece, properties);
    return piece;
  }

  private applyFurnitureCommon(node: Extract<JavaNode, { kind: "object" }>, piece: HomePieceOfFurniture): void {
    piece.setX(this.num(node.fields.get("x"), 0));
    piece.setY(this.num(node.fields.get("y"), 0));
    piece.setAngle(this.num(node.fields.get("angle"), 0));
    piece.setPitch(this.num(node.fields.get("pitch"), 0));
    piece.setRoll(this.num(node.fields.get("roll"), 0));
    piece.setModelMirrored(this.bool(node.fields.get("modelMirrored"), false));
    piece.setWidthInPlan(this.num(node.fields.get("widthInPlan"), piece.getWidth()));
    piece.setDepthInPlan(this.num(node.fields.get("depthInPlan"), piece.getDepth()));
    piece.setHeightInPlan(this.num(node.fields.get("heightInPlan"), piece.getHeight()));
    piece.setVisible(this.bool(node.fields.get("visible"), true));
    piece.setNameVisible(this.bool(node.fields.get("nameVisible"), true));
    piece.setNameAngle(this.num(node.fields.get("nameAngle"), 0));
    piece.setNameXOffset(this.num(node.fields.get("nameXOffset"), 0));
    piece.setNameYOffset(this.num(node.fields.get("nameYOffset"), 0));
    piece.setModelCenteredAtOrigin(this.bool(node.fields.get("modelCenteredAtOrigin"), true));
    piece.setModelFlags(this.num(node.fields.get("modelFlags"), 0));
    const texture = this.decodeObject(node.fields.get("texture"));
    if (texture instanceof HomeTexture) {
      piece.setTexture(texture);
    }
    const color = this.int(node.fields.get("color"));
    if (color !== null) {
      piece.setColor(color);
    }
    const shininess = this.numOrNull(node.fields.get("shininess"));
    if (shininess !== null) {
      piece.setShininess(shininess);
    }
    const materials = this.asList(node.fields.get("modelMaterials"));
    if (materials !== null) {
      piece.setModelMaterials(materials as HomeMaterial[]);
    }
    const level = node.fields.get("level");
    if (unwrap(level) !== null) {
      piece.setLevel(this.levels.get(this.str(level) ?? "") ?? null);
    }
  }

  private decodeDoorOrWindow(node: Extract<JavaNode, { kind: "object" }>): HomeDoorOrWindow {
    const { id, properties } = this.idAndProperties(node);
    const supplier: import("../../model/Interfaces.js").DoorOrWindow = {
      getName: () => this.str(node.fields.get("name")),
      getDescription: () => this.str(node.fields.get("description")),
      getInformation: () => this.str(node.fields.get("information")),
      getLicense: () => this.str(node.fields.get("license")),
      getDepth: () => this.num(node.fields.get("depth"), 0),
      getHeight: () => this.num(node.fields.get("height"), 0),
      getWidth: () => this.num(node.fields.get("width"), 0),
      getElevation: () => this.num(node.fields.get("elevation"), 0),
      getDropOnTopElevation: () => this.num(node.fields.get("dropOnTopElevation"), 1),
      isMovable: () => this.bool(node.fields.get("movable"), true),
      isDoorOrWindow: () => true,
      getIcon: () => this.content(node.fields.get("icon")),
      getPlanIcon: () => this.content(node.fields.get("planIcon")),
      getModel: () => this.content(node.fields.get("model")),
      getModelFlags: () => this.num(node.fields.get("modelFlags"), 0),
      getModelSize: () => this.numOrNull(node.fields.get("modelSize")),
      getModelRotation: () => {
        const rotation = this.asFloatArray(node.fields.get("modelRotation"));
        if (rotation !== null && rotation.length >= 3) {
          return [rotation[0] ?? [1, 0, 0], rotation[1] ?? [0, 1, 0], rotation[2] ?? [0, 0, 1]];
        }
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      },
      getStaircaseCutOutShape: () => this.str(node.fields.get("staircaseCutOutShape")),
      getCreator: () => this.str(node.fields.get("creator")),
      isBackFaceShown: () => this.bool(node.fields.get("backFaceShown"), false),
      getColor: () => this.int(node.fields.get("color")),
      isResizable: () => this.bool(node.fields.get("resizable"), true),
      isDeformable: () => this.bool(node.fields.get("deformable"), true),
      isWidthDepthDeformable: () => this.bool(node.fields.get("widthDepthDeformable"), true),
      isTexturable: () => this.bool(node.fields.get("texturable"), true),
      isHorizontallyRotatable: () => this.bool(node.fields.get("horizontallyRotatable"), true),
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => this.str(node.fields.get("currency")),
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
      getWallThickness: () => this.num(node.fields.get("wallThickness"), 1),
      getWallDistance: () => this.num(node.fields.get("wallDistance"), 0),
      getSashes: () => (this.asList(node.fields.get("sashes")) as Sash[]) ?? [],
      getCutOutShape: () => this.str(node.fields.get("cutOutShape")) ?? "M0,0 v1 h1 v-1 z",
      isWallCutOutOnBothSides: () => this.bool(node.fields.get("wallCutOutOnBothSides"), false),
    };
    const door = new HomeDoorOrWindow(id.length > 0 ? id : "doorOrWindow", supplier);
    this.applyFurnitureCommon(node, door);
    door.setWallWidth(this.num(node.fields.get("wallWidth"), 1));
    door.setWallLeft(this.num(node.fields.get("wallLeft"), 0));
    door.setWallHeight(this.num(node.fields.get("wallHeight"), 1));
    door.setWallTop(this.num(node.fields.get("wallTop"), 0));
    door.setWidthDepthDeformable(this.bool(node.fields.get("widthDepthDeformable"), true));
    door.setBoundToWall(this.bool(node.fields.get("boundToWall"), true));
    const sashes = this.asList(node.fields.get("sashes"));
    if (sashes !== null) {
      door.setSashes(sashes as Sash[]);
    }
    const cutOutShape = this.str(node.fields.get("cutOutShape"));
    if (cutOutShape !== null) {
      door.setCutOutShape(cutOutShape);
    }
    this.applyProperties(door, properties);
    return door;
  }

  private decodeLight(node: Extract<JavaNode, { kind: "object" }>): HomeLight {
    const { id, properties } = this.idAndProperties(node);
    const supplier: import("../../model/Interfaces.js").Light = {
      getName: () => this.str(node.fields.get("name")),
      getDescription: () => this.str(node.fields.get("description")),
      getInformation: () => this.str(node.fields.get("information")),
      getLicense: () => this.str(node.fields.get("license")),
      getDepth: () => this.num(node.fields.get("depth"), 0),
      getHeight: () => this.num(node.fields.get("height"), 0),
      getWidth: () => this.num(node.fields.get("width"), 0),
      getElevation: () => this.num(node.fields.get("elevation"), 0),
      getDropOnTopElevation: () => this.num(node.fields.get("dropOnTopElevation"), 1),
      isMovable: () => this.bool(node.fields.get("movable"), true),
      isDoorOrWindow: () => false,
      getIcon: () => this.content(node.fields.get("icon")),
      getPlanIcon: () => this.content(node.fields.get("planIcon")),
      getModel: () => this.content(node.fields.get("model")),
      getModelFlags: () => this.num(node.fields.get("modelFlags"), 0),
      getModelSize: () => this.numOrNull(node.fields.get("modelSize")),
      getModelRotation: () => {
        const rotation = this.asFloatArray(node.fields.get("modelRotation"));
        if (rotation !== null && rotation.length >= 3) {
          return [rotation[0] ?? [1, 0, 0], rotation[1] ?? [0, 1, 0], rotation[2] ?? [0, 0, 1]];
        }
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      },
      getStaircaseCutOutShape: () => this.str(node.fields.get("staircaseCutOutShape")),
      getCreator: () => this.str(node.fields.get("creator")),
      isBackFaceShown: () => this.bool(node.fields.get("backFaceShown"), false),
      getColor: () => this.int(node.fields.get("color")),
      isResizable: () => this.bool(node.fields.get("resizable"), true),
      isDeformable: () => this.bool(node.fields.get("deformable"), true),
      isWidthDepthDeformable: () => true,
      isTexturable: () => this.bool(node.fields.get("texturable"), true),
      isHorizontallyRotatable: () => this.bool(node.fields.get("horizontallyRotatable"), true),
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => this.str(node.fields.get("currency")),
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
      getLightSources: () => (this.asList(node.fields.get("lightSources")) as LightSource[]) ?? [],
      getLightSourceMaterialNames: () => (this.asList(node.fields.get("lightSourceMaterialNames")) as string[]) ?? [],
      getPower: () => this.num(node.fields.get("power"), 0),
    };
    const light = new HomeLight(id.length > 0 ? id : "light", supplier);
    this.applyFurnitureCommon(node, light);
    light.setPower(this.num(node.fields.get("power"), 0));
    const lightSources = this.asList(node.fields.get("lightSources"));
    if (lightSources !== null) {
      light.setLightSources(lightSources as LightSource[]);
    }
    const materialNames = this.asList(node.fields.get("lightSourceMaterialNames"));
    if (materialNames !== null) {
      light.setLightSourceMaterialNames(materialNames as string[]);
    }
    this.applyProperties(light, properties);
    return light;
  }

  private decodeShelfUnit(node: Extract<JavaNode, { kind: "object" }>): HomeShelfUnit {
    const { id, properties } = this.idAndProperties(node);
    const supplier: import("../../model/Interfaces.js").ShelfUnit = {
      getName: () => this.str(node.fields.get("name")),
      getDescription: () => this.str(node.fields.get("description")),
      getInformation: () => this.str(node.fields.get("information")),
      getLicense: () => this.str(node.fields.get("license")),
      getDepth: () => this.num(node.fields.get("depth"), 0),
      getHeight: () => this.num(node.fields.get("height"), 0),
      getWidth: () => this.num(node.fields.get("width"), 0),
      getElevation: () => this.num(node.fields.get("elevation"), 0),
      getDropOnTopElevation: () => this.num(node.fields.get("dropOnTopElevation"), 1),
      isMovable: () => this.bool(node.fields.get("movable"), true),
      isDoorOrWindow: () => false,
      getIcon: () => this.content(node.fields.get("icon")),
      getPlanIcon: () => this.content(node.fields.get("planIcon")),
      getModel: () => this.content(node.fields.get("model")),
      getModelFlags: () => this.num(node.fields.get("modelFlags"), 0),
      getModelSize: () => this.numOrNull(node.fields.get("modelSize")),
      getModelRotation: () => {
        const rotation = this.asFloatArray(node.fields.get("modelRotation"));
        if (rotation !== null && rotation.length >= 3) {
          return [rotation[0] ?? [1, 0, 0], rotation[1] ?? [0, 1, 0], rotation[2] ?? [0, 0, 1]];
        }
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      },
      getStaircaseCutOutShape: () => this.str(node.fields.get("staircaseCutOutShape")),
      getCreator: () => this.str(node.fields.get("creator")),
      isBackFaceShown: () => this.bool(node.fields.get("backFaceShown"), false),
      getColor: () => this.int(node.fields.get("color")),
      isResizable: () => this.bool(node.fields.get("resizable"), true),
      isDeformable: () => this.bool(node.fields.get("deformable"), true),
      isWidthDepthDeformable: () => true,
      isTexturable: () => this.bool(node.fields.get("texturable"), true),
      isHorizontallyRotatable: () => this.bool(node.fields.get("horizontallyRotatable"), true),
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => this.str(node.fields.get("currency")),
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
      getShelfElevations: () => (this.asNumberArray(node.fields.get("shelfElevations")) as number[]) ?? [],
      getShelfBoxes: () => (this.asList(node.fields.get("shelfBoxes")) as unknown[]) ?? [],
    };
    const shelf = new HomeShelfUnit(id.length > 0 ? id : "shelfUnit", supplier);
    this.applyFurnitureCommon(node, shelf);
    const elevations = this.asNumberArray(node.fields.get("shelfElevations"));
    if (elevations !== null) {
      shelf.setShelfElevations(elevations as number[]);
    }
    const boxes = this.asList(node.fields.get("shelfBoxes"));
    if (boxes !== null) {
      shelf.setShelfBoxes(boxes);
    }
    this.applyProperties(shelf, properties);
    return shelf;
  }

  private decodeFurnitureGroup(node: Extract<JavaNode, { kind: "object" }>): HomeFurnitureGroup {
    const furniture = (this.asList(node.fields.get("furniture")) ?? []).filter((p) => p instanceof HomePieceOfFurniture) as HomePieceOfFurniture[];
    const name = this.str(node.fields.get("name")) ?? "";
    const angle = this.num(node.fields.get("angle"), 0);
    const mirrored = this.bool(node.fields.get("modelMirrored"), false);
    const { id } = this.idAndProperties(node);
    if (furniture.length === 0) {
      // Degenerate group (should not occur); build from a placeholder.
      const placeholder = new HomePieceOfFurniture("groupPiece", {
        getName: () => null, getDescription: () => null, getInformation: () => null, getLicense: () => null,
        getDepth: () => 0, getHeight: () => 0, getWidth: () => 0, getElevation: () => 0, getDropOnTopElevation: () => 1,
        isMovable: () => true, isDoorOrWindow: () => false, getIcon: () => null, getPlanIcon: () => null, getModel: () => null,
        getModelFlags: () => 0, getModelSize: () => null, getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        getStaircaseCutOutShape: () => null, getCreator: () => null, isBackFaceShown: () => false, getColor: () => null,
        isResizable: () => true, isDeformable: () => true, isWidthDepthDeformable: () => true, isTexturable: () => true,
        isHorizontallyRotatable: () => true, getPrice: () => null, getValueAddedTaxPercentage: () => null, getCurrency: () => null,
        getProperty: () => null, getPropertyNames: () => [], getContentProperty: () => null, isContentProperty: () => false, getLevel: () => null,
      });
      furniture.push(placeholder);
    }
    return new HomeFurnitureGroup(id.length > 0 ? id : "furnitureGroup", furniture, angle, mirrored, name);
  }

  // -------------------------------------------------------------- helpers

  private applyProperties(object: HomeObject, properties: Map<string, unknown>): void {
    for (const [name, value] of properties) {
      if (isContent(value)) {
        object.setProperty(name, value);
      } else if (typeof value === "string") {
        object.setProperty(name, value);
      }
    }
  }

  /** Returns a concrete id (serialized HomeObject has no id field in old files). */
  private idOrGenerate(id: string, prefix: string): string {
    return id.length > 0 ? id : HomeObject.createId(prefix);
  }

  private num(node: NodeOrNull, fallback: number): number {
    const value = this.decodeObject(node);
    return typeof value === "number" ? value : fallback;
  }

  private numOrNull(node: NodeOrNull): number | null {
    const value = this.decodeObject(node);
    return typeof value === "number" ? value : null;
  }

  private str(node: NodeOrNull): string | null {
    const value = this.decodeObject(node);
    return typeof value === "string" ? value : null;
  }

  private int(node: NodeOrNull): number | null {
    const value = this.decodeObject(node);
    return typeof value === "number" ? value : null;
  }

  private bool(node: NodeOrNull, fallback: boolean): boolean {
    const value = this.decodeObject(node);
    return typeof value === "boolean" ? value : fallback;
  }

  private content(node: NodeOrNull): Content | null {
    const value = this.decodeObject(node);
    return isContent(value) ? value : null;
  }

  private asList(node: NodeOrNull): unknown[] | null {
    const value = this.decodeObject(node);
    return Array.isArray(value) ? value : null;
  }

  private asNumberArray(node: NodeOrNull): number[] | null {
    const value = this.decodeObject(node);
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "number" ? v : Number(v)));
    }
    if (value instanceof Float32Array) {
      return [...value];
    }
    return null;
  }

  private asFloatArray(node: NodeOrNull): number[][] | null {
    const value = this.decodeObject(node);
    if (Array.isArray(value)) {
      return value.map((row) => (Array.isArray(row) ? row.map((v) => (typeof v === "number" ? v : Number(v))) : [Number(row)]));
    }
    return null;
  }
}

/** Structural Content check (Content is a type-only interface). */
function isContent(value: unknown): value is Content {
  return value !== null && typeof value === "object" && typeof (value as Content).openStream === "function";
}

/** Unwraps reference/null nodes to their target or null. */
function unwrap(node: NodeOrNull): JavaNode | null {
  if (node === null || node === undefined) return null;
  if (node.kind === "null" || node.kind === "reference") return null;
  return node;
}
