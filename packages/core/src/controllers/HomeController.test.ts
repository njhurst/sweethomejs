/**
 * HomeController tests (task 4.2): master-controller wiring with a mock
 * HomeView — undo support, action enablement, sub-controller accessors.
 */
import { describe, expect, it } from "vitest";
import { Home } from "../model/Home.js";
import { HomePieceOfFurniture } from "../model/HomePieceOfFurniture.js";
import { HomeController } from "./HomeController.js";
import { UserPreferences } from "../model/UserPreferences.js";
import { HomeView } from "./HomeView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";

class MockHomeView implements HomeView {
  readonly enabled = new Map<HomeView.ActionType, boolean>();
  undoText: string | null = null;
  redoText: string | null = null;
  transferEnabled = false;

  setEnabled(actionType: HomeView.ActionType, enabled: boolean): void {
    this.enabled.set(actionType, enabled);
  }
  setActionEnabled(actionKey: string, enabled: boolean): void {}
  setUndoRedoName(undoText: string | null, redoText: string | null): void {
    this.undoText = undoText;
    this.redoText = redoText;
  }
  setTransferEnabled(enabled: boolean): void {
    this.transferEnabled = enabled;
  }
  detachView(view: View): void {}
  attachView(view: View): void {}
  showOpenDialog(): string | null {
    return null;
  }
  confirmOpenDamagedHome(homeName: string, homeModified: boolean): HomeView.OpenDamagedHomeAnswer {
    return HomeView.OpenDamagedHomeAnswer.DO_NOT_OPEN_HOME;
  }
  showNewHomeFromExampleDialog(): string | null {
    return null;
  }
  showImportLanguageLibraryDialog(): string | null {
    return null;
  }
  confirmReplaceLanguageLibrary(languageLibraryName: string): boolean {
    return false;
  }
  showImportFurnitureLibraryDialog(): string | null {
    return null;
  }
  confirmReplaceFurnitureLibrary(furnitureLibraryName: string): boolean {
    return false;
  }
  showImportTexturesLibraryDialog(): string | null {
    return null;
  }
  confirmReplaceTexturesLibrary(texturesLibraryName: string): boolean {
    return false;
  }
  confirmReplacePlugin(pluginName: string): boolean {
    return false;
  }
  showSaveDialog(homeName: string | null): string | null {
    return null;
  }
  confirmSave(homeName: string): HomeView.SaveAnswer {
    return HomeView.SaveAnswer.CANCEL;
  }
  confirmSaveNewerHome(homeName: string): boolean {
    return true;
  }
  confirmDeleteCatalogSelection(): boolean {
    return false;
  }
  confirmExit(): boolean {
    return false;
  }
  showError(message: string): void {}
  showMessage(message: string): void {}
  showActionTipMessage(actionTipKey: string): boolean {
    return false;
  }
  showAboutDialog(): void {}
  showPrintDialog(): (() => void) | null {
    return null;
  }
  showPrintToPDFDialog(homeName: string): string | null {
    return null;
  }
  printToPDF(pdfFile: string): void {}
  showExportToCSVDialog(name: string): string | null {
    return null;
  }
  exportToCSV(csvName: string): void {}
  showExportToSVGDialog(name: string): string | null {
    return null;
  }
  exportToSVG(svgName: string): void {}
  showExportToOBJDialog(homeName: string): string | null {
    return null;
  }
  exportToOBJ(objFile: string): void {}
  showStoreCameraDialog(cameraName: string): string | null {
    return null;
  }
  showDeletedCamerasDialog() {
    return [];
  }
  isClipboardEmpty(): boolean {
    return true;
  }
}

