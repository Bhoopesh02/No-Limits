import { describe, expect, it } from 'vitest';
import { formatOrdinal } from './formatOrdinal';

describe('formatOrdinal', () => {
  it('formats primary single digits', () => {
    expect(formatOrdinal(1)).toBe('1st');
    expect(formatOrdinal(2)).toBe('2nd');
    expect(formatOrdinal(3)).toBe('3rd');
    expect(formatOrdinal(4)).toBe('4th');
    expect(formatOrdinal(5)).toBe('5th');
    expect(formatOrdinal(6)).toBe('6th');
  });

  it('formats teen numbers with "th"', () => {
    expect(formatOrdinal(11)).toBe('11th');
    expect(formatOrdinal(12)).toBe('12th');
    expect(formatOrdinal(13)).toBe('13th');
    expect(formatOrdinal(14)).toBe('14th');
  });

  it('formats larger numbers ending in 1, 2, 3 correctly', () => {
    expect(formatOrdinal(21)).toBe('21st');
    expect(formatOrdinal(22)).toBe('22nd');
    expect(formatOrdinal(23)).toBe('23rd');
    expect(formatOrdinal(24)).toBe('24th');
    expect(formatOrdinal(101)).toBe('101st');
    expect(formatOrdinal(111)).toBe('111th');
    expect(formatOrdinal(112)).toBe('112th');
    expect(formatOrdinal(122)).toBe('122nd');
  });

  it('rounds floating point inputs down to integer rank', () => {
    expect(formatOrdinal(1.8)).toBe('1st');
    expect(formatOrdinal(3.1)).toBe('3rd');
  });
});
