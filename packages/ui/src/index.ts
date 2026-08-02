/**
 * @sweethomejs/ui — React UI shell (docs/02-architecture.md, docs/06-2d-plan-view.md).
 */
export { HomePane } from "./HomePane.js";
export type { HomePaneProps, View3DPosition } from "./HomePane.js";
export { PlanCanvas } from "./plan/PlanCanvas.js";
export { PlanCanvasView } from "./plan/PlanCanvasView.js";
export type { PlanCanvasHost } from "./plan/PlanCanvasView.js";
export { View3DCanvas } from "./view3d/View3DCanvas.js";
export { WebViewFactory, ElementView } from "./WebViewFactory.js";
export type { WebViewFactoryOptions } from "./WebViewFactory.js";
export { HomeViewAdapter } from "./HomeViewAdapter.js";
export { FurnitureCatalogPanel, filterCatalog } from "./catalog/FurnitureCatalogPanel.js";
export type { CatalogSearchResult } from "./catalog/FurnitureCatalogPanel.js";
export { FurnitureTable, sortFurniture, FURNITURE_COLUMNS } from "./catalog/FurnitureTable.js";
export type { FurnitureColumn } from "./catalog/FurnitureTable.js";
export { FurniturePropertiesPanel } from "./properties/FurniturePropertiesPanel.js";
export type { FurniturePropertiesPanelProps } from "./properties/FurniturePropertiesPanel.js";
export { WallDialog, RoomDialog } from "./properties/ControllerDialogs.js";
export type { WallDialogProps, RoomDialogProps } from "./properties/ControllerDialogs.js";
export { FurnitureWizard, TextureWizard, BackgroundImageWizard, ModelMaterialsView, BaseboardChoiceView } from "./wizards/Wizards.js";
export type { FurnitureWizardProps, TextureWizardProps, BackgroundImageWizardProps, ModelMaterialsViewProps, BaseboardChoiceViewProps } from "./wizards/Wizards.js";
export { getLocalizedString, setLocale, initMessages, guessBrowserLocale, SUPPORTED_LOCALES, getLocale } from "./i18n/Messages.js";
export { HelpPane, HELP_PAGES } from "./help/HelpPane.js";
export type { HelpPaneProps } from "./help/HelpPane.js";
export { WebContent, readContentBytes } from "./io/WebContent.js";
export { WebContentManager } from "./io/WebContentManager.js";
export { IndexedDBStore, DB_NAME, DB_VERSION } from "./persistence/IndexedDBStore.js";
export type { DocumentRecord, RecoveryRecord, StoreName } from "./persistence/IndexedDBStore.js";
export { PreferencesStore, HomeDocumentStore, Autosaver, snapshotPreferences } from "./persistence/Persistence.js";
export type { PreferencesSnapshot, AutosaverOptions } from "./persistence/Persistence.js";
export { IndexedDBHomeStore, InMemoryHomeStore } from "./persistence/HomeStore.js";
export type { HomeStore } from "./persistence/HomeStore.js";
