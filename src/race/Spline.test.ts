import { describe, expect, it } from 'vitest';
import trackJson from '../../public/assets/tracks/coastal-highway/data/track-coastal-highway.json';
import { parseTrackData } from '../data/TrackData';
import { createEmptySplineProjection, createEmptySplineSample, Spline } from './Spline';

describe('Spline', () => {
  // A circular test spline with radius R = 100 m (circumference ~ 628.3 m)
  const circlePoints = [
    { x: 100, y: 0, z: 0, width: 14 },
    { x: 0, y: 0, z: -100, width: 14 },
    { x: -100, y: 0, z: 0, width: 14 },
    { x: 0, y: 0, z: 100, width: 14 },
  ];

  it('is closed (end meets start)', () => {
    const spline = new Spline(circlePoints, 1.0);
    const s0 = createEmptySplineSample();
    const sEnd = createEmptySplineSample();

    spline.sample(0, s0);
    spline.sample(spline.length, sEnd);

    expect(s0.x).toBeCloseTo(sEnd.x, 2);
    expect(s0.y).toBeCloseTo(sEnd.y, 2);
    expect(s0.z).toBeCloseTo(sEnd.z, 2);
    expect(s0.tangentX).toBeCloseTo(sEnd.tangentX, 2);
    expect(s0.tangentZ).toBeCloseTo(sEnd.tangentZ, 2);
  });

  it('has length close to expected analytical length', () => {
    const spline = new Spline(circlePoints, 0.5);
    // Catmull-Rom through 4 points on a circle slightly cuts corners; length should be ~560 - 628m
    expect(spline.length).toBeGreaterThan(500);
    expect(spline.length).toBeLessThan(630);
  });

  it('produces continuous positions and unit length tangents', () => {
    const spline = new Spline(circlePoints, 1.0);
    const sample = createEmptySplineSample();
    const prevSample = createEmptySplineSample();

    spline.sample(0, prevSample);

    const stepMeters = 5.0;
    for (let d = stepMeters; d < spline.length; d += stepMeters) {
      spline.sample(d, sample);

      const tanLen = Math.hypot(sample.tangentX, sample.tangentY, sample.tangentZ);
      expect(tanLen).toBeCloseTo(1.0, 3);

      const normLen = Math.hypot(sample.normalX, sample.normalY, sample.normalZ);
      expect(normLen).toBeCloseTo(1.0, 3);

      const stepDist = Math.hypot(sample.x - prevSample.x, sample.z - prevSample.z);
      expect(stepDist).toBeCloseTo(stepMeters, 0.5);

      prevSample.x = sample.x;
      prevSample.y = sample.y;
      prevSample.z = sample.z;
    }
  });

  it('wrap works properly for positive, negative, and out-of-range values', () => {
    const spline = new Spline(circlePoints, 1.0);
    const L = spline.length;

    expect(spline.wrap(0)).toBeCloseTo(0, 5);
    expect(spline.wrap(L)).toBeCloseTo(0, 5);
    expect(spline.wrap(L * 2 + 50)).toBeCloseTo(50, 5);
    expect(spline.wrap(-10)).toBeCloseTo(L - 10, 5);
  });

  it('projects known points and returns correct distance and lateral offset', () => {
    const spline = new Spline(circlePoints, 1.0);
    const proj = createEmptySplineProjection();
    const sample = createEmptySplineSample();

    // Sample point at distance 100m
    spline.sample(100, sample);

    // Place a query point offset by +5m along track normal (to the right)
    const testX = sample.x + 5.0 * sample.normalX;
    const testZ = sample.z + 5.0 * sample.normalZ;

    spline.project(testX, testZ, 100, proj);
    expect(proj.distance).toBeCloseTo(100, 1);
    expect(proj.lateralOffset).toBeCloseTo(5.0, 1);

    // Place a query point offset by -8m along track normal (to the left)
    const testLeftX = sample.x - 8.0 * sample.normalX;
    const testLeftZ = sample.z - 8.0 * sample.normalZ;

    spline.project(testLeftX, testLeftZ, 100, proj);
    expect(proj.distance).toBeCloseTo(100, 1);
    expect(proj.lateralOffset).toBeCloseTo(-8.0, 1);
  });

  it('project with a stale hint still finds the correct position via fallback', () => {
    const spline = new Spline(circlePoints, 1.0);
    const proj = createEmptySplineProjection();
    const sample = createEmptySplineSample();

    // Query point at distance 300m
    spline.sample(300, sample);

    // Give a completely stale hint at distance 10m (opposite side of track)
    spline.project(sample.x, sample.z, 10, proj);

    expect(proj.distance).toBeCloseTo(300, 1);
    expect(proj.lateralOffset).toBeCloseTo(0, 1);
  });

  it('verifies Coastal City Highway track data meets all requirements', () => {
    const trackData = parseTrackData(trackJson);

    const spline = new Spline(trackData.controlPoints, 1.0);

    // 1. Length is within 10% of 2,500 m (between 2,250 and 2,750 m)
    expect(spline.length).toBeGreaterThanOrEqual(2250);
    expect(spline.length).toBeLessThanOrEqual(2750);

    // 2. Minimum curve radius >= 60 m
    const sample = createEmptySplineSample();
    const nextSample = createEmptySplineSample();
    const prevSample = createEmptySplineSample();
    let minRadius = Infinity;

    const step = 2.0;
    for (let d = 0; d < spline.length; d += step) {
      spline.sample(d, sample);
      spline.sample(spline.wrap(d + step), nextSample);
      spline.sample(spline.wrap(d - step), prevSample);

      const a = Math.hypot(nextSample.x - sample.x, nextSample.z - sample.z);
      const b = Math.hypot(sample.x - prevSample.x, sample.z - prevSample.z);
      const c = Math.hypot(nextSample.x - prevSample.x, nextSample.z - prevSample.z);

      const area =
        0.5 *
        Math.abs(
          (sample.x - prevSample.x) * (nextSample.z - prevSample.z) -
            (sample.z - prevSample.z) * (nextSample.x - prevSample.x),
        );
      const curvature = (4 * area) / (a * b * c + 1e-9);
      if (curvature > 1e-5) {
        const r = 1 / curvature;
        if (r < minRadius) {
          minRadius = r;
        }
      }
    }
    expect(minRadius).toBeGreaterThanOrEqual(60);

    // 3. No self-intersections
    function ccw(ax: number, az: number, bx: number, bz: number, cx: number, cz: number): boolean {
      return (cz - az) * (bx - ax) > (bz - az) * (cx - ax);
    }
    function intersects(
      p1x: number,
      p1z: number,
      p2x: number,
      p2z: number,
      p3x: number,
      p3z: number,
      p4x: number,
      p4z: number,
    ): boolean {
      return (
        ccw(p1x, p1z, p3x, p3z, p4x, p4z) !== ccw(p2x, p2z, p3x, p3z, p4x, p4z) &&
        ccw(p1x, p1z, p2x, p2z, p3x, p3z) !== ccw(p1x, p1z, p2x, p2z, p4x, p4z)
      );
    }

    const polySamples: Array<{ x: number; z: number }> = [];
    const polyStep = 10.0;
    for (let d = 0; d < spline.length; d += polyStep) {
      spline.sample(d, sample);
      polySamples.push({ x: sample.x, z: sample.z });
    }

    let selfIntersects = false;
    for (let i = 0; i < polySamples.length; i++) {
      const p1 = polySamples[i];
      const p2 = polySamples[(i + 1) % polySamples.length];
      for (let j = i + 2; j < polySamples.length; j++) {
        if (i === 0 && j === polySamples.length - 1) continue;
        const p3 = polySamples[j];
        const p4 = polySamples[(j + 1) % polySamples.length];
        if (intersects(p1.x, p1.z, p2.x, p2.z, p3.x, p3.z, p4.x, p4.z)) {
          selfIntersects = true;
          break;
        }
      }
      if (selfIntersects) break;
    }
    expect(selfIntersects).toBe(false);
  });
});
