/**
 * Port of com.eteks.sweethome3d.io.HomeXMLExporter / ObjectXMLExporter
 * (GPL v2+). Writes a Home object graph to the canonical Home.xml format.
 */
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
import { TextStyle } from "../model/TextStyle.js";
import { Wall } from "../model/Wall.js";
import type { Content } from "../model/Content.js";

import { Transformation } from "../model/ModelInterfaces.js";
import { Baseboard, LightSource, ObjectProperty, Sash } from "../model/ValueClasses.js";
import { formatFloat } from "../util/f32.js";
import { XMLWriter } from "./XMLWriter.js";

/** Computes the Java getTag: simple class name, "Home" prefix removed, first letter lowercased. */
export function getTag(object: object): string {
  const name = object.constructor.name;
  let tagName = name;
  if (tagName.startsWith("Home") && tagName !== "Home") {
    tagName = tagName.slice(4);
  }
  return tagName.charAt(0).toLowerCase() + tagName.slice(1);
}

/** Port of the Java floatToString helper: -1/0/1 printed without decimals. */
function floatToString(f: number): string {
  if (Math.abs(f) < 1e-6) {
    return "0";
  } else if (Math.abs(f - 1) < 1e-6) {
    return "1";
  } else if (Math.abs(f + 1) < 1e-6) {
    return "-1";
  }
  return formatFloat(f);
}

function matrixToString(matrix: number[][]): string {
  return matrix
    .flat()
    .map(floatToString)
    .join(" ");
}

export class HomeXMLExporter {
  private savedContentNames = new Map<Content, string>();
  private savedContentNameResolver: ((content: Content) => string | null) | null = null;
  private levelIds = new Map<Level, string>();
  private wallIds = new Map<Wall, string>();

  /** Assigns zip entry names to contents (order matters for byte parity). */
  setSavedContentNames(savedContentNames: Map<Content, string>): void {
    this.savedContentNames = savedContentNames;
  }

  /** Lazily assigns entry names during traversal (used by HomeFileRecorder). */
  setSavedContentNameResolver(resolver: (content: Content) => string | null): void {
    this.savedContentNameResolver = resolver;
  }

  getId(object: object): string | null {
    if (object instanceof Level) {
      return this.levelIds.get(object) ?? null;
    }
    if (object instanceof Wall) {
      return this.wallIds.get(object) ?? null;
    }
    return null;
  }

  getExportedContentName(content: Content | null): string | null {
    if (content === null) {
      return null;
    }
    const contentName = this.savedContentNames.get(content);
    if (contentName !== undefined) {
      return contentName;
    }
    if (this.savedContentNameResolver !== null) {
      const resolved = this.savedContentNameResolver(content);
      if (resolved !== null) {
        return resolved;
      }
    }
    return content.getURL();
  }

  writeHome(writer: XMLWriter, home: Home): void {
    // Store level and wall ids for references
    for (const level of home.getLevels()) {
      this.levelIds.set(level, level.getId());
    }
    for (const wall of home.getWalls()) {
      this.wallIds.set(wall, wall.getId());
    }
    this.writeElement(writer, home);
  }

  private writeElement(writer: XMLWriter, object: object): void {
    writer.writeStartElement(getTag(object));
    this.writeAttributes(writer, object);
    this.writeChildren(writer, object);
    writer.writeEndElement();
  }

