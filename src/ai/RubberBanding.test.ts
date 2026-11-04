import { describe, expect, it } from 'vitest';
import { computeRubberBandMultiplier } from './RubberBanding';

describe('computeRubberBandMultiplier', () => {
  it('returns 1.0 for zero gap', () => {
    expect(computeRubberBandMultiplier(0)).toBe(1.0);
  });

  it('slows down AI when ahead of player by at most 8%', () => {
    // 75m ahead (halfway)
    const mid = computeRubberBandMultiplier(75);
    expect(mid).toBeLessThan(1.0);
    expect(mid).toBeGreaterThan(0.92);

    // 150m ahead (full range)
    const full = computeRubberBandMultiplier(150);
    expect(full).toBeCloseTo(0.92, 4);

    // 500m ahead (clamped to max effect)
    const clamped = computeRubberBandMultiplier(500);
    expect(clamped).toBeCloseTo(0.92, 4);
  });

  it('speeds up AI when behind player by at most 8%', () => {
    // 75m behind
    const mid = computeRubberBandMultiplier(-75);
    expect(mid).toBeGreaterThan(1.0);
    expect(mid).toBeLessThan(1.08);

    // 150m behind
    const full = computeRubberBandMultiplier(-150);
    expect(full).toBeCloseTo(1.08, 4);

    // 500m behind (clamped)
    const clamped = computeRubberBandMultiplier(-500);
    expect(clamped).toBeCloseTo(1.08, 4);
  });

  it('is smooth and monotonic in both directions', () => {
    let prev = computeRubberBandMultiplier(-200);
    for (let gap = -200; gap <= 200; gap += 10) {
      const current = computeRubberBandMultiplier(gap);
      expect(current).toBeLessThanOrEqual(prev + 1e-6); // Decreases as gap increases (AI gets further ahead)
      prev = current;
    }
  });
});
