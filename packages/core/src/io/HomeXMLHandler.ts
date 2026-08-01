/**
 * Port of com.eteks.sweethome3d.io.HomeXMLHandler (GPL v2+).
 *
 * SAX-style handler that parses a `Home.xml` document into a Home object
 * graph. The XML is parsed with DOMParser and walked in document order to
 * reproduce the exact SAX event sequence the Java handler expects.
 *
 * The state machine (element stacks, per-object accumulators, wall-join
 * resolution in endDocument) is transcribed faithfully from the Java source.
 */
import { f32 } from "../util/f32.js";
import { BackgroundImage } from "../model/BackgroundImage.js";
import { Camera } from "../model/Camera.js";
import { Compass } from "../model/Compass.js";
import { DimensionLine } from "../model/DimensionLine.js";
import { Home } from "../model/Home.js";
import { HomeDoorOrWindow } from "../model/HomeDoorOrWindow.js";
import { HomeEnvironment } from "../model/HomeEnvironment.js";
import { HomeFurnitureGroup } from "../model/HomeFurnitureGroup.js";
import { HomeLight } from "../model/HomeLight.js";
import { HomeMaterial } from "../model/HomeMaterial.js";
import { HomeObject } from "../model/HomeObject.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { HomePrint } from "../model/HomePrint.js";
import { HomeShelfUnit } from "../model/HomeShelfUnit.js";
import { HomeTexture } from "../model/HomeTexture.js";
import { Label } from "../model/Label.js";
import { Level } from "../model/Level.js";
import { ObserverCamera } from "../model/ObserverCamera.js";
import { Polyline } from "../model/Polyline.js";
import { Room } from "../model/Room.js";
import type { Content } from "../model/Content.js";
import type { HomeRecorder } from "../model/ModelInterfaces.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import { TextStyle } from "../model/TextStyle.js";
import { Wall } from "../model/Wall.js";
import { Baseboard, LightSource, ObjectProperty, Sash } from "../model/ValueClasses.js";
import { Transformation } from "../model/ModelInterfaces.js";
import { CatalogDoorOrWindow, CatalogLight, CatalogPieceOfFurniture, CatalogShelfUnit, CatalogTexture } from "./CatalogClasses.js";
import type { HomeContentContext } from "./HomeContentContext.js";

const UNIQUE_ATTRIBUTE = "@&unique&@";

class JoinedWall {
  constructor(
    readonly wall: Wall,
    readonly wallAtStartId: string | null,
    readonly wallAtEndId: string | null,
  ) {}
}

export class HomeXMLHandler {
  private contentContext: HomeContentContext | null = null;
  private preferences: UserPreferences | null = null;
  private home: Home | null = null;

  private buffer = "";
  private readonly elements: string[] = [];
  private readonly attributes: Array<Map<string, string>> = [];
  private readonly groupsFurniture: Array<HomePieceOfFurniture[]> = [];
  private readonly properties: Array<Map<string, string | Content>> = [];
  private readonly textStyles: Array<Map<string, TextStyle>> = [];
  private readonly levels = new Map<string, Level>();
  private readonly joinedWalls = new Map<string, JoinedWall>();

  private homeElementName: string | null = null;
  private labelText: string | null = null;
  private leftSideBaseboard: Baseboard | null = null;
  private rightSideBaseboard: Baseboard | null = null;
  private homeBackgroundImage: BackgroundImage | null = null;
  private backgroundImage: BackgroundImage | null = null;
  private readonly textures = new Map<string, HomeTexture>();
  private readonly materials: HomeMaterial[] = [];
  private readonly transformations: Transformation[] = [];
  private materialTexture: HomeTexture | null = null;
  private readonly sashes: Sash[] = [];
  private readonly lightSources: LightSource[] = [];
  private readonly lightSourceMaterialNames: string[] = [];
  private readonly shelfBoxes: unknown[] = [];
  private readonly shelfElevations: number[] = [];
  private readonly points: number[][] = [];
  private readonly furnitureVisiblePropertyNames: string[] = [];
  private readonly printedLevelIds: string[] = [];

  constructor();
  constructor(preferences: UserPreferences | null);
  constructor(preferences: UserPreferences | null = null) {
    this.preferences = preferences;
  }

  setContentContext(contentContext: HomeContentContext | null): void {
    this.contentContext = contentContext;
  }

  // ------------------------------------------------------------- SAX events

  startElement(name: string, attributes: Map<string, string>): void {
    this.buffer = "";
    this.elements.push(name);
    this.attributes.push(attributes);
    if (name !== "property" && name !== "furnitureVisibleProperty" && name !== "textStyle") {
      this.properties.push(new Map());
      this.textStyles.push(new Map());
    }

    if (name === "home") {
      this.setHome(this.createHome(name, attributes));
      this.furnitureVisiblePropertyNames.length = 0;
      this.homeBackgroundImage = null;
    } else if (name === "environment") {
      this.textures.clear();
    } else if (name === "level") {
      this.backgroundImage = null;
    } else if (name === "pieceOfFurniture" || name === "doorOrWindow" || name === "light" || name === "shelfUnit" || name === "furnitureGroup") {
      this.textures.clear();
      this.materials.length = 0;
      this.transformations.length = 0;
      this.sashes.length = 0;
      this.lightSources.length = 0;
      this.lightSourceMaterialNames.length = 0;
      this.shelfBoxes.length = 0;
      this.shelfElevations.length = 0;
      if (name === "furnitureGroup") {
        this.groupsFurniture.push([]);
      }
    } else if (name === "room") {
      this.textures.clear();
      this.points.length = 0;
    } else if (name === "polyline") {
      this.points.length = 0;
    } else if (name === "label") {
      this.labelText = null;
    } else if (name === "wall") {
      this.textures.clear();
      this.leftSideBaseboard = null;
      this.rightSideBaseboard = null;
    } else if (name === "baseboard") {
      this.textures.delete(UNIQUE_ATTRIBUTE);
    } else if (name === "material") {
      this.materialTexture = null;
    }
  }

  characters(text: string): void {
    this.buffer += text;
  }