  private writeAttributes(writer: XMLWriter, object: object): void {
    if (object instanceof Home) {
      const homeObj = object;
      homeObj.setVersion(Home.CURRENT_VERSION);
      writer.writeAttribute("version", String(homeObj.getVersion()));
      writer.writeAttribute("name", homeObj.getName() ?? null);
      writer.writeAttribute("camera", homeObj.getCamera() === homeObj.getObserverCamera() ? "observerCamera" : "topCamera");
      const selectedLevelId = this.getId(homeObj.getSelectedLevel()!);
      if (selectedLevelId !== null) {
        writer.writeAttribute("selectedLevel", selectedLevelId);
      }
      writer.writeFloatAttribute("wallHeight", homeObj.getWallHeight());
      writer.writeBooleanAttribute("basePlanLocked", homeObj.isBasePlanLocked(), false);
      if (homeObj.getFurnitureSortedPropertyName() !== null) {
        writer.writeAttribute("furnitureSortedProperty", homeObj.getFurnitureSortedPropertyName()!);
      }
      writer.writeBooleanAttribute("furnitureDescendingSorted", homeObj.isFurnitureDescendingSorted(), false);
    } else if (object instanceof HomeEnvironment) {
      this.writeEnvironmentAttributes(writer, object);
    } else if (object instanceof BackgroundImage) {
      writer.writeAttribute("image", this.getExportedContentName(object.getImage()), null);
      writer.writeFloatAttribute("scaleDistance", object.getScaleDistance());
      writer.writeFloatAttribute("scaleDistanceXStart", object.getScaleDistanceXStart());
      writer.writeFloatAttribute("scaleDistanceYStart", object.getScaleDistanceYStart());
      writer.writeFloatAttribute("scaleDistanceXEnd", object.getScaleDistanceXEnd());
      writer.writeFloatAttribute("scaleDistanceYEnd", object.getScaleDistanceYEnd());
      writer.writeFloatAttribute("xOrigin", object.getXOrigin(), 0);
      writer.writeFloatAttribute("yOrigin", object.getYOrigin(), 0);
      writer.writeBooleanAttribute("visible", object.isVisible(), true);
    } else if (object instanceof HomePrint) {
      writer.writeAttribute("headerFormat", object.getHeaderFormat(), null);
      writer.writeAttribute("footerFormat", object.getFooterFormat(), null);
      writer.writeBooleanAttribute("furniturePrinted", object.isFurniturePrinted(), true);
      writer.writeBooleanAttribute("planPrinted", object.isPlanPrinted(), true);
      writer.writeBooleanAttribute("view3DPrinted", object.isView3DPrinted(), true);
      writer.writeFloatAttribute("planScale", object.getPlanScale());
      writer.writeFloatAttribute("paperWidth", object.getPaperWidth());
      writer.writeFloatAttribute("paperHeight", object.getPaperHeight());
      writer.writeFloatAttribute("paperTopMargin", object.getPaperTopMargin());
      writer.writeFloatAttribute("paperLeftMargin", object.getPaperLeftMargin());
      writer.writeFloatAttribute("paperBottomMargin", object.getPaperBottomMargin());
      writer.writeFloatAttribute("paperRightMargin", object.getPaperRightMargin());
      writer.writeAttribute("paperOrientation", object.getPaperOrientation());
    } else if (object instanceof Compass) {
      writer.writeFloatAttribute("x", object.getX());
      writer.writeFloatAttribute("y", object.getY());
      writer.writeFloatAttribute("diameter", object.getDiameter());
      writer.writeFloatAttribute("northDirection", object.getNorthDirection());
      writer.writeFloatAttribute("longitude", object.getLongitude());
      writer.writeFloatAttribute("latitude", object.getLatitude());
      writer.writeAttribute("timeZone", object.getTimeZone() ?? null);
      writer.writeBooleanAttribute("visible", object.isVisible(), true);
    } else if (object instanceof Camera) {
      this.writeCameraAttributes(writer, object);
    } else if (object instanceof Level) {
      writer.writeAttribute("id", object.getId());
      writer.writeAttribute("name", object.getName());
      writer.writeFloatAttribute("elevation", object.getElevation());
      writer.writeFloatAttribute("floorThickness", object.getFloorThickness());
      writer.writeFloatAttribute("height", object.getHeight());
      writer.writeIntegerAttribute("elevationIndex", object.getElevationIndex());
      writer.writeBooleanAttribute("visible", object.isVisible(), true);
      writer.writeBooleanAttribute("viewable", object.isViewable(), true);
    } else if (object instanceof HomePieceOfFurniture) {
      this.writePieceAttributes(writer, object);
    } else if (object instanceof Wall) {
      this.writeWallAttributes(writer, object);
    } else if (object instanceof Room) {
      this.writeRoomAttributes(writer, object);
    } else if (object instanceof Polyline) {
      this.writePolylineAttributes(writer, object);
    } else if (object instanceof DimensionLine) {
      writer.writeAttribute("id", object.getId());
      if (object.getLevel() !== null) {
        writer.writeAttribute("level", this.getId(object.getLevel()!)!);
      }
      writer.writeFloatAttribute("xStart", object.getXStart());
      writer.writeFloatAttribute("yStart", object.getYStart());
      writer.writeFloatAttribute("elevationStart", object.getElevationStart(), 0);
      writer.writeFloatAttribute("xEnd", object.getXEnd());
      writer.writeFloatAttribute("yEnd", object.getYEnd());
      writer.writeFloatAttribute("elevationEnd", object.getElevationEnd(), 0);
      writer.writeFloatAttribute("offset", object.getOffset());
      writer.writeFloatAttribute("endMarkSize", object.getEndMarkSize(), 10);
      writer.writeFloatAttribute("pitch", object.getPitch(), 0);
      writer.writeColorAttribute("color", object.getColor());
      writer.writeBooleanAttribute("visibleIn3D", object.isVisibleIn3D(), false);
    } else if (object instanceof Label) {
      writer.writeAttribute("id", object.getId());
      if (object.getLevel() !== null) {
        writer.writeAttribute("level", this.getId(object.getLevel()!)!);
      }
      writer.writeFloatAttribute("x", object.getX());
      writer.writeFloatAttribute("y", object.getY());
      writer.writeFloatAttribute("angle", object.getAngle(), 0);
      writer.writeFloatAttribute("elevation", object.getElevation(), 0);
      writer.writeFloatAttribute("pitch", object.getPitch());
      writer.writeColorAttribute("color", object.getColor());
      writer.writeColorAttribute("outlineColor", object.getOutlineColor());
    } else if (object instanceof TextStyle) {
      this.writeTextStyleAttributes(writer, object);
    } else if (object instanceof Baseboard) {
      writer.writeFloatAttribute("thickness", object.getThickness());
      writer.writeFloatAttribute("height", object.getHeight());
      writer.writeColorAttribute("color", object.getColor());
    } else if (object instanceof HomeTexture) {
      this.writeTextureAttributes(writer, object);
    } else if (object instanceof HomeMaterial) {
      writer.writeAttribute("name", object.getName());
      writer.writeAttribute("key", object.getKey(), null);
      writer.writeColorAttribute("color", object.getColor());
      writer.writeFloatAttribute("shininess", object.getShininess() ?? 0);
    }
  }

