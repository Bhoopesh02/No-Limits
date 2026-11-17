import { describe, expect, it, vi } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  describe('probeInitialTier', () => {
    it('selects high tier for low frame times (<= 17.5 ms)', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor.probeInitialTier([0.016, 0.0165, 0.015])).toBe('high');
    });

    it('selects medium tier for medium frame times (17.5 ms to 24 ms)', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor.probeInitialTier([0.02, 0.021, 0.019])).toBe('medium');
    });

    it('selects low tier for heavy frame times (> 24 ms)', () => {
      const monitor = new PerformanceMonitor();
      expect(monitor.probeInitialTier([0.033, 0.04, 0.035])).toBe('low');
    });
  });

  describe('dynamic resolution and tier downgrades', () => {
    it('drops resolution scale when frame rate stays below threshold for 5 seconds', () => {
      const onDowngradeScale = vi.fn();
      const onDowngradeTier = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'high',
        initialScale: 1.0,
        enabled: true,
        onDowngradeScale,
        onDowngradeTier,
      });

      // High tier downgrade threshold is 55 FPS (~18.18 ms)
      // Feed frameDt = 0.025 s (~40 FPS)
      const frameDt = 0.025;
      const stepsToReach5Sec = Math.ceil(5.0 / frameDt) + 20;

      for (let i = 0; i < stepsToReach5Sec; i++) {
        monitor.recordFrame(frameDt, true);
      }

      expect(onDowngradeScale).toHaveBeenCalledWith(0.9);
      expect(onDowngradeTier).not.toHaveBeenCalled();
    });

    it('downgrades tier when resolution scale is already at floor (0.6)', () => {
      const onDowngradeScale = vi.fn();
      const onDowngradeTier = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'high',
        initialScale: 0.6,
        enabled: true,
        onDowngradeScale,
        onDowngradeTier,
      });

      const frameDt = 0.025;
      const stepsToReach5Sec = Math.ceil(5.0 / frameDt) + 20;

      for (let i = 0; i < stepsToReach5Sec; i++) {
        monitor.recordFrame(frameDt, true);
      }

      expect(onDowngradeTier).toHaveBeenCalledWith('medium', 1.0);
    });

    it('downgrades from medium to low when sustained below 45 FPS at scale floor', () => {
      const onDowngradeTier = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'medium',
        initialScale: 0.6,
        enabled: true,
        onDowngradeTier,
      });

      const frameDt = 0.035; // ~28 FPS (< 45 FPS)
      const steps = Math.ceil(5.0 / frameDt) + 20;

      for (let i = 0; i < steps; i++) {
        monitor.recordFrame(frameDt, true);
      }

      expect(onDowngradeTier).toHaveBeenCalledWith('low', 1.0);
    });
  });

  describe('promotions / upgrades', () => {
    it('promotes resolution scale after 10 seconds of sustained overhead', () => {
      const onUpgradeScale = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'medium',
        initialScale: 0.8,
        enabled: true,
        onUpgradeScale,
      });

      // Medium tier upgrade threshold is 58 FPS (<= 17.2 ms)
      const frameDt = 0.015; // ~66 FPS
      const stepsToReach10Sec = Math.ceil(10.0 / frameDt) + 20;

      for (let i = 0; i < stepsToReach10Sec; i++) {
        monitor.recordFrame(frameDt, true);
      }

      expect(onUpgradeScale).toHaveBeenCalledWith(0.9);
    });

    it('promotes tier when scale is 1.0 and sustained high overhead occurs', () => {
      const onUpgradeTier = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'low',
        initialScale: 1.0,
        enabled: true,
        onUpgradeTier,
      });

      // Low upgrade threshold is 48 FPS (~20.8 ms)
      const frameDt = 0.016; // ~60 FPS
      const stepsToReach10Sec = Math.ceil(10.0 / frameDt) + 20;

      for (let i = 0; i < stepsToReach10Sec; i++) {
        monitor.recordFrame(frameDt, true);
      }

      expect(onUpgradeTier).toHaveBeenCalledWith('medium', 1.0);
    });
  });

  describe('eligibility and pause guards', () => {
    it('does not adjust when isEligibleForAuto is false', () => {
      const onDowngradeScale = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'high',
        initialScale: 1.0,
        enabled: true,
        onDowngradeScale,
      });

      const frameDt = 0.05; // 20 FPS
      for (let i = 0; i < 200; i++) {
        monitor.recordFrame(frameDt, false);
      }

      expect(onDowngradeScale).not.toHaveBeenCalled();
      expect(monitor.getUnderTargetDuration()).toBe(0);
    });

    it('does not adjust when disabled', () => {
      const onDowngradeScale = vi.fn();

      const monitor = new PerformanceMonitor({
        initialTier: 'high',
        initialScale: 1.0,
        enabled: false,
        onDowngradeScale,
      });

      const frameDt = 0.05;
      for (let i = 0; i < 200; i++) {
        monitor.recordFrame(frameDt, true);
      }

      expect(onDowngradeScale).not.toHaveBeenCalled();
    });
  });
});