  endElement(name: string): void {
    this.elements.pop();
    const parent = this.elements.length > 0 ? this.elements[this.elements.length - 1]! : null;
    const attributesMap = this.attributes.pop()!;

    if (this.homeElementName !== null && this.homeElementName === name) {
      this.setHomeAttributes(this.home!, name, attributesMap);
    } else if (name === "furnitureVisibleProperty") {
      const attrName = attributesMap.get("name");
      if (attrName === undefined) {
        throw new Error("Missing name attribute");
      }
      this.furnitureVisiblePropertyNames.push(attrName);
    } else if (name === "environment") {
      this.setEnvironmentAttributes(this.home!.getEnvironment(), name, attributesMap);
    } else if (name === "compass") {
      this.setCompassAttributes(this.home!.getCompass(), name, attributesMap);
    } else if (name === "print") {
      this.home!.setPrint(this.createPrint(attributesMap));
    } else if (name === "printedLevel" && parent === "print") {
      const level = attributesMap.get("level");
      if (level === undefined) {
        throw new Error("Missing level attribute");
      }
      this.printedLevelIds.push(level);
    } else if (name === "level") {
      const level = this.createLevel(name, attributesMap);
      this.setLevelAttributes(level, name, attributesMap);
      this.levels.set(attributesMap.get("id") ?? "", level);
      this.home!.addLevel(level);
    } else if (name === "camera" || name === "observerCamera") {
      const camera = this.createCamera(name, attributesMap);
      this.setCameraAttributes(camera, name, attributesMap);
      const attribute = attributesMap.get("attribute");
      if (attribute === "cameraPath") {
        const cameraPath = [...this.home!.getEnvironment().getVideoCameraPath()];
        cameraPath.push(camera);
        this.home!.getEnvironment().setVideoCameraPath(cameraPath);
      } else if (attribute === "topCamera") {
        const topCamera = this.home!.getTopCamera();
        topCamera.setCamera(camera);
        topCamera.setTime(camera.getTime());
        topCamera.setLens(camera.getLens());
      } else if (attribute === "observerCamera") {
        const observerCamera = this.home!.getObserverCamera();
        observerCamera.setCamera(camera);
        observerCamera.setTime(camera.getTime());
        observerCamera.setLens(camera.getLens());
        if (camera instanceof ObserverCamera) {
          observerCamera.setFixedSize(camera.isFixedSize());
        }
      } else if (attribute === "storedCamera") {
        const storedCameras = [...this.home!.getStoredCameras()];
        storedCameras.push(camera);
        this.home!.setStoredCameras(storedCameras);
      }
    } else if (name === "pieceOfFurniture" || name === "doorOrWindow" || name === "light" || name === "shelfUnit" || name === "furnitureGroup") {
      const piece =
        name === "furnitureGroup"
          ? this.createFurnitureGroup(name, attributesMap, this.groupsFurniture.pop() ?? [])
          : this.createPieceOfFurniture(name, attributesMap);
      this.setPieceOfFurnitureAttributes(piece, name, attributesMap);
      if (this.homeElementName !== null && this.homeElementName === parent) {
        this.home!.addPieceOfFurniture(piece);
        const levelId = attributesMap.get("level");
        if (levelId !== undefined) {
          piece.setLevel(this.levels.get(levelId) ?? null);
        }
      } else if (parent === "furnitureGroup") {
        this.groupsFurniture[this.groupsFurniture.length - 1]!.push(piece);
      }
    } else if (name === "wall") {
      const wall = this.createWall(name, attributesMap);
      this.joinedWalls.set(attributesMap.get("id") ?? "", new JoinedWall(wall, attributesMap.get("wallAtStart") ?? null, attributesMap.get("wallAtEnd") ?? null));
      this.setWallAttributes(wall, name, attributesMap);
      this.home!.addWall(wall);
      const levelId = attributesMap.get("level");
      if (levelId !== undefined) {
        wall.setLevel(this.levels.get(levelId) ?? null);
      }
    } else if (name === "baseboard") {
      const baseboard = this.createBaseboard(name, attributesMap);
      if (attributesMap.get("attribute") === "leftSideBaseboard") {
        this.leftSideBaseboard = baseboard;
      } else {
        this.rightSideBaseboard = baseboard;
      }
    } else if (name === "room") {
      const room = this.createRoom(name, attributesMap, this.points);
      this.setRoomAttributes(room, name, attributesMap);
      this.home!.addRoom(room);
      const levelId = attributesMap.get("level");
      if (levelId !== undefined) {
        room.setLevel(this.levels.get(levelId) ?? null);
      }
    } else if (name === "polyline") {
      const polyline = this.createPolyline(name, attributesMap, this.points);
      this.setPolylineAttributes(polyline, name, attributesMap);
      this.home!.addPolyline(polyline);
      const levelId = attributesMap.get("level");
      if (levelId !== undefined) {
        polyline.setLevel(this.levels.get(levelId) ?? null);
      }
    } else if (name === "dimensionLine") {
      const dimensionLine = this.createDimensionLine(name, attributesMap);
      this.setDimensionLineAttributes(dimensionLine, name, attributesMap);
      this.home!.addDimensionLine(dimensionLine);
      const levelId = attributesMap.get("level");
      if (levelId !== undefined) {
        dimensionLine.setLevel(this.levels.get(levelId) ?? null);
      }
    } else if (name === "label") {
      const label = this.createLabel(name, attributesMap, this.labelText ?? "");
      this.setLabelAttributes(label, name, attributesMap);
      this.home!.addLabel(label);
      const levelId = attributesMap.get("level");
      if (levelId !== undefined) {
        label.setLevel(this.levels.get(levelId) ?? null);
      }
    } else if (name === "text") {
      this.labelText = this.getCharacters();
    } else if (name === "textStyle") {
      const attribute = attributesMap.get("attribute");
      this.textStyles[this.textStyles.length - 1]!.set(attribute ?? UNIQUE_ATTRIBUTE, this.createTextStyle(name, attributesMap));
    } else if (name === "texture") {
      if (parent === "material") {
        this.materialTexture = this.createTexture(name, attributesMap);
      } else {
        const attribute = attributesMap.get("attribute");
        this.textures.set(attribute ?? UNIQUE_ATTRIBUTE, this.createTexture(name, attributesMap));
      }
    } else if (name === "material") {
      this.materials.push(this.createMaterial(name, attributesMap));
    } else if (name === "transformation") {
      const matrixAttribute = attributesMap.get("matrix");
      if (matrixAttribute === undefined) {
        throw new Error("Missing attribute matrix");
      }
      const values = matrixAttribute.split(" ", 12);
      if (values.length < 12) {
        throw new Error("Missing values for attribute matrix");
      }
      const matrix = [
        [Number.parseFloat(values[0]!), Number.parseFloat(values[1]!), Number.parseFloat(values[2]!), Number.parseFloat(values[3]!)],
        [Number.parseFloat(values[4]!), Number.parseFloat(values[5]!), Number.parseFloat(values[6]!), Number.parseFloat(values[7]!)],
        [Number.parseFloat(values[8]!), Number.parseFloat(values[9]!), Number.parseFloat(values[10]!), Number.parseFloat(values[11]!)],
      ];
      this.transformations.push(new Transformation(attributesMap.get("name") ?? "", matrix));
    } else if (name === "point") {
      this.points.push([this.parseFloat(attributesMap, "x"), this.parseFloat(attributesMap, "y")]);
    } else if (name === "sash") {
      this.sashes.push(
        new Sash(
          this.parseFloat(attributesMap, "xAxis"),
          this.parseFloat(attributesMap, "yAxis"),
          this.parseFloat(attributesMap, "width"),
          this.parseFloat(attributesMap, "startAngle"),
          this.parseFloat(attributesMap, "endAngle"),
          false,
        ),
      );
    } else if (name === "lightSource") {
      this.lightSources.push(
        new LightSource(
          this.parseFloat(attributesMap, "x"),
          this.parseFloat(attributesMap, "y"),
          this.parseFloat(attributesMap, "z"),
          this.parseOptionalColor(attributesMap, "color") ?? 0xffffff,
          this.parseOptionalFloat(attributesMap, "diameter"),
        ),
      );
    } else if (name === "lightSourceMaterial") {
      const materialName = attributesMap.get("name");
      if (materialName !== undefined) {
        this.lightSourceMaterialNames.push(materialName);
      }
    } else if (name === "shelf") {
      if (attributesMap.get("xLower") !== undefined) {
        this.shelfBoxes.push([
          this.parseFloat(attributesMap, "xLower"),
          this.parseFloat(attributesMap, "yLower"),
          this.parseFloat(attributesMap, "zLower"),
          this.parseFloat(attributesMap, "xUpper"),
          this.parseFloat(attributesMap, "yUpper"),
          this.parseFloat(attributesMap, "zUpper"),
        ]);
      } else {
        this.shelfElevations.push(this.parseFloat(attributesMap, "elevation"));
      }
    } else if (name === "backgroundImage") {
      const backgroundImage = new BackgroundImage(
        this.parseContent(name, attributesMap, "image"),
        this.parseFloat(attributesMap, "scaleDistance"),
        this.parseFloat(attributesMap, "scaleDistanceXStart"),
        this.parseFloat(attributesMap, "scaleDistanceYStart"),
        this.parseFloat(attributesMap, "scaleDistanceXEnd"),
        this.parseFloat(attributesMap, "scaleDistanceYEnd"),
        attributesMap.get("xOrigin") !== undefined ? this.parseFloat(attributesMap, "xOrigin") : 0,
        attributesMap.get("yOrigin") !== undefined ? this.parseFloat(attributesMap, "yOrigin") : 0,
        attributesMap.get("visible") !== "false",
      );
      if (this.homeElementName !== null && this.homeElementName === parent) {
        this.homeBackgroundImage = backgroundImage;
      } else {
        this.backgroundImage = backgroundImage;
      }
    } else if (name === "property") {
      if (this.homeElementName !== null) {
        if (ObjectProperty.Type.CONTENT === attributesMap.get("type")) {
          const content = this.parseContent(name, attributesMap, "value");
          if (content !== null) {
            this.properties[this.properties.length - 1]!.set(attributesMap.get("name") ?? "", content);
          }
        } else {
          const propertyName = attributesMap.get("name");
          const propertyValue = attributesMap.get("value");
          if (propertyName !== undefined && propertyValue !== undefined) {
            this.properties[this.properties.length - 1]!.set(propertyName, propertyValue);
          }
        }
      }
    }

    if (name !== "property" && name !== "furnitureVisibleProperty" && name !== "textStyle") {
      this.properties.pop();
      this.textStyles.pop();
    }
  }

