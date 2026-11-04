import { clamp } from '../core/clamp';
import type { TrackSample, TrackSampler } from '../data/TrackSampler';
import {
  RACING_LINE_MAX_BRAKE_DECEL,
  RACING_LINE_MAX_DRIVE_ACCEL,
  RACING_LINE_MAX_LAT_ACCEL,
  RACING_LINE_ROAD_SAFETY_MARGIN,
  RACING_LINE_SAMPLE_STEP_METERS,
} from './AiTuning';

export interface RacingLineSample {
  x: number;
  y: number;
  z: number;
  tangentX: number;
  tangentY: number;
  tangentZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  width: number;
  offset: number;
  targetSpeed: number;
  curvature: number;
}

export function createEmptyRacingLineSample(): RacingLineSample {
  return {
    x: 0,
    y: 0,
    z: 0,
    tangentX: 0,
    tangentY: 0,
    tangentZ: -1,
    normalX: 1,
    normalY: 0,
    normalZ: 0,
    width: 15,
    offset: 0,
    targetSpeed: 50,
    curvature: 0,
  };
}

/**
 * Precomputed optimal racing line along a track spline.
 *
 * Algorithm:
 * 1. Samples track at equidistant arc lengths (~4.5 m).
 * 2. Computes signed track curvature and generates apex-seeking lateral offsets.
 * 3. Enforces road boundary safety margins.
 * 4. Determines max cornering speeds from lateral acceleration limits.
 * 5. Runs backward braking pass to guarantee stopping distance before corners.
 * 6. Runs forward acceleration pass to enforce realistic propulsion limits.
 * 7. Wraps cyclically without seam discontinuities.
 */
export class RacingLine {
  public readonly trackLength: number;
  public readonly sampleCount: number;
  public readonly stepSize: number;

  private readonly tableX: Float64Array;
  private readonly tableY: Float64Array;
  private readonly tableZ: Float64Array;
  private readonly tableTx: Float64Array;
  private readonly tableTy: Float64Array;
  private readonly tableTz: Float64Array;
  private readonly tableNx: Float64Array;
  private readonly tableNy: Float64Array;
  private readonly tableNz: Float64Array;
  private readonly tableWidth: Float64Array;
  private readonly tableCurvature: Float64Array;
  private readonly tableOffset: Float64Array;
  private readonly tableTargetSpeed: Float64Array;

