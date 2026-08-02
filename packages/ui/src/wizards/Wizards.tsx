/*
 * Wizards.tsx
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
 * Wizards UI (task 7.4): React wizard dialogs bound to the wizard
 * controllers — furniture import, texture import, background image, model
 * materials and baseboard choice.
 */
import { useEffect, useState } from "react";
import type { ImportedFurnitureWizardController, ImportedTextureWizardController, BackgroundImageWizardController, ModelMaterialsController, BaseboardChoiceController } from "@sweethomejs/core";

// ---------------------------------------------------------------------------
// Imported furniture wizard

export interface FurnitureWizardProps {
  controller: ImportedFurnitureWizardController;
  onClose: () => void;
}

export function FurnitureWizard(props: FurnitureWizardProps): React.JSX.Element {
  const { controller, onClose } = props;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(controller.getName());
  const [width, setWidth] = useState(String(controller.getWidth()));
  const [depth, setDepth] = useState(String(controller.getDepth()));
  const [height, setHeight] = useState(String(controller.getHeight()));
  const [movable, setMovable] = useState(controller.isMovable());
  const [doorOrWindow, setDoorOrWindow] = useState(controller.isDoorOrWindow());

  const syncToController = (): void => {
    controller.setName(name);
    controller.setWidth(parseFloat(width) || 0);
    controller.setDepth(parseFloat(depth) || 0);
    controller.setHeight(parseFloat(height) || 0);
    controller.setMovable(movable);
    controller.setDoorOrWindow(doorOrWindow);
  };

  const next = (): void => {
    syncToController();
    setStep(1);
  };

  const finish = (): void => {
    syncToController();
    controller.finish();
    onClose();
  };

  return (
    <div className="sh-dialog sh-wizard" data-testid="furniture-wizard">
      <h3>Import furniture</h3>
      {step === 0 ? (
        <>
          <DialogField label="Name" value={name} onChange={setName} />
          <DialogField label="Width (cm)" value={width} onChange={setWidth} />
          <DialogField label="Depth (cm)" value={depth} onChange={setDepth} />
          <DialogField label="Height (cm)" value={height} onChange={setHeight} />
          <div className="sh-dialog-buttons">
            <button onClick={next} disabled={name.trim() === ""}>Next</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <label className="sh-dialog-field">
            <span>Movable</span>
            <input type="checkbox" checked={movable} onChange={(e) => setMovable(e.target.checked)} />
          </label>
          <label className="sh-dialog-field">
            <span>Door or window</span>
            <input type="checkbox" checked={doorOrWindow} onChange={(e) => setDoorOrWindow(e.target.checked)} />
          </label>
          <div className="sh-dialog-buttons">
            <button onClick={finish}>Finish</button>
            <button onClick={() => setStep(0)}>Back</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Imported texture wizard

export interface TextureWizardProps {
  controller: ImportedTextureWizardController;
  onClose: () => void;
}

export function TextureWizard(props: TextureWizardProps): React.JSX.Element {
  const { controller, onClose } = props;
  const [name, setName] = useState(controller.getName());
  const [width, setWidth] = useState(String(controller.getWidth()));
  const [height, setHeight] = useState(String(controller.getHeight()));
  const [creator, setCreator] = useState(controller.getCreator() ?? "");

  const finish = (): void => {
    controller.setName(name);
    controller.setWidth(parseFloat(width) || 0);
    controller.setHeight(parseFloat(height) || 0);
    controller.setCreator(creator);
    controller.finish();
    onClose();
  };

  return (
    <div className="sh-dialog sh-wizard" data-testid="texture-wizard">
      <h3>Import texture</h3>
      <DialogField label="Name" value={name} onChange={setName} />
      <DialogField label="Width (cm)" value={width} onChange={setWidth} />
      <DialogField label="Height (cm)" value={height} onChange={setHeight} />
      <DialogField label="Creator" value={creator} onChange={setCreator} />
      <div className="sh-dialog-buttons">
        <button onClick={finish} disabled={name.trim() === ""}>Finish</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Background image wizard

export interface BackgroundImageWizardProps {
  controller: BackgroundImageWizardController;
  onClose: () => void;
}

export function BackgroundImageWizard(props: BackgroundImageWizardProps): React.JSX.Element {
  const { controller, onClose } = props;
  const [scaleDistance, setScaleDistance] = useState(String(controller.getScaleDistance() ?? 1));
  const [xOrigin, setXOrigin] = useState(String(controller.getXOrigin()));
  const [yOrigin, setYOrigin] = useState(String(controller.getYOrigin()));

  const finish = (): void => {
    controller.setScaleDistance(parseFloat(scaleDistance));
    controller.setOrigin(parseFloat(xOrigin), parseFloat(yOrigin));
    controller.finish();
    onClose();
  };

  return (
    <div className="sh-dialog sh-wizard" data-testid="background-image-wizard">
      <h3>Background image</h3>
      <DialogField label="Scale distance (cm)" value={scaleDistance} onChange={setScaleDistance} />
      <DialogField label="X origin" value={xOrigin} onChange={setXOrigin} />
      <DialogField label="Y origin" value={yOrigin} onChange={setYOrigin} />
      <div className="sh-dialog-buttons">
        <button onClick={finish}>Finish</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model materials + baseboard choice

export interface ModelMaterialsViewProps {
  controller: ModelMaterialsController;
}

export function ModelMaterialsView(props: ModelMaterialsViewProps): React.JSX.Element {
  const { controller } = props;
  const [materials, setMaterials] = useState(controller.getMaterials() ?? []);
  useEffect(() => {
    setMaterials(controller.getMaterials() ?? []);
  }, [controller]);
  return (
    <div className="sh-model-materials" data-testid="model-materials">
      <h3>Model materials</h3>
      <ul>
        {materials.length === 0 && <li>No materials</li>}
        {materials.map((material, index) => (
          <li key={index}>{material.getName()}</li>
        ))}
      </ul>
    </div>
  );
}

export interface BaseboardChoiceViewProps {
  controller: BaseboardChoiceController;
}

export function BaseboardChoiceView(props: BaseboardChoiceViewProps): React.JSX.Element {
  const { controller } = props;
  const [visible, setVisible] = useState(controller.getVisible() ?? false);
  const [thickness, setThickness] = useState(String(controller.getThickness() ?? 0));
  const [height, setHeight] = useState(String(controller.getHeight() ?? 0));

  const sync = (): void => {
    controller.setVisible(visible);
    controller.setThickness(parseFloat(thickness));
    controller.setHeight(parseFloat(height));
  };

  return (
    <div className="sh-baseboard-choice" data-testid="baseboard-choice">
      <h3>Baseboard</h3>
      <label className="sh-dialog-field">
        <span>Visible</span>
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
      </label>
      <DialogField label="Thickness (cm)" value={thickness} onChange={setThickness} />
      <DialogField label="Height (cm)" value={height} onChange={setHeight} />
      <div className="sh-dialog-buttons">
        <button onClick={sync}>Apply</button>
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
