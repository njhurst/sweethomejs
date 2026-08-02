/*
 * LabelController.ts.ts
 *
 * Translated from Sweet Home 3D LabelController.java.java
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
 * LabelController (port of com.eteks.sweethome3d.viewcontroller.LabelController, GPL v2+).
 * Edits the labels of a home.
 */
import type { DialogView } from "./DialogView.js";
import type { View } from "./View.js";
import type { ViewFactory } from "./ViewFactory.js";
import type { UndoableEditSupport } from "./undo/UndoableEditSupport.js";
import { PropertyChangeSupportByString, ObjectUndoableEdit } from "./PropertyController.js";
import { Home } from "../model/Home.js";
import { Label } from "../model/Label.js";
import { TextStyle } from "../model/TextStyle.js";
import type { UserPreferences } from "../model/UserPreferences.js";
import type { PropertyChangeListener } from "../events/PropertyChangeSupport.js";

export class LabelController {
  private readonly home: Home;
  private readonly preferences: UserPreferences;
  private readonly viewFactory: ViewFactory;
  private readonly undoSupport: UndoableEditSupport | null;
  private readonly propertyChangeSupport = new PropertyChangeSupportByString();
  private labelView: DialogView | null = null;
  private labels: Label[] = [];
  private text = "";
  private alignment: string | null = null;
  private fontName: string | null = null;
  private fontSize = 0;
  private color: number | null = null;
  private pitch: number | null = null;
  private elevation = 0;

  constructor(home: Home, preferences: UserPreferences, viewFactory: ViewFactory, undoSupport: UndoableEditSupport | null = null) {
    this.home = home;
    this.preferences = preferences;
    this.viewFactory = viewFactory;
    this.undoSupport = undoSupport;
    this.updateProperties();
  }

  getView(): DialogView {
    if (this.labelView === null) {
      this.labelView = this.viewFactory.createLabelView(true, this.preferences, this);
    }
    return this.labelView;
  }

  displayView(parentView: View): void {
    this.getView().displayView(parentView);
  }

  addPropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.addPropertyChangeListener(property, listener);
  }

  removePropertyChangeListener(property: string, listener: PropertyChangeListener): void {
    this.propertyChangeSupport.removePropertyChangeListener(property, listener);
  }

  protected updateProperties(): void {
    this.labels = Home.getSubList(this.home.getSelectedItems(), Label);
    if (this.labels.length > 0) {
      const label = this.labels[0]!;
      this.setText(label.getText());
      const style = label.getStyle();
      if (style !== null) {
        this.setAlignment(style.getAlignment());
        this.setFontName(style.getFontName());
        this.setFontSize(style.getFontSize());
      }
      this.setColor(label.getColor());
      this.setPitch(label.getPitch());
      this.setElevation(label.getElevation());
    }
  }

  getText(): string {
    return this.text;
  }

  setText(text: string): void {
    if (text !== this.text) {
      const oldText = this.text;
      this.text = text;
      this.propertyChangeSupport.firePropertyChange("TEXT", oldText, text);
    }
  }

  getAlignment(): string | null {
    return this.alignment;
  }

  setAlignment(alignment: string | null): void {
    if (alignment !== this.alignment) {
      const oldAlignment = this.alignment;
      this.alignment = alignment;
      this.propertyChangeSupport.firePropertyChange("ALIGNMENT", oldAlignment, alignment);
    }
  }

  getFontName(): string | null {
    return this.fontName;
  }

  setFontName(fontName: string | null): void {
    if (fontName !== this.fontName) {
      const oldFontName = this.fontName;
      this.fontName = fontName;
      this.propertyChangeSupport.firePropertyChange("FONT_NAME", oldFontName, fontName);
    }
  }

  getFontSize(): number {
    return this.fontSize;
  }

  setFontSize(fontSize: number): void {
    if (fontSize !== this.fontSize) {
      const oldFontSize = this.fontSize;
      this.fontSize = fontSize;
      this.propertyChangeSupport.firePropertyChange("FONT_SIZE", oldFontSize, fontSize);
    }
  }

  getColor(): number | null {
    return this.color;
  }

  setColor(color: number | null): void {
    if (color !== this.color) {
      const oldColor = this.color;
      this.color = color;
      this.propertyChangeSupport.firePropertyChange("COLOR", oldColor, color);
    }
  }

  getPitch(): number | null {
    return this.pitch;
  }

  setPitch(pitch: number | null): void {
    if (pitch !== this.pitch) {
      const oldPitch = this.pitch;
      this.pitch = pitch;
      this.propertyChangeSupport.firePropertyChange("PITCH", oldPitch, pitch);
    }
  }

  getElevation(): number {
    return this.elevation;
  }

  setElevation(elevation: number): void {
    if (elevation !== this.elevation) {
      const oldElevation = this.elevation;
      this.elevation = elevation;
      this.propertyChangeSupport.firePropertyChange("ELEVATION", oldElevation, elevation);
    }
  }

  modifyLabels(): void {
    const modifiedLabels = Home.getSubList(this.home.getSelectedItems(), Label);
    const oldStates = modifiedLabels.map((label): { text: string; style: TextStyle | null; color: number | null; pitch: number | null; elevation: number } => ({
      text: label.getText(),
      style: label.getStyle(),
      color: label.getColor(),
      pitch: label.getPitch(),
      elevation: label.getElevation(),
    }));
    const newStates = modifiedLabels.map((label): { text: string; style: TextStyle; color: number | null; pitch: number | null; elevation: number } => ({
      text: this.getText(),
      style: new TextStyle(
        this.getFontName(),
        this.getFontSize(),
        false,
        false,
        this.getAlignment() ?? TextStyle.Alignment.CENTER,
      ),
      color: this.getColor(),
      pitch: this.getPitch(),
      elevation: this.getElevation(),
    }));
    doModifyLabels(modifiedLabels, newStates);
    if (this.undoSupport !== null) {
      this.undoSupport.postEdit(
        new ObjectUndoableEdit(
          this.preferences, LabelController, "undoModifyLabelsName",
          (states) => doModifyLabels(modifiedLabels, states as never),
          oldStates, newStates,
        ),
      );
    }
  }
}

function doModifyLabels(
  labels: Label[],
  states: Array<{ text: string; style: TextStyle; color: number | null; pitch: number | null; elevation: number }>,
): void {
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!;
    const state = states[i]!;
    label.setText(state.text);
    label.setStyle(state.style);
    label.setColor(state.color);
    label.setPitch(state.pitch);
    label.setElevation(state.elevation);
  }
}
