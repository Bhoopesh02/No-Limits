import { PlanarVehiclePose, TrackLimiter } from '../data/TrackLimiter';
import { createEmptySplineProjection, Spline, SplineProjection } from './Spline';

export interface TrackLimitsConfig {
  barrierMargin: number;
  offroadDecel: number;
  offroadMinSpeed: number;
  barrierMinSpeed: number;
  headOnLoss: number;
  scrapeLoss: number;
}

export const DEFAULT_TRACK_LIMITS_CONFIG: TrackLimitsConfig = {
  barrierMargin: 1.5,
  offroadDecel: 22.0,
  offroadMinSpeed: 5.0,
  barrierMinSpeed: 4.5,
  headOnLoss: 0.65,
  scrapeLoss: 0.12,
};

/**
 * Resolves vehicle interactions against road boundaries and physical barriers.
 *
 * Rules:
 * - On road: No change.
 * - Past road edge (off-road): Extra drag slows the car, but never stops it dead.
 * - At barrier line: Pushes car back inside, removes outward velocity component,
 *   and loses speed proportional to the impact angle without dropping below minimum speed.
 *   The car is never wrecked or stuck.
 */
export class TrackLimits implements TrackLimiter {
  private readonly spline: Spline;
  private readonly config: TrackLimitsConfig;
  private readonly projOut: SplineProjection;
  private lastHint = 0;

  constructor(spline: Spline, config: TrackLimitsConfig = DEFAULT_TRACK_LIMITS_CONFIG) {
    this.spline = spline;
    this.config = { ...config };
    this.projOut = createEmptySplineProjection();
  }

  public resetHint(hint = 0): void {
    this.lastHint = hint;
  }

  public getLastProjection(): SplineProjection {
    return this.projOut;
  }

  public resolve(pose: PlanarVehiclePose, dt: number): void {
    if (dt <= 0) return;

    // 1. Project vehicle onto track spline
    this.spline.project(pose.x, pose.z, this.lastHint, this.projOut);
    this.lastHint = this.projOut.distance;

    const sample = this.projOut.sample;
    const roadHalfWidth = sample.width * 0.5;
    const barrierDist = roadHalfWidth + this.config.barrierMargin;
    const offset = this.projOut.lateralOffset;
    const absOffset = Math.abs(offset);

    // Case 1: Inside road boundaries
    if (absOffset <= roadHalfWidth) {
      return;
    }

    // Case 2: Off-road shoulder (gravel/grass between road edge and barrier)
    if (absOffset < barrierDist) {
      if (pose.forwardSpeed > this.config.offroadMinSpeed) {
        pose.forwardSpeed = Math.max(
          this.config.offroadMinSpeed,
          pose.forwardSpeed - this.config.offroadDecel * dt,
        );
      }
      pose.lateralSpeed *= Math.max(0, 1 - 3.0 * dt);
      return;
    }

    // Case 3: Barrier collision (|offset| >= barrierDist)
    // 3a. Push car back inside the barrier boundary
    const insideOffset = Math.sign(offset) * (barrierDist - 0.05);
    pose.x = sample.x + insideOffset * sample.normalX;
    pose.z = sample.z + insideOffset * sample.normalZ;
    this.projOut.lateralOffset = insideOffset;

    // 3b. Velocity decomposition
    const fwdX = -Math.sin(pose.heading);
    const fwdZ = -Math.cos(pose.heading);
    const rightX = Math.cos(pose.heading);
    const rightZ = -Math.sin(pose.heading);

    const vx = fwdX * pose.forwardSpeed + rightX * pose.lateralSpeed;
    const vz = fwdZ * pose.forwardSpeed + rightZ * pose.lateralSpeed;
    const totalSpeed = Math.hypot(vx, vz);

    if (totalSpeed <= 1e-4) {
      return;
    }

    // Decompose into track tangent and track normal
    let vt = vx * sample.tangentX + vz * sample.tangentZ;
    const vn = vx * sample.normalX + vz * sample.normalZ;

    // Remove outward velocity component if heading towards or past the barrier
    const isMovingOutward = offset * vn > 0;
    const resolvedVn = isMovingOutward ? 0 : vn;

    // Speed loss proportional to impact angle
    const impactFactor = Math.min(1.0, Math.abs(vn) / totalSpeed);
    const speedLossFraction =
      this.config.scrapeLoss + impactFactor * (this.config.headOnLoss - this.config.scrapeLoss);

    vt *= 1.0 - speedLossFraction;

    // Preserve minimum speed so car is never stopped dead or stuck
    if (Math.abs(vt) < this.config.barrierMinSpeed) {
      const dir = vt >= 0 ? 1 : -1;
      vt = dir * Math.min(totalSpeed, this.config.barrierMinSpeed);
    }

    // Reconstruct world velocity
    const newVx = vt * sample.tangentX + resolvedVn * sample.normalX;
    const newVz = vt * sample.tangentZ + resolvedVn * sample.normalZ;

    // Project back onto vehicle local frame
    let newForwardSpeed = newVx * fwdX + newVz * fwdZ;
    let newLateralSpeed = newVx * rightX + newVz * rightZ;

    // Ensure car doesn't get pushed into reverse from a barrier collision
    if (newForwardSpeed < this.config.barrierMinSpeed) {
      newForwardSpeed = Math.min(totalSpeed, this.config.barrierMinSpeed);
      newLateralSpeed = 0;
    }

    pose.forwardSpeed = newForwardSpeed;
    pose.lateralSpeed = newLateralSpeed;
  }
}