  private writeChildren(writer: XMLWriter, object: object): void {
    if (object instanceof Home) {
      this.writeHomeChildren(writer, object);
    } else if (object instanceof HomeEnvironment) {
      this.writeProperties(writer, object);
      if (object.getVideoCameraPath().length > 0) {
        for (const camera of object.getVideoCameraPath()) {
          this.writeCamera(writer, camera, "cameraPath");
        }
      }
      this.writeTexture(writer, object.getGroundTexture(), "groundTexture");
      this.writeTexture(writer, object.getSkyTexture(), "skyTexture");
    } else if (object instanceof HomePrint) {
      const printedLevels = object.getPrintedLevels();
      if (printedLevels.length > 0) {
        for (const level of printedLevels) {
          writer.writeStartElement("printedLevel");
          writer.writeAttribute("level", this.getId(level)!);
          writer.writeEndElement();
        }
      }
    } else if (object instanceof Camera) {
      this.writeProperties(writer, object);
    } else if (object instanceof Level) {
      this.writeProperties(writer, object);
      if (object.getBackgroundImage() !== null) {
        this.writeBackgroundImage(writer, object.getBackgroundImage()!);
      }
    } else if (object instanceof HomePieceOfFurniture) {
      this.writePieceChildren(writer, object);
    } else if (object instanceof Wall) {
      this.writeProperties(writer, object);
      this.writeTexture(writer, object.getLeftSideTexture(), "leftSideTexture");
      this.writeTexture(writer, object.getRightSideTexture(), "rightSideTexture");
      this.writeBaseboard(writer, object.getLeftSideBaseboard(), "leftSideBaseboard");
      this.writeBaseboard(writer, object.getRightSideBaseboard(), "rightSideBaseboard");
    } else if (object instanceof Room) {
      this.writeProperties(writer, object);
      this.writeTextStyle(writer, object.getNameStyle(), "nameStyle");
      this.writeTextStyle(writer, object.getAreaStyle(), "areaStyle");
      this.writeTexture(writer, object.getFloorTexture(), "floorTexture");
      this.writeTexture(writer, object.getCeilingTexture(), "ceilingTexture");
      for (const point of object.getPoints()) {
        writer.writeStartElement("point");
        writer.writeFloatAttribute("x", point[0]!);
        writer.writeFloatAttribute("y", point[1]!);
        writer.writeEndElement();
      }
    } else if (object instanceof Polyline) {
      this.writeProperties(writer, object);
      for (const point of object.getPoints()) {
        writer.writeStartElement("point");
        writer.writeFloatAttribute("x", point[0]!);
        writer.writeFloatAttribute("y", point[1]!);
        writer.writeEndElement();
      }
    } else if (object instanceof DimensionLine) {
      this.writeProperties(writer, object);
      this.writeTextStyle(writer, object.getLengthStyle(), "lengthStyle");
    } else if (object instanceof Label) {
      this.writeProperties(writer, object);
      this.writeTextStyle(writer, object.getStyle(), null);
      writer.writeStartElement("text");
      writer.writeText(object.getText());
      writer.writeEndElement();
    } else if (object instanceof Baseboard) {
      this.writeTexture(writer, object.getTexture(), null);
    } else if (object instanceof HomeMaterial) {
      this.writeTexture(writer, object.getTexture(), null);
    }
  }

  private writeHomeChildren(writer: XMLWriter, home: Home): void {
    const propertiesNames = [...home.getPropertyNames()].sort();
    for (const propertyName of propertiesNames) {
      this.writeProperty(writer, propertyName, home.getProperty(propertyName)!, false);
    }
    for (const property of home.getFurnitureVisiblePropertyNames()) {
      writer.writeStartElement("furnitureVisibleProperty");
      writer.writeAttribute("name", property);
      writer.writeEndElement();
    }
    this.writeEnvironment(writer, home.getEnvironment());
    this.writeBackgroundImage(writer, home.getBackgroundImage());
    this.writePrint(writer, home.getPrint());
    this.writeCompass(writer, home.getCompass());
    this.writeCamera(writer, home.getObserverCamera(), "observerCamera");
    this.writeCamera(writer, home.getTopCamera(), "topCamera");
    for (const camera of home.getStoredCameras()) {
      this.writeCamera(writer, camera, "storedCamera");
    }
    for (const level of home.getLevels()) {
      this.writeLevel(writer, level);
    }
    for (const piece of home.getFurniture()) {
      this.writePiece(writer, piece);
    }
    for (const wall of home.getWalls()) {
      this.writeWall(writer, wall);
    }
    for (const room of home.getRooms()) {
      this.writeRoom(writer, room);
    }
    for (const polyline of home.getPolylines()) {
      this.writePolyline(writer, polyline);
    }
    for (const dimensionLine of home.getDimensionLines()) {
      this.writeDimensionLine(writer, dimensionLine);
    }
    for (const label of home.getLabels()) {
      this.writeLabel(writer, label);
    }
  }

