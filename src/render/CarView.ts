import * as THREE from 'three';
import { Group } from 'three';
import { getCarDetailForTier, type CarDetailLevel } from '../data/CarRenderBudget';
import { BlobShadow } from './BlobShadow';
import { CarFactory, type CarInstance } from './car/CarFactory';
import type { KazeWheels } from './car/carWheels';
import { lerp, lerpAngle } from './cameraMath';

export type GraphicsTier = 'low' | 'medium' | 'high';

export interface CarRenderPose {
  readonly x: number;
  readonly y?: number;
  readonly z: number;
  readonly heading: number;
  readonly forwardSpeed?: number;
  readonly lateralSpeed?: number;
  readonly steerAngle?: number;
  readonly isReversing?: boolean;
}

export interface CarViewOptions {
  tier?: GraphicsTier;
  detail?: CarDetailLevel;
  paintColor?: string | number | THREE.Color;
  factory?: CarFactory;
}

const WHEEL_RADIUS = 0.35; // meters (from tire geometry in CarFactory)

export class CarView {
  private readonly root: Group = new Group();
  private readonly chassisGroup: Group = new Group();
  private readonly factory: CarFactory;
  private readonly ownsFactory: boolean;
  private readonly blobShadow: BlobShadow;
  private carInstance: CarInstance;
  private currentDetail: CarDetailLevel;
  private currentPaintColor: string | number | THREE.Color;

  private posX = 0;
  private posY = 0;
  private posZ = 0;
  private heading = 0;

  private wheelRollAngle = 0;
  private lastUpdateTimestampMs = 0;

  constructor(options: CarViewOptions = {}) {
    this.root.name = 'CarView';
    this.chassisGroup.name = 'ChassisGroup';
    this.root.add(this.chassisGroup);

    if (options.factory) {
      this.factory = options.factory;
      this.ownsFactory = false;
    } else {
      this.factory = new CarFactory();
      this.ownsFactory = true;
    }

    this.currentDetail =
      options.detail ?? (options.tier ? getCarDetailForTier(options.tier) : 'medium');
    this.currentPaintColor = options.paintColor ?? 0x3da5ff;
    this.carInstance = this.factory.create(this.currentDetail, this.currentPaintColor);
    this.chassisGroup.add(this.carInstance.root);

    this.blobShadow = new BlobShadow();
    this.blobShadow.setVisible(options.tier === 'low');
    this.root.add(this.blobShadow.mesh);
  }

  public getRoot(): Group {
    return this.root;
  }

  public getPosition(): { x: number; y: number; z: number } {
    return { x: this.posX, y: this.posY, z: this.posZ };
  }

  public getHeading(): number {
    return this.heading;
  }

  public getWheels(): KazeWheels {
    return this.carInstance.wheels;
  }

  public getCarInstance(): CarInstance {
    return this.carInstance;
  }

  /**
   * Alias for backwards compatibility with existing call sites and tests.
   */
  public getKazeCar(): CarInstance {
    return this.carInstance;
  }

  public setPaintColor(color: string | number | THREE.Color): void {
    this.currentPaintColor = color;
    this.carInstance.setPaintColor(color);
  }

  public setBlobShadowVisible(visible: boolean): void {
    this.blobShadow.setVisible(visible);
  }

  public setDetail(detail: CarDetailLevel): void {
    if (this.currentDetail === detail) {
      return;
    }
    this.currentDetail = detail;
    this.chassisGroup.remove(this.carInstance.root);
    this.carInstance.dispose();
    this.carInstance = this.factory.create(detail, this.currentPaintColor);
    this.chassisGroup.add(this.carInstance.root);
  }

  public getDetail(): CarDetailLevel {
    return this.currentDetail;
  }

  public setReversing(isReversing: boolean): void {
    this.carInstance.setReversing(isReversing);
  }

  /**
   * Interpolates position, heading, drift slide angle, chassis body roll,
   * front steering angle, and wheel rolling rotation between previous simulation
   * state and current simulation state.
   * Guarantees perfectly smooth motion with zero allocations in the game loop.
   */
  public update(previous: CarRenderPose, current: CarRenderPose, alpha: number): void {
    const t = Math.max(0, Math.min(1, alpha));

    this.posX = lerp(previous.x, current.x, t);
    this.posY = lerp(previous.y ?? 0, current.y ?? 0, t);
    this.posZ = lerp(previous.z, current.z, t);
    this.heading = lerpAngle(previous.heading, current.heading, t);

    this.root.position.set(this.posX, this.posY, this.posZ);
    this.root.rotation.y = this.heading;

    if (current.isReversing !== undefined) {
      this.setReversing(current.isReversing);
    }

    // Visual drift yaw (slide angle) and body roll on steering
    const forwardSpeed = lerp(previous.forwardSpeed ?? 0, current.forwardSpeed ?? 0, t);
    const lateralSpeed = lerp(previous.lateralSpeed ?? 0, current.lateralSpeed ?? 0, t);
    const steerAngle = lerp(previous.steerAngle ?? 0, current.steerAngle ?? 0, t);

    // Lateral slide pushes the visual body angle towards velocity vector
    const slideAngle = forwardSpeed > 1.5 ? Math.atan2(lateralSpeed, forwardSpeed) : 0;
    this.chassisGroup.rotation.y = slideAngle * 0.85;

    // Subtle chassis roll into turns
    this.chassisGroup.rotation.z = -steerAngle * 0.12;

    // 1. Steering pivot on front wheels rotates from steering angle
    this.carInstance.wheels.frontLeft.steer.rotation.y = steerAngle;
    this.carInstance.wheels.frontRight.steer.rotation.y = steerAngle;

    // 2. Wheel rolling rotation from forward speed
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const dt =
      this.lastUpdateTimestampMs > 0 && now > this.lastUpdateTimestampMs
        ? Math.min(0.1, (now - this.lastUpdateTimestampMs) * 0.001)
        : 1 / 60;
    this.lastUpdateTimestampMs = now;

    // v = omega * r -> omega = v / r
    // Negative roll around X moves top of wheel forward (-Z direction)
    const deltaAngle = (forwardSpeed / WHEEL_RADIUS) * dt;
    this.wheelRollAngle = (this.wheelRollAngle - deltaAngle) % (Math.PI * 2);

    this.carInstance.wheels.frontLeft.roll.rotation.x = this.wheelRollAngle;
    this.carInstance.wheels.frontRight.roll.rotation.x = this.wheelRollAngle;
    this.carInstance.wheels.rearLeft.roll.rotation.x = this.wheelRollAngle;
    this.carInstance.wheels.rearRight.roll.rotation.x = this.wheelRollAngle;
  }

  public dispose(): void {
    this.blobShadow.dispose();
    this.carInstance.dispose();
    if (this.ownsFactory) {
      this.factory.dispose();
    }
    this.chassisGroup.clear();
    this.root.clear();
  }
}
