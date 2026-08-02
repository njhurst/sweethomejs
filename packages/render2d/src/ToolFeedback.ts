/*
 * ToolFeedback.ts
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

/**
 * Tool feedback (task 5.6): length/angle tooltips, editable-property hidden
 * input overlay, and alignment/duplication dashed feedback.
 */
import { PlanController } from "@sweethomejs/core";
import type { PlanPainter } from "./PlanPainter.js";

// ---------------------------------------------------------------------------
// Tool tip feedback

/** The tool tip state: text + position in model space + optional value fields. */
export interface ToolTipState {
  text: string | null;
  x: number;
  y: number;
  /** Editable properties displayed in the tool tip (PlanController.EditableProperty names). */
  editableProperties: string[];
  /** The current value of each editable property. */
  editablePropertyValues: number[];
  /** The index of the focused editable property. */
  focusedPropertyIndex: number;
}

export function emptyToolTip(): ToolTipState {
  return { text: null, x: 0, y: 0, editableProperties: [], editablePropertyValues: [], focusedPropertyIndex: 0 };
}

/** Paints the tool tip (a small filled rounded box with the text). */
export function paintToolTip(painter: PlanPainter, toolTip: ToolTipState): void {
  if (toolTip.text === null) {
    return;
  }
  const fontSize = 10;
  const paddingX = 4;
  const paddingY = 2;
  const textWidth = toolTip.text.length * fontSize * 0.6;
  const boxX = toolTip.x + 8;
  const boxY = toolTip.y - fontSize - 8;
  const boxW = textWidth + paddingX * 2;
  const boxH = fontSize + paddingY * 2;
  painter.save();
  painter.setColor(0xffffff);
  painter.fillRect(boxX, boxY, boxW, boxH);
  painter.setColor(0x000000);
  painter.setStroke(0.5, []);
  painter.drawRect(boxX, boxY, boxW, boxH);
  painter.setFont({ name: null, size: fontSize, bold: false, italic: false });
  painter.drawText(toolTip.text, boxX + paddingX, boxY + fontSize);
  painter.restore();
}

// ---------------------------------------------------------------------------
// Alignment / duplication feedback

export interface AlignmentFeedbackState {
  /** Dashed segments in model space (each [x1, y1, x2, y2]). */
  segments: number[][];
  color: number;
  /** Width in model units (1/scale in Java). */
  width: number;
  dash: number[];
}

export function emptyAlignmentFeedback(): AlignmentFeedbackState {
  return { segments: [], color: 0x0057ff, width: 1, dash: [20, 5, 5, 5] };
}

/** Paints the dashed alignment/duplication feedback lines. */
export function paintAlignmentFeedback(painter: PlanPainter, feedback: AlignmentFeedbackState): void {
  if (feedback.segments.length === 0) {
    return;
  }
  painter.save();
  painter.setColor(feedback.color);
  painter.setStroke(feedback.width, feedback.dash);
  for (const segment of feedback.segments) {
    painter.drawLine(segment[0]!, segment[1]!, segment[2]!, segment[3]!);
  }
  painter.restore();
}

// ---------------------------------------------------------------------------
// Editable-property hidden input overlay

export interface EditablePropertyInputOptions {
  element: HTMLElement;
  /** PlanController.EditableProperty name (e.g. "X", "LENGTH"). */
  propertyName: string;
  value: number;
  onCommit: (propertyName: string, value: number) => void;
  onCancel: () => void;
}

/**
 * A hidden absolutely-positioned input that captures numeric entry for an
 * editable plan property (like Java's focused text field in the tool tip).
 */
export class EditablePropertyInput {
  private readonly input: HTMLInputElement;
  private readonly onCommit: (propertyName: string, value: number) => void;
  private readonly onCancel: () => void;
  private readonly propertyName: string;
  private visible = false;

  constructor(options: EditablePropertyInputOptions) {
    this.onCommit = options.onCommit;
    this.onCancel = options.onCancel;
    this.propertyName = options.propertyName;
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.style.position = "absolute";
    this.input.style.opacity = "0";
    this.input.style.width = "1px";
    this.input.style.height = "1px";
    this.input.style.pointerEvents = "none";
    this.input.style.zIndex = "-1";
    this.input.value = String(options.value);
    this.input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") {
        this.commit();
      } else if (event.key === "Escape") {
        this.cancel();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Move the caret like a text field
        event.stopPropagation();
      }
    });
    this.input.addEventListener("blur", () => {
      this.commit();
    });
    options.element.appendChild(this.input);
  }

  /** Shows the input and focuses it, selecting the current value. */
  show(x: number, y: number): void {
    this.visible = true;
    this.input.style.left = `${x}px`;
    this.input.style.top = `${y}px`;
    this.input.style.zIndex = "100";
    this.input.focus();
    this.input.select();
  }

  hide(): void {
    this.visible = false;
    this.input.style.zIndex = "-1";
    this.input.blur();
  }

  isVisible(): boolean {
    return this.visible;
  }

  setValue(value: number): void {
    this.input.value = String(value);
  }

  getValue(): number {
    return parseFloat(this.input.value);
  }

  private commit(): void {
    if (!this.visible) {
      return;
    }
    const value = this.getValue();
    if (!Number.isNaN(value)) {
      this.onCommit(this.propertyName, value);
    }
    this.hide();
  }

  private cancel(): void {
    this.hide();
    this.onCancel();
  }

  destroy(): void {
    this.input.remove();
  }
}

/** Commits an editable property value to the controller. */
export function commitEditableProperty(
  controller: PlanController,
  propertyName: string,
  value: number,
): void {
  const property = PlanController.EditableProperty[propertyName as keyof typeof PlanController.EditableProperty];
  if (property !== undefined) {
    controller.updateEditableProperty(property, value);
  }
}