  endDocument(): void {
    const home = this.home!;
    // Rebind printed levels
    const printedLevels: Level[] = [];
    for (const levelId of this.printedLevelIds) {
      for (const level of home.getLevels()) {
        if (levelId === level.getId()) {
          printedLevels.push(level);
          break;
        }
      }
    }
    const print = home.getPrint();
    if (print !== null && printedLevels.length > 0) {
      home.setPrint(
        new HomePrint(
          print.getPaperOrientation(),
          print.getPaperWidth(),
          print.getPaperHeight(),
          print.getPaperTopMargin(),
          print.getPaperLeftMargin(),
          print.getPaperBottomMargin(),
          print.getPaperRightMargin(),
          print.isFurniturePrinted(),
          print.isPlanPrinted(),
          printedLevels,
          print.isView3DPrinted(),
          print.getPlanScale(),
          print.getHeaderFormat(),
          print.getFooterFormat(),
        ),
      );
    }
    // Rebind wall starts and ends
    for (const joinedWall of this.joinedWalls.values()) {
      const wall = joinedWall.wall;
      if (joinedWall.wallAtStartId !== null && joinedWall.wallAtStartId !== wall.getId()) {
        const joinedWallAtStart = this.joinedWalls.get(joinedWall.wallAtStartId);
        if (joinedWallAtStart !== undefined) {
          wall.setWallAtStart(joinedWallAtStart.wall);
        }
      }
      if (joinedWall.wallAtEndId !== null && joinedWall.wallAtEndId !== wall.getId()) {
        const joinedWallAtEnd = this.joinedWalls.get(joinedWall.wallAtEndId);
        if (joinedWallAtEnd !== undefined) {
          wall.setWallAtEnd(joinedWallAtEnd.wall);
        }
      }
    }
  }

  private getCharacters(): string {
    return this.buffer;
  }

  // ---------------------------------------------------------------- creators

  private createHome(elementName: string, attributes: Map<string, string>): Home {
    const home = attributes.get("wallHeight") !== undefined ? new Home(this.parseFloat(attributes, "wallHeight")) : new Home();
    const version = attributes.get("version");
    if (version !== undefined) {
      home.setVersion(Number.parseInt(version, 10));
    }
    return home;
  }

  private setHomeAttributes(home: Home, elementName: string, attributes: Map<string, string>): void {
    for (const [property, value] of this.properties[this.properties.length - 1]!) {
      if (typeof value === "string") {
        home.setProperty(property, value);
      }
    }
    if (this.furnitureVisiblePropertyNames.length > 0) {
      home.setFurnitureVisiblePropertyNames(this.furnitureVisiblePropertyNames);
    }
    home.setBackgroundImage(this.homeBackgroundImage);
    home.setName(attributes.get("name") ?? null);
    const selectedLevelId = attributes.get("selectedLevel");
    if (selectedLevelId !== undefined) {
      home.setSelectedLevel(this.levels.get(selectedLevelId) ?? null);
    }
    if (attributes.get("camera") === "observerCamera") {
      home.setCamera(home.getObserverCamera());
    }
    home.setBasePlanLocked(attributes.get("basePlanLocked") === "true");
    const furnitureSortedPropertyName = attributes.get("furnitureSortedProperty");
    if (furnitureSortedPropertyName !== undefined) {
      home.setFurnitureSortedPropertyName(furnitureSortedPropertyName);
    }
    home.setFurnitureDescendingSorted(attributes.get("furnitureDescendingSorted") === "true");
  }

