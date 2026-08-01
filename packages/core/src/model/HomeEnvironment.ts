/**
 * Port of com.eteks.sweethome3d.model.HomeEnvironment (GPL v2+).
 */
import { f32 } from "../util/f32.js";
import type { Camera } from "./Camera.js";
import { HomeObject } from "./HomeObject.js";
import type { HomeTexture } from "./HomeTexture.js";

export class HomeEnvironment extends HomeObject {
  static readonly Property = {
    OBSERVER_CAMERA_ELEVATION_ADJUSTED: "OBSERVER_CAMERA_ELEVATION_ADJUSTED",
    GROUND_COLOR: "GROUND_COLOR",
    GROUND_TEXTURE: "GROUND_TEXTURE",
    BACKGROUND_IMAGE_VISIBLE_ON_GROUND_3D: "BACKGROUND_IMAGE_VISIBLE_ON_GROUND_3D",
    SKY_COLOR: "SKY_COLOR",
    SKY_TEXTURE: "SKY_TEXTURE",
    LIGHT_COLOR: "LIGHT_COLOR",
    CEILING_LIGHT_COLOR: "CEILING_LIGHT_COLOR",
    WALLS_ALPHA: "WALLS_ALPHA",
    DRAWING_MODE: "DRAWING_MODE",
    SUBPART_SIZE_UNDER_LIGHT: "SUBPART_SIZE_UNDER_LIGHT",
    ALL_LEVELS_VISIBLE: "ALL_LEVELS_VISIBLE",
    PHOTO_WIDTH: "PHOTO_WIDTH",
    PHOTO_HEIGHT: "PHOTO_HEIGHT",
    PHOTO_ASPECT_RATIO: "PHOTO_ASPECT_RATIO",
    PHOTO_QUALITY: "PHOTO_QUALITY",
    VIDEO_WIDTH: "VIDEO_WIDTH",
    VIDEO_HEIGHT: "VIDEO_HEIGHT",
    VIDEO_ASPECT_RATIO: "VIDEO_ASPECT_RATIO",
    VIDEO_QUALITY: "VIDEO_QUALITY",
    VIDEO_SPEED: "VIDEO_SPEED",
    VIDEO_FRAME_RATE: "VIDEO_FRAME_RATE",
    VIDEO_CAMERA_PATH: "VIDEO_CAMERA_PATH",
  } as const;

  static readonly DrawingMode = {
    FILL: "FILL",
    OUTLINE: "OUTLINE",
    FILL_AND_OUTLINE: "FILL_AND_OUTLINE",
  } as const;

  private observerCameraElevationAdjusted = true;
  private groundColor = 0xa8a8a8;
  private groundTexture: HomeTexture | null = null;
  private backgroundImageVisibleOnGround3D = true;
  private skyColor = 0xcce4fc;
  private skyTexture: HomeTexture | null = null;
  private lightColor = 0xd0d0d0;
  private ceilingLightColor = 0xd0d0d0;
  private wallsAlpha = 0;
  private drawingMode: string = HomeEnvironment.DrawingMode.FILL;
  private subpartSizeUnderLight = 0;
  private allLevelsVisible = true;
  private photoWidth = 400;
  private photoHeight = 300;
  private photoAspectRatioName: string | null = null;
  private photoQuality = 0;
  private videoWidth = 320;
  private videoHeight = 240;
  private videoAspectRatioName: string | null = null;
  private videoQuality = 0;
  private videoSpeed = 2400 / 3600;
  private videoFrameRate = 25;
  private videoCameraPath: Camera[] = [];

  constructor(id?: string) {
    super(id ?? "environment-homeEnvironment");
  }

  isObserverCameraElevationAdjusted(): boolean {
    return this.observerCameraElevationAdjusted;
  }

  setObserverCameraElevationAdjusted(observerCameraElevationAdjusted: boolean): void {
    if (observerCameraElevationAdjusted !== this.observerCameraElevationAdjusted) {
      const oldValue = this.observerCameraElevationAdjusted;
      this.observerCameraElevationAdjusted = observerCameraElevationAdjusted;
      this.firePropertyChange(HomeEnvironment.Property.OBSERVER_CAMERA_ELEVATION_ADJUSTED, oldValue, observerCameraElevationAdjusted);
    }
  }

  getGroundColor(): number {
    return this.groundColor;
  }

  setGroundColor(groundColor: number): void {
    if (groundColor !== this.groundColor) {
      const oldGroundColor = this.groundColor;
      this.groundColor = groundColor;
      this.firePropertyChange(HomeEnvironment.Property.GROUND_COLOR, oldGroundColor, groundColor);
    }
  }

