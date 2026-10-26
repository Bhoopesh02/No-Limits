import { PerspectiveCamera, Vector3 } from 'three';
import {
  calcResponsiveVfov,
  clamp01,
  clampDeltaTime,
  lerpAngle,
} from './cameraMath';

export { clamp01 };

// CameraRig tuning constants
export const FOV_MIN = 60; // degrees at standstill
export const FOV_MAX = 70; // hard cap at top speed (reduced from 78 to prevent car shrinking)
export const FOV_MAX_REDUCED_MOTION = 64; // for Reduce Motion accessibility setting
export const DIST_MIN = 6.0; // chase distance at standstill (m)
export const DIST_MAX = 6.8; // hard cap at top speed (reduced from 7.5 to keep car closer)
export const HEIGHT_MIN = 2.4; // chase height at standstill (m)
export const HEIGHT_MAX = 2.6; // chase height at top speed (reduced from 2.8)
export const SPEED_SMOOTH = 4; // higher = reacts faster
export const ZOOM_CAP_SPEED_KMH = 55; // stop zoom-out at 55 km/h
export const ZOOM_CAP_SPEED_MS = 55 / 3.6; // ~15.278 m/s

// Module-level fallback for standalone updateSpeedFactor usage
let moduleSpeedFactor = 0;

/**
 * Normalizes speed to 0..1 using topSpeed, applies ease-out curve,
 * and performs frame-rate independent exponential smoothing.
 */
export function updateSpeedFactor(
  speed: number,
  topSpeed: number,
  dt: number,
  speedSmooth = SPEED_SMOOTH,
): number {
  if (topSpeed <= 0 || dt <= 0) return moduleSpeedFactor;
  const target = clamp01(speed / topSpeed);
  // Ease-out so the effect is strong early and flattens near top speed
  const eased = 1 - (1 - target) * (1 - target);
  // Frame-rate independent exponential smoothing
  moduleSpeedFactor += (eased - moduleSpeedFactor) * (1 - Math.exp(-speedSmooth * dt));
  return moduleSpeedFactor;
}

export interface CameraRigOptions {
  distMin?: number;
  distMax?: number;
  heightMin?: number;
  heightMax?: number;
  fovMin?: number;
  fovMax?: number;
  lookAtHeight?: number;
  maxSpeed?: number;
  zoomCapSpeed?: number;
  stiffness?: number;
  damping?: number;
  speedSmooth?: number;
  reduceMotion?: boolean;
  /** Backward compatibility aliases */
  distance?: number;
  height?: number;
  baseFov?: number;
}

export class CameraRig {
  private readonly camera: PerspectiveCamera;
  private readonly distMin: number;
  private readonly distMax: number;
  private readonly heightMin: number;
  private readonly heightMax: number;
  private readonly fovMin: number;
  private fovMax: number;
  private readonly lookAtHeight: number;
  private readonly maxSpeed: number;
  private zoomCapSpeed: number;
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly speedSmooth: number;
  private reduceMotion: boolean;

  // Smoothed speed factor [0..1] kept as an instance field (zero allocations per frame)
  private speedFactor = 0;

  // Smoothed camera heading angle (radians) - lags during turns for arcade feel without linear drag
  private camHeading = 0;

  // Camera world position (strictly bounded to car position + distance)
  private posX = 0;
  private posY: number;
  private posZ: number;

  // Camera look-at target
  private lookX = 0;
  private lookY = 1.2;
  private lookZ = 0;

  private readonly lookTargetVec = new Vector3();
  private initialized = false;

  constructor(camera: PerspectiveCamera, options: CameraRigOptions = {}) {
    this.camera = camera;
    this.distMin = options.distMin ?? DIST_MIN;
    this.distMax = options.distMax ?? options.distance ?? DIST_MAX;
    this.heightMin = options.heightMin ?? HEIGHT_MIN;
    this.heightMax = options.heightMax ?? options.height ?? HEIGHT_MAX;
    this.fovMin = options.fovMin ?? options.baseFov ?? FOV_MIN;
    this.reduceMotion = options.reduceMotion ?? false;
    this.fovMax =
      options.fovMax ?? (this.reduceMotion ? FOV_MAX_REDUCED_MOTION : FOV_MAX);
    this.lookAtHeight = options.lookAtHeight ?? 1.2;
    this.maxSpeed = options.maxSpeed ?? 80.56;
    this.zoomCapSpeed = options.zoomCapSpeed ?? ZOOM_CAP_SPEED_MS;
    this.stiffness = options.stiffness ?? 32;
    this.damping = options.damping ?? 11.5;
    this.speedSmooth = options.speedSmooth ?? SPEED_SMOOTH;

    this.posY = this.heightMin;
    this.posZ = this.distMin;
    this.camera.fov = this.fovMin;
  }

  /**
   * Updates smoothed speed factor using normalized, clamped speed and ease-out curve.
   */
  public updateSpeedFactor(speed: number, topSpeed: number, dt: number): number {
    if (topSpeed <= 0 || dt <= 0) return this.speedFactor;
    const target = clamp01(speed / topSpeed);
    // Ease-out so the effect is strong early and flattens near top speed
    const eased = 1 - (1 - target) * (1 - target);
    // Frame-rate independent exponential smoothing
    this.speedFactor += (eased - this.speedFactor) * (1 - Math.exp(-this.speedSmooth * dt));
    return this.speedFactor;
  }

