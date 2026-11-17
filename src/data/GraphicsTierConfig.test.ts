import { describe, expect, it } from 'vitest';
import {
  getEffectivePixelRatio,
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
    expect(GRAPHICS_TIER_LOW.shadowType).toBe('none');
    expect(GRAPHICS_TIER_LOW.shadowMapSize).toBe(0);
    expect(GRAPHICS_TIER_LOW.cameraFar).toBe(500);
    expect(GRAPHICS_TIER_LOW.fogNear).toBe(120);
    expect(GRAPHICS_TIER_LOW.fogFar).toBe(450);
    expect(GRAPHICS_TIER_LOW.drawDistance).toBe(500);
    expect(GRAPHICS_TIER_LOW.resolutionScaleMin).toBe(0.6);
    expect(GRAPHICS_TIER_LOW.postProcessing).toEqual([]);
    expect(GRAPHICS_TIER_LOW.particleScale).toBe(0.25);
    expect(GRAPHICS_TIER_LOW.maxTraffic).toBe(2);
    expect(GRAPHICS_TIER_LOW.maxOpponents).toBe(3);
  });

  it('defines medium tier with correct values from Dev Plan section 11', () => {
    expect(GRAPHICS_TIER_MEDIUM.id).toBe('medium');
    expect(GRAPHICS_TIER_MEDIUM.pixelRatioCap).toBe(1.5);
    expect(GRAPHICS_TIER_MEDIUM.shadows).toBe('map');
    expect(GRAPHICS_TIER_MEDIUM.shadowType).toBe('pcf');
    expect(GRAPHICS_TIER_MEDIUM.shadowMapSize).toBe(1024);
    expect(GRAPHICS_TIER_MEDIUM.cameraFar).toBe(900);
    expect(GRAPHICS_TIER_MEDIUM.fogNear).toBe(200);
    expect(GRAPHICS_TIER_MEDIUM.fogFar).toBe(800);
    expect(GRAPHICS_TIER_MEDIUM.drawDistance).toBe(900);
    expect(GRAPHICS_TIER_MEDIUM.resolutionScaleMin).toBe(0.6);
    expect(GRAPHICS_TIER_MEDIUM.postProcessing).toContain('bloom');
    expect(GRAPHICS_TIER_MEDIUM.particleScale).toBe(0.6);
    expect(GRAPHICS_TIER_MEDIUM.maxTraffic).toBe(4);
    expect(GRAPHICS_TIER_MEDIUM.maxOpponents).toBe(5);
  });

  it('defines high tier with correct values from Dev Plan section 11', () => {
    expect(GRAPHICS_TIER_HIGH.id).toBe('high');
    expect(GRAPHICS_TIER_HIGH.pixelRatioCap).toBe(2);
    expect(GRAPHICS_TIER_HIGH.shadows).toBe('softMap');
    expect(GRAPHICS_TIER_HIGH.shadowType).toBe('pcfSoft');
    expect(GRAPHICS_TIER_HIGH.shadowMapSize).toBe(2048);
    expect(GRAPHICS_TIER_HIGH.cameraFar).toBe(1600);
    expect(GRAPHICS_TIER_HIGH.fogNear).toBe(350);
    expect(GRAPHICS_TIER_HIGH.fogFar).toBe(1500);
    expect(GRAPHICS_TIER_HIGH.drawDistance).toBe(1600);
    expect(GRAPHICS_TIER_HIGH.resolutionScaleMin).toBe(0.6);
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

  describe('getEffectivePixelRatio', () => {
    it('handles low DPR laptops correctly', () => {
      // Laptop with DPR 1.0, High tier cap 2.0, scale 1.0 -> 1.0
      expect(getEffectivePixelRatio(1.0, 2.0, 1.0)).toBe(1.0);
      // Scale 0.6 on DPR 1.0 laptop -> 0.6
      expect(getEffectivePixelRatio(1.0, 2.0, 0.6)).toBeCloseTo(0.6, 3);
      // Low tier cap 1.0 on DPR 1.0 laptop -> 1.0
      expect(getEffectivePixelRatio(1.0, 1.0, 1.0)).toBe(1.0);
    });

    it('handles high DPR phones correctly', () => {
      // Phone with DPR 3.0, Low tier cap 1.0 -> 1.0
      expect(getEffectivePixelRatio(3.0, 1.0, 1.0)).toBe(1.0);
      // Phone with DPR 3.0, Medium tier cap 1.5 -> 1.5
      expect(getEffectivePixelRatio(3.0, 1.5, 1.0)).toBe(1.5);
      // Phone with DPR 3.0, High tier cap 2.0 -> 2.0
      expect(getEffectivePixelRatio(3.0, 2.0, 1.0)).toBe(2.0);
      // Phone with DPR 3.0, Medium tier cap 1.5, scale 0.6 -> 0.9
      expect(getEffectivePixelRatio(3.0, 1.5, 0.6)).toBeCloseTo(0.9, 3);
    });

    it('clamps to sensible minimum (0.5)', () => {
      // DPR 1.0, scale 0.3 -> would be 0.3, clamped to 0.5
      expect(getEffectivePixelRatio(1.0, 1.0, 0.3)).toBe(0.5);
      // Very low resolution scale
      expect(getEffectivePixelRatio(1.0, 2.0, 0.1)).toBe(0.5);
    });

    it('clamps to maximum tier cap', () => {
      // If scale > 1, does not exceed tierCap
      expect(getEffectivePixelRatio(2.0, 1.5, 1.2)).toBe(1.5);
    });

    it('handles zero or negative inputs gracefully', () => {
      expect(getEffectivePixelRatio(0, 1.5, 1.0)).toBe(1.0);
      expect(getEffectivePixelRatio(-1, 1.5, 1.0)).toBe(1.0);
    });
  });
});