  // ---------------------------------------------------------------- writers

  private writeEnvironment(writer: XMLWriter, environment: HomeEnvironment): void {
    writer.writeStartElement("environment");
    this.writeEnvironmentAttributes(writer, environment);
    this.writeProperties(writer, environment);
    if (environment.getVideoCameraPath().length > 0) {
      for (const camera of environment.getVideoCameraPath()) {
        this.writeCamera(writer, camera, "cameraPath");
      }
    }
    this.writeTexture(writer, environment.getGroundTexture(), "groundTexture");
    this.writeTexture(writer, environment.getSkyTexture(), "skyTexture");
    writer.writeEndElement();
  }

  private writeEnvironmentAttributes(writer: XMLWriter, environment: HomeEnvironment): void {
    writer.writeColorAttribute("groundColor", environment.getGroundColor());
    writer.writeBooleanAttribute("backgroundImageVisibleOnGround3D", environment.isBackgroundImageVisibleOnGround3D(), false);
    writer.writeColorAttribute("skyColor", environment.getSkyColor());
    writer.writeColorAttribute("lightColor", environment.getLightColor());
    writer.writeFloatAttribute("wallsAlpha", environment.getWallsAlpha(), 0);
    writer.writeBooleanAttribute("allLevelsVisible", environment.isAllLevelsVisible(), false);
    writer.writeBooleanAttribute("observerCameraElevationAdjusted", environment.isObserverCameraElevationAdjusted(), true);
    writer.writeColorAttribute("ceillingLightColor", environment.getCeillingLightColor());
    writer.writeAttribute("drawingMode", environment.getDrawingMode(), HomeEnvironment.DrawingMode.FILL);
    writer.writeFloatAttribute("subpartSizeUnderLight", environment.getSubpartSizeUnderLight(), 0);
    writer.writeIntegerAttribute("photoWidth", environment.getPhotoWidth());
    writer.writeIntegerAttribute("photoHeight", environment.getPhotoHeight());
    const photoAspectRatio = environment.getPhotoAspectRatio();
    if (photoAspectRatio !== null) {
      writer.writeAttribute("photoAspectRatio", photoAspectRatio);
    }
    writer.writeIntegerAttribute("photoQuality", environment.getPhotoQuality());
    writer.writeIntegerAttribute("videoWidth", environment.getVideoWidth());
    const videoAspectRatio = environment.getVideoAspectRatio();
    if (videoAspectRatio !== null) {
      writer.writeAttribute("videoAspectRatio", videoAspectRatio);
    }
    writer.writeIntegerAttribute("videoQuality", environment.getVideoQuality());
    writer.writeFloatAttribute("videoSpeed", environment.getVideoSpeed(), 2400 / 3600);
    writer.writeIntegerAttribute("videoFrameRate", environment.getVideoFrameRate());
  }

  private writeBackgroundImage(writer: XMLWriter, backgroundImage: BackgroundImage | null): void {
    if (backgroundImage !== null) {
      writer.writeStartElement("backgroundImage");
      this.writeAttributes(writer, backgroundImage);
      writer.writeEndElement();
    }
  }

  private writePrint(writer: XMLWriter, print: HomePrint | null): void {
    if (print !== null) {
      writer.writeStartElement("print");
      this.writeAttributes(writer, print);
      this.writeChildren(writer, print);
      writer.writeEndElement();
    }
  }

  private writeCompass(writer: XMLWriter, compass: Compass): void {
    writer.writeStartElement("compass");
    this.writeAttributes(writer, compass);
    this.writeProperties(writer, compass);
    writer.writeEndElement();
  }

  private writeCamera(writer: XMLWriter, camera: Camera, attributeName: string): void {
    writer.writeStartElement(getTag(camera));
    writer.writeAttribute("attribute", attributeName, null);
    if (attributeName !== "observerCamera" && attributeName !== "topCamera") {
      writer.writeAttribute("id", camera.getId());
    }
    this.writeCameraAttributes(writer, camera);
    this.writeProperties(writer, camera);
    writer.writeEndElement();
  }

  private writeCameraAttributes(writer: XMLWriter, camera: Camera): void {
    writer.writeAttribute("name", camera.getName() ?? null);
    writer.writeAttribute("lens", camera.getLens());
    writer.writeFloatAttribute("x", camera.getX());
    writer.writeFloatAttribute("y", camera.getY());
    writer.writeFloatAttribute("z", camera.getZ());
    writer.writeFloatAttribute("yaw", camera.getYaw());
    writer.writeFloatAttribute("pitch", camera.getPitch());
    writer.writeFloatAttribute("fieldOfView", camera.getFieldOfView());
    writer.writeLongAttribute("time", camera.getTime());
    if (camera instanceof ObserverCamera) {
      writer.writeBooleanAttribute("fixedSize", camera.isFixedSize(), false);
    }
    writer.writeAttribute("renderer", camera.getRenderer() ?? null);
  }