  public getSpeedFactor(): number {
    return this.speedFactor;
  }

  public getCamHeading(): number {
    return this.camHeading;
  }

  public setReduceMotion(reduce: boolean): void {
    this.reduceMotion = reduce;
    this.fovMax = reduce ? FOV_MAX_REDUCED_MOTION : FOV_MAX;
  }

  public teleport(carPos: { x: number; y: number; z: number }, heading: number): void {
    this.speedFactor = 0;
    this.camHeading = heading;

    const dist = this.distMin;
    const height = this.heightMin;
    const fwdX = -Math.sin(heading);
    const fwdZ = -Math.cos(heading);

    this.posX = carPos.x - fwdX * dist;
    this.posY = carPos.y + height;
    this.posZ = carPos.z - fwdZ * dist;

    this.lookX = carPos.x + fwdX * 2.0;
    this.lookY = carPos.y + this.lookAtHeight;
    this.lookZ = carPos.z + fwdZ * 2.0;

    this.camera.position.set(this.posX, this.posY, this.posZ);
    this.lookTargetVec.set(this.lookX, this.lookY, this.lookZ);
    this.camera.lookAt(this.lookTargetVec);

    this.camera.fov = this.fovMin;
    this.camera.updateProjectionMatrix();
    this.initialized = true;
  }

  public update(
    carPos: { x: number; y: number; z: number },
    heading: number,
    speed: number,
    dt: number,
    aspect: number,
    isReversing?: boolean,
  ): void {
    if (!this.initialized) {
      this.teleport(carPos, heading);
    }

    const safeDt = clampDeltaTime(dt, 0.1);
    if (safeDt <= 0) return;

    // 1. Advance smoothed speedFactor (clamped 0..1 with ease-out and exp smoothing)
    // When reversing, effective speed is 0 so camera FOV and chase distance do not widen
    // Zoom-out stops expanding at zoomCapSpeed (55 km/h)
    const effectiveSpeed = isReversing || speed <= 0 ? 0 : speed;
    this.updateSpeedFactor(effectiveSpeed, this.zoomCapSpeed, safeDt);
    const t = this.speedFactor;

    // 2. Interpolate chase distance and height with hard limits
    const dist = this.distMin + (this.distMax - this.distMin) * t;
    const height = this.heightMin + (this.heightMax - this.heightMin) * t;

    // 3. Smooth camera heading (angular lag gives arcade drift feel without linear spring drag)
    const headingRate = 8.0;
    const headingT = 1 - Math.exp(-headingRate * safeDt);
    this.camHeading = lerpAngle(this.camHeading, heading, headingT);

    const camFwdX = -Math.sin(this.camHeading);
    const camFwdZ = -Math.cos(this.camHeading);

    // Anchored directly to car position: chase distance is EXACTLY `dist`, eliminating velocity stretch!
    this.posX = carPos.x - camFwdX * dist;
    this.posZ = carPos.z - camFwdZ * dist;

    // Smooth vertical position to absorb track bumps
    const heightRate = 12.0;
    const heightT = 1 - Math.exp(-heightRate * safeDt);
    this.posY += (carPos.y + height - this.posY) * heightT;

    // Smooth look-at target
    const carFwdX = -Math.sin(heading);
    const carFwdZ = -Math.cos(heading);
    const targetLookX = carPos.x + carFwdX * 2.0;
    const targetLookY = carPos.y + this.lookAtHeight;
    const targetLookZ = carPos.z + carFwdZ * 2.0;

    const lookRate = 14.0;
    const lookT = 1 - Math.exp(-lookRate * safeDt);
    this.lookX += (targetLookX - this.lookX) * lookT;
    this.lookY += (targetLookY - this.lookY) * lookT;
    this.lookZ += (targetLookZ - this.lookZ) * lookT;

    // Update Three.js camera position and orientation
    this.camera.position.set(this.posX, this.posY, this.posZ);
    this.lookTargetVec.set(this.lookX, this.lookY, this.lookZ);
    this.camera.lookAt(this.lookTargetVec);

    // 3. Responsive FOV with speed limits
    const baseMin = calcResponsiveVfov(this.fovMin, aspect);
    const baseMax = calcResponsiveVfov(this.fovMax, aspect);
    const targetFov = baseMin + (baseMax - baseMin) * t;

    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
  }

  public getCamera(): PerspectiveCamera {
    return this.camera;
  }

  public getDistMin(): number {
    return this.distMin;
  }

  public getDistMax(): number {
    return this.distMax;
  }

  public getHeightMin(): number {
    return this.heightMin;
  }

  public getHeightMax(): number {
    return this.heightMax;
  }

  public getFovMin(): number {
    return this.fovMin;
  }

  public getFovMax(): number {
    return this.fovMax;
  }

  public getMaxSpeed(): number {
    return this.maxSpeed;
  }

  public getZoomCapSpeed(): number {
    return this.zoomCapSpeed;
  }

  public setZoomCapSpeed(speedMs: number): void {
    this.zoomCapSpeed = speedMs;
  }

  public getStiffness(): number {
    return this.stiffness;
  }

  public getDamping(): number {
    return this.damping;
  }

  public dispose(): void {
    // CameraRig has no persistent DOM or WebGL listeners to clean up
  }
}
