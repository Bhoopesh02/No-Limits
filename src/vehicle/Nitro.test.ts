import { beforeEach, describe, expect, it } from 'vitest';
import { updateNitro } from './Nitro';
import { createVehicleState, VehicleState } from './VehicleState';

describe('Nitro', () => {
  let state: VehicleState;
  const duration = 3.5;
  const cooldown = 5.0;
  const fillRate = 0.25;
  const maxNitro = 1.0;
  const dt = 1 / 60;

  beforeEach(() => {
    state = createVehicleState(0, 0, 0, 0, 30.0);
  });

  it('ignites when requested with sufficient fuel and no cooldown', () => {
    state.nitroAmount = 1.0;
    updateNitro(state, true, duration, cooldown, fillRate, maxNitro, dt);

    expect(state.nitroActiveTime).toBeGreaterThan(0);
    expect(state.nitroAmount).toBeLessThan(1.0);
  });

  it('refuses to ignite when fuel is below minimum threshold', () => {
    state.nitroAmount = 0.05;
    updateNitro(state, true, duration, cooldown, fillRate, maxNitro, dt);

    expect(state.nitroActiveTime).toBe(0);
  });

  it('depletes fuel over duration and triggers cooldown upon completion', () => {
    state.nitroAmount = 1.0;
    updateNitro(state, true, duration, cooldown, fillRate, maxNitro, dt);

    // Run until burned out
    const steps = Math.ceil(duration / dt) + 10;
    for (let i = 0; i < steps; i++) {
      updateNitro(state, true, duration, cooldown, fillRate, maxNitro, dt);
    }

    expect(state.nitroActiveTime).toBe(0);
    expect(state.nitroAmount).toBe(0);
    expect(state.nitroCooldownTimer).toBeGreaterThan(0);
  });

  it('prevents re-ignition during active cooldown even if fuel is present', () => {
    state.nitroCooldownTimer = 2.0;
    state.nitroAmount = 1.0;

    updateNitro(state, true, duration, cooldown, fillRate, maxNitro, dt);
    expect(state.nitroActiveTime).toBe(0);
  });

  it('recharges fuel during drift when not burning and respects maximum limit', () => {
    state.nitroAmount = 0.5;
    state.isDrifting = true;

    // 1 second of drift at 0.25 fillRate
    for (let i = 0; i < 60; i++) {
      updateNitro(state, false, duration, cooldown, fillRate, maxNitro, dt);
    }

    expect(state.nitroAmount).toBeCloseTo(0.75, 2);

    // Keep drifting to test cap
    for (let i = 0; i < 200; i++) {
      updateNitro(state, false, duration, cooldown, fillRate, maxNitro, dt);
    }

    expect(state.nitroAmount).toBe(1.0);
  });
});
