import { describe, expect, it } from 'vitest';
import { convertSpeed } from './convertSpeed';

describe('convertSpeed', () => {
  it('returns rounded km/h when target unit is km/h', () => {
    expect(convertSpeed(0, 'km/h')).toBe(0);
    expect(convertSpeed(120.4, 'km/h')).toBe(120);
    expect(convertSpeed(120.6, 'km/h')).toBe(121);
    expect(convertSpeed(280, 'km/h')).toBe(280);
  });

  it('converts km/h to mph accurately', () => {
    expect(convertSpeed(0, 'mph')).toBe(0);
    // 100 km/h is ~62.137 mph -> rounds to 62
    expect(convertSpeed(100, 'mph')).toBe(62);
    // 160 km/h is ~99.42 mph -> rounds to 99
    expect(convertSpeed(160, 'mph')).toBe(99);
    // 200 km/h is ~124.27 mph -> rounds to 124
    expect(convertSpeed(200, 'mph')).toBe(124);
    // 300 km/h is ~186.41 mph -> rounds to 186
    expect(convertSpeed(300, 'mph')).toBe(186);
  });
});