  constructor(sampler: TrackSampler, topSpeed = 65.0) {
    this.trackLength = sampler.totalLength;
    const n = Math.max(16, Math.round(this.trackLength / RACING_LINE_SAMPLE_STEP_METERS));
    this.sampleCount = n;
    this.stepSize = this.trackLength / n;
    const ds = this.stepSize;

    this.tableX = new Float64Array(n);
    this.tableY = new Float64Array(n);
    this.tableZ = new Float64Array(n);
    this.tableTx = new Float64Array(n);
    this.tableTy = new Float64Array(n);
    this.tableTz = new Float64Array(n);
    this.tableNx = new Float64Array(n);
    this.tableNy = new Float64Array(n);
    this.tableNz = new Float64Array(n);
    this.tableWidth = new Float64Array(n);
    this.tableCurvature = new Float64Array(n);
    this.tableOffset = new Float64Array(n);
    this.tableTargetSpeed = new Float64Array(n);

    // 1. Sample track centerline
    const tempTrackSample: TrackSample = {
      x: 0,
      y: 0,
      z: 0,
      tangentX: 0,
      tangentY: 0,
      tangentZ: -1,
      normalX: 1,
      normalY: 0,
      normalZ: 0,
      width: 15,
    };

    for (let i = 0; i < n; i++) {
      const s = i * ds;
      sampler.sample(s, tempTrackSample);
      this.tableX[i] = tempTrackSample.x;
      this.tableY[i] = tempTrackSample.y;
      this.tableZ[i] = tempTrackSample.z;
      this.tableTx[i] = tempTrackSample.tangentX;
      this.tableTy[i] = tempTrackSample.tangentY;
      this.tableTz[i] = tempTrackSample.tangentZ;
      this.tableNx[i] = tempTrackSample.normalX;
      this.tableNy[i] = tempTrackSample.normalY;
      this.tableNz[i] = tempTrackSample.normalZ;
      this.tableWidth[i] = tempTrackSample.width;
    }

    // 2. Curvature & Apex Lateral Offsets
    for (let i = 0; i < n; i++) {
      const prev = (i - 1 + n) % n;
      const next = (i + 1) % n;

      const dTx = this.tableTx[next] - this.tableTx[prev];
      const dTz = this.tableTz[next] - this.tableTz[prev];

      // Turning into normal direction (+ = turning right towards normal, - = turning left)
      const dotN = dTx * this.tableNx[i] + dTz * this.tableNz[i];
      const curvatureMag = Math.hypot(dTx, dTz) / (2 * ds);
      this.tableCurvature[i] = curvatureMag;

      const halfRoad = this.tableWidth[i] * 0.5;
      const maxOffset = Math.max(0, halfRoad - RACING_LINE_ROAD_SAFETY_MARGIN);

      // Apex offset bias: move inside corner (in direction of normal dot product)
      const insideDir = Math.sign(dotN);
      const apexOffset = insideDir * Math.min(maxOffset, curvatureMag * 120.0);
      this.tableOffset[i] = clamp(apexOffset, -maxOffset, maxOffset);
    }

    // 3. Initial Target Speeds from curvature limit
    for (let i = 0; i < n; i++) {
      // Effective curvature reduction from apex cutting (~25% flatter radius)
      const effCurvature = Math.max(1e-4, this.tableCurvature[i] * 0.75);
      const maxCornerSpeed = Math.sqrt(RACING_LINE_MAX_LAT_ACCEL / effCurvature);
      this.tableTargetSpeed[i] = Math.min(topSpeed, maxCornerSpeed);
    }

    // 4. Backward Pass (Braking limit: v_i <= sqrt(v_{i+1}^2 + 2 * a_brake * ds))
    // 2 cyclic passes to ensure seamless wrap-around at the start line
    for (let pass = 0; pass < 2; pass++) {
      for (let i = n - 1; i >= 0; i--) {
        const next = (i + 1) % n;
        const maxEntrySpeed = Math.sqrt(
          this.tableTargetSpeed[next] * this.tableTargetSpeed[next] +
            2 * RACING_LINE_MAX_BRAKE_DECEL * ds,
        );
        if (this.tableTargetSpeed[i] > maxEntrySpeed) {
          this.tableTargetSpeed[i] = maxEntrySpeed;
        }
      }
    }

    // 5. Forward Pass (Acceleration limit: v_{i+1} <= sqrt(v_i^2 + 2 * a_drive * ds))
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const maxExitSpeed = Math.sqrt(
          this.tableTargetSpeed[i] * this.tableTargetSpeed[i] +
            2 * RACING_LINE_MAX_DRIVE_ACCEL * ds,
        );
        if (this.tableTargetSpeed[next] > maxExitSpeed) {
          this.tableTargetSpeed[next] = maxExitSpeed;
        }
      }
    }
  }

  public wrap(distance: number): number {
    const l = this.trackLength;
    return ((distance % l) + l) % l;
  }

  public targetSpeedAt(distance: number): number {
    const s = this.wrap(distance);
    const continuousIdx = (s / this.trackLength) * this.sampleCount;
    const i0 = Math.floor(continuousIdx);
    const i1 = (i0 + 1) % this.sampleCount;
    const frac = continuousIdx - i0;
    return (1 - frac) * this.tableTargetSpeed[i0] + frac * this.tableTargetSpeed[i1];
  }

  public offsetAt(distance: number): number {
    const s = this.wrap(distance);
    const continuousIdx = (s / this.trackLength) * this.sampleCount;
    const i0 = Math.floor(continuousIdx);
    const i1 = (i0 + 1) % this.sampleCount;
    const frac = continuousIdx - i0;
    return (1 - frac) * this.tableOffset[i0] + frac * this.tableOffset[i1];
  }

  public sampleAt(distance: number, out: RacingLineSample): void {
    const s = this.wrap(distance);
    const continuousIdx = (s / this.trackLength) * this.sampleCount;
    const i0 = Math.floor(continuousIdx);
    const i1 = (i0 + 1) % this.sampleCount;
    const frac = continuousIdx - i0;

    const cx = (1 - frac) * this.tableX[i0] + frac * this.tableX[i1];
    const cy = (1 - frac) * this.tableY[i0] + frac * this.tableY[i1];
    const cz = (1 - frac) * this.tableZ[i0] + frac * this.tableZ[i1];

    const tx = (1 - frac) * this.tableTx[i0] + frac * this.tableTx[i1];
    const ty = (1 - frac) * this.tableTy[i0] + frac * this.tableTy[i1];
    const tz = (1 - frac) * this.tableTz[i0] + frac * this.tableTz[i1];
    const tLen = Math.hypot(tx, ty, tz) || 1e-6;
    out.tangentX = tx / tLen;
    out.tangentY = ty / tLen;
    out.tangentZ = tz / tLen;

    const nx = (1 - frac) * this.tableNx[i0] + frac * this.tableNx[i1];
    const ny = (1 - frac) * this.tableNy[i0] + frac * this.tableNy[i1];
    const nz = (1 - frac) * this.tableNz[i0] + frac * this.tableNz[i1];
    const nLen = Math.hypot(nx, ny, nz) || 1e-6;
    out.normalX = nx / nLen;
    out.normalY = ny / nLen;
    out.normalZ = nz / nLen;

    out.width = (1 - frac) * this.tableWidth[i0] + frac * this.tableWidth[i1];
    out.offset = (1 - frac) * this.tableOffset[i0] + frac * this.tableOffset[i1];
    out.targetSpeed = (1 - frac) * this.tableTargetSpeed[i0] + frac * this.tableTargetSpeed[i1];
    out.curvature = (1 - frac) * this.tableCurvature[i0] + frac * this.tableCurvature[i1];

    out.x = cx + out.normalX * out.offset;
    out.y = cy;
    out.z = cz + out.normalZ * out.offset;
  }
}
