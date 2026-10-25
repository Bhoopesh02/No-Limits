import { describe, expect, it } from 'vitest';
import {
  calcCameraFov,
  calcResponsiveVfov,
  calcSpeedFov,
  clampDeltaTime,
  lerp,
  lerpAngle,
  stepSpring1D,
} from './cameraMath';

describe('cameraMath', () => {
  describe('clampDeltaTime', () => {
    it('clamps negative or zero delta time to 0', () => {
      expect(clampDeltaTime(-0.05)).toBe(0);
      expect(clampDeltaTime(0)).toBe(0);
      expect(clampDeltaTime(NaN)).toBe(0);
    });

    it('clamps abnormally large frame delta time to maxDt', () => {
      expect(clampDeltaTime(0.5, 0.1)).toBe(0.1);
      expect(clampDeltaTime(0.25)).toBe(0.1);
    });

    it('leaves normal delta time untouched', () => {
      expect(clampDeltaTime(1 / 60)).toBeCloseTo(1 / 60, 5);
      expect(clampDeltaTime(0.033)).toBeCloseTo(0.033, 5);
    });
  });

  describe('calcResponsiveVfov', () => {
    it('maintains base FOV on standard wide screens (16:9)', () => {
      const aspect = 16 / 9; // ~1.777
      const vfov = calcResponsiveVfov(60, aspect, 75);
      expect(vfov).toBe(60);
    });

    it('widens vertical FOV on tall/narrow screens to keep minimum horizontal FOV', () => {
      const portraitAspect = 9 / 16; // ~0.5625
      const vfov = calcResponsiveVfov(60, portraitAspect, 75);
      expect(vfov).toBeGreaterThan(60);
      // Verify horizontal FOV is at least 75 degrees
      const vfovRad = (vfov * Math.PI) / 180;
      const hfovRad = 2 * Math.atan(portraitAspect * Math.tan(vfovRad / 2));
      const hfovDeg = (hfovRad * 180) / Math.PI;
      expect(hfovDeg).toBeCloseTo(75, 1);
    });
  });

  describe('calcSpeedFov', () => {
    it('returns base FOV at 0 speed', () => {
      expect(calcSpeedFov(60, 0, 80, 12)).toBe(60);
    });

    it('returns base FOV + maxDelta at top speed', () => {
      expect(calcSpeedFov(60, 80, 80, 12)).toBe(72);
    });

    it('interpolates FOV smoothly between 0 and top speed', () => {
      expect(calcSpeedFov(60, 40, 80, 12)).toBe(66);
    });

    it('clamps FOV if speed exceeds maxSpeed', () => {
      expect(calcSpeedFov(60, 100, 80, 12)).toBe(72);
    });
  });

  describe('calcCameraFov', () => {
    it('combines responsive FOV and speed widening', () => {
      const fov = calcCameraFov(60, 16 / 9, 80, 80, 75, 10);
      expect(fov).toBe(70);
    });
  });

  describe('lerp and lerpAngle', () => {
    it('linearly interpolates numbers', () => {
      expect(lerp(10, 20, 0.5)).toBe(15);
      expect(lerp(0, 100, 0.25)).toBe(25);
    });

    it('interpolates angles via shortest arc', () => {
      // 350 deg (5.934 rad) to 10 deg (0.1745 rad) through 0
      const from = (350 * Math.PI) / 180;
      const to = (10 * Math.PI) / 180;
      const mid = lerpAngle(from, to, 0.5);
      // The shortest path goes through 0 (or 2PI)
      // At t=0.5, it should be 0 (or 2PI equivalent)
      const midDeg = ((((mid * 180) / Math.PI) % 360) + 360) % 360;
      expect(midDeg).toBeCloseTo(0, 1);
    });
  });

  describe('stepSpring1D', () => {
    it('moves position toward target with damping', () => {
      let state = { position: 0, velocity: 0 };
      const target = 10;
      const stiffness = 25;
      const damping = 10;
      const dt = 1 / 60;

      for (let i = 0; i < 120; i++) {
        state = stepSpring1D(state.position, state.velocity, target, stiffness, damping, dt);
      }

      expect(state.position).toBeCloseTo(target, 1);
      expect(Math.abs(state.velocity)).toBeLessThan(0.1);
    });

    it('stays stable even with large frame drops', () => {
      let state = { position: 0, velocity: 0 };
      const target = 10;
      // Feed a large 1-second lag spike
      state = stepSpring1D(state.position, state.velocity, target, 25, 10, 1.0);
      expect(Number.isFinite(state.position)).toBe(true);
      expect(Number.isFinite(state.velocity)).toBe(true);
    });
  });
});
