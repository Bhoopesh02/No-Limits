import { PerspectiveCamera, Vector3 } from 'three';
import { calcCameraFov, clampDeltaTime, stepSpring1D } from './cameraMath';

export interface CameraRigOptions {
  distance?: number;
  height?: number;
  lookAtHeight?: number;
  baseFov?: number;
  maxSpeed?: number;
  stiffness?: number;
  damping?: number;
}

export class CameraRig {
  private readonly camera: PerspectiveCamera;
  private readonly distance: number;
  private readonly height: number;
  private readonly lookAtHeight: number;
  private readonly baseFov: number;
  private readonly maxSpeed: number;
  private readonly stiffness: number;
  private readonly damping: number;

  // Spring state for camera position
  private posX = 0;
  private posY = 2.6;
  private posZ = 7.5;
  private velX = 0;
  private velY = 0;
  private velZ = 0;

  // Spring state for camera look-at target
  private lookX = 0;
  private lookY = 1.2;
  private lookZ = 0;
  private lookVelX = 0;
  private lookVelY = 0;
  private lookVelZ = 0;

  private readonly lookTargetVec = new Vector3();
  private initialized = false;

  constructor(camera: PerspectiveCamera, options: CameraRigOptions = {}) {
    this.camera = camera;
    this.distance = options.distance ?? 7.5;
    this.height = options.height ?? 2.6;
    this.lookAtHeight = options.lookAtHeight ?? 1.2;
    this.baseFov = options.baseFov ?? 60;
    this.maxSpeed = options.maxSpeed ?? 80.56;
    this.stiffness = options.stiffness ?? 32;
    this.damping = options.damping ?? 11.5;
  }

  public teleport(carPos: { x: number; y: number; z: number }, heading: number): void {
    const fwdX = -Math.sin(heading);
    const fwdZ = -Math.cos(heading);

    this.posX = carPos.x - fwdX * this.distance;
    this.posY = carPos.y + this.height;
    this.posZ = carPos.z - fwdZ * this.distance;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;

    this.lookX = carPos.x + fwdX * 2.0;
    this.lookY = carPos.y + this.lookAtHeight;
    this.lookZ = carPos.z + fwdZ * 2.0;
    this.lookVelX = 0;
    this.lookVelY = 0;
    this.lookVelZ = 0;

    this.camera.position.set(this.posX, this.posY, this.posZ);
    this.lookTargetVec.set(this.lookX, this.lookY, this.lookZ);
    this.camera.lookAt(this.lookTargetVec);
    this.initialized = true;
  }

  public update(
    carPos: { x: number; y: number; z: number },
    heading: number,
    speed: number,
    dt: number,
    aspect: number,
  ): void {
    if (!this.initialized) {
      this.teleport(carPos, heading);
    }

    const safeDt = clampDeltaTime(dt, 0.1);
    if (safeDt <= 0) return;

    // Ideal camera position behind the car
    const fwdX = -Math.sin(heading);
    const fwdZ = -Math.cos(heading);

    const targetPosX = carPos.x - fwdX * this.distance;
    const targetPosY = carPos.y + this.height;
    const targetPosZ = carPos.z - fwdZ * this.distance;

    const targetLookX = carPos.x + fwdX * 2.0;
    const targetLookY = carPos.y + this.lookAtHeight;
    const targetLookZ = carPos.z + fwdZ * 2.0;

    // Smooth camera position with spring
    const springX = stepSpring1D(
      this.posX,
      this.velX,
      targetPosX,
      this.stiffness,
      this.damping,
      safeDt,
    );
    const springY = stepSpring1D(
      this.posY,
      this.velY,
      targetPosY,
      this.stiffness,
      this.damping,
      safeDt,
    );
    const springZ = stepSpring1D(
      this.posZ,
      this.velZ,
      targetPosZ,
      this.stiffness,
      this.damping,
      safeDt,
    );

    this.posX = springX.position;
    this.velX = springX.velocity;
    this.posY = springY.position;
    this.velY = springY.velocity;
    this.posZ = springZ.position;
    this.velZ = springZ.velocity;

    // Smooth camera look-at target with spring
    const lookSpringX = stepSpring1D(
      this.lookX,
      this.lookVelX,
      targetLookX,
      this.stiffness,
      this.damping,
      safeDt,
    );
    const lookSpringY = stepSpring1D(
      this.lookY,
      this.lookVelY,
      targetLookY,
      this.stiffness,
      this.damping,
      safeDt,
    );
    const lookSpringZ = stepSpring1D(
      this.lookZ,
      this.lookVelZ,
      targetLookZ,
      this.stiffness,
      this.damping,
      safeDt,
    );

    this.lookX = lookSpringX.position;
    this.lookVelX = lookSpringX.velocity;
    this.lookY = lookSpringY.position;
    this.lookVelY = lookSpringY.velocity;
    this.lookZ = lookSpringZ.position;
    this.lookVelZ = lookSpringZ.velocity;

    // Update Three.js camera position and orientation
    this.camera.position.set(this.posX, this.posY, this.posZ);
    this.lookTargetVec.set(this.lookX, this.lookY, this.lookZ);
    this.camera.lookAt(this.lookTargetVec);

    // Update responsive and speed-widened FOV
    const targetFov = calcCameraFov(this.baseFov, aspect, speed, this.maxSpeed);
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }
  }

  public getCamera(): PerspectiveCamera {
    return this.camera;
  }

  public dispose(): void {
    // CameraRig has no persistent DOM or WebGL listeners to clean up
  }
}
