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

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Home, UserPreferences, HomeController, HomeFileRecorder } from "@sweethomejs/core";
import { HomePane, HomeViewAdapter } from "@sweethomejs/ui";
import "@sweethomejs/ui/theme.css";

/**
 * The SweetHomeJS app: creates a Home + HomeController and mounts the
 * HomePane (plan + 3D editor).
 */
export function App(): ReactElement {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void createSession().then(async (s) => {
      setSession(s);
      // Debug hooks for e2e
      (globalThis as unknown as Record<string, unknown>).__homeController = s.homeController;
      (globalThis as unknown as Record<string, unknown>).__preferences = s.preferences;
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
    />
  );
}

interface Session {
  home: Home;
  preferences: UserPreferences;
  homeController: HomeController;
}

async function createSession(): Promise<Session> {
  // Load a fixture from ?file=<path> (relative to the server) if provided
  const fixtureParam = new URLSearchParams(location.search).get("file");
  let home = new Home();
  home.setName("Untitled");
  if (fixtureParam !== null) {
    try {
      const response = await fetch(fixtureParam);
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        const result = await new HomeFileRecorder().readHomeFromZip(bytes);
        home = result.home;
      }
    } catch {
      // Fall back to an empty home
    }
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
