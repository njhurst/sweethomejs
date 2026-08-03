/*
 * HomeController.ts.ts
 *
 * Translated from Sweet Home 3D HomeController.java.java
 * Sweet Home 3D, Copyright (c) 2024 Space Mushrooms <info@sweethome3d.com>
 * TypeScript translation Copyright (c) 2026 SweetHomeJS contributors
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * Porting notes:
 *   - Keep method names identical to the Java source so upstream fixes map 1:1.
 *   - Mark every float-narrowing point with f32() (see docs/05-file-format.md).
 *   - Update this file's row in TRANSLATION.md when porting status changes.
 */

/**
 * HomeController (port of com.eteks.sweethome3d.viewcontroller.HomeController, GPL v2+).
 * The master controller of a home: owns the sub-controllers, enables/disables
 * the view actions, and implements the file/edit/level/camera operations.
 *
 * Dialog-controller methods (modifyWall, modifyRoom, ...) are stubbed until
 * task 4.4 ports them; PlanController/HomeController3D are forward stubs
 * until tasks 4.3/4.6.
 */
import type { Controller } from "./Controller.js";
import type { View } from "./View.js";
import { HomeView } from "./HomeView.js";
import type { ViewFactory } from "./ViewFactory.js";
import { ContentManager } from "./ContentManager.js";
import { LocalizedUndoableEdit } from "./LocalizedUndoableEdit.js";
import { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { UndoManager } from "./undo/UndoManager.js";
import type { UndoableEdit } from "./undo/UndoableEdit.js";
import { CompoundEdit } from "./undo/CompoundEdit.js";
import { FurnitureController } from "./FurnitureController.js";
import { FurnitureCatalogController } from "./FurnitureCatalogController.js";
import { PlanController } from "./PlanController.js";
import { HomeController3D } from "./HomeController3D.js";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import { HomeApplication, HomeRecorder, RecorderException } from "../model/ModelInterfaces.js";
import type { Selectable } from "../model/Selectable.js";
import { HomeFileRecorder } from "../io/HomeFileRecorder.js";
import { Wall } from "../model/Wall.js";
import { Room } from "../model/Room.js";
import { DimensionLine } from "../model/DimensionLine.js";
import { Label } from "../model/Label.js";
import { Polyline } from "../model/Polyline.js";
import { WallController } from "./WallController.js";
import { RoomController } from "./RoomController.js";
import { DimensionLineController } from "./DimensionLineController.js";
import { LabelController } from "./LabelController.js";
import { PolylineController } from "./PolylineController.js";
import { CompassController } from "./CompassController.js";
import { Home3DAttributesController } from "./Home3DAttributesController.js";
import { ObserverCameraController } from "./ObserverCameraController.js";

export class HomeController implements Controller {
  protected readonly home: Home;
  protected readonly preferences: UserPreferences;
  protected readonly viewFactory: ViewFactory;
  protected readonly contentManager: ContentManager | null;
  protected readonly application: HomeApplication | null;
  protected readonly undoSupport: UndoableEditSupport;
  protected readonly undoManager = new UndoManager();
  protected homeView: HomeView | null = null;
  protected focusedView: View | null = null;
  private furnitureCatalogController: FurnitureCatalogController | null = null;
  private furnitureController: FurnitureController | null = null;
  private planController: PlanController | null = null;
  private homeController3D: HomeController3D | null = null;
  private saveUndoLevel = 0;
  private notUndoableModifications = false;

  constructor(home: Home, application: HomeApplication, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, contentManager?: ContentManager | null);
  constructor(
    home: Home,
    applicationOrPreferences: HomeApplication | UserPreferences,
    viewFactory: ViewFactory,
    contentManager: ContentManager | null = null,
  ) {
    this.home = home;
    this.viewFactory = viewFactory;
    this.contentManager = contentManager;
    if (applicationOrPreferences instanceof HomeApplication) {
      this.application = applicationOrPreferences;
      this.preferences = applicationOrPreferences.getUserPreferences();
    } else {
      this.application = null;
      this.preferences = applicationOrPreferences as UserPreferences;
    }

    this.undoSupport = new (class extends UndoableEditSupport {
      override _postEdit(edit: UndoableEdit): void {
        // Ignore not significant compound edits
        if (!(edit instanceof CompoundEdit) || edit.isSignificant()) {
          super._postEdit(edit);
        }
      }
    })(this);
    this.undoSupport.addUndoableEditListener(this.undoManager);
    this.notUndoableModifications = home.isModified();

    // Update recent homes list
    const homeName0 = home.getName();
    if (homeName0 !== null) {
      const recentHomes = this.preferences.getRecentHomes().filter((name) => name !== homeName0);
      recentHomes.unshift(homeName0);
      this.updateUserPreferencesRecentHomes(recentHomes);
    }
  }

  // ------------------------------------------------------------------ views

  getView(): HomeView {
    if (this.homeView === null) {
      this.homeView = this.viewFactory.createHomeView(this.home, this.preferences, this) as HomeView;
      this.addListeners();
      this.enableDefaultActions(this.homeView);
    }
    return this.homeView;
  }

  getFurnitureCatalogController(): FurnitureCatalogController {
    if (this.furnitureCatalogController === null) {
      this.furnitureCatalogController = new FurnitureCatalogController(
        this.preferences.getFurnitureCatalog(), this.preferences, this.viewFactory, this.contentManager,
      );
    }
    return this.furnitureCatalogController;
  }

  getFurnitureController(): FurnitureController {
    if (this.furnitureController === null) {
      this.furnitureController = new FurnitureController(
        this.home, this.preferences, this.viewFactory, this.contentManager, this.getUndoableEditSupport(),
      );
    }
    return this.furnitureController;
  }

  getPlanController(): PlanController {
    if (this.planController === null) {
      this.planController = new PlanController(
        this.home, this.preferences, this.viewFactory, this.contentManager, this.getUndoableEditSupport(),
      );
    }
    return this.planController;
  }

  getHomeController3D(): HomeController3D {
    if (this.homeController3D === null) {
      this.homeController3D = new HomeController3D(
        this.home, this.getPlanController(), this.preferences, this.viewFactory, this.contentManager, this.getUndoableEditSupport(),
      );
    }
    return this.homeController3D;
  }

  protected getUndoableEditSupport(): UndoableEditSupport {
    return this.undoSupport;
  }

  setFocusedView(focusedView: View): void {
    this.focusedView = focusedView;
    this.enableActionsBoundToSelection();
  }

  getFocusedView(): View | null {
    return this.focusedView;
  }

  // --------------------------------------------------------------- actions

  private enableDefaultActions(homeView: HomeView): void {
    const applicationExists = this.application !== null;
    const set = (action: HomeView.ActionType, enabled: boolean): void => homeView.setEnabled(action, enabled);
    const setEnabled = (action: HomeView.ActionType): void => set(action, true);

    set(HomeView.ActionType.NEW_HOME, applicationExists);
    set(HomeView.ActionType.NEW_HOME_FROM_EXAMPLE, applicationExists);
    set(HomeView.ActionType.OPEN, applicationExists);
    set(HomeView.ActionType.DELETE_RECENT_HOMES, applicationExists && this.preferences.getRecentHomes().length > 0);
    set(HomeView.ActionType.CLOSE, applicationExists);
    set(HomeView.ActionType.SAVE, applicationExists);
    set(HomeView.ActionType.SAVE_AS, applicationExists);
    set(HomeView.ActionType.SAVE_AND_COMPRESS, applicationExists);
    setEnabled(HomeView.ActionType.PAGE_SETUP);
    setEnabled(HomeView.ActionType.PRINT_PREVIEW);
    setEnabled(HomeView.ActionType.PRINT);
    setEnabled(HomeView.ActionType.PRINT_TO_PDF);
    setEnabled(HomeView.ActionType.PREFERENCES);
    set(HomeView.ActionType.EXIT, applicationExists);
    setEnabled(HomeView.ActionType.IMPORT_FURNITURE);
    setEnabled(HomeView.ActionType.IMPORT_FURNITURE_LIBRARY);
    setEnabled(HomeView.ActionType.IMPORT_TEXTURE);
    setEnabled(HomeView.ActionType.IMPORT_TEXTURES_LIBRARY);
    setEnabled(HomeView.ActionType.SORT_HOME_FURNITURE_BY_DESCENDING_ORDER);
    setEnabled(HomeView.ActionType.EXPORT_TO_CSV);
    setEnabled(HomeView.ActionType.SELECT);
    setEnabled(HomeView.ActionType.PAN);
    setEnabled(HomeView.ActionType.LOCK_BASE_PLAN);
    setEnabled(HomeView.ActionType.UNLOCK_BASE_PLAN);
    setEnabled(HomeView.ActionType.ENABLE_MAGNETISM);
    setEnabled(HomeView.ActionType.DISABLE_MAGNETISM);
    setEnabled(HomeView.ActionType.MODIFY_COMPASS);
    setEnabled(HomeView.ActionType.ZOOM_IN);
    setEnabled(HomeView.ActionType.ZOOM_OUT);
    setEnabled(HomeView.ActionType.EXPORT_TO_SVG);
    setEnabled(HomeView.ActionType.VIEW_FROM_TOP);
    setEnabled(HomeView.ActionType.VIEW_FROM_OBSERVER);
    set(HomeView.ActionType.MODIFY_OBSERVER, this.home.getCamera() === this.home.getObserverCamera());
    setEnabled(HomeView.ActionType.STORE_POINT_OF_VIEW);
    const emptyStoredCameras = this.home.getStoredCameras().length === 0;
    set(HomeView.ActionType.DELETE_POINTS_OF_VIEW, !emptyStoredCameras);
    set(HomeView.ActionType.CREATE_PHOTOS_AT_POINTS_OF_VIEW, !emptyStoredCameras);
    setEnabled(HomeView.ActionType.DETACH_3D_VIEW);
    setEnabled(HomeView.ActionType.ATTACH_3D_VIEW);
    setEnabled(HomeView.ActionType.MODIFY_3D_ATTRIBUTES);
    setEnabled(HomeView.ActionType.CREATE_PHOTO);
    setEnabled(HomeView.ActionType.CREATE_VIDEO);
    setEnabled(HomeView.ActionType.EXPORT_TO_OBJ);
    setEnabled(HomeView.ActionType.HELP);
    setEnabled(HomeView.ActionType.ABOUT);
    homeView.setTransferEnabled(true);
    this.enableLevelActions(homeView);
    this.enableCreationToolsActions(homeView);
  }

  private enableLevelActions(homeView: HomeView): void {
    homeView.setEnabled(HomeView.ActionType.ADD_LEVEL, true);
    const selectedLevel = this.home.getSelectedLevel();
    homeView.setEnabled(HomeView.ActionType.DELETE_LEVEL, selectedLevel !== null && this.home.getLevels().length > 1);
    homeView.setEnabled(HomeView.ActionType.MODIFY_LEVEL, selectedLevel !== null);
    homeView.setEnabled(HomeView.ActionType.TOGGLE_LEVEL_VIEW, selectedLevel !== null);
    homeView.setEnabled(HomeView.ActionType.SELECT_ALL_AT_ALL_LEVELS, selectedLevel !== null);
  }

  private enableCreationToolsActions(homeView: HomeView): void {
    homeView.setEnabled(HomeView.ActionType.ADD_WALLS, true);
    homeView.setEnabled(HomeView.ActionType.ADD_ROOMS, true);
    homeView.setEnabled(HomeView.ActionType.ADD_DIMENSION_LINES, true);
    homeView.setEnabled(HomeView.ActionType.ADD_LABELS, true);
    homeView.setEnabled(HomeView.ActionType.ADD_POLYLINES, true);
    homeView.setEnabled(HomeView.ActionType.ADD_HOME_FURNITURE, true);
    homeView.setEnabled(HomeView.ActionType.ADD_FURNITURE_TO_GROUP, true);
  }

  /** Enables actions bound to the current selection. */
  protected enableActionsBoundToSelection(): void {
    const homeView = this.getView();
    const selectedItems = this.home.getSelectedItems();
    homeView.setEnabled(HomeView.ActionType.CUT, selectedItems.length > 0);
    homeView.setEnabled(HomeView.ActionType.COPY, selectedItems.length > 0);
    homeView.setEnabled(HomeView.ActionType.PASTE, !this.getFocusedViewIsClipboardEmpty());
    homeView.setEnabled(HomeView.ActionType.PASTE_TO_GROUP, !this.getFocusedViewIsClipboardEmpty());
    homeView.setEnabled(HomeView.ActionType.PASTE_STYLE, !this.getFocusedViewIsClipboardEmpty());
    homeView.setEnabled(HomeView.ActionType.DELETE, selectedItems.length > 0);
    homeView.setEnabled(HomeView.ActionType.SELECT_ALL, true);
    homeView.setEnabled(HomeView.ActionType.SELECT_ALL_AT_ALL_LEVELS, true);
  }

  private getFocusedViewIsClipboardEmpty(): boolean {
    const focused = this.focusedView;
    return focused === null || typeof (focused as { isClipboardEmpty?: () => boolean }).isClipboardEmpty !== "function"
      || (focused as { isClipboardEmpty(): boolean }).isClipboardEmpty();
  }

  // -------------------------------------------------------------- listeners

  private addListeners(): void {
    // Undo/redo names
    this.undoSupport.addUndoableEditListener({
      undoableEditHappened: (edit) => {
        const view = this.getView();
        view.setEnabled(HomeView.ActionType.UNDO, true);
        view.setEnabled(HomeView.ActionType.REDO, this.undoManager.canRedo());
        view.setUndoRedoName(this.undoManager.getUndoPresentationName(), this.undoManager.getRedoPresentationName());
        this.saveUndoLevel++;
        this.home.setModified(this.saveUndoLevel !== 0 || this.notUndoableModifications);
      },
    });
    // Home selection changes
    this.home.addSelectionListener(() => {
      this.enableActionsBoundToSelection();
    });
    // Home property changes (background image, levels, cameras)
    const homeListener = { propertyChange: () => this.enableActionsBoundToSelection() };
    this.home.addPropertyChangeListener("backgroundImage", homeListener);
    this.home.addPropertyChangeListener("modified", homeListener);
    // Furniture catalog changes
    this.getFurnitureCatalogController().addSelectionListener(() => {
      this.enableActionsBoundToSelection();
    });
    // Furniture collection changes
    this.home.addFurnitureListener({
      collectionChanged: () => {
        this.enableActionsBoundToSelection();
      },
    });
  }

  private updateUserPreferencesRecentHomes(recentHomes: string[]): void {
    // Preferences persistence arrives with the UI layer
    (this.preferences as unknown as { setRecentHomes?: (homes: string[]) => void }).setRecentHomes?.(recentHomes);
  }

  // ------------------------------------------------------------------ undo

  isUndoEnabled(): boolean {
    return this.undoManager.canUndo();
  }

  isRedoEnabled(): boolean {
    return this.undoManager.canRedo();
  }

  /** Listens for undo/redo availability changes. */
  addUndoStateListener(listener: () => void): void {
    this.undoManager.addStateListener(listener);
  }

  removeUndoStateListener(listener: () => void): void {
    this.undoManager.removeStateListener(listener);
  }

  undo(): void {
    this.undoManager.undo();
    const view = this.getView();
    const moreUndo = this.undoManager.canUndo();
    view.setEnabled(HomeView.ActionType.UNDO, moreUndo);
    view.setEnabled(HomeView.ActionType.REDO, true);
    view.setUndoRedoName(moreUndo ? this.undoManager.getUndoPresentationName() : null, this.undoManager.getRedoPresentationName());
    this.saveUndoLevel--;
    this.home.setModified(this.saveUndoLevel !== 0 || this.notUndoableModifications);
  }

  redo(): void {
    this.undoManager.redo();
    const view = this.getView();
    const moreRedo = this.undoManager.canRedo();
    view.setEnabled(HomeView.ActionType.UNDO, true);
    view.setEnabled(HomeView.ActionType.REDO, moreRedo);
    view.setUndoRedoName(this.undoManager.getUndoPresentationName(), moreRedo ? this.undoManager.getRedoPresentationName() : null);
    this.saveUndoLevel++;
    this.home.setModified(this.saveUndoLevel !== 0 || this.notUndoableModifications);
  }

  cut(items: Selectable[]): void {
    this.getUndoableEditSupport().beginUpdate();
    this.getPlanController().deleteItems(items);
    this.getUndoableEditSupport().postEdit(new LocalizedUndoableEdit(this.preferences, HomeController, "undoCutName"));
    this.getUndoableEditSupport().endUpdate();
  }

  paste(items: Selectable[]): void {
    throw new Error("HomeController.paste not ported yet");
  }

  pasteToGroup(): void {
    throw new Error("HomeController.pasteToGroup not ported yet");
  }

  pasteStyle(): void {
    throw new Error("HomeController.pasteStyle not ported yet");
  }

  deleteSelection(): void {
    this.getPlanController().deleteItems(this.home.getSelectedItems());
  }

  selectAll(): void {
    if (this.focusedView === this.getFurnitureController().getView()) {
      this.getFurnitureController().selectAll();
    } else if (this.focusedView === this.getPlanController().getView() || this.focusedView === this.getHomeController3D().getView()) {
      this.getPlanController().selectAll();
    }
  }

  selectAllAtAllLevels(): void {
    throw new Error("HomeController.selectAllAtAllLevels not ported yet");
  }

  // ----------------------------------------------------------------- files

  newHome(): void {
    if (this.application !== null) {
      const home = this.application.createHome();
      this.application.addHome(home);
    }
  }

  newHomeFromExample(): void {
    throw new Error("HomeController.newHomeFromExample not ported yet");
  }

  open(homeName?: string): void {
    if (homeName === undefined) {
      const chosen = this.getView().showOpenDialog();
      if (chosen === null) {
        return;
      }
      homeName = chosen;
    }
    const home = this.getHomeRecorder().readHome(homeName);
    if (home !== null && this.application !== null) {
      this.application.addHome(home);
    }
  }

  save(): void {
    this.saveHome(HomeRecorder.Type.DEFAULT, null);
  }

  saveAs(): void {
    this.saveAsHome(HomeRecorder.Type.DEFAULT, null);
  }

  saveAndCompress(): void {
    this.saveHome(HomeRecorder.Type.COMPRESSED, null);
  }

  saveAsAndCompress(): void {
    this.saveAsHome(HomeRecorder.Type.COMPRESSED, null);
  }

  private saveHome(recorderType: (typeof HomeRecorder.Type)[keyof typeof HomeRecorder.Type], postSaveTask: (() => void) | null): void {
    const homeName = this.home.getName();
    if (homeName === null || this.home.isRepaired()) {
      this.saveAsHome(recorderType, postSaveTask);
    } else {
      this.saveHomeAs(homeName, recorderType, postSaveTask);
    }
  }

  private saveAsHome(recorderType: (typeof HomeRecorder.Type)[keyof typeof HomeRecorder.Type], postSaveTask: (() => void) | null): void {
    const newName = this.getView().showSaveDialog(this.home.getName() ?? null);
    if (newName !== null) {
      this.saveHomeAs(newName, recorderType, postSaveTask);
    }
  }

  private saveHomeAs(homeName: string, recorderType: (typeof HomeRecorder.Type)[keyof typeof HomeRecorder.Type], postSaveTask: (() => void) | null): void {
    if (this.home.getVersion() <= Home.CURRENT_VERSION || homeName !== this.home.getName() || this.getView().confirmSaveNewerHome(homeName)) {
      try {
        const savedHome = this.home.clone();
        const recorder = this.getHomeRecorder();
        savedHome.setName(this.contentManager?.getPresentationName(homeName, ContentManager.ContentType.SWEET_HOME_3D) ?? homeName);
        // Web recorder writes asynchronously; the HomeRecorder contract is synchronous,
        // so bridge through a blocking write (HomeFileRecorder.writeHome is async).
        void this.writeHomeAsync(recorder, savedHome, homeName, postSaveTask);
      } catch (error) {
        this.getView().showError(this.preferences.getLocalizedString(HomeController, "saveError", homeName, String(error)));
      }
    }
  }

  private async writeHomeAsync(recorder: HomeRecorder, savedHome: Home, homeName: string, postSaveTask: (() => void) | null): Promise<void> {
    try {
      if (recorder instanceof HomeFileRecorder) {
        const bytes = await recorder.writeHome(savedHome);
        (recorder as unknown as { _lastBytes?: Uint8Array })._lastBytes = bytes;
        savedHome.setName(homeName);
        savedHome.setVersion(Home.CURRENT_VERSION);
        savedHome.setModified(false);
        this.notUndoableModifications = false;
        this.saveUndoLevel = 0;
        postSaveTask?.();
      } else {
        recorder.writeHome(savedHome, homeName);
        savedHome.setName(homeName);
        savedHome.setVersion(Home.CURRENT_VERSION);
        savedHome.setModified(false);
        this.notUndoableModifications = false;
        this.saveUndoLevel = 0;
        postSaveTask?.();
      }
    } catch (error) {
      this.getView().showError(this.preferences.getLocalizedString(HomeController, "saveError", homeName, String(error)));
    }
  }

  /** The recorder used for file operations (application recorder or a default HomeFileRecorder). */
  private getHomeRecorder(): HomeRecorder {
    if (this.application !== null) {
      return this.application.getHomeRecorder();
    }
    return new HomeFileRecorder() as unknown as HomeRecorder;
  }

  // ----------------------------------------------------------------- levels

  addLevel(): void {
    throw new Error("HomeController.addLevel not ported yet");
  }

  deleteLevel(): void {
    throw new Error("HomeController.deleteLevel not ported yet");
  }

  // ------------------------------------------------------------- cameras

  storeCamera(): void {
    throw new Error("HomeController.storeCamera not ported yet");
  }

  deleteCameras(): void {
    throw new Error("HomeController.deleteCameras not ported yet");
  }

  // -------------------------------------------------------------- libraries

  importFurnitureLibrary(): void {
    throw new Error("HomeController.importFurnitureLibrary not ported yet");
  }

  importTexturesLibrary(): void {
    throw new Error("HomeController.importTexturesLibrary not ported yet");
  }

  // -------------------------------------------------------------- dialogs

  showPreferences(): void {
    throw new Error("HomeController.showPreferences not ported yet (task 4.3)");
  }

  showAboutDialog(): void {
    this.getView().showAboutDialog();
  }

  // ---------------------------------------------------- creation tools (delegated to PlanController, task 4.6)

  addWalls(): void {
    throw new Error("HomeController.addWalls not ported yet (task 4.6)");
  }

  addRooms(): void {
    throw new Error("HomeController.addRooms not ported yet (task 4.6)");
  }

  addDimensionLines(): void {
    throw new Error("HomeController.addDimensionLines not ported yet (task 4.6)");
  }

  addLabels(): void {
    throw new Error("HomeController.addLabels not ported yet (task 4.6)");
  }

  addPolylines(): void {
    throw new Error("HomeController.addPolylines not ported yet (task 4.6)");
  }

  // ------------------------------------------------------- object dialogs (task 4.4)

  modifyWall(): void {
    if (Home.getSubList(this.home.getSelectedItems(), Wall).length > 0) {
      new WallController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
    }
  }

  modifyRoom(): void {
    if (Home.getSubList(this.home.getSelectedItems(), Room).length > 0) {
      new RoomController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
    }
  }

  modifyDimensionLine(): void {
    if (Home.getSubList(this.home.getSelectedItems(), DimensionLine).length > 0) {
      new DimensionLineController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
    }
  }

  modifyLabel(): void {
    if (Home.getSubList(this.home.getSelectedItems(), Label).length > 0) {
      new LabelController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
    }
  }

  modifyPolyline(): void {
    if (Home.getSubList(this.home.getSelectedItems(), Polyline).length > 0) {
      new PolylineController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
    }
  }

  modifyCompass(): void {
    new CompassController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
  }

  modify3DAttributes(): void {
    new Home3DAttributesController(this.home, this.preferences, this.viewFactory, this.contentManager, this.undoSupport).displayView(this.getView());
  }

  modifyObserverCamera(): void {
    new ObserverCameraController(this.home, this.preferences, this.viewFactory, this.undoSupport).displayView(this.getView());
  }
}