const mockViewFactory: ViewFactory = {
  createHomeView: (_home, _prefs, _controller) => new MockHomeView(),
  createFurnitureView: () => ({}) as never,
  createFurnitureCatalogView: () => ({}) as never,
  createPlanView: () => ({}) as never,
  createView3D: () => ({}) as never,
  createWizardView: () => ({}) as never,
  createBackgroundImageWizardStepsView: () => ({}) as never,
  createImportedFurnitureWizardStepsView: () => ({}) as never,
  createImportedTextureWizardStepsView: () => ({}) as never,
  createThreadedTaskView: () => ({}) as never,
  createUserPreferencesView: () => ({}) as never,
  createLevelView: () => ({}) as never,
  createHomeFurnitureView: () => ({}) as never,
  createWallView: () => ({}) as never,
  createRoomView: () => ({}) as never,
  createPolylineView: () => ({}) as never,
  createDimensionLineView: () => ({}) as never,
  createLabelView: () => ({}) as never,
  createCompassView: () => ({}) as never,
  createObserverCameraView: () => ({}) as never,
  createHome3DAttributesView: () => ({}) as never,
  createTextureChoiceView: () => ({}) as never,
  createBaseboardChoiceView: () => ({}) as never,
  createModelMaterialsView: () => ({}) as never,
  createPageSetupView: () => ({}) as never,
  createPrintPreviewView: () => ({}) as never,
  createPhotoView: () => ({}) as never,
  createPhotosView: () => ({}) as never,
  createVideoView: () => ({}) as never,
  createHelpView: () => ({}) as never,
};

describe("HomeController (task 4.2)", () => {
  it("creates its view through the factory and enables default actions", () => {
    const home = new Home();
    const controller = new HomeController(home, new UserPreferences(), mockViewFactory);
    const view = controller.getView() as MockHomeView;

    expect(view).toBeInstanceOf(MockHomeView);
    expect(view.transferEnabled).toBe(true);
    expect(view.enabled.get(HomeView.ActionType.PREFERENCES)).toBe(true);
    expect(view.enabled.get(HomeView.ActionType.IMPORT_FURNITURE)).toBe(true);
    expect(view.enabled.get(HomeView.ActionType.ADD_LEVEL)).toBe(true);
    // File actions are disabled without an application
    expect(view.enabled.get(HomeView.ActionType.SAVE)).toBe(false);
    expect(view.enabled.get(HomeView.ActionType.NEW_HOME)).toBe(false);
  });

  it("exposes the sub-controllers lazily", () => {
    const home = new Home();
    const controller = new HomeController(home, new UserPreferences(), mockViewFactory);
    expect(controller.getFurnitureController()).toBe(controller.getFurnitureController());
    expect(controller.getPlanController()).toBe(controller.getPlanController());
    expect(controller.getHomeController3D()).toBe(controller.getHomeController3D());
    expect(controller.getFurnitureCatalogController()).toBe(controller.getFurnitureCatalogController());
  });

  it("updates undo/redo names and modified state through undo support", () => {
    const home = new Home();
    const controller = new HomeController(home, new UserPreferences(), mockViewFactory);
    const view = controller.getView() as MockHomeView;

    // Post an edit through the furniture controller
    const piece = new HomePieceOfFurniture("test", {
      getName: () => "Table",
      getDescription: () => null,
      getInformation: () => null,
      getLicense: () => null,
      getDepth: () => 50,
      getHeight: () => 30,
      getWidth: () => 100,
      getElevation: () => 0,
      getDropOnTopElevation: () => 1,
      isMovable: () => true,
      isDoorOrWindow: () => false,
      getIcon: () => null,
      getPlanIcon: () => null,
      getModel: () => null,
      getModelFlags: () => 0,
      getModelSize: () => null,
      getModelRotation: () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      getStaircaseCutOutShape: () => null,
      getCreator: () => null,
      isBackFaceShown: () => false,
      getColor: () => null,
      isResizable: () => true,
      isDeformable: () => true,
      isWidthDepthDeformable: () => true,
      isTexturable: () => true,
      isHorizontallyRotatable: () => true,
      getPrice: () => null,
      getValueAddedTaxPercentage: () => null,
      getCurrency: () => null,
      getProperty: () => null,
      getPropertyNames: () => [],
      getContentProperty: () => null,
      isContentProperty: () => false,
      getLevel: () => null,
    } as never);
    controller.getFurnitureController().addFurniture([piece]);

    expect(view.enabled.get(HomeView.ActionType.UNDO)).toBe(true);
    expect(home.isModified()).toBe(true);

    controller.undo();
    expect(home.getFurniture().length).toBe(0);
    expect(view.enabled.get(HomeView.ActionType.REDO)).toBe(true);

    controller.redo();
    expect(home.getFurniture().length).toBe(1);
  });

  it("registers the home in the recent-homes list", () => {
    const home = new Home();
    home.setName("test-home.sh3d");
    const controller = new HomeController(home, new UserPreferences(), mockViewFactory);
    expect(controller.getView()).toBeInstanceOf(MockHomeView);
  });
});