  getGroundTexture(): HomeTexture | null {
    return this.groundTexture;
  }

  setGroundTexture(groundTexture: HomeTexture | null): void {
    if (groundTexture !== this.groundTexture) {
      const oldGroundTexture = this.groundTexture;
      this.groundTexture = groundTexture;
      this.firePropertyChange(HomeEnvironment.Property.GROUND_TEXTURE, oldGroundTexture, groundTexture);
    }
  }

  isBackgroundImageVisibleOnGround3D(): boolean {
    return this.backgroundImageVisibleOnGround3D;
  }

  setBackgroundImageVisibleOnGround3D(backgroundImageVisibleOnGround3D: boolean): void {
    if (backgroundImageVisibleOnGround3D !== this.backgroundImageVisibleOnGround3D) {
      const oldValue = this.backgroundImageVisibleOnGround3D;
      this.backgroundImageVisibleOnGround3D = backgroundImageVisibleOnGround3D;
      this.firePropertyChange(HomeEnvironment.Property.BACKGROUND_IMAGE_VISIBLE_ON_GROUND_3D, oldValue, backgroundImageVisibleOnGround3D);
    }
  }

  getSkyColor(): number {
    return this.skyColor;
  }

  setSkyColor(skyColor: number): void {
    if (skyColor !== this.skyColor) {
      const oldSkyColor = this.skyColor;
      this.skyColor = skyColor;
      this.firePropertyChange(HomeEnvironment.Property.SKY_COLOR, oldSkyColor, skyColor);
    }
  }

  getSkyTexture(): HomeTexture | null {
    return this.skyTexture;
  }

  setSkyTexture(skyTexture: HomeTexture | null): void {
    if (skyTexture !== this.skyTexture) {
      const oldSkyTexture = this.skyTexture;
      this.skyTexture = skyTexture;
      this.firePropertyChange(HomeEnvironment.Property.SKY_TEXTURE, oldSkyTexture, skyTexture);
    }
  }

  getLightColor(): number {
    return this.lightColor;
  }

  setLightColor(lightColor: number): void {
    if (lightColor !== this.lightColor) {
      const oldLightColor = this.lightColor;
      this.lightColor = lightColor;
      this.firePropertyChange(HomeEnvironment.Property.LIGHT_COLOR, oldLightColor, lightColor);
    }
  }

  getCeillingLightColor(): number {
    return this.ceilingLightColor;
  }

  setCeillingLightColor(ceilingLightColor: number): void {
    if (ceilingLightColor !== this.ceilingLightColor) {
      const oldCeilingLightColor = this.ceilingLightColor;
      this.ceilingLightColor = ceilingLightColor;
      this.firePropertyChange(HomeEnvironment.Property.CEILING_LIGHT_COLOR, oldCeilingLightColor, ceilingLightColor);
    }
  }

  getWallsAlpha(): number {
    return this.wallsAlpha;
  }

  setWallsAlpha(wallsAlpha: number): void {
    const narrowed = f32(wallsAlpha);
    if (narrowed !== this.wallsAlpha) {
      const oldWallsAlpha = this.wallsAlpha;
      this.wallsAlpha = narrowed;
      this.firePropertyChange(HomeEnvironment.Property.WALLS_ALPHA, oldWallsAlpha, narrowed);
    }
  }

  getDrawingMode(): string {
    return this.drawingMode;
  }

  setDrawingMode(drawingMode: string): void {
    if (drawingMode !== this.drawingMode) {
      const oldDrawingMode = this.drawingMode;
      this.drawingMode = drawingMode;
      this.firePropertyChange(HomeEnvironment.Property.DRAWING_MODE, oldDrawingMode, drawingMode);
    }
  }

  getSubpartSizeUnderLight(): number {
    return this.subpartSizeUnderLight;
  }

  setSubpartSizeUnderLight(subpartSizeUnderLight: number): void {
    const narrowed = f32(subpartSizeUnderLight);
    if (narrowed !== this.subpartSizeUnderLight) {
      const oldSubpartSizeUnderLight = this.subpartSizeUnderLight;
      this.subpartSizeUnderLight = narrowed;
      this.firePropertyChange(HomeEnvironment.Property.SUBPART_SIZE_UNDER_LIGHT, oldSubpartSizeUnderLight, narrowed);
    }
  }

  isAllLevelsVisible(): boolean {
    return this.allLevelsVisible;
  }

  setAllLevelsVisible(allLevelsVisible: boolean): void {
    if (allLevelsVisible !== this.allLevelsVisible) {
      const oldAllLevelsVisible = this.allLevelsVisible;
      this.allLevelsVisible = allLevelsVisible;
      this.firePropertyChange(HomeEnvironment.Property.ALL_LEVELS_VISIBLE, oldAllLevelsVisible, allLevelsVisible);
    }
  }

