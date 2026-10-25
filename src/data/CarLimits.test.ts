import { describe, expect, it } from 'vitest';
import { CAR_STAT_LIMITS, clampCarStat } from './CarLimits';

describe('CarLimits', () => {
  it('clamps values below minimum to minimum', () => {
    expect(clampCarStat('topSpeed', 10)).toBe(CAR_STAT_LIMITS.topSpeed.min);
    expect(clampCarStat('mass', 500)).toBe(CAR_STAT_LIMITS.mass.min);
    expect(clampCarStat('grip', 1.0)).toBe(CAR_STAT_LIMITS.grip.min);
  });

  it('clamps values above maximum to maximum', () => {
    expect(clampCarStat('topSpeed', 200)).toBe(CAR_STAT_LIMITS.topSpeed.max);
    expect(clampCarStat('mass', 5000)).toBe(CAR_STAT_LIMITS.mass.max);
    expect(clampCarStat('nitroBoostTopSpeed', 2.5)).toBe(CAR_STAT_LIMITS.nitroBoostTopSpeed.max);
  });

  it('preserves valid in-range values', () => {
    expect(clampCarStat('topSpeed', 80.0)).toBe(80.0);
    expect(clampCarStat('mass', 1250)).toBe(1250);
  });

  it('returns untouched value for unconstrained keys', () => {
    expect(clampCarStat('unknownKey', 9999)).toBe(9999);
  });
});