  private writeLevel(writer: XMLWriter, level: Level): void {
    writer.writeStartElement("level");
    this.writeAttributes(writer, level);
    this.writeProperties(writer, level);
    if (level.getBackgroundImage() !== null) {
      this.writeBackgroundImage(writer, level.getBackgroundImage()!);
    }
    writer.writeEndElement();
  }

  private writePiece(writer: XMLWriter, piece: HomePieceOfFurniture): void {
    writer.writeStartElement(getTag(piece));
    this.writePieceAttributes(writer, piece);
    this.writePieceChildren(writer, piece);
    writer.writeEndElement();
  }

  private writePieceAttributes(writer: XMLWriter, piece: HomePieceOfFurniture): void {
    writer.writeAttribute("id", piece.getId());
    if (piece.getLevel() !== null) {
      writer.writeAttribute("level", this.getId(piece.getLevel()!)!);
    }
    writer.writeAttribute("catalogId", piece.getCatalogId(), null);
    writer.writeAttribute("name", piece.getName() ?? null);
    writer.writeAttribute("creator", piece.getCreator(), null);
    writer.writeAttribute("model", this.getExportedContentName(piece.getModel()), null);
    writer.writeAttribute("icon", this.getExportedContentName(piece.getIcon()), null);
    writer.writeAttribute("planIcon", this.getExportedContentName(piece.getPlanIcon()), null);
    writer.writeFloatAttribute("x", piece.getX());
    writer.writeFloatAttribute("y", piece.getY());
    writer.writeFloatAttribute("elevation", piece.getElevation(), 0);
    writer.writeFloatAttribute("angle", piece.getAngle(), 0);
    writer.writeFloatAttribute("pitch", piece.getPitch(), 0);
    writer.writeFloatAttribute("roll", piece.getRoll(), 0);
    writer.writeFloatAttribute("width", piece.getWidth());
    writer.writeFloatAttribute("widthInPlan", piece.getWidthInPlan(), piece.getWidth());
    writer.writeFloatAttribute("depth", piece.getDepth());
    writer.writeFloatAttribute("depthInPlan", piece.getDepthInPlan(), piece.getDepth());
    writer.writeFloatAttribute("height", piece.getHeight());
    writer.writeFloatAttribute("heightInPlan", piece.getHeightInPlan(), piece.getHeight());
    writer.writeIntegerAttribute("modelFlags", piece.getModelFlags(), 0);
    writer.writeBooleanAttribute("modelMirrored", piece.isModelMirrored(), false);
    writer.writeBooleanAttribute("visible", piece.isVisible(), true);
    writer.writeColorAttribute("color", piece.getColor());
    if (piece.getShininess() !== null) {
      writer.writeFloatAttribute("shininess", piece.getShininess()!);
    }
    writer.writeAttribute("modelRotation", matrixToString(piece.getModelRotation()), "1 0 0 0 1 0 0 0 1");
    writer.writeBooleanAttribute("modelCenteredAtOrigin", piece.isModelCenteredAtOrigin(), true);
    writer.writeLongAttributeNullable("modelSize", piece.getModelSize());
    writer.writeAttribute("description", piece.getDescription(), null);
    writer.writeAttribute("information", piece.getInformation(), null);
    writer.writeAttribute("license", piece.getLicense(), null);
    writer.writeBooleanAttribute("movable", piece.isMovable(), true);
    if (!(piece instanceof HomeFurnitureGroup)) {
      if (!(piece instanceof HomeDoorOrWindow)) {
        writer.writeBooleanAttribute("doorOrWindow", piece.isDoorOrWindow(), false);
        writer.writeBooleanAttribute("horizontallyRotatable", piece.isHorizontallyRotatable(), true);
      }
      writer.writeBooleanAttribute("resizable", piece.isResizable(), true);
      writer.writeBooleanAttribute("deformable", piece.isDeformable(), true);
      writer.writeBooleanAttribute("texturable", piece.isTexturable(), true);
    }
    if (piece instanceof HomeFurnitureGroup) {
      let price = piece.getPrice();
      for (const groupPiece of piece.getFurniture()) {
        if (groupPiece.getPrice() !== null) {
          price = null;
          break;
        }
      }
      writer.writeBigDecimalAttribute("price", price);
    } else {
      writer.writeBigDecimalAttribute("price", piece.getPrice());
      writer.writeBigDecimalAttribute("valueAddedTaxPercentage", piece.getValueAddedTaxPercentage());
      writer.writeAttribute("currency", piece.getCurrency(), null);
    }
    writer.writeAttribute("staircaseCutOutShape", piece.getStaircaseCutOutShape(), null);
    writer.writeFloatAttribute("dropOnTopElevation", piece.getDropOnTopElevation(), 1);
    writer.writeBooleanAttribute("nameVisible", piece.isNameVisible(), false);
    writer.writeFloatAttribute("nameAngle", piece.getNameAngle(), 0);
    writer.writeFloatAttribute("nameXOffset", piece.getNameXOffset(), 0);
    writer.writeFloatAttribute("nameYOffset", piece.getNameYOffset(), 0);
    if (piece instanceof HomeDoorOrWindow) {
      writer.writeFloatAttribute("wallThickness", piece.getWallThickness(), 1);
      writer.writeFloatAttribute("wallDistance", piece.getWallDistance(), 0);
      writer.writeFloatAttribute("wallWidth", piece.getWallWidth(), 1);
      writer.writeFloatAttribute("wallLeft", piece.getWallLeft(), 0);
      writer.writeFloatAttribute("wallHeight", piece.getWallHeight(), 1);
      writer.writeFloatAttribute("wallTop", piece.getWallTop(), 0);
      writer.writeAttribute("cutOutShape", piece.getCutOutShape(), null);
      writer.writeBooleanAttribute("wallCutOutOnBothSides", piece.isWallCutOutOnBothSides(), false);
      writer.writeBooleanAttribute("widthDepthDeformable", piece.isWidthDepthDeformable(), true);
      writer.writeBooleanAttribute("boundToWall", piece.isBoundToWall(), true);
    } else if (piece instanceof HomeLight) {
      writer.writeFloatAttribute("power", piece.getPower());
    }
  }