  private setEnvironmentAttributes(environment: HomeEnvironment, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(environment, elementName, attributes);
    const groundColor = this.parseOptionalColor(attributes, "groundColor");
    if (groundColor !== null) {
      environment.setGroundColor(groundColor);
    }
    environment.setGroundTexture(this.textures.get("groundTexture") ?? null);
    environment.setBackgroundImageVisibleOnGround3D(attributes.get("backgroundImageVisibleOnGround3D") === "true");
    const skyColor = this.parseOptionalColor(attributes, "skyColor");
    if (skyColor !== null) {
      environment.setSkyColor(skyColor);
    }
    environment.setSkyTexture(this.textures.get("skyTexture") ?? null);
    const lightColor = this.parseOptionalColor(attributes, "lightColor");
    if (lightColor !== null) {
      environment.setLightColor(lightColor);
    }
    const wallsAlpha = this.parseOptionalFloat(attributes, "wallsAlpha");
    if (wallsAlpha !== null) {
      environment.setWallsAlpha(wallsAlpha);
    }
    environment.setAllLevelsVisible(attributes.get("allLevelsVisible") === "true");
    environment.setObserverCameraElevationAdjusted(attributes.get("observerCameraElevationAdjusted") !== "false");
    const ceilingLightColor = this.parseOptionalColor(attributes, "ceillingLightColor");
    if (ceilingLightColor !== null) {
      environment.setCeillingLightColor(ceilingLightColor);
    }
    const drawingMode = attributes.get("drawingMode");
    if (drawingMode !== undefined) {
      environment.setDrawingMode(drawingMode);
    }
    const subpartSizeUnderLight = this.parseOptionalFloat(attributes, "subpartSizeUnderLight");
    if (subpartSizeUnderLight !== null) {
      environment.setSubpartSizeUnderLight(subpartSizeUnderLight);
    }
    const photoWidth = this.parseOptionalInteger(attributes, "photoWidth");
    if (photoWidth !== null) {
      environment.setPhotoWidth(photoWidth);
    }
    const photoHeight = this.parseOptionalInteger(attributes, "photoHeight");
    if (photoHeight !== null) {
      environment.setPhotoHeight(photoHeight);
    }
    const photoAspectRatio = attributes.get("photoAspectRatio");
    if (photoAspectRatio !== undefined) {
      environment.setPhotoAspectRatio(photoAspectRatio);
    }
    const photoQuality = this.parseOptionalInteger(attributes, "photoQuality");
    if (photoQuality !== null) {
      environment.setPhotoQuality(photoQuality);
    }
    const videoWidth = this.parseOptionalInteger(attributes, "videoWidth");
    if (videoWidth !== null) {
      environment.setVideoWidth(videoWidth);
    }
    const videoAspectRatio = attributes.get("videoAspectRatio");
    if (videoAspectRatio !== undefined) {
      environment.setVideoAspectRatio(videoAspectRatio);
    }
    const videoQuality = this.parseOptionalInteger(attributes, "videoQuality");
    if (videoQuality !== null) {
      environment.setVideoQuality(videoQuality);
    }
    const videoSpeed = this.parseOptionalFloat(attributes, "videoSpeed");
    if (videoSpeed !== null) {
      environment.setVideoSpeed(videoSpeed);
    }
    const videoFrameRate = this.parseOptionalInteger(attributes, "videoFrameRate");
    if (videoFrameRate !== null) {
      environment.setVideoFrameRate(videoFrameRate);
    }
    const videoHeight = this.parseOptionalInteger(attributes, "videoHeight");
    if (videoHeight !== null) {
      environment.setVideoHeight(videoHeight);
    }
  }

  private createPrint(attributes: Map<string, string>): HomePrint {
    let paperOrientation: string = HomePrint.PaperOrientation.PORTRAIT;
    const orientation = attributes.get("paperOrientation");
    if (orientation !== undefined) {
      paperOrientation = orientation;
    }
    return new HomePrint(
      paperOrientation,
      this.parseFloat(attributes, "paperWidth"),
      this.parseFloat(attributes, "paperHeight"),
      this.parseFloat(attributes, "paperTopMargin"),
      this.parseFloat(attributes, "paperLeftMargin"),
      this.parseFloat(attributes, "paperBottomMargin"),
      this.parseFloat(attributes, "paperRightMargin"),
      attributes.get("furniturePrinted") !== "false",
      attributes.get("planPrinted") !== "false",
      [],
      attributes.get("view3DPrinted") !== "false",
      this.parseOptionalFloat(attributes, "planScale"),
      attributes.get("headerFormat") ?? null,
      attributes.get("footerFormat") ?? null,
    );
  }

  private setCompassAttributes(compass: Compass, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(compass, elementName, attributes);
    const x = this.parseOptionalFloat(attributes, "x");
    if (x !== null) {
      compass.setX(x);
    }
    const y = this.parseOptionalFloat(attributes, "y");
    if (y !== null) {
      compass.setY(y);
    }
    const diameter = this.parseOptionalFloat(attributes, "diameter");
    if (diameter !== null) {
      compass.setDiameter(diameter);
    }
    const northDirection = this.parseOptionalFloat(attributes, "northDirection");
    if (northDirection !== null) {
      compass.setNorthDirection(northDirection);
    }
    const longitude = this.parseOptionalFloat(attributes, "longitude");
    if (longitude !== null) {
      compass.setLongitude(longitude);
    }
    const latitude = this.parseOptionalFloat(attributes, "latitude");
    if (latitude !== null) {
      compass.setLatitude(latitude);
    }
    const timeZone = attributes.get("timeZone");
    if (timeZone !== undefined) {
      compass.setTimeZone(timeZone);
    }
    compass.setVisible(attributes.get("visible") !== "false");
  }

