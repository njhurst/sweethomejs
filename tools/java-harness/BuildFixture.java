import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.eteks.sweethome3d.io.ContentRecording;
import com.eteks.sweethome3d.io.DefaultHomeOutputStream;
import com.eteks.sweethome3d.io.DefaultUserPreferences;
import com.eteks.sweethome3d.io.HomeFileRecorder;
import com.eteks.sweethome3d.model.Camera;
import com.eteks.sweethome3d.model.CatalogDoorOrWindow;
import com.eteks.sweethome3d.model.CatalogLight;
import com.eteks.sweethome3d.model.CatalogPieceOfFurniture;
import com.eteks.sweethome3d.model.Compass;
import com.eteks.sweethome3d.model.DimensionLine;
import com.eteks.sweethome3d.model.FurnitureCatalog;
import com.eteks.sweethome3d.model.FurnitureCategory;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.HomeDoorOrWindow;
import com.eteks.sweethome3d.model.HomeEnvironment;
import com.eteks.sweethome3d.model.HomeFurnitureGroup;
import com.eteks.sweethome3d.model.HomeLight;
import com.eteks.sweethome3d.model.HomePieceOfFurniture;
import com.eteks.sweethome3d.model.HomeShelfUnit;
import com.eteks.sweethome3d.model.Label;
import com.eteks.sweethome3d.model.Level;
import com.eteks.sweethome3d.model.ObserverCamera;
import com.eteks.sweethome3d.model.Polyline;
import com.eteks.sweethome3d.model.Room;
import com.eteks.sweethome3d.model.ShelfUnit;
import com.eteks.sweethome3d.model.UserPreferences;
import com.eteks.sweethome3d.model.Wall;

/**
 * BuildFixture — golden-corpus fixture generator (task 1.6).
 *
 * Programmatically builds feature-covering homes with the real Sweet Home 3D
 * model classes and saves them through the real io codec, so every fixture is
 * a genuine .sh3d produced by upstream code.
 *
 * Usage: java BuildFixture <outputDir>
 */
public class BuildFixture {
  private static UserPreferences preferences;
  private static FurnitureCatalog catalog;

  public static void main(String[] args) throws Exception {
    if (args.length != 1) {
      System.err.println("Usage: java BuildFixture <outputDir>");
      System.exit(2);
    }
    File outputDir = new File(args[0]);
    outputDir.mkdirs();
    preferences = new DefaultUserPreferences();
    catalog = preferences.getFurnitureCatalog();
    System.out.println("Catalog categories: " + catalog.getCategoriesCount());

    buildWalls(new File(outputDir, "walls.sh3d"));
    buildRooms(new File(outputDir, "rooms.sh3d"));
    buildFurniture(new File(outputDir, "furniture.sh3d"));
    buildLevels(new File(outputDir, "levels.sh3d"));
    buildDimensionsLabels(new File(outputDir, "dimensions-labels.sh3d"));
    buildCameras(new File(outputDir, "cameras.sh3d"));
    buildEnvironment(new File(outputDir, "environment.sh3d"));
    buildBig(new File(outputDir, "big.sh3d"));
    buildSerializedOnly(new File(outputDir, "serialized-only.sh3d"));
    System.out.println("Built fixtures in " + outputDir);
  }

  private static void save(Home home, String name, File file) throws Exception {
    home.setName(name);
    new HomeFileRecorder(4, false, preferences, true, true).writeHome(home, file.getPath());
    System.out.println("  wrote " + file.getName()
        + " (" + home.getFurniture().size() + " furniture, "
        + home.getWalls().size() + " walls, "
        + home.getRooms().size() + " rooms, "
        + home.getLevels().size() + " levels)");
  }

  private static void buildWalls(File file) throws Exception {
    Home home = new Home(250);
    // Straight wall
    home.addWall(new Wall(0, 0, 400, 0, 12));
    // Connected wall chain (wallAtStart/End)
    Wall w2 = new Wall(400, 0, 400, 300, 12);
    home.addWall(w2);
    Wall w3 = new Wall(400, 300, 100, 300, 12);
    w3.setWallAtStart(w2);
    home.addWall(w3);
    // Arc wall
    Wall arc = new Wall(100, 0, 0, 200, 20);
    arc.setArcExtent(90f);
    home.addWall(arc);
    // Different heights + baseboards
    Wall tall = new Wall(500, 0, 700, 0, 15);
    tall.setHeight(300f);
    tall.setHeightAtEnd(240f);
    tall.setLeftSideBaseboard(new com.eteks.sweethome3d.model.Baseboard(10f, 12f, 0x8B4513, null));
    tall.setRightSideBaseboard(new com.eteks.sweethome3d.model.Baseboard(12f, 12f, 0x696969, null));
    home.addWall(tall);
    save(home, "walls", file);
  }