  private writePieceChildren(writer: XMLWriter, piece: HomePieceOfFurniture): void {
    if (piece instanceof HomeFurnitureGroup) {
      for (const groupPiece of piece.getFurniture()) {
        this.writePiece(writer, groupPiece);
      }
    } else if (piece instanceof HomeLight) {
      for (const lightSource of piece.getLightSources()) {
        writer.writeStartElement("lightSource");
        writer.writeFloatAttribute("x", lightSource.getX());
        writer.writeFloatAttribute("y", lightSource.getY());
        writer.writeFloatAttribute("z", lightSource.getZ());
        writer.writeColorAttribute("color", lightSource.getColor());
        writer.writeFloatAttribute("diameter", lightSource.getDiameter() ?? 0);
        writer.writeEndElement();
      }
      for (const name of piece.getLightSourceMaterialNames()) {
        writer.writeStartElement("lightSourceMaterial");
        writer.writeAttribute("name", name);
        writer.writeEndElement();
      }
    } else if (piece instanceof HomeDoorOrWindow) {
      for (const sash of piece.getSashes()) {
        writer.writeStartElement("sash");
        writer.writeFloatAttribute("xAxis", sash.getXAxis());
        writer.writeFloatAttribute("yAxis", sash.getYAxis());
        writer.writeFloatAttribute("width", sash.getWidth());
        writer.writeFloatAttribute("startAngle", sash.getStartAngle());
        writer.writeFloatAttribute("endAngle", sash.getEndAngle());
        writer.writeEndElement();
      }
    } else if (piece instanceof HomeShelfUnit) {
      for (const elevation of piece.getShelfElevations()) {
        writer.writeStartElement("shelf");
        writer.writeFloatAttribute("elevation", elevation);
        writer.writeEndElement();
      }
      for (const box of piece.getShelfBoxes() as Array<number[]>) {
        writer.writeStartElement("shelf");
        writer.writeFloatAttribute("xLower", box[0]!);
        writer.writeFloatAttribute("yLower", box[1]!);
        writer.writeFloatAttribute("zLower", box[2]!);
        writer.writeFloatAttribute("xUpper", box[3]!);
        writer.writeFloatAttribute("yUpper", box[4]!);
        writer.writeFloatAttribute("zUpper", box[5]!);
        writer.writeEndElement();
      }
    }

    this.writeProperties(writer, piece);
    this.writeTextStyle(writer, piece.getNameStyle(), "nameStyle");
    this.writeTexture(writer, piece.getTexture(), null);
    if (piece.getModelMaterials() !== null) {
      for (const material of piece.getModelMaterials()!) {
        this.writeMaterial(writer, material);
      }
    }
    if (piece.getModelTransformations() !== null) {
      for (const transformation of piece.getModelTransformations()!) {
        writer.writeStartElement("transformation");
        writer.writeAttribute("name", transformation.getName(), null);
        writer.writeAttribute("matrix", matrixToString(transformation.getMatrix()));
        writer.writeEndElement();
      }
    }
  }

  private writeMaterial(writer: XMLWriter, material: HomeMaterial): void {
    writer.writeStartElement("material");
    writer.writeAttribute("name", material.getName());
    writer.writeAttribute("key", material.getKey(), null);
    writer.writeColorAttribute("color", material.getColor());
    writer.writeFloatAttribute("shininess", material.getShininess() ?? 0);
    this.writeTexture(writer, material.getTexture(), null);
    writer.writeEndElement();
  }

  private writeWall(writer: XMLWriter, wall: Wall): void {
    writer.writeStartElement("wall");
    this.writeWallAttributes(writer, wall);
    this.writeProperties(writer, wall);
    this.writeTexture(writer, wall.getLeftSideTexture(), "leftSideTexture");
    this.writeTexture(writer, wall.getRightSideTexture(), "rightSideTexture");
    this.writeBaseboard(writer, wall.getLeftSideBaseboard(), "leftSideBaseboard");
    this.writeBaseboard(writer, wall.getRightSideBaseboard(), "rightSideBaseboard");
    writer.writeEndElement();
  }

