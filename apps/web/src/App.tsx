/*
 * App.tsx
 *
 * Original SweetHomeJS code, Copyright (c) 2026 SweetHomeJS contributors
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
 */

import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Home, UserPreferences, HomeController, HomeFileRecorder } from "@sweethomejs/core";
import { HomePane, HomeViewAdapter, WebContentManager } from "@sweethomejs/ui";
import "@sweethomejs/ui/theme.css";

/**
 * The SweetHomeJS app: creates a Home + HomeController and mounts the
 * HomePane (plan + 3D editor).
 */
const contentManager = new WebContentManager();

export function App(): ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const replaceSession = (next: Session): void => {
    sessionRef.current = next;
    (globalThis as unknown as Record<string, unknown>).__homeController = next.homeController;
    setSession(next);
  };

  const openHome = async (): Promise<void> => {
    const files = await contentManager.pickFile(".sh3d");
    if (files === null || files.length === 0) {
      return;
    }
    try {
      const result = await new HomeFileRecorder().readHomeFromZip(files[0]!.bytes);
      const next = await createSession(result.home);
      replaceSession(next);
    } catch (error) {
      console.error("Failed to open home", error);
    }
  };

  const saveHome = async (): Promise<void> => {
    const current = sessionRef.current;
    if (current === null) {
      return;
    }
    const name = current.home.getName() ?? "home.sh3d";
    const bytes = await new HomeFileRecorder().writeHome(current.home);
    await contentManager.saveFile(name, bytes, ".sh3d");
  };

  useEffect(() => {
    void createSession(new Home()).then(async (s) => {
      setSession(s);
      // Debug hooks for e2e
      (globalThis as unknown as Record<string, unknown>).__homeController = s.homeController;
      (globalThis as unknown as Record<string, unknown>).__preferences = s.preferences;
      (globalThis as unknown as Record<string, unknown>).__contentManager = contentManager;
      const { IndexedDBStore, PreferencesStore } = await import("@sweethomejs/ui");
      const store = new IndexedDBStore();
      (globalThis as unknown as Record<string, unknown>).__preferencesStore = new PreferencesStore(store);
    });
    return () => {
      void session;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (session === null) {
    return <div data-testid="app-loading">Loading…</div>;
  }

  return (
    <HomePane
      home={session.home}
      preferences={session.preferences}
      homeController={session.homeController}
      onOpenHome={openHome}
      onSaveHome={saveHome}
    />
  );
}

interface Session {
  home: Home;
  preferences: UserPreferences;
  homeController: HomeController;
}

async function createSession(home: Home): Promise<Session> {
  // Load a fixture from ?file=<path> (relative to the server) if provided
  const fixtureParam = new URLSearchParams(location.search).get("file");
  if (home.getFurniture().length === 0 && home.getWalls().length === 0 && fixtureParam !== null) {
    try {
      const response = await fetch(fixtureParam);
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        const result = await new HomeFileRecorder().readHomeFromZip(bytes);
        home = result.home;
      }
    } catch {
      // Fall back to the empty home
    }
  }
  if (home.getName() === null) {
    home.setName("Untitled");
  }
  const preferences = new UserPreferences();
  const homeViewAdapter = new HomeViewAdapter();
  const homeController = new HomeController(home, preferences, {
    createHomeView: () => homeViewAdapter,
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
  } as never);
  return { home, preferences, homeController };
}