  private createCamera(elementName: string, attributes: Map<string, string>): Camera {
    const id = attributes.get("id");
    const x = this.parseFloat(attributes, "x");
    const y = this.parseFloat(attributes, "y");
    const z = this.parseFloat(attributes, "z");
    const yaw = this.parseFloat(attributes, "yaw");
    const pitch = this.parseFloat(attributes, "pitch");
    const fieldOfView = this.parseFloat(attributes, "fieldOfView");
    if (elementName === "observerCamera") {
      return id !== undefined ? new ObserverCamera(id, x, y, z, yaw, pitch, fieldOfView) : new ObserverCamera(x, y, z, yaw, pitch, fieldOfView);
    }
    return id !== undefined ? new Camera(id, x, y, z, yaw, pitch, fieldOfView) : new Camera(x, y, z, yaw, pitch, fieldOfView);
  }

  private setCameraAttributes(camera: Camera, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(camera, elementName, attributes);
    if (camera instanceof ObserverCamera) {
      camera.setFixedSize(attributes.get("fixedSize") === "true");
    }
    const lens = attributes.get("lens");
    if (lens !== undefined) {
      camera.setLens(lens);
    }
    const time = attributes.get("time");
    if (time !== undefined) {
      camera.setTime(Number.parseInt(time, 10));
    }
    camera.setName(attributes.get("name") ?? null);
    camera.setRenderer(attributes.get("renderer") ?? null);
  }

  private createLevel(elementName: string, attributes: Map<string, string>): Level {
    const id = attributes.get("id");
    const name = attributes.get("name") ?? "";
    const elevation = this.parseFloat(attributes, "elevation");
    const floorThickness = this.parseFloat(attributes, "floorThickness");
    const height = this.parseFloat(attributes, "height");
    return id !== undefined ? new Level(id, name, elevation, floorThickness, height) : new Level(name, elevation, floorThickness, height);
  }

  private setLevelAttributes(level: Level, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(level, elementName, attributes);
    level.setBackgroundImage(this.backgroundImage);
    const elevationIndex = this.parseOptionalInteger(attributes, "elevationIndex");
    if (elevationIndex !== null) {
      level.setElevationIndex(elevationIndex);
    }
    level.setVisible(attributes.get("visible") !== "false");
    level.setViewable(attributes.get("viewable") !== "false");
  }

  private createPieceOfFurniture(elementName: string, attributes: Map<string, string>): HomePieceOfFurniture {
    const id = attributes.get("id");
    const catalogId = attributes.get("catalogId") ?? null;
    const tags = attributes.get("tags") ?? null;
    const elevation = attributes.get("elevation") !== undefined ? this.parseFloat(attributes, "elevation") : 0;
    const dropOnTopElevation = attributes.get("dropOnTopElevation") !== undefined ? this.parseFloat(attributes, "dropOnTopElevation") : 1;
    let modelRotation: number[][] | null = null;
    const modelRotationString = attributes.get("modelRotation");
    if (modelRotationString !== undefined) {
      const values = modelRotationString.split(" ", 9);
      modelRotation = [
        [Number.parseFloat(values[0]!), Number.parseFloat(values[1]!), Number.parseFloat(values[2]!)],
        [Number.parseFloat(values[3]!), Number.parseFloat(values[4]!), Number.parseFloat(values[5]!)],
        [Number.parseFloat(values[6]!), Number.parseFloat(values[7]!), Number.parseFloat(values[8]!)],
      ];
    }
    const name = attributes.get("name") ?? null;
    const description = attributes.get("description") ?? null;
    const information = attributes.get("information") ?? null;
    const license = attributes.get("license") ?? null;
    const creationDate = this.parseOptionalLong(attributes, "creationDate");
    const grade = this.parseOptionalFloat(attributes, "grade");
    const icon = this.parseContent(elementName, attributes, "icon");
    const planIcon = this.parseContent(elementName, attributes, "planIcon");
    const model = this.parseContent(elementName, attributes, "model");
    const width = this.parseFloat(attributes, "width");
    const depth = this.parseFloat(attributes, "depth");
    const height = this.parseFloat(attributes, "height");
    const movable = attributes.get("movable") !== "false";
    let modelFlags = this.parseOptionalInteger(attributes, "modelFlags");
    if (modelFlags === null) {
      modelFlags = attributes.get("backFaceShown") === "true" ? 0x01 : 0;
    }
    const modelSize = this.parseOptionalLong(attributes, "modelSize");
    const creator = attributes.get("creator") ?? null;
    const resizable = attributes.get("resizable") !== "false";
    const deformable = attributes.get("deformable") !== "false";
    const texturable = attributes.get("texturable") !== "false";
    const price = this.parseOptionalDecimal(attributes, "price");
    const valueAddedTaxPercentage = this.parseOptionalDecimal(attributes, "valueAddedTaxPercentage");
    const currency = attributes.get("currency") ?? null;
    let piece: HomePieceOfFurniture;
    if (elementName === "doorOrWindow" || attributes.get("doorOrWindow") === "true") {
      const wallThickness = attributes.get("wallThickness") !== undefined ? this.parseFloat(attributes, "wallThickness") : 1;
      const wallDistance = attributes.get("wallDistance") !== undefined ? this.parseFloat(attributes, "wallDistance") : 0;
      let cutOutShape = attributes.get("cutOutShape") ?? null;
      if (cutOutShape === null && elementName !== "doorOrWindow") {
        cutOutShape = "M0,0 v1 h1 v-1 z";
      }
      const wallCutOutOnBothSides = attributes.get("wallCutOutOnBothSides") === "true";
      const widthDepthDeformable = attributes.get("widthDepthDeformable") !== "false";
      const catalogDoorOrWindow = new CatalogDoorOrWindow(
        catalogId, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
        width, depth, height, elevation, dropOnTopElevation, movable, cutOutShape, wallThickness, wallDistance,
        wallCutOutOnBothSides, widthDepthDeformable, [...this.sashes], modelRotation, modelFlags, modelSize,
        creator, resizable, deformable, texturable, price, valueAddedTaxPercentage, currency,
      );
      piece = id !== undefined ? new HomeDoorOrWindow(id, catalogDoorOrWindow) : new HomeDoorOrWindow(catalogDoorOrWindow);
    } else {
      const staircaseCutOutShape = attributes.get("staircaseCutOutShape") ?? null;
      const horizontallyRotatable = attributes.get("horizontallyRotatable") !== "false";
      if (elementName === "light") {
        const catalogLight = new CatalogLight(
          catalogId, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
          width, depth, height, elevation, dropOnTopElevation, movable, [...this.lightSources],
          [...this.lightSourceMaterialNames], staircaseCutOutShape, modelRotation, modelFlags, modelSize,
          creator, resizable, deformable, texturable, horizontallyRotatable, price, valueAddedTaxPercentage, currency,
        );
        piece = id !== undefined ? new HomeLight(id, catalogLight) : new HomeLight(catalogLight);
      } else if (elementName === "shelfUnit") {
        const catalogShelfUnit = new CatalogShelfUnit(
          catalogId, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
          width, depth, height, elevation, dropOnTopElevation, [...this.shelfElevations], [...this.shelfBoxes],
          movable, staircaseCutOutShape, modelRotation, modelFlags, modelSize, creator, resizable, deformable,
          texturable, horizontallyRotatable, price, valueAddedTaxPercentage, currency,
        );
        piece = id !== undefined ? new HomeShelfUnit(id, catalogShelfUnit) : new HomeShelfUnit(catalogShelfUnit);
      } else {
        const catalogPiece = new CatalogPieceOfFurniture(
          catalogId, name, description, information, license, tags, creationDate, grade, icon, planIcon, model,
          width, depth, height, elevation, dropOnTopElevation, movable, staircaseCutOutShape, modelRotation,
          modelFlags, modelSize, creator, resizable, deformable, texturable, horizontallyRotatable,
          price, valueAddedTaxPercentage, currency,
        );
        piece = id !== undefined ? new HomePieceOfFurniture(id, catalogPiece) : new HomePieceOfFurniture(catalogPiece);
      }
    }
    return piece;
  }