  private writeWallAttributes(writer: XMLWriter, wall: Wall): void {
    writer.writeAttribute("id", wall.getId());
    if (wall.getLevel() !== null) {
      writer.writeAttribute("level", this.getId(wall.getLevel()!)!);
    }
    if (wall.getWallAtStart() !== null) {
      const id = this.getId(wall.getWallAtStart()!);
      if (id !== null) {
        writer.writeAttribute("wallAtStart", id);
      }
    }
    if (wall.getWallAtEnd() !== null) {
      const id = this.getId(wall.getWallAtEnd()!);
      if (id !== null) {
        writer.writeAttribute("wallAtEnd", id);
      }
    }
    writer.writeFloatAttribute("xStart", wall.getXStart());
    writer.writeFloatAttribute("yStart", wall.getYStart());
    writer.writeFloatAttribute("xEnd", wall.getXEnd());
    writer.writeFloatAttribute("yEnd", wall.getYEnd());
    writer.writeFloatAttribute("height", wall.getHeight());
    writer.writeFloatAttribute("heightAtEnd", wall.getHeightAtEnd());
    writer.writeFloatAttribute("thickness", wall.getThickness());
    writer.writeFloatAttribute("arcExtent", wall.getArcExtent());
    writer.writeColorAttribute("topColor", wall.getTopColor());
    writer.writeColorAttribute("leftSideColor", wall.getLeftSideColor());
    writer.writeFloatAttribute("leftSideShininess", wall.getLeftSideShininess(), 0);
    writer.writeColorAttribute("rightSideColor", wall.getRightSideColor());
    writer.writeFloatAttribute("rightSideShininess", wall.getRightSideShininess(), 0);
  }

  private writeRoom(writer: XMLWriter, room: Room): void {
    writer.writeStartElement("room");
    this.writeRoomAttributes(writer, room);
    this.writeChildren(writer, room);
    writer.writeEndElement();
  }

  private writeRoomAttributes(writer: XMLWriter, room: Room): void {
    writer.writeAttribute("id", room.getId());
    if (room.getLevel() !== null) {
      writer.writeAttribute("level", this.getId(room.getLevel()!)!);
    }
    writer.writeAttribute("name", room.getName(), null);
    writer.writeFloatAttribute("nameAngle", room.getNameAngle(), 0);
    writer.writeFloatAttribute("nameXOffset", room.getNameXOffset(), 0);
    writer.writeFloatAttribute("nameYOffset", room.getNameYOffset(), -40);
    writer.writeBooleanAttribute("areaVisible", room.isAreaVisible(), false);
    writer.writeFloatAttribute("areaAngle", room.getAreaAngle(), 0);
    writer.writeFloatAttribute("areaXOffset", room.getAreaXOffset(), 0);
    writer.writeFloatAttribute("areaYOffset", room.getAreaYOffset(), 0);
    writer.writeBooleanAttribute("floorVisible", room.isFloorVisible(), true);
    writer.writeColorAttribute("floorColor", room.getFloorColor());
    writer.writeFloatAttribute("floorShininess", room.getFloorShininess(), 0);
    writer.writeBooleanAttribute("ceilingVisible", room.isCeilingVisible(), true);
    writer.writeColorAttribute("ceilingColor", room.getCeilingColor());
    writer.writeFloatAttribute("ceilingShininess", room.getCeilingShininess(), 0);
    writer.writeBooleanAttribute("ceilingFlat", room.isCeilingFlat(), false);
  }

  private writePolyline(writer: XMLWriter, polyline: Polyline): void {
    writer.writeStartElement("polyline");
    this.writePolylineAttributes(writer, polyline);
    this.writeProperties(writer, polyline);
    for (const point of polyline.getPoints()) {
      writer.writeStartElement("point");
      writer.writeFloatAttribute("x", point[0]!);
      writer.writeFloatAttribute("y", point[1]!);
      writer.writeEndElement();
    }
    writer.writeEndElement();
  }

  private writePolylineAttributes(writer: XMLWriter, polyline: Polyline): void {
    writer.writeAttribute("id", polyline.getId());
    if (polyline.getLevel() !== null) {
      writer.writeAttribute("level", this.getId(polyline.getLevel()!)!);
    }
    writer.writeFloatAttribute("thickness", polyline.getThickness(), 1);
    writer.writeAttribute("capStyle", polyline.getCapStyle(), Polyline.CapStyle.BUTT);
    writer.writeAttribute("joinStyle", polyline.getJoinStyle(), Polyline.JoinStyle.MITER);
    writer.writeAttribute("dashStyle", polyline.getDashStyle(), Polyline.DashStyle.SOLID);
    if (polyline.getDashStyle() === Polyline.DashStyle.CUSTOMIZED && polyline.getDashPattern() !== null) {
      writer.writeAttribute("dashPattern", polyline.getDashPattern()!.map(floatToString).join(" "));
    }
    writer.writeFloatAttribute("dashOffset", polyline.getDashOffset(), 0);
    writer.writeAttribute("startArrowStyle", polyline.getStartArrowStyle(), Polyline.ArrowStyle.NONE);
    writer.writeAttribute("endArrowStyle", polyline.getEndArrowStyle(), Polyline.ArrowStyle.NONE);
    if (polyline.isVisibleIn3D()) {
      writer.writeFloatAttribute("elevation", polyline.getElevation());
    }
    writer.writeColorAttribute("color", polyline.getColor());
    writer.writeBooleanAttribute("closedPath", polyline.isClosedPath(), false);
  }

