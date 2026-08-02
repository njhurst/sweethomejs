/*
 * ControllerDialogs.tsx
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
 * ControllerDialogs (task 7.3): React dialogs bound to the dialog
 * controllers (WallController, RoomController, ...). Each shows the
 * controller's editable properties, mutates them via the controller setters,
 * and commits through the modify* method (which posts the undoable edit).
 */
import { useEffect, useState } from "react";
import type { WallController, RoomController } from "@sweethomejs/core";

// ---------------------------------------------------------------------------
// Wall dialog

export interface WallDialogProps {
  controller: WallController;
  onClose: () => void;
}

interface WallFields {
  xStart: string;
  yStart: string;
  xEnd: string;
  yEnd: string;
  thickness: string;
  height: string;
}

function wallFieldsFrom(controller: WallController): WallFields {
  return {
    xStart: num(controller.getXStart() ?? 0),
    yStart: num(controller.getYStart() ?? 0),
    xEnd: num(controller.getXEnd() ?? 0),
    yEnd: num(controller.getYEnd() ?? 0),
    thickness: num(controller.getThickness() ?? 0),
    height: num(controller.getRectangularWallHeight() ?? 0),
  };
}

function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function WallDialog(props: WallDialogProps): React.JSX.Element {
  const { controller, onClose } = props;
  const [fields, setFields] = useState<WallFields>(() => wallFieldsFrom(controller));

  useEffect(() => {
    setFields(wallFieldsFrom(controller));
  }, [controller]);

  const set = (field: keyof WallFields, value: string): void => {
    setFields({ ...fields, [field]: value });
  };

  const apply = (): void => {
    const f = parseFloat;
    controller.setXStart(f(fields.xStart));
    controller.setYStart(f(fields.yStart));
    controller.setXEnd(f(fields.xEnd));
    controller.setYEnd(f(fields.yEnd));
    controller.setThickness(f(fields.thickness));
    controller.setRectangularWallHeight(f(fields.height));
    controller.modifyWalls();
    onClose();
  };

  return (
    <div className="sh-dialog" data-testid="wall-dialog">
      <h3>Wall</h3>
      <DialogField label="Start X" value={fields.xStart} onChange={(v) => set("xStart", v)} />
      <DialogField label="Start Y" value={fields.yStart} onChange={(v) => set("yStart", v)} />
      <DialogField label="End X" value={fields.xEnd} onChange={(v) => set("xEnd", v)} />
      <DialogField label="End Y" value={fields.yEnd} onChange={(v) => set("yEnd", v)} />
      <DialogField label="Thickness" value={fields.thickness} onChange={(v) => set("thickness", v)} />
      <DialogField label="Height" value={fields.height} onChange={(v) => set("height", v)} />
      <div className="sh-dialog-buttons">
        <button onClick={apply}>OK</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room dialog

export interface RoomDialogProps {
  controller: RoomController;
  onClose: () => void;
}

interface RoomFields {
  name: string;
  floorColor: string;
  ceilingColor: string;
}

function roomFieldsFrom(controller: RoomController): RoomFields {
  return {
    name: controller.getName(),
    floorColor: hexColor(controller.getFloorColor()),
    ceilingColor: hexColor(controller.getCeilingColor()),
  };
}

function hexColor(color: number | null): string {
  if (color === null) {
    return "#ffffff";
  }
  return `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
}

export function RoomDialog(props: RoomDialogProps): React.JSX.Element {
  const { controller, onClose } = props;
  const [fields, setFields] = useState<RoomFields>(() => roomFieldsFrom(controller));

  useEffect(() => {
    setFields(roomFieldsFrom(controller));
  }, [controller]);

  const apply = (): void => {
    controller.setName(fields.name);
    controller.setFloorColor(parseInt(fields.floorColor.slice(1), 16));
    controller.setCeilingColor(parseInt(fields.ceilingColor.slice(1), 16));
    controller.modifyRooms();
    onClose();
  };

  return (
    <div className="sh-dialog" data-testid="room-dialog">
      <h3>Room</h3>
      <DialogField label="Name" value={fields.name} onChange={(v) => setFields({ ...fields, name: v })} />
      <DialogField label="Floor color" value={fields.floorColor} onChange={(v) => setFields({ ...fields, floorColor: v })} />
      <DialogField label="Ceiling color" value={fields.ceilingColor} onChange={(v) => setFields({ ...fields, ceilingColor: v })} />
      <div className="sh-dialog-buttons">
        <button onClick={apply}>OK</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function DialogField(props: { label: string; value: string; onChange: (value: string) => void }): React.JSX.Element {
  return (
    <label className="sh-dialog-field">
      <span>{props.label}</span>
      <input type="text" value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}
