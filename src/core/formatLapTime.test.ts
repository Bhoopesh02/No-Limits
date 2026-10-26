import { describe, expect, it } from 'vitest';
import { formatLapTime } from './formatLapTime';

describe('formatLapTime', () => {
  it('formats 0 milliseconds to 0:00.000', () => {
    expect(formatLapTime(0)).toBe('0:00.000');
  });

  it('formats edge cases around minute boundaries', () => {
    expect(formatLapTime(59999)).toBe('0:59.999');
    expect(formatLapTime(60000)).toBe('1:00.000');
    expect(formatLapTime(60001)).toBe('1:00.001');
    expect(formatLapTime(119999)).toBe('1:59.999');
    expect(formatLapTime(120000)).toBe('2:00.000');
  });

  it('formats times exceeding 10 minutes (600+ seconds)', () => {
    expect(formatLapTime(600000)).toBe('10:00.000');
    expect(formatLapTime(672345)).toBe('11:12.345');
    expect(formatLapTime(3599999)).toBe('59:59.999');
  });

  it('handles negative, non-finite or invalid numbers safely', () => {
    expect(formatLapTime(-1)).toBe('0:00.000');
    expect(formatLapTime(NaN)).toBe('0:00.000');
    expect(formatLapTime(Infinity)).toBe('0:00.000');
    expect(formatLapTime(-Infinity)).toBe('0:00.000');
  });
});
