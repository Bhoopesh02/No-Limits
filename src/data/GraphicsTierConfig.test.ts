import { describe, expect, it } from 'vitest';
import {
  GRAPHICS_TIER_HIGH,
  GRAPHICS_TIER_LOW,
  GRAPHICS_TIER_MEDIUM,
  GRAPHICS_TIERS,
} from './GraphicsTierConfig';

describe('GraphicsTierConfig', () => {
  it('defines low tier with correct values from Dev Plan section 11', () => {
    expect(GRAPHICS_TIER_LOW.id).toBe('low');
    expect(GRAPHICS_TIER_LOW.pixelRatioCap).toBe(1);
    expect(GRAPHICS_TIER_LOW.shadows).toBe('blob');
    expect(GRAPHICS_TIER_LOW.postProcessing).toEqual([]);
    expect(GRAPHICS_TIER_LOW.particleScale).toBe(0.25);
    expect(GRAPHICS_TIER_LOW.maxTraffic).toBe(2);
    expect(GRAPHICS_TIER_LOW.maxOpponents).toBe(3);
  });

  it('defines medium tier with correct values from Dev Plan section 11', () => {
    expect(GRAPHICS_TIER_MEDIUM.id).toBe('medium');
    expect(GRAPHICS_TIER_MEDIUM.pixelRatioCap).toBe(1.5);
    expect(GRAPHICS_TIER_MEDIUM.shadows).toBe('map');
    expect(GRAPHICS_TIER_MEDIUM.postProcessing).toContain('bloom');
    expect(GRAPHICS_TIER_MEDIUM.particleScale).toBe(0.6);
    expect(GRAPHICS_TIER_MEDIUM.maxTraffic).toBe(4);
    expect(GRAPHICS_TIER_MEDIUM.maxOpponents).toBe(5);
  });

  it('defines high tier with correct values from Dev Plan section 11', () => {
    expect(GRAPHICS_TIER_HIGH.id).toBe('high');
    expect(GRAPHICS_TIER_HIGH.pixelRatioCap).toBe(2);
    expect(GRAPHICS_TIER_HIGH.shadows).toBe('softMap');
    expect(GRAPHICS_TIER_HIGH.postProcessing).toEqual(['bloom', 'motionBlur', 'vignette']);
    expect(GRAPHICS_TIER_HIGH.particleScale).toBe(1.0);
    expect(GRAPHICS_TIER_HIGH.maxTraffic).toBe(6);
    expect(GRAPHICS_TIER_HIGH.maxOpponents).toBe(5);
  });

  it('provides map of all graphics tiers', () => {
    expect(GRAPHICS_TIERS.low).toBe(GRAPHICS_TIER_LOW);
    expect(GRAPHICS_TIERS.medium).toBe(GRAPHICS_TIER_MEDIUM);
    expect(GRAPHICS_TIERS.high).toBe(GRAPHICS_TIER_HIGH);
  });
});