  private createFurnitureGroup(elementName: string, attributes: Map<string, string>, furniture: HomePieceOfFurniture[]): HomeFurnitureGroup {
    const id = attributes.get("id");
    const angle = attributes.get("angle") !== undefined ? this.parseFloat(attributes, "angle") : 0;
    const modelMirrored = attributes.get("modelMirrored") === "true";
    const name = attributes.get("name") ?? "";
    return id !== undefined ? new HomeFurnitureGroup(id, furniture, angle, modelMirrored, name) : new HomeFurnitureGroup(furniture, angle, modelMirrored, name);
  }

  private setPieceOfFurnitureAttributes(piece: HomePieceOfFurniture, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(piece, elementName, attributes);
    piece.setNameStyle(this.textStyles[this.textStyles.length - 1]!.get("nameStyle") ?? null);
    piece.setNameVisible(attributes.get("nameVisible") === "true");
    const nameAngle = this.parseOptionalFloat(attributes, "nameAngle");
    if (nameAngle !== null) {
      piece.setNameAngle(nameAngle);
    }
    const nameXOffset = this.parseOptionalFloat(attributes, "nameXOffset");
    if (nameXOffset !== null) {
      piece.setNameXOffset(nameXOffset);
    }
    const nameYOffset = this.parseOptionalFloat(attributes, "nameYOffset");
    if (nameYOffset !== null) {
      piece.setNameYOffset(nameYOffset);
    }
    piece.setVisible(attributes.get("visible") !== "false");

    if (!(piece instanceof HomeFurnitureGroup)) {
      const x = this.parseOptionalFloat(attributes, "x");
      if (x !== null) {
        piece.setX(x);
      }
      const y = this.parseOptionalFloat(attributes, "y");
      if (y !== null) {
        piece.setY(y);
      }
      const angle = this.parseOptionalFloat(attributes, "angle");
      if (angle !== null) {
        piece.setAngle(angle);
      }
      if (piece.isHorizontallyRotatable()) {
        const pitch = this.parseOptionalFloat(attributes, "pitch");
        if (pitch !== null) {
          piece.setPitch(pitch);
        }
        const roll = this.parseOptionalFloat(attributes, "roll");
        if (roll !== null) {
          piece.setRoll(roll);
        }
      }
      const widthInPlan = this.parseOptionalFloat(attributes, "widthInPlan");
      if (widthInPlan !== null) {
        piece.setWidthInPlan(widthInPlan);
      }
      const depthInPlan = this.parseOptionalFloat(attributes, "depthInPlan");
      if (depthInPlan !== null) {
        piece.setDepthInPlan(depthInPlan);
      }
      const heightInPlan = this.parseOptionalFloat(attributes, "heightInPlan");
      if (heightInPlan !== null) {
        piece.setHeightInPlan(heightInPlan);
      }
      if ((this.home?.getVersion() ?? 7400) < 5500 || attributes.get("modelCenteredAtOrigin") === "false") {
        piece.setModelCenteredAtOrigin(attributes.get("modelRotation") === undefined);
      }
      if (piece.isResizable()) {
        piece.setModelMirrored(attributes.get("modelMirrored") === "true");
      }
      if (piece.isTexturable()) {
        if (this.materials.length > 0) {
          piece.setModelMaterials([...this.materials]);
        }
        const color = this.parseOptionalColor(attributes, "color");
        if (color !== null) {
          piece.setColor(color);
        }
        const texture = this.textures.get(UNIQUE_ATTRIBUTE);
        if (texture !== undefined) {
          piece.setTexture(texture);
        }
        const shininess = this.parseOptionalFloat(attributes, "shininess");
        if (shininess !== null) {
          piece.setShininess(shininess);
        }
      }
      if (piece.isDeformable() && this.transformations.length > 0) {
        piece.setModelTransformations([...this.transformations]);
      }

      if (piece instanceof HomeLight) {
        const power = attributes.get("power");
        if (power !== undefined) {
          piece.setPower(this.parseFloat(attributes, "power"));
        }
      } else if (piece instanceof HomeDoorOrWindow && elementName === "doorOrWindow") {
        piece.setBoundToWall(attributes.get("boundToWall") !== "false");
        const wallWidth = this.parseOptionalFloat(attributes, "wallWidth");
        if (wallWidth !== null) {
          piece.setWallWidth(wallWidth);
        }
        const wallLeft = this.parseOptionalFloat(attributes, "wallLeft");
        if (wallLeft !== null) {
          piece.setWallLeft(wallLeft);
        }
        const wallHeight = this.parseOptionalFloat(attributes, "wallHeight");
        if (wallHeight !== null) {
          piece.setWallHeight(wallHeight);
        }
        const wallTop = this.parseOptionalFloat(attributes, "wallTop");
        if (wallTop !== null) {
          piece.setWallTop(wallTop);
        }
      }
    }
  }

  private createWall(elementName: string, attributes: Map<string, string>): Wall {
    const id = attributes.get("id");
    const xStart = this.parseFloat(attributes, "xStart");
    const yStart = this.parseFloat(attributes, "yStart");
    const xEnd = this.parseFloat(attributes, "xEnd");
    const yEnd = this.parseFloat(attributes, "yEnd");
    const thickness = this.parseFloat(attributes, "thickness");
    return id !== undefined ? new Wall(id, xStart, yStart, xEnd, yEnd, thickness, 0) : new Wall(xStart, yStart, xEnd, yEnd, thickness, 0);
  }

