import { describe, expect, it } from 'vitest';
import { formatLapTime, LapTimer } from './LapTimer';

describe('formatLapTime', () => {
  it('formats edge cases properly', () => {
    expect(formatLapTime(0)).toBe('0:00.000');
    expect(formatLapTime(59999)).toBe('0:59.999');
    expect(formatLapTime(60000)).toBe('1:00.000');
    expect(formatLapTime(600000)).toBe('10:00.000');
    expect(formatLapTime(672345)).toBe('11:12.345');
  });

  it('handles negative or invalid numbers safely', () => {
    expect(formatLapTime(-500)).toBe('0:00.000');
    expect(formatLapTime(NaN)).toBe('0:00.000');
    expect(formatLapTime(Infinity)).toBe('0:00.000');
  });
});

describe('LapTimer', () => {
  const trackLength = 2500;
  const totalLaps = 3;

  it('counts a normal lap upon crossing start/finish in the forward direction', () => {
    const timer = new LapTimer(trackLength, totalLaps);
    timer.reset(0);

    const dt = 1 / 60;
    const speed = 50; // 50 m/s (~180 km/h) -> 2500m takes 50 seconds (3000 steps)
    const stepDist = speed * dt;

    let dist = 0;
    // Drive 1 full lap + cross line
    for (let step = 0; step < 3050; step++) {
      dist = (dist + stepDist) % trackLength;
      timer.update(dist, dt);
    }

    const state = timer.getState();
    expect(state.currentLap).toBe(2);
    expect(state.lastLapTimeMs).toBeGreaterThan(49000);
    expect(state.lastLapTimeMs).toBeLessThan(51000);
    expect(state.bestLapTimeMs).toBe(state.lastLapTimeMs);
  });

  it('ignores reverse crossing', () => {
    const timer = new LapTimer(trackLength, totalLaps);
    timer.reset(10); // Start just past line

    const dt = 1 / 60;

    // Drive backward across start line (e.g. from 10m to 2490m)
    timer.update(5, dt);
    timer.update(1, dt);
    timer.update(2495, dt);
    timer.update(2480, dt);

    const state = timer.getState();
    expect(state.currentLap).toBe(1);
    expect(state.lastLapTimeMs).toBeNull();
  });

  it('ignores jitter around the start line without traveling at least half a lap', () => {
    const timer = new LapTimer(trackLength, totalLaps);
    timer.reset(0);
    const dt = 1 / 60;

    // Oscillate near start line (2490 -> 10 -> 2490 -> 10)
    timer.update(2490, dt);
    timer.update(10, dt); // Forward wrap, but traveled only 10m!
    timer.update(2495, dt);
    timer.update(5, dt);

    const state = timer.getState();
    expect(state.currentLap).toBe(1);
    expect(state.lastLapTimeMs).toBeNull();
  });

  it('updates best lap time when a faster lap is recorded', () => {
    const timer = new LapTimer(trackLength, totalLaps);
    timer.reset(0);
    const dt = 1 / 60;

    // Lap 1: 50 m/s (takes 50s)
    let dist = 0;
    for (let s = 0; s < 3050; s++) {
      dist = (dist + 50 * dt) % trackLength;
      timer.update(dist, dt);
    }
    const state1 = timer.getState();
    const lap1Time = state1.bestLapTimeMs;
    expect(lap1Time).toBeDefined();

    // Lap 2: 70 m/s (takes ~35.7s, faster)
    for (let s = 0; s < 2200; s++) {
      dist = (dist + 70 * dt) % trackLength;
      timer.update(dist, dt);
    }
    const state2 = timer.getState();
    expect(state2.currentLap).toBe(3);
    expect(state2.bestLapTimeMs).toBeLessThan(lap1Time!);
    expect(state2.bestLapTimeMs).toBe(state2.lastLapTimeMs);
  });
});
