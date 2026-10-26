import { describe, expect, it } from 'vitest';
import { createSpeedometer, formatSpeedometerDisplay } from './Speedometer';

describe('Speedometer', () => {
  describe('formatSpeedometerDisplay', () => {
    it('formats normal positive speed in km/h without gear indicator', () => {
      const res = formatSpeedometerDisplay(120, 'km/h', false);
      expect(res.displaySpeed).toBe(120);
      expect(res.unitLabel).toBe('KM/H');
      expect(res.gearLabel).toBe('');
      expect(res.isReversing).toBe(false);
    });

    it('formats normal positive speed in mph', () => {
      const res = formatSpeedometerDisplay(100, 'mph', false);
      // 100 km/h in mph ≈ 62
      expect(res.displaySpeed).toBe(62);
      expect(res.unitLabel).toBe('MPH');
    });

    it('formats reversing speed as absolute value and provides R gear indicator', () => {
      // Reversing at -43 km/h (~12 m/s reverseTopSpeed)
      const res = formatSpeedometerDisplay(-43, 'km/h', true);
      expect(res.displaySpeed).toBe(43);
      expect(res.gearLabel).toBe('R');
      expect(res.isReversing).toBe(true);
    });

    it('formats standstill with reverse gear engaged', () => {
      const res = formatSpeedometerDisplay(0, 'km/h', true);
      expect(res.displaySpeed).toBe(0);
      expect(res.gearLabel).toBe('R');
      expect(res.isReversing).toBe(true);
    });
  });

  describe('createSpeedometer headless compatibility', () => {
    it('safely instantiates in headless / test environment without throwing', () => {
      const widget = createSpeedometer({ speed: 80, unit: 'km/h', isReversing: true });
      expect(widget).toBeDefined();
      expect(typeof widget.setSpeed).toBe('function');
      expect(typeof widget.setWarning).toBe('function');
      expect(typeof widget.setReversing).toBe('function');

      expect(() => {
        widget.setSpeed(-43);
        widget.setWarning(true, 'RPM LIMIT');
        widget.setReversing(true);
      }).not.toThrow();
    });
  });
});