  private setWallAttributes(wall: Wall, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(wall, elementName, attributes);
    wall.setLeftSideBaseboard(this.leftSideBaseboard);
    wall.setRightSideBaseboard(this.rightSideBaseboard);
    wall.setHeight(this.parseOptionalFloat(attributes, "height"));
    wall.setHeightAtEnd(this.parseOptionalFloat(attributes, "heightAtEnd"));
    wall.setArcExtent(this.parseOptionalFloat(attributes, "arcExtent"));
    wall.setTopColor(this.parseOptionalColor(attributes, "topColor"));
    wall.setLeftSideColor(this.parseOptionalColor(attributes, "leftSideColor"));
    wall.setLeftSideTexture(this.textures.get("leftSideTexture") ?? null);
    const leftSideShininess = this.parseOptionalFloat(attributes, "leftSideShininess");
    if (leftSideShininess !== null) {
      wall.setLeftSideShininess(leftSideShininess);
    }
    wall.setRightSideColor(this.parseOptionalColor(attributes, "rightSideColor"));
    wall.setRightSideTexture(this.textures.get("rightSideTexture") ?? null);
    const rightSideShininess = this.parseOptionalFloat(attributes, "rightSideShininess");
    if (rightSideShininess !== null) {
      wall.setRightSideShininess(rightSideShininess);
    }
  }

  private createRoom(elementName: string, attributes: Map<string, string>, points: number[][]): Room {
    const id = attributes.get("id");
    return id !== undefined ? new Room(id, points) : new Room(points);
  }

  private setRoomAttributes(room: Room, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(room, elementName, attributes);
    room.setNameStyle(this.textStyles[this.textStyles.length - 1]!.get("nameStyle") ?? null);
    room.setAreaStyle(this.textStyles[this.textStyles.length - 1]!.get("areaStyle") ?? null);
    room.setName(attributes.get("name") ?? null);
    const nameAngle = this.parseOptionalFloat(attributes, "nameAngle");
    if (nameAngle !== null) {
      room.setNameAngle(nameAngle);
    }
    const nameXOffset = this.parseOptionalFloat(attributes, "nameXOffset");
    if (nameXOffset !== null) {
      room.setNameXOffset(nameXOffset);
    }
    const nameYOffset = this.parseOptionalFloat(attributes, "nameYOffset");
    if (nameYOffset !== null) {
      room.setNameYOffset(nameYOffset);
    }
    room.setAreaVisible(attributes.get("areaVisible") === "true");
    const areaAngle = this.parseOptionalFloat(attributes, "areaAngle");
    if (areaAngle !== null) {
      room.setAreaAngle(areaAngle);
    }
    const areaXOffset = this.parseOptionalFloat(attributes, "areaXOffset");
    if (areaXOffset !== null) {
      room.setAreaXOffset(areaXOffset);
    }
    const areaYOffset = this.parseOptionalFloat(attributes, "areaYOffset");
    if (areaYOffset !== null) {
      room.setAreaYOffset(areaYOffset);
    }
    room.setFloorVisible(attributes.get("floorVisible") !== "false");
    room.setFloorColor(this.parseOptionalColor(attributes, "floorColor"));
    room.setFloorTexture(this.textures.get("floorTexture") ?? null);
    const floorShininess = this.parseOptionalFloat(attributes, "floorShininess");
    if (floorShininess !== null) {
      room.setFloorShininess(floorShininess);
    }
    room.setCeilingVisible(attributes.get("ceilingVisible") !== "false");
    room.setCeilingColor(this.parseOptionalColor(attributes, "ceilingColor"));
    room.setCeilingTexture(this.textures.get("ceilingTexture") ?? null);
    const ceilingShininess = this.parseOptionalFloat(attributes, "ceilingShininess");
    if (ceilingShininess !== null) {
      room.setCeilingShininess(ceilingShininess);
    }
    room.setCeilingFlat(attributes.get("ceilingFlat") === "true");
  }

  private createPolyline(elementName: string, attributes: Map<string, string>, points: number[][]): Polyline {
    const id = attributes.get("id");
    return id !== undefined ? new Polyline(id, points) : new Polyline(points);
  }

  private setPolylineAttributes(polyline: Polyline, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(polyline, elementName, attributes);
    const thickness = this.parseOptionalFloat(attributes, "thickness");
    if (thickness !== null) {
      polyline.setThickness(thickness);
    }
    const capStyle = attributes.get("capStyle");
    if (capStyle !== undefined) {
      polyline.setCapStyle(capStyle);
    }
    const joinStyle = attributes.get("joinStyle");
    if (joinStyle !== undefined) {
      polyline.setJoinStyle(joinStyle);
    }
    const dashStyle = attributes.get("dashStyle");
    if (dashStyle !== undefined) {
      polyline.setDashStyle(dashStyle);
    }
    const dashPattern = attributes.get("dashPattern");
    if (dashPattern !== undefined) {
      polyline.setDashPattern(dashPattern.split(" ").map((v) => Number.parseFloat(v)));
    }
    const dashOffset = this.parseOptionalFloat(attributes, "dashOffset");
    if (dashOffset !== null) {
      polyline.setDashOffset(dashOffset);
    }
    const startArrowStyle = attributes.get("startArrowStyle");
    if (startArrowStyle !== undefined) {
      polyline.setStartArrowStyle(startArrowStyle);
    }
    const endArrowStyle = attributes.get("endArrowStyle");
    if (endArrowStyle !== undefined) {
      polyline.setEndArrowStyle(endArrowStyle);
    }
    const elevation = this.parseOptionalFloat(attributes, "elevation");
    if (elevation !== null) {
      polyline.setVisibleIn3D(true);
      polyline.setElevation(elevation);
    }
    const color = this.parseOptionalColor(attributes, "color");
    if (color !== null) {
      polyline.setColor(color);
    }
    polyline.setClosedPath(attributes.get("closedPath") === "true");
  }

  private createDimensionLine(elementName: string, attributes: Map<string, string>): DimensionLine {
    const id = attributes.get("id");
    const xStart = this.parseFloat(attributes, "xStart");
    const yStart = this.parseFloat(attributes, "yStart");
    const elevationStart = this.parseOptionalFloat(attributes, "elevationStart") ?? 0;
    const xEnd = this.parseFloat(attributes, "xEnd");
    const yEnd = this.parseFloat(attributes, "yEnd");
    const elevationEnd = this.parseOptionalFloat(attributes, "elevationEnd") ?? 0;
    const offset = this.parseFloat(attributes, "offset");
    const dimensionLine =
      id !== undefined
        ? new DimensionLine(id, xStart, yStart, elevationStart, xEnd, yEnd, elevationEnd, offset)
        : new DimensionLine(xStart, yStart, elevationStart, xEnd, yEnd, elevationEnd, offset);
    const endMarkSize = this.parseOptionalFloat(attributes, "endMarkSize");
    if (endMarkSize !== null) {
      dimensionLine.setEndMarkSize(endMarkSize);
    }
    const pitch = this.parseOptionalFloat(attributes, "pitch");
    if (pitch !== null) {
      dimensionLine.setPitch(pitch);
    }
    const color = this.parseOptionalColor(attributes, "color");
    if (color !== null) {
      dimensionLine.setColor(color);
    }
    dimensionLine.setVisibleIn3D(attributes.get("visibleIn3D") === "true");
    return dimensionLine;
  }

