import { describe, expect, it } from 'vitest';
import { createInputState } from '../data/InputState';
import { createTouchControlState } from '../data/TouchControlState';
import { TouchInput } from './TouchInput';

describe('TouchInput', () => {
  it('maps button states to InputState with digital throttle and brake', () => {
    const touchState = createTouchControlState();
    touchState.throttle = true;
    touchState.nitro = true;
    touchState.handbrake = true;

    const provider = new TouchInput(touchState, 1 / 60);
    const outState = createInputState();

    provider.poll(outState);
    expect(outState.throttle).toBe(1.0);
    expect(outState.brake).toBe(0.0);
    expect(outState.nitro).toBe(true);
    expect(outState.handbrake).toBe(true);
  });

  it('progressively ramps steering over consecutive simulation ticks', () => {
    const touchState = createTouchControlState();
    touchState.steerRight = true;

    const provider = new TouchInput(touchState, 1 / 60);
    const outState = createInputState();

    // First tick
    provider.poll(outState);
    expect(outState.steer).toBeGreaterThan(0);
    expect(outState.steer).toBeLessThan(0.3);

    // After 9 ticks (~150 ms at 60 Hz)
    for (let i = 0; i < 9; i++) {
      provider.poll(outState);
    }
    expect(outState.steer).toBeCloseTo(1.0, 1);

    // Release steering
    touchState.steerRight = false;
    for (let i = 0; i < 5; i++) {
      provider.poll(outState);
    }
    expect(outState.steer).toBe(0);
  });
});
