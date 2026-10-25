import { BoxGeometry, BufferGeometry, Group, Material, Mesh, MeshStandardMaterial } from 'three';
import { lerp, lerpAngle } from './cameraMath';

export interface CarRenderPose {
  readonly x: number;
  readonly y?: number;
  readonly z: number;
  readonly heading: number;
  readonly forwardSpeed?: number;
  readonly lateralSpeed?: number;
  readonly steerAngle?: number;
}

export class CarView {
  private readonly root: Group = new Group();
  private readonly chassisGroup: Group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];

  private posX = 0;
  private posY = 0;
  private posZ = 0;
  private heading = 0;

  constructor() {
    this.root.add(this.chassisGroup);
    this.buildPlaceholderMesh();
  }

  private buildPlaceholderMesh(): void {
    // 1. Lower chassis / body box
    // Car is 1.9m wide, 0.45m tall, 4.2m long
    const bodyGeom = new BoxGeometry(1.9, 0.45, 4.2);
    const bodyMat = new MeshStandardMaterial({
      color: 0x3da5ff, // Accent blue
      roughness: 0.3,
      metalness: 0.35,
    });
    const bodyMesh = new Mesh(bodyGeom, bodyMat);
    bodyMesh.position.y = 0.35;
    this.chassisGroup.add(bodyMesh);
    this.geometries.push(bodyGeom);
    this.materials.push(bodyMat);

    // 2. Cabin / roof box
    const cabinGeom = new BoxGeometry(1.4, 0.4, 2.0);
    const cabinMat = new MeshStandardMaterial({
      color: 0x121722, // Dark tinted glass
      roughness: 0.1,
      metalness: 0.9,
    });
    const cabinMesh = new Mesh(cabinGeom, cabinMat);
    cabinMesh.position.set(0, 0.72, -0.15);
    this.chassisGroup.add(cabinMesh);
    this.geometries.push(cabinGeom);
    this.materials.push(cabinMat);

    // 3. Front Headlights (-Z direction is forward)
    const lightGeom = new BoxGeometry(0.3, 0.1, 0.05);
    const headlightMat = new MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.9,
    });
    const leftHeadlight = new Mesh(lightGeom, headlightMat);
    leftHeadlight.position.set(-0.65, 0.38, -2.11);
    const rightHeadlight = new Mesh(lightGeom, headlightMat);
    rightHeadlight.position.set(0.65, 0.38, -2.11);
    this.chassisGroup.add(leftHeadlight, rightHeadlight);
    this.geometries.push(lightGeom);
    this.materials.push(headlightMat);

    // 4. Rear Taillights (+Z direction is rear)
    const tailGeom = new BoxGeometry(0.35, 0.1, 0.05);
    const taillightMat = new MeshStandardMaterial({
      color: 0xff4d5e, // Red
      emissive: 0xff4d5e,
      emissiveIntensity: 0.9,
    });
    const leftTaillight = new Mesh(tailGeom, taillightMat);
    leftTaillight.position.set(-0.65, 0.38, 2.11);
    const rightTaillight = new Mesh(tailGeom, taillightMat);
    rightTaillight.position.set(0.65, 0.38, 2.11);
    this.chassisGroup.add(leftTaillight, rightTaillight);
    this.geometries.push(tailGeom);
    this.materials.push(taillightMat);
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

  /**
   * Interpolates position, heading, drift slide angle and steering roll
   * between previous simulation state and current simulation state.
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
  }

  public dispose(): void {
    for (const geom of this.geometries) {
      geom.dispose();
    }
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.geometries.length = 0;
    this.materials.length = 0;
    this.chassisGroup.clear();
    this.root.clear();
  }
}