  private static void buildRooms(File file) throws Exception {
    Home home = new Home(250);
    // Simple rectangular room
    home.addRoom(new Room(new float[][] {{0, 0}, {400, 0}, {400, 300}, {0, 300}}));
    // Concave room
    home.addRoom(new Room(new float[][] {{500, 0}, {900, 0}, {900, 400}, {700, 400}, {700, 200}, {500, 200}}));
    // Room with color + visible area
    Room textured = new Room(new float[][] {{0, 400}, {400, 400}, {400, 700}, {0, 700}});
    textured.setFloorColor(0xE0C9A0);
    textured.setAreaVisible(true);
    home.addRoom(textured);
    save(home, "rooms", file);
  }

  private static void buildFurniture(File file) throws Exception {
    Home home = new Home(250);
    List<HomePieceOfFurniture> pieces = new ArrayList<HomePieceOfFurniture>();
    int placed = 0;
    for (FurnitureCategory category : catalog.getCategories()) {
      for (CatalogPieceOfFurniture piece : category.getFurniture()) {
        if (placed >= 12) break;
        if (piece instanceof CatalogDoorOrWindow || piece instanceof CatalogLight) continue;
        HomePieceOfFurniture homePiece = new HomePieceOfFurniture(piece);
        homePiece.setX(50 + placed * 80);
        homePiece.setY(50 + (placed % 3) * 100);
        if (placed % 2 == 0) {
          homePiece.setAngle((float)Math.toRadians(45));
        }
        homePiece.setModelMirrored(placed % 4 == 0);
        pieces.add(homePiece);
        placed++;
      }
      if (placed >= 12) break;
    }
    for (HomePieceOfFurniture piece : pieces) {
      home.addPieceOfFurniture(piece);
    }
    // A door in a wall
    Wall wall = new Wall(0, 0, 600, 0, 20);
    home.addWall(wall);
    for (FurnitureCategory category : catalog.getCategories()) {
      for (CatalogPieceOfFurniture piece : category.getFurniture()) {
        if (piece instanceof CatalogDoorOrWindow) {
          HomeDoorOrWindow door = new HomeDoorOrWindow((CatalogDoorOrWindow)piece);
          door.setX(300);
          door.setY(0);
          door.setWallThickness(20);
          door.setWallDistance(10);
          home.addPieceOfFurniture(door);
          break;
        }
      }
    }
    // A light
    for (FurnitureCategory category : catalog.getCategories()) {
      for (CatalogPieceOfFurniture piece : category.getFurniture()) {
        if (piece instanceof CatalogLight) {
          home.addPieceOfFurniture(new HomeLight((CatalogLight)piece));
          break;
        }
      }
    }
    // A shelf unit if the catalog has one
    for (FurnitureCategory category : catalog.getCategories()) {
      for (CatalogPieceOfFurniture piece : category.getFurniture()) {
        if (piece instanceof ShelfUnit) {
          home.addPieceOfFurniture(new HomeShelfUnit((ShelfUnit)piece));
          break;
        }
      }
    }
    // A group of the first two pieces
    if (pieces.size() >= 2) {
      HomeFurnitureGroup group = new HomeFurnitureGroup(
          new ArrayList<HomePieceOfFurniture>(Arrays.asList(pieces.get(0), pieces.get(1))),
          "Test group");
      home.addPieceOfFurniture(group);
    }
    save(home, "furniture", file);
  }

  private static void buildLevels(File file) throws Exception {
    Home home = new Home(250);
    Level ground = new Level("Ground floor", 0, 20, 250);
    Level first = new Level("First floor", 280, 20, 250);
    Level attic = new Level("Attic", 560, 15, 220);
    home.addLevel(ground);
    home.addLevel(first);
    home.addLevel(attic);
    // A wall on each level
    Wall w1 = new Wall(0, 0, 300, 0, 12);
    w1.setLevel(ground);
    home.addWall(w1);
    Wall w2 = new Wall(0, 0, 300, 0, 12);
    w2.setLevel(first);
    home.addWall(w2);
    Wall w3 = new Wall(0, 0, 300, 0, 12);
    w3.setLevel(attic);
    home.addWall(w3);
    save(home, "levels", file);
  }

