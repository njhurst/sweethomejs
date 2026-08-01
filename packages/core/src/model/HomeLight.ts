/**
 * Port of com.eteks.sweethome3d.model.HomeLight (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import { HomeObject } from "./HomeObject.js";
import { HomePieceOfFurniture } from "./HomePieceOfFurniture.js";
import type { Light } from "./Interfaces.js";
import type { LightSource } from "./stubs.js";

export class HomeLight extends HomePieceOfFurniture implements Light {
  static override readonly Property = {
    ...HomePieceOfFurniture.Property,
    POWER: "POWER",
    LIGHT_SOURCES: "LIGHT_SOURCES",
    LIGHT_SOURCE_MATERIAL_NAMES: "LIGHT_SOURCE_MATERIAL_NAMES",
  } as const;

  private lightSources: LightSource[] = [];
  private lightSourceMaterialNames: string[] = [];
  private power: number;

  constructor(light: Light, copiedProperties?: string[] | null);
  constructor(id: string, light: Light, copiedProperties?: string[] | null);
  constructor(idOrLight: string | Light, lightOrProps?: Light | string[] | null, props?: string[] | null) {
    if (typeof idOrLight === "string") {
      super(idOrLight, lightOrProps as Light, props ?? null);
    } else {
      super(HomeObject.createId("light"), idOrLight, (lightOrProps as string[] | null | undefined) ?? null);
    }
    const light = typeof idOrLight === "string" ? (lightOrProps as Light) : idOrLight;
    this.power = f32(light.getPower());
    this.lightSources = [...light.getLightSources()];
    this.lightSourceMaterialNames = [...light.getLightSourceMaterialNames()];
  }

  getLightSources(): LightSource[] {
    return this.lightSources;
  }

  setLightSources(lightSources: LightSource[]): void {
    if (lightSources !== this.lightSources) {
      const oldLightSources = this.lightSources;
      this.lightSources = [...lightSources];
      this.firePropertyChange(HomeLight.Property.LIGHT_SOURCES, oldLightSources, lightSources);
    }
  }

  getLightSourceMaterialNames(): string[] {
    return this.lightSourceMaterialNames;
  }

  setLightSourceMaterialNames(lightSourceMaterialNames: string[]): void {
    if (lightSourceMaterialNames !== this.lightSourceMaterialNames) {
      const oldLightSourceMaterialNames = this.lightSourceMaterialNames;
      this.lightSourceMaterialNames = [...lightSourceMaterialNames];
      this.firePropertyChange(HomeLight.Property.LIGHT_SOURCE_MATERIAL_NAMES, oldLightSourceMaterialNames, lightSourceMaterialNames);
    }
  }

  getPower(): number {
    return this.power;
  }

  setPower(power: number): void {
    const narrowed = f32(power);
    if (narrowed !== this.power) {
      const oldPower = this.power;
      this.power = narrowed;
      this.firePropertyChange(HomeLight.Property.POWER, oldPower, narrowed);
    }
  }

  override clone(): HomeLight {
    const copy = Object.create(HomeLight.prototype) as HomeLight;
    this.copyBaseTo(copy);
    copy.lightSources = [...this.lightSources];
    copy.lightSourceMaterialNames = [...this.lightSourceMaterialNames];
    copy.power = this.power;
    return copy;
  }
}
