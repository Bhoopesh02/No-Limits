import { describe, expect, it } from 'vitest';
import type { TrackSample, TrackSampler } from '../data/TrackSampler';
import { RACING_LINE_MAX_BRAKE_DECEL, RACING_LINE_ROAD_SAFETY_MARGIN } from './AiTuning';
import { createEmptyRacingLineSample, RacingLine } from './RacingLine';

class MockTrackSampler implements TrackSampler {
  public readonly totalLength = 1000;
  public readonly closed = true;

  public sample(distance: number, out: TrackSample): void {
    const angle = (distance / this.totalLength) * Math.PI * 2;
    const r = this.totalLength / (Math.PI * 2);
    out.x = Math.cos(angle) * r;
    out.y = 0;
    out.z = Math.sin(angle) * r;
    out.tangentX = -Math.sin(angle);
    out.tangentZ = Math.cos(angle);
    out.normalX = Math.cos(angle);
    out.normalZ = Math.sin(angle);
    out.width = 12.0;
  }

  public wrap(distance: number): number {
    return ((distance % this.totalLength) + this.totalLength) % this.totalLength;
  }
}

describe('RacingLine', () => {
  const sampler = new MockTrackSampler();
  const topSpeed = 64.0; // m/s
  const racingLine = new RacingLine(sampler, topSpeed);

  it('builds a closed loop with valid sample count and step size', () => {
    expect(racingLine.sampleCount).toBeGreaterThan(100);
    expect(racingLine.stepSize).toBeGreaterThan(3.5);
    expect(racingLine.stepSize).toBeLessThan(5.5);
    expect(racingLine.wrap(racingLine.trackLength + 10)).toBeCloseTo(10, 4);
    expect(racingLine.wrap(-10)).toBeCloseTo(racingLine.trackLength - 10, 4);
  });

  it('ensures apex offsets strictly stay within road width minus safety margin', () => {
    const sample = createEmptyRacingLineSample();
    const step = 10.0;
    for (let d = 0; d < racingLine.trackLength; d += step) {
      racingLine.sampleAt(d, sample);
      const halfRoad = sample.width * 0.5;
      const maxAllowedOffset = halfRoad - RACING_LINE_ROAD_SAFETY_MARGIN;
      expect(Math.abs(sample.offset)).toBeLessThanOrEqual(maxAllowedOffset + 1e-4);
      expect(Number.isNaN(sample.x)).toBe(false);
      expect(Number.isNaN(sample.z)).toBe(false);
    }
  });

  it('ensures target speeds never exceed the top speed cap and stay above minimum cornering speed', () => {
    for (let d = 0; d < racingLine.trackLength; d += 8.0) {
      const v = racingLine.targetSpeedAt(d);
      expect(v).toBeLessThanOrEqual(topSpeed + 1e-4);
      expect(v).toBeGreaterThan(10.0); // Never comes to a dead stop
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  it('ensures speed profile never requires more deceleration than the braking limit', () => {
    const ds = racingLine.stepSize;
    const maxAllowedDecel = RACING_LINE_MAX_BRAKE_DECEL * 1.05;

    for (let i = 0; i < racingLine.sampleCount; i++) {
      const d1 = i * ds;
      const d2 = ((i + 1) % racingLine.sampleCount) * ds;
      const v1 = racingLine.targetSpeedAt(d1);
      const v2 = racingLine.targetSpeedAt(d2);

      if (v1 > v2) {
        const decel = (v1 * v1 - v2 * v2) / (2 * ds);
        expect(decel).toBeLessThanOrEqual(maxAllowedDecel);
      }
    }
  });

  it('smoothly wraps queries across the boundary seam', () => {
    const vEnd = racingLine.targetSpeedAt(racingLine.trackLength - 1.0);
    const vStart = racingLine.targetSpeedAt(1.0);
    expect(Math.abs(vEnd - vStart)).toBeLessThan(10.0);
  });
});
