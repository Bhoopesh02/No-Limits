import * as THREE from 'three';
import { Group } from 'three';
import { createKazeCar, GraphicsTier, KazeCarResult, KazeWheels } from './createKazeCar';
import { lerp, lerpAngle } from './cameraMath';

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
  paintColor?: string | number | THREE.Color;
}

const WHEEL_RADIUS = 0.35; // meters (from tire geometry in createKazeCar)

export class CarView {
  private readonly root: Group = new Group();
  private readonly chassisGroup: Group = new Group();
  private readonly kazeCar: KazeCarResult;

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

    this.kazeCar = createKazeCar(options);
    this.chassisGroup.add(this.kazeCar.group);
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
    return this.kazeCar.wheels;
  }

  public getKazeCar(): KazeCarResult {
    return this.kazeCar;
  }

  public setPaintColor(color: string | number | THREE.Color): void {
    this.kazeCar.setPaintColor(color);
  }

  public setReversing(isReversing: boolean): void {
    this.kazeCar.setReversing(isReversing);
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

    // Slide angle beta = atan2(lateralSpeed, forwardSpeed)
    // Lateral slide pushes the visual body angle towards velocity vector
    const slideAngle = forwardSpeed > 1.5 ? Math.atan2(lateralSpeed, forwardSpeed) : 0;
    this.chassisGroup.rotation.y = slideAngle * 0.85;

    // Subtle chassis roll into turns
    this.chassisGroup.rotation.z = -steerAngle * 0.12;

    // 1. Steering pivot on front wheels rotates from steering angle
    this.kazeCar.wheels.frontLeft.steer.rotation.y = steerAngle;
    this.kazeCar.wheels.frontRight.steer.rotation.y = steerAngle;

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

    this.kazeCar.wheels.frontLeft.roll.rotation.x = this.wheelRollAngle;
    this.kazeCar.wheels.frontRight.roll.rotation.x = this.wheelRollAngle;
    this.kazeCar.wheels.rearLeft.roll.rotation.x = this.wheelRollAngle;
    this.kazeCar.wheels.rearRight.roll.rotation.x = this.wheelRollAngle;
  }

  public dispose(): void {
    this.kazeCar.dispose();
    this.chassisGroup.clear();
    this.root.clear();
  }
}
