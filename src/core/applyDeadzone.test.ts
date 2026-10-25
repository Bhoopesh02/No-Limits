import { describe, expect, it } from 'vitest';
import { applyDeadzone } from './applyDeadzone';

describe('applyDeadzone', () => {
  it('returns 0 for values within the deadzone threshold', () => {
    expect(applyDeadzone(0, 0.15)).toBe(0);
    expect(applyDeadzone(0.05, 0.15)).toBe(0);
    expect(applyDeadzone(-0.05, 0.15)).toBe(0);
    expect(applyDeadzone(0.15, 0.15)).toBe(0);
    expect(applyDeadzone(-0.15, 0.15)).toBe(0);
  });

  it('rescales values smoothly between deadzone edge and 1.0 without jumps', () => {
    // Just above deadzone (0.15) should start near 0
    const justAbove = applyDeadzone(0.1585, 0.15);
    expect(justAbove).toBeCloseTo(0.01, 2);

    // Halfway between 0.15 and 1.0 is 0.575
    const halfway = applyDeadzone(0.575, 0.15);
    expect(halfway).toBeCloseTo(0.5, 4);

    // Full deflection is 1.0
    expect(applyDeadzone(1.0, 0.15)).toBe(1.0);
  });

  it('handles negative inputs symmetrically', () => {
    const justBelow = applyDeadzone(-0.1585, 0.15);
    expect(justBelow).toBeCloseTo(-0.01, 2);

    const halfwayNeg = applyDeadzone(-0.575, 0.15);
    expect(halfwayNeg).toBeCloseTo(-0.5, 4);

    expect(applyDeadzone(-1.0, 0.15)).toBe(-1.0);
  });

  it('clamps values exceeding 1.0 or -1.0', () => {
    expect(applyDeadzone(1.5, 0.15)).toBe(1.0);
    expect(applyDeadzone(-1.5, 0.15)).toBe(-1.0);
  });

  it('uses default deadzone of 0.15 if not specified', () => {
    expect(applyDeadzone(0.1)).toBe(0);
    expect(applyDeadzone(1.0)).toBe(1.0);
  });
});
