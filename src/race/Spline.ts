import { TrackControlPoint } from '../data/TrackData';
import {
  createEmptySplineProjection,
  createEmptySplineSample,
  SplineProjection,
  SplineSample,
  TrackSpline,
} from '../data/TrackSpline';

export type { SplineProjection, SplineSample, TrackSpline };
export { createEmptySplineProjection, createEmptySplineSample };

/**
 * Closed centripetal Catmull-Rom spline through 3D control points with arc-length parameterization.
 *
 * Coordinate Convention & Direction:
 * - Forward direction along track: Unit Tangent T = (tangentX, 0, tangentZ)
 * - Track Right vector: Unit Normal N = (-tangentZ, 0, tangentX)
 * - Positive lateral offset (d > 0) is to the RIGHT of the track centerline.
 * - Negative lateral offset (d < 0) is to the LEFT of the track centerline.
 * - Road edges sit at +/- (width / 2).
 */
export class Spline implements TrackSpline {
  private readonly totalLength: number;
  private readonly sampleCount: number;
  private readonly stepSize: number;

  // Dense equidistant arc-length table for O(1) sampling and zero-allocation lookup
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

  constructor(controlPoints: readonly TrackControlPoint[], resolutionMeters = 1.0) {
    if (controlPoints.length < 3) {
      throw new Error('Spline requires at least 3 control points for a closed loop');
    }

    // Step 1: High-resolution evaluation along centripetal Catmull-Rom segments
    const n = controlPoints.length;
    const alpha = 0.5; // Centripetal Catmull-Rom
    const SUBDIVISIONS_PER_SEGMENT = 100;

    const rawPointsX: number[] = [];
    const rawPointsY: number[] = [];
    const rawPointsZ: number[] = [];
    const rawWidth: number[] = [];
    const rawCumulativeDist: number[] = [0];

    let accumulatedDist = 0;

    for (let i = 0; i < n; i++) {
      const p0 = controlPoints[(i - 1 + n) % n];
      const p1 = controlPoints[i];
      const p2 = controlPoints[(i + 1) % n];
      const p3 = controlPoints[(i + 2) % n];

      const d01 = Math.pow(Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z), alpha) || 1e-4;
      const d12 = Math.pow(Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z), alpha) || 1e-4;
      const d23 = Math.pow(Math.hypot(p3.x - p2.x, p3.y - p2.y, p3.z - p2.z), alpha) || 1e-4;

      const t0 = 0;
      const t1 = t0 + d01;
      const t2 = t1 + d12;
      const t3 = t2 + d23;