  getPhotoWidth(): number {
    return this.photoWidth;
  }

  setPhotoWidth(photoWidth: number): void {
    if (photoWidth !== this.photoWidth) {
      const oldPhotoWidth = this.photoWidth;
      this.photoWidth = photoWidth;
      this.firePropertyChange(HomeEnvironment.Property.PHOTO_WIDTH, oldPhotoWidth, photoWidth);
    }
  }

  getPhotoHeight(): number {
    return this.photoHeight;
  }

  setPhotoHeight(photoHeight: number): void {
    if (photoHeight !== this.photoHeight) {
      const oldPhotoHeight = this.photoHeight;
      this.photoHeight = photoHeight;
      this.firePropertyChange(HomeEnvironment.Property.PHOTO_HEIGHT, oldPhotoHeight, photoHeight);
    }
  }

  getPhotoAspectRatio(): string | null {
    return this.photoAspectRatioName;
  }

  setPhotoAspectRatio(photoAspectRatio: string | null): void {
    if (photoAspectRatio !== this.photoAspectRatioName) {
      const oldPhotoAspectRatio = this.photoAspectRatioName;
      this.photoAspectRatioName = photoAspectRatio;
      this.firePropertyChange(HomeEnvironment.Property.PHOTO_ASPECT_RATIO, oldPhotoAspectRatio, photoAspectRatio);
    }
  }

  getPhotoQuality(): number {
    return this.photoQuality;
  }

  setPhotoQuality(photoQuality: number): void {
    if (photoQuality !== this.photoQuality) {
      const oldPhotoQuality = this.photoQuality;
      this.photoQuality = photoQuality;
      this.firePropertyChange(HomeEnvironment.Property.PHOTO_QUALITY, oldPhotoQuality, photoQuality);
    }
  }

  getVideoWidth(): number {
    return this.videoWidth;
  }

  setVideoWidth(videoWidth: number): void {
    if (videoWidth !== this.videoWidth) {
      const oldVideoWidth = this.videoWidth;
      this.videoWidth = videoWidth;
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_WIDTH, oldVideoWidth, videoWidth);
    }
  }

  getVideoHeight(): number {
    return this.videoHeight;
  }

  setVideoHeight(videoHeight: number): void {
    if (videoHeight !== this.videoHeight) {
      const oldVideoHeight = this.videoHeight;
      this.videoHeight = videoHeight;
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_HEIGHT, oldVideoHeight, videoHeight);
    }
  }

  getVideoAspectRatio(): string | null {
    return this.videoAspectRatioName;
  }

  setVideoAspectRatio(videoAspectRatio: string | null): void {
    if (videoAspectRatio !== this.videoAspectRatioName) {
      const oldVideoAspectRatio = this.videoAspectRatioName;
      this.videoAspectRatioName = videoAspectRatio;
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_ASPECT_RATIO, oldVideoAspectRatio, videoAspectRatio);
    }
  }

  getVideoQuality(): number {
    return this.videoQuality;
  }

  setVideoQuality(videoQuality: number): void {
    if (videoQuality !== this.videoQuality) {
      const oldVideoQuality = this.videoQuality;
      this.videoQuality = videoQuality;
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_QUALITY, oldVideoQuality, videoQuality);
    }
  }

  getVideoSpeed(): number {
    return this.videoSpeed;
  }

  setVideoSpeed(videoSpeed: number): void {
    const narrowed = f32(videoSpeed);
    if (narrowed !== this.videoSpeed) {
      const oldVideoSpeed = this.videoSpeed;
      this.videoSpeed = narrowed;
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_SPEED, oldVideoSpeed, narrowed);
    }
  }

  getVideoFrameRate(): number {
    return this.videoFrameRate;
  }

  setVideoFrameRate(videoFrameRate: number): void {
    if (videoFrameRate !== this.videoFrameRate) {
      const oldVideoFrameRate = this.videoFrameRate;
      this.videoFrameRate = videoFrameRate;
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_FRAME_RATE, oldVideoFrameRate, videoFrameRate);
    }
  }

  getVideoCameraPath(): Camera[] {
    return this.videoCameraPath;
  }

  setVideoCameraPath(cameraPath: Camera[]): void {
    if (cameraPath !== this.videoCameraPath) {
      const oldCameraPath = this.videoCameraPath;
      this.videoCameraPath = [...cameraPath];
      this.firePropertyChange(HomeEnvironment.Property.VIDEO_CAMERA_PATH, oldCameraPath, cameraPath);
    }
  }
}
