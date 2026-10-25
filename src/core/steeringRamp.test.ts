import { describe, expect, it } from 'vitest';
import { stepSteeringRamp } from './steeringRamp';

describe('stepSteeringRamp', () => {
  const DT = 1 / 60; // 60 Hz fixed timestep

  it('ramps smoothly towards +1 when right button is held over ~150 ms', () => {
    let steer = 0;
    // Over 9 ticks (~150 ms at 60 Hz = 0.15 s)
    for (let i = 0; i < 9; i++) {
      steer = stepSteeringRamp(steer, false, true, DT, 0.15, 0.08);
      expect(steer).toBeGreaterThan(0);
      expect(steer).toBeLessThanOrEqual(1.0);
    }
    // At or after 9 ticks, should reach exactly 1.0
    expect(steer).toBeCloseTo(1.0, 1);

    steer = stepSteeringRamp(steer, false, true, DT, 0.15, 0.08);
    expect(steer).toBe(1.0);
  });

  it('ramps smoothly towards -1 when left button is held over ~150 ms', () => {
    let steer = 0;
    for (let i = 0; i < 9; i++) {
      steer = stepSteeringRamp(steer, true, false, DT, 0.15, 0.08);
      expect(steer).toBeLessThan(0);
      expect(steer).toBeGreaterThanOrEqual(-1.0);
    }
    expect(steer).toBeCloseTo(-1.0, 1);

    steer = stepSteeringRamp(steer, true, false, DT, 0.15, 0.08);
    expect(steer).toBe(-1.0);
  });

  it('returns quickly to 0 when released', () => {
    let steer = 1.0;
    // Release (both false) over ~80 ms = ~5 ticks
    for (let i = 0; i < 5; i++) {
      steer = stepSteeringRamp(steer, false, false, DT, 0.15, 0.08);
    }
    expect(steer).toBe(0);
  });

  it('returns to 0 if both left and right are held at the same time', () => {
    let steer = 0.5;
    for (let i = 0; i < 5; i++) {
      steer = stepSteeringRamp(steer, true, true, DT, 0.15, 0.08);
    }
    expect(steer).toBe(0);
  });

  it('is deterministic and pure across multiple calls', () => {
    const s1 = stepSteeringRamp(0.2, true, false, DT, 0.15, 0.08);
    const s2 = stepSteeringRamp(0.2, true, false, DT, 0.15, 0.08);
    expect(s1).toBe(s2);
  });
});