      for (let s = 0; s < SUBDIVISIONS_PER_SEGMENT; s++) {
        const u = s / SUBDIVISIONS_PER_SEGMENT;
        const t = t1 + u * (t2 - t1);

        // Catmull-Rom pyramid evaluation
        const a1_x = ((t1 - t) * p0.x + (t - t0) * p1.x) / (t1 - t0);
        const a1_y = ((t1 - t) * p0.y + (t - t0) * p1.y) / (t1 - t0);
        const a1_z = ((t1 - t) * p0.z + (t - t0) * p1.z) / (t1 - t0);

        const a2_x = ((t2 - t) * p1.x + (t - t1) * p2.x) / (t2 - t1);
        const a2_y = ((t2 - t) * p1.y + (t - t1) * p2.y) / (t2 - t1);
        const a2_z = ((t2 - t) * p1.z + (t - t1) * p2.z) / (t2 - t1);

        const a3_x = ((t3 - t) * p2.x + (t - t2) * p3.x) / (t3 - t2);
        const a3_y = ((t3 - t) * p2.y + (t - t2) * p3.y) / (t3 - t2);
        const a3_z = ((t3 - t) * p2.z + (t - t2) * p3.z) / (t3 - t2);

        const b1_x = ((t2 - t) * a1_x + (t - t0) * a2_x) / (t2 - t0);
        const b1_y = ((t2 - t) * a1_y + (t - t0) * a2_y) / (t2 - t0);
        const b1_z = ((t2 - t) * a1_z + (t - t0) * a2_z) / (t2 - t0);

        const b2_x = ((t3 - t) * a2_x + (t - t1) * a3_x) / (t3 - t1);
        const b2_y = ((t3 - t) * a2_y + (t - t1) * a3_y) / (t3 - t1);
        const b2_z = ((t3 - t) * a2_z + (t - t1) * a3_z) / (t3 - t1);

        const cx = ((t2 - t) * b1_x + (t - t1) * b2_x) / (t2 - t1);
        const cy = ((t2 - t) * b1_y + (t - t1) * b2_y) / (t2 - t1);
        const cz = ((t2 - t) * b1_z + (t - t1) * b2_z) / (t2 - t1);
        const cw = (1 - u) * p1.width + u * p2.width;

        if (rawPointsX.length > 0) {
          const lastIdx = rawPointsX.length - 1;
          const segmentDist = Math.hypot(
            cx - rawPointsX[lastIdx],
            cy - rawPointsY[lastIdx],
            cz - rawPointsZ[lastIdx],
          );
          accumulatedDist += segmentDist;
          rawCumulativeDist.push(accumulatedDist);
        }

        rawPointsX.push(cx);
        rawPointsY.push(cy);
        rawPointsZ.push(cz);
        rawWidth.push(cw);
      }
    }

    // Close the loop to connect back to the start point
    const closingDist = Math.hypot(
      rawPointsX[0] - rawPointsX[rawPointsX.length - 1],
      rawPointsY[0] - rawPointsY[rawPointsY.length - 1],
      rawPointsZ[0] - rawPointsZ[rawPointsZ.length - 1],
    );
    accumulatedDist += closingDist;
    this.totalLength = accumulatedDist;

    // Step 2: Resample at equidistant steps along arc-length
    this.stepSize = Math.max(0.1, resolutionMeters);
    this.sampleCount = Math.max(16, Math.round(this.totalLength / this.stepSize));

    this.tableX = new Float64Array(this.sampleCount);
    this.tableY = new Float64Array(this.sampleCount);
    this.tableZ = new Float64Array(this.sampleCount);
    this.tableTx = new Float64Array(this.sampleCount);
    this.tableTy = new Float64Array(this.sampleCount);
    this.tableTz = new Float64Array(this.sampleCount);
    this.tableNx = new Float64Array(this.sampleCount);
    this.tableNy = new Float64Array(this.sampleCount);
    this.tableNz = new Float64Array(this.sampleCount);
    this.tableWidth = new Float64Array(this.sampleCount);

    let rawIdx = 0;
    const rawCount = rawPointsX.length;

    for (let k = 0; k < this.sampleCount; k++) {
      const targetDist = (k / this.sampleCount) * this.totalLength;

      // Advance rawIdx until targetDist is between rawCumulativeDist[rawIdx] and rawCumulativeDist[rawIdx + 1]
      while (rawIdx < rawCount - 1 && rawCumulativeDist[rawIdx + 1] < targetDist) {
        rawIdx++;
      }

      const dA = rawCumulativeDist[rawIdx];
      const dB = rawIdx < rawCount - 1 ? rawCumulativeDist[rawIdx + 1] : this.totalLength;
      const frac = dB > dA ? (targetDist - dA) / (dB - dA) : 0;
      const nextRawIdx = (rawIdx + 1) % rawCount;

      this.tableX[k] = (1 - frac) * rawPointsX[rawIdx] + frac * rawPointsX[nextRawIdx];
      this.tableY[k] = (1 - frac) * rawPointsY[rawIdx] + frac * rawPointsY[nextRawIdx];
      this.tableZ[k] = (1 - frac) * rawPointsZ[rawIdx] + frac * rawPointsZ[nextRawIdx];
      this.tableWidth[k] = (1 - frac) * rawWidth[rawIdx] + frac * rawWidth[nextRawIdx];
    }

    // Step 3: Compute continuous unit tangents and normals via central finite differences
    for (let k = 0; k < this.sampleCount; k++) {
      const prevK = (k - 1 + this.sampleCount) % this.sampleCount;
      const nextK = (k + 1) % this.sampleCount;

      const dx = this.tableX[nextK] - this.tableX[prevK];
      const dy = this.tableY[nextK] - this.tableY[prevK];
      const dz = this.tableZ[nextK] - this.tableZ[prevK];
      const len = Math.hypot(dx, dy, dz) || 1e-6;

      const tx = dx / len;
      const ty = dy / len;
      const tz = dz / len;

      this.tableTx[k] = tx;
      this.tableTy[k] = ty;
      this.tableTz[k] = tz;

      // Unit normal in horizontal plane pointing right: N = (-tz, 0, tx)
      const hLen = Math.hypot(-tz, tx) || 1e-6;
      this.tableNx[k] = -tz / hLen;
      this.tableNy[k] = 0;
      this.tableNz[k] = tx / hLen;
    }
  }

  public get length(): number {
    return this.totalLength;
  }

  /**
   * Wrap any real distance in meters into the range [0, length).
   */
  public wrap(distance: number): number {
    const l = this.totalLength;
    return ((distance % l) + l) % l;
  }

  /**
   * Sample position, unit tangent, unit normal and width at arc-length distance.
   * Mutates and returns the provided out object (zero allocations).
   */
  public sample(distance: number, out: SplineSample): SplineSample {
    const s = this.wrap(distance);
    const continuousIdx = (s / this.totalLength) * this.sampleCount;
    const i0 = Math.floor(continuousIdx);
    const i1 = (i0 + 1) % this.sampleCount;
    const frac = continuousIdx - i0;

    out.x = (1 - frac) * this.tableX[i0] + frac * this.tableX[i1];
    out.y = (1 - frac) * this.tableY[i0] + frac * this.tableY[i1];
    out.z = (1 - frac) * this.tableZ[i0] + frac * this.tableZ[i1];

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
    return out;
  }

  /**
   * Project a 2D planar coordinate (x, z) onto the spline centerline.
   * Searches a local window around hint first; falls back to global search if vehicle is far from hint.
   * Mutates and returns the out projection object (zero allocations).
   */
  public project(x: number, z: number, hint: number, out: SplineProjection): SplineProjection {
    const l = this.totalLength;
    const count = this.sampleCount;

    // Search window in meters around hint
    const WINDOW_METERS = 60.0;
    const windowSamples = Math.ceil((WINDOW_METERS / l) * count);

    const hintWrapped = this.wrap(hint);
    const centerIdx = Math.floor((hintWrapped / l) * count);

    let bestIdx = centerIdx;
    let minD2 = Infinity;

    // 1. Search local window
    for (let offset = -windowSamples; offset <= windowSamples; offset++) {
      const idx = (((centerIdx + offset) % count) + count) % count;
      const dx = x - this.tableX[idx];
      const dz = z - this.tableZ[idx];
      const d2 = dx * dx + dz * dz;
      if (d2 < minD2) {
        minD2 = d2;
        bestIdx = idx;
      }
    }

    // 2. If the best point in the local window is far (> 45 m), fall back to global search
    const FALLBACK_THRESHOLD_D2 = 45 * 45;
    if (minD2 > FALLBACK_THRESHOLD_D2) {
      // Coarse search first (every 4th sample)
      let coarseBest = 0;
      let coarseMinD2 = Infinity;
      for (let i = 0; i < count; i += 4) {
        const dx = x - this.tableX[i];
        const dz = z - this.tableZ[i];
        const d2 = dx * dx + dz * dz;
        if (d2 < coarseMinD2) {
          coarseMinD2 = d2;
          coarseBest = i;
        }
      }

      // Fine search around coarseBest
      for (let offset = -4; offset <= 4; offset++) {
        const idx = (((coarseBest + offset) % count) + count) % count;
        const dx = x - this.tableX[idx];
        const dz = z - this.tableZ[idx];
        const d2 = dx * dx + dz * dz;
        if (d2 < minD2) {
          minD2 = d2;
          bestIdx = idx;
        }
      }
    }

    // 3. Sub-sample refinement along tangent
    const sampleDist = (bestIdx / count) * l;
    this.sample(sampleDist, out.sample);

    const dx = x - out.sample.x;
    const dz = z - out.sample.z;
    const forwardProj = dx * out.sample.tangentX + dz * out.sample.tangentZ;

    const refinedDist = this.wrap(sampleDist + forwardProj);
    this.sample(refinedDist, out.sample);

    out.distance = refinedDist;
    const refDx = x - out.sample.x;
    const refDz = z - out.sample.z;
    out.lateralOffset = refDx * out.sample.normalX + refDz * out.sample.normalZ;

    return out;
  }
}
