import { describe, expect, it } from 'vitest';
import { createTouchControlState, resetTouchControlState } from './TouchControlState';

describe('TouchControlState', () => {
  it('initializes all fields to false', () => {
    const state = createTouchControlState();
    expect(state.steerLeft).toBe(false);
    expect(state.steerRight).toBe(false);
    expect(state.throttle).toBe(false);
    expect(state.brake).toBe(false);
    expect(state.nitro).toBe(false);
    expect(state.handbrake).toBe(false);
  });

  it('resets all fields back to false in place', () => {
    const state = createTouchControlState();
    state.steerLeft = true;
    state.steerRight = true;
    state.throttle = true;
    state.brake = true;
    state.nitro = true;
    state.handbrake = true;

    resetTouchControlState(state);
    expect(state.steerLeft).toBe(false);
    expect(state.steerRight).toBe(false);
    expect(state.throttle).toBe(false);
    expect(state.brake).toBe(false);
    expect(state.nitro).toBe(false);
    expect(state.handbrake).toBe(false);
  });
});