  private static void buildDimensionsLabels(File file) throws Exception {
    Home home = new Home(250);
    home.addDimensionLine(new DimensionLine(0, 0, 400, 0, 50));
    home.addDimensionLine(new DimensionLine(0, 50, 0, 400, 30));
    // Length style 1 (with memo text style)
    DimensionLine styled = new DimensionLine(100, 100, 500, 100, 40);
    styled.setLengthStyle(new com.eteks.sweethome3d.model.TextStyle(8));
    home.addDimensionLine(styled);
    // Labels
    home.addLabel(new Label("Living room", 200, 150));
    home.addLabel(new Label("Kitchen", 400, 500));
    // Polylines: solid, dashed, with arrows, closed
    home.addPolyline(new Polyline(new float[][] {{0, 600}, {100, 650}, {200, 600}}, 10f, Polyline.CapStyle.ROUND,
        Polyline.JoinStyle.ROUND, Polyline.DashStyle.SOLID, 0f, Polyline.ArrowStyle.DELTA,
        Polyline.ArrowStyle.OPEN, false, 0x000000));
    home.addPolyline(new Polyline(new float[][] {{300, 600}, {400, 650}, {500, 600}}, 6f, Polyline.CapStyle.BUTT,
        Polyline.JoinStyle.BEVEL, Polyline.DashStyle.DASH, 0f, Polyline.ArrowStyle.NONE,
        Polyline.ArrowStyle.NONE, true, 0x0000FF));
    save(home, "dimensions-labels", file);
  }

  private static void buildCameras(File file) throws Exception {
    Home home = new Home(250);
    ObserverCamera observer = new ObserverCamera(200, 150, 175, (float)Math.toRadians(30),
        (float)Math.toRadians(10), (float)Math.toRadians(63));
    home.getObserverCamera().setCamera(observer);
    Camera top = new Camera(200, 150, 1000, 0, (float)Math.toRadians(-90), (float)Math.toRadians(63));
    home.getTopCamera().setCamera(top);
    home.setStoredCameras(new ArrayList<Camera>(Arrays.asList(
        new Camera(100, 100, 500, (float)Math.toRadians(45), (float)Math.toRadians(-20), (float)Math.toRadians(63)),
        new Camera(300, 200, 600, (float)Math.toRadians(-45), (float)Math.toRadians(-15), (float)Math.toRadians(63)))));
    // Camera path
    home.getEnvironment().setVideoCameraPath(new ArrayList<Camera>(Arrays.asList(
        new Camera(0, 0, 300, 0, (float)Math.toRadians(-10), (float)Math.toRadians(63)),
        new Camera(400, 0, 300, 0, (float)Math.toRadians(-10), (float)Math.toRadians(63)),
        new Camera(400, 400, 300, (float)Math.toRadians(90), (float)Math.toRadians(-10), (float)Math.toRadians(63)))));
    save(home, "cameras", file);
  }

  private static void buildEnvironment(File file) throws Exception {
    Home home = new Home(250);
    HomeEnvironment env = home.getEnvironment();
    env.setSkyColor(0x87CEEB);
    env.setGroundColor(0x8B8B6B);
    env.setLightColor(0xFFF8DC);
    env.setCeillingLightColor(0xFFFFFF);
    env.setWallsAlpha(0.5f);
    env.setDrawingMode(HomeEnvironment.DrawingMode.FILL_AND_OUTLINE);
    env.setAllLevelsVisible(true);
    home.getCompass().setX(200);
    home.getCompass().setY(150);
    home.getCompass().setDiameter(100);
    home.getCompass().setNorthDirection((float)Math.toRadians(-25));
    home.getCompass().setLatitude((float)Math.toRadians(48.8566));
    home.getCompass().setLongitude((float)Math.toRadians(2.3522));
    home.getCompass().setTimeZone("GMT+1");
    home.getEnvironment().setObserverCameraElevationAdjusted(false);
    save(home, "environment", file);
  }

  private static void buildBig(File file) throws Exception {
    Home home = new Home(250);
    // Find one simple piece to clone 1000 times
    CatalogPieceOfFurniture template = null;
    outer:
    for (FurnitureCategory category : catalog.getCategories()) {
      for (CatalogPieceOfFurniture piece : category.getFurniture()) {
        if (!(piece instanceof CatalogDoorOrWindow) && !(piece instanceof CatalogLight)) {
          template = piece;
          break outer;
        }
      }
    }
    if (template != null) {
      for (int i = 0; i < 1000; i++) {
        HomePieceOfFurniture piece = new HomePieceOfFurniture(template);
        piece.setX((i % 50) * 30);
        piece.setY((i / 50) * 30);
        home.addPieceOfFurniture(piece);
      }
    }
    save(home, "big", file);
  }

  private static void buildSerializedOnly(File file) throws Exception {
    Home home = new Home(250);
    home.addWall(new Wall(0, 0, 300, 0, 12));
    home.addWall(new Wall(300, 0, 300, 200, 12));
    home.setName("serialized-only");
    // Write only the serialized "Home" entry, no Home.xml entry
    DefaultHomeOutputStream out = new DefaultHomeOutputStream(
        new FileOutputStream(file), 4, ContentRecording.INCLUDE_ALL_CONTENT, true, null);
    out.writeHome(home);
    out.close();
    System.out.println("  wrote " + file.getName() + " (serialized Home entry only)");
  }
}