  private setDimensionLineAttributes(dimensionLine: DimensionLine, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(dimensionLine, elementName, attributes);
    dimensionLine.setLengthStyle(this.textStyles[this.textStyles.length - 1]!.get("lengthStyle") ?? null);
  }

  private createLabel(elementName: string, attributes: Map<string, string>, text: string): Label {
    const id = attributes.get("id");
    const x = this.parseFloat(attributes, "x");
    const y = this.parseFloat(attributes, "y");
    return id !== undefined ? new Label(id, text, x, y) : new Label(text, x, y);
  }

  private setLabelAttributes(label: Label, elementName: string, attributes: Map<string, string>): void {
    this.setProperties(label, elementName, attributes);
    label.setStyle(this.textStyles[this.textStyles.length - 1]!.get(UNIQUE_ATTRIBUTE) ?? null);
    const angle = this.parseOptionalFloat(attributes, "angle");
    if (angle !== null) {
      label.setAngle(angle);
    }
    const elevation = this.parseOptionalFloat(attributes, "elevation");
    if (elevation !== null) {
      label.setElevation(elevation);
    }
    const pitch = this.parseOptionalFloat(attributes, "pitch");
    if (pitch !== null) {
      label.setPitch(pitch);
    }
    label.setColor(this.parseOptionalColor(attributes, "color"));
    label.setOutlineColor(this.parseOptionalColor(attributes, "outlineColor"));
  }

  private createBaseboard(elementName: string, attributes: Map<string, string>): Baseboard {
    return new Baseboard(
      this.parseFloat(attributes, "thickness"),
      this.parseFloat(attributes, "height"),
      this.parseOptionalColor(attributes, "color"),
      this.textures.get(UNIQUE_ATTRIBUTE) ?? null,
    );
  }

  private createTextStyle(elementName: string, attributes: Map<string, string>): TextStyle {
    let alignment: string = TextStyle.Alignment.CENTER;
    const alignmentString = attributes.get("alignment");
    if (alignmentString !== undefined) {
      alignment = alignmentString;
    }
    return new TextStyle(
      attributes.get("fontName") ?? null,
      this.parseFloat(attributes, "fontSize"),
      attributes.get("bold") === "true",
      attributes.get("italic") === "true",
      alignment,
    );
  }

  private createTexture(elementName: string, attributes: Map<string, string>): HomeTexture {
    const catalogId = attributes.get("catalogId") ?? null;
    const catalogTexture = new CatalogTexture(
      catalogId,
      attributes.get("name") ?? null,
      this.parseContent(elementName, attributes, "image"),
      this.parseFloat(attributes, "width"),
      this.parseFloat(attributes, "height"),
      attributes.get("creator") ?? null,
    );
    return new HomeTexture(
      catalogTexture,
      attributes.get("xOffset") !== undefined ? this.parseFloat(attributes, "xOffset") : 0,
      attributes.get("yOffset") !== undefined ? this.parseFloat(attributes, "yOffset") : 0,
      attributes.get("angle") !== undefined ? this.parseFloat(attributes, "angle") : 0,
      attributes.get("scale") !== undefined ? this.parseFloat(attributes, "scale") : 1,
      attributes.get("fittingArea") === "true",
      attributes.get("leftToRightOriented") !== "false",
    );
  }

  private createMaterial(elementName: string, attributes: Map<string, string>): HomeMaterial {
    return new HomeMaterial(
      attributes.get("name") ?? "",
      attributes.get("key") ?? null,
      this.parseOptionalColor(attributes, "color"),
      this.materialTexture,
      this.parseOptionalFloat(attributes, "shininess"),
    );
  }

  private setProperties(object: HomeObject, elementName: string, attributes: Map<string, string>): void {
    const props = this.properties[this.properties.length - 1];
    if (props !== undefined) {
      for (const [name, value] of props) {
        object.setProperty(name, value);
      }
    }
  }

  // ----------------------------------------------------------------- parsing

  private parseOptionalColor(attributes: Map<string, string>, name: string): number | null {
    const color = attributes.get(name);
    if (color !== undefined) {
      return Number.parseInt(color, 16) | 0;
    }
    return null;
  }

  private parseOptionalInteger(attributes: Map<string, string>, name: string): number | null {
    const value = attributes.get(name);
    return value !== undefined ? Number.parseInt(value, 10) : null;
  }

  private parseOptionalLong(attributes: Map<string, string>, name: string): number | null {
    const value = attributes.get(name);
    return value !== undefined ? Number.parseInt(value, 10) : null;
  }

  private parseOptionalDecimal(attributes: Map<string, string>, name: string): number | null {
    const value = attributes.get(name);
    return value !== undefined ? Number.parseFloat(value) : null;
  }

  private parseOptionalFloat(attributes: Map<string, string>, name: string): number | null {
    const value = attributes.get(name);
    return value !== undefined ? f32(Number.parseFloat(value)) : null;
  }

  private parseFloat(attributes: Map<string, string>, name: string): number {
    const value = attributes.get(name);
    if (value === undefined) {
      throw new Error(`Missing float attribute ${name}`);
    }
    return f32(Number.parseFloat(value));
  }

  private parseContent(elementName: string, attributes: Map<string, string>, attributeName: string): Content | null {
    const contentFile = attributes.get(attributeName);
    if (contentFile !== undefined) {
      if (this.contentContext !== null) {
        return this.contentContext.lookupContent(contentFile);
      }
      // Without a container context, content files resolve to nothing meaningful;
      // throw like Java's "Missing URL base" for now.
      throw new Error(`Missing URL base for content ${contentFile}`);
    }
    return null;
  }

  private setHome(home: Home): void {
    this.home = home;
    this.homeElementName = this.elements[this.elements.length - 1]!;
  }

  getHome(): Home {
    return this.home!;
  }
}

// Keep the HomeRecorder type import referenced for parity with the Java enum.
export type { HomeRecorder };
