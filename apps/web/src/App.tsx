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
import { Home, UserPreferences, HomeController } from "@sweethomejs/core";
import { HomePane, HomeViewAdapter } from "@sweethomejs/ui";
import "@sweethomejs/ui/theme.css";

/**
 * The SweetHomeJS app: creates a Home + HomeController and mounts the
 * HomePane (plan + 3D editor).
 */
export function App(): ReactElement {
  const [session] = useState(() => createSession());

  useEffect(() => {
    return () => {
      void session;
    };
  }, [session]);

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

function createSession(): Session {
  const home = new Home();
  home.setName("Untitled");
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
