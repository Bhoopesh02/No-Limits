import { describe, expect, it } from 'vitest';
import {
  calculateFundamentalFrequency,
  calculateGear,
  calculateLayerGains,
  calculateTargetRpm,
  EngineSound,
  IDLE_RPM,
  REDLINE_RPM,
} from './EngineSound';
import { MockAudioContext, MockGainNode } from './mockAudioContext';

describe('EngineSound pure calculations', () => {
  it('determines transmission gear with shift hysteresis', () => {
    // Reverse
    expect(calculateGear(-5, 1, false)).toBe(-1);
    expect(calculateGear(5, 1, true)).toBe(-1);

    // Low speed starts in gear 1
    expect(calculateGear(0, 1, false)).toBe(1);
    expect(calculateGear(10, 1, false)).toBe(1);

    // Upshifts when exceeding gear thresholds
    expect(calculateGear(17, 1, false)).toBe(2);
    expect(calculateGear(30, 2, false)).toBe(3);
    expect(calculateGear(44, 3, false)).toBe(4);
    expect(calculateGear(59, 4, false)).toBe(5);
    expect(calculateGear(72, 5, false)).toBe(6);

    // Remains in gear 6 at top speed
    expect(calculateGear(82, 6, false)).toBe(6);

    // Downshifts with hysteresis
    // Gear 2 downshifts at 12 m/s or below
    expect(calculateGear(15, 2, false)).toBe(2);
    expect(calculateGear(11, 2, false)).toBe(1);

    // Gear 3 downshifts at 23 m/s or below
    expect(calculateGear(25, 3, false)).toBe(3);
    expect(calculateGear(22, 3, false)).toBe(2);
  });

  it('computes target RPM for idle, launch revving, and gears', () => {
    // Idle when stationary with no throttle
    expect(calculateTargetRpm(0, 0, 1)).toBe(IDLE_RPM);

    // Launch revving when stationary with full throttle
    const launchRpm = calculateTargetRpm(0, 1.0, 1);
    expect(launchRpm).toBeGreaterThan(4000);
    expect(launchRpm).toBeLessThan(7000);

    // Scaling within gear 1 (0 to 16.5 m/s)
    const midGear1Rpm = calculateTargetRpm(8.25, 1.0, 1);
    expect(midGear1Rpm).toBeGreaterThan(IDLE_RPM);
    expect(midGear1Rpm).toBeLessThan(REDLINE_RPM);

    // Reverse gear scaling
    const revRpm = calculateTargetRpm(-6, 1.0, -1);
    expect(revRpm).toBeGreaterThan(IDLE_RPM);
  });

  it('calculates fundamental firing frequency for a 6-cylinder engine', () => {
    // At 600 RPM -> (600 / 60) * 3 = 30 Hz
    expect(calculateFundamentalFrequency(600)).toBe(30);

    // At 3000 RPM -> (3000 / 60) * 3 = 150 Hz
    expect(calculateFundamentalFrequency(3000)).toBe(150);

    // At 6000 RPM -> (6000 / 60) * 3 = 300 Hz
    expect(calculateFundamentalFrequency(6000)).toBe(300);
  });

  it('crossfades Idle, Mid, and High layers across the RPM range', () => {
    // At idle (850 RPM): Idle layer dominant, Mid and High are zero
    const idleGains = calculateLayerGains(850, 0);
    expect(idleGains.idle).toBe(1.0);
    expect(idleGains.mid).toBe(0.0);
    expect(idleGains.high).toBe(0.0);
    expect(idleGains.noise).toBe(0.0);

    // At 4500 RPM (Mid-range): Mid layer dominant, Idle is 0
    const midGains = calculateLayerGains(4500, 0.5);
    expect(midGains.idle).toBe(0.0);
    expect(midGains.mid).toBe(1.0);
    expect(midGains.high).toBeGreaterThan(0.0);
    expect(midGains.noise).toBeGreaterThan(0.0);

    // At 7500 RPM (High-range): High layer dominant, Mid is 0
    const highGains = calculateLayerGains(7500, 1.0);
    expect(highGains.idle).toBe(0.0);
    expect(highGains.mid).toBe(0.0);
    expect(highGains.high).toBe(1.0);
    expect(highGains.noise).toBeGreaterThan(0.3);
  });
});

describe('EngineSound synthesis instance', () => {
  it('initializes audio nodes and starts smoothly', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const engine = new EngineSound(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    expect(engine.getRpm()).toBe(IDLE_RPM);
    expect(engine.getGear()).toBe(1);
    expect(engine.isRevLimiting()).toBe(false);

    engine.start();
    expect(dest.connectedTo.length).toBe(0); // dest is output
  });

  it('updates RPM and gears across acceleration steps without NaN or errors', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const engine = new EngineSound(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    engine.start();

    let speed = 0;
    const dt = 1 / 60;

    // Simulate acceleration from 0 to 50 m/s (~180 km/h)
    for (let step = 0; step < 300; step++) {
      speed += 0.2;
      engine.update(speed, 1.0, false, dt);

      expect(Number.isFinite(engine.getRpm())).toBe(true);
      expect(engine.getRpm()).toBeGreaterThanOrEqual(IDLE_RPM);
    }

    expect(engine.getGear()).toBeGreaterThanOrEqual(3);
  });

  it('detects rev-limiter when reaching maximum redline', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const engine = new EngineSound(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    engine.start();

    // At top speed in top gear for prolonged duration
    for (let step = 0; step < 200; step++) {
      engine.update(86, 1.0, false, 0.05);
    }

    expect(engine.getRpm()).toBeGreaterThanOrEqual(REDLINE_RPM);
    expect(engine.isRevLimiting()).toBe(true);
  });

  it('stops and disposes without errors', () => {
    const mockCtx = new MockAudioContext();
    const dest = new MockGainNode();
    const engine = new EngineSound(mockCtx as unknown as AudioContext, dest as unknown as GainNode);

    engine.start();
    engine.stop();
    expect(() => engine.dispose()).not.toThrow();
  });
});
