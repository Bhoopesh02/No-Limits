import { describe, expect, it } from 'vitest';
import { DEFAULT_CAR_KAZE } from './CarData';

describe('CarData', () => {
  it('defines Kaze with plausible physical parameters', () => {
    expect(DEFAULT_CAR_KAZE.id).toBe('kaze');
    expect(DEFAULT_CAR_KAZE.displayName).toBe('Kaze GT');
    // Top speed 290 km/h in m/s = 290 / 3.6 ≈ 80.5555...
    expect(DEFAULT_CAR_KAZE.topSpeed).toBeCloseTo(80.5555, 3);
    expect(DEFAULT_CAR_KAZE.mass).toBe(1250);
    expect(DEFAULT_CAR_KAZE.wheelbase).toBeGreaterThan(2.0);
    expect(DEFAULT_CAR_KAZE.engineForce).toBeGreaterThan(5000);
    expect(DEFAULT_CAR_KAZE.grip).toBeGreaterThan(0);
    expect(DEFAULT_CAR_KAZE.driftEntrySlip).toBeGreaterThan(DEFAULT_CAR_KAZE.driftExitSlip);
    expect(DEFAULT_CAR_KAZE.nitroDuration).toBeGreaterThan(0);
    expect(DEFAULT_CAR_KAZE.nitroCooldown).toBeGreaterThan(0);
  });
});
