import { describe, expect, it } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  it('returns value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('clamps values below min to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, -50, 50)).toBe(-50);
  });

  it('clamps values above max to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, -50, 50)).toBe(50);
  });

  it('handles negative ranges correctly', () => {
    expect(clamp(-20, -30, -10)).toBe(-20);
    expect(clamp(-5, -30, -10)).toBe(-10);
    expect(clamp(-40, -30, -10)).toBe(-30);
  });

  it('handles fractional numbers', () => {
    expect(clamp(0.45, 0, 1)).toBe(0.45);
    expect(clamp(-0.1, 0, 1)).toBe(0);
    expect(clamp(1.2, 0, 1)).toBe(1);
  });

  it('throws an error if min > max', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError);
  });
});