  private writeDimensionLine(writer: XMLWriter, dimensionLine: DimensionLine): void {
    writer.writeStartElement("dimensionLine");
    this.writeAttributes(writer, dimensionLine);
    this.writeProperties(writer, dimensionLine);
    this.writeTextStyle(writer, dimensionLine.getLengthStyle(), "lengthStyle");
    writer.writeEndElement();
  }

  private writeLabel(writer: XMLWriter, label: Label): void {
    writer.writeStartElement("label");
    this.writeAttributes(writer, label);
    this.writeProperties(writer, label);
    this.writeTextStyle(writer, label.getStyle(), null);
    writer.writeStartElement("text");
    writer.writeText(label.getText());
    writer.writeEndElement();
    writer.writeEndElement();
  }

  private writeTextStyle(writer: XMLWriter, textStyle: TextStyle | null, attributeName: string | null): void {
    if (textStyle !== null) {
      writer.writeStartElement("textStyle");
      this.writeTextStyleAttributes(writer, textStyle, attributeName);
      writer.writeEndElement();
    }
  }

  private writeTextStyleAttributes(writer: XMLWriter, textStyle: TextStyle, attributeName?: string | null): void {
    if (attributeName !== null && attributeName !== undefined) {
      writer.writeAttribute("attribute", attributeName, null);
    }
    writer.writeAttribute("fontName", textStyle.getFontName(), null);
    writer.writeFloatAttribute("fontSize", textStyle.getFontSize());
    writer.writeBooleanAttribute("bold", textStyle.isBold(), false);
    writer.writeBooleanAttribute("italic", textStyle.isItalic(), false);
    writer.writeAttribute("alignment", textStyle.getAlignment() ?? TextStyle.Alignment.CENTER, TextStyle.Alignment.CENTER);
  }

  private writeBaseboard(writer: XMLWriter, baseboard: Baseboard | null, attributeName: string | null): void {
    if (baseboard !== null) {
      writer.writeStartElement("baseboard");
      writer.writeAttribute("attribute", attributeName, null);
      writer.writeFloatAttribute("thickness", baseboard.getThickness());
      writer.writeFloatAttribute("height", baseboard.getHeight());
      writer.writeColorAttribute("color", baseboard.getColor());
      this.writeTexture(writer, baseboard.getTexture(), null);
      writer.writeEndElement();
    }
  }

  private writeTexture(writer: XMLWriter, texture: HomeTexture | null, attributeName: string | null): void {
    if (texture !== null) {
      writer.writeStartElement("texture");
      writer.writeAttribute("attribute", attributeName, null);
      this.writeTextureAttributes(writer, texture);
      writer.writeEndElement();
    }
  }

  private writeTextureAttributes(writer: XMLWriter, texture: HomeTexture): void {
    writer.writeAttribute("name", texture.getName(), null);
    writer.writeAttribute("creator", texture.getCreator(), null);
    writer.writeAttribute("catalogId", texture.getCatalogId(), null);
    writer.writeFloatAttribute("width", texture.getWidth());
    writer.writeFloatAttribute("height", texture.getHeight());
    writer.writeFloatAttribute("xOffset", texture.getXOffset(), 0);
    writer.writeFloatAttribute("yOffset", texture.getYOffset(), 0);
    writer.writeFloatAttribute("angle", texture.getAngle(), 0);
    writer.writeFloatAttribute("scale", texture.getScale(), 1);
    writer.writeBooleanAttribute("fittingArea", texture.isFittingArea(), false);
    writer.writeBooleanAttribute("leftToRightOriented", texture.isLeftToRightOriented(), true);
    writer.writeAttribute("image", this.getExportedContentName(texture.getImage()), null);
  }

  private writeProperties(writer: XMLWriter, object: HomeObject): void {
    const propertiesNames = [...object.getPropertyNames()].sort();
    for (const propertyName of propertiesNames) {
      const propertyContent = object.isContentProperty(propertyName);
      const value = propertyContent ? object.getContentProperty(propertyName) : object.getProperty(propertyName);
      if (value !== null) {
        this.writeProperty(writer, propertyName, propertyContent ? this.getExportedContentName(value as Content)! : String(value), propertyContent);
      }
    }
  }

  private writeProperty(writer: XMLWriter, propertyName: string, propertyValue: string, content: boolean): void {
    writer.writeStartElement("property");
    writer.writeAttribute("name", propertyName);
    writer.writeAttribute("value", propertyValue);
    if (content) {
      writer.writeAttribute("type", (ObjectProperty.Type.CONTENT as unknown as string));
    }
    writer.writeEndElement();
  }
}

