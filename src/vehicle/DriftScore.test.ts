import { beforeEach, describe, expect, it } from 'vitest';
import { calculateSlipAngle, updateDriftScore } from './DriftScore';
import { createVehicleState, VehicleState } from './VehicleState';

describe('DriftScore', () => {
  let state: VehicleState;
  const entrySlip = 3.0;
  const exitSlip = 1.2;
  const dt = 1 / 60;

  beforeEach(() => {
    state = createVehicleState(0, 0, 0, 0, 30.0);
  });

  it('calculates slip angle correctly', () => {
    expect(calculateSlipAngle(0, 20)).toBe(0);
    expect(calculateSlipAngle(10, 10)).toBeCloseTo(Math.PI / 4, 3);
  });

  it('enters drift when lateral speed exceeds entry threshold at speed', () => {
    state.lateralSpeed = 3.5;
    updateDriftScore(state, entrySlip, exitSlip, dt);

    expect(state.isDrifting).toBe(true);
    expect(state.driftMultiplier).toBe(1.0);
    expect(state.driftScore).toBeGreaterThan(0);
  });

  it('maintains drift due to hysteresis when lateral speed is between exit and entry thresholds', () => {
    // Enter drift
    state.lateralSpeed = 3.5;
    updateDriftScore(state, entrySlip, exitSlip, dt);
    expect(state.isDrifting).toBe(true);

    // Drop into hysteresis zone (e.g. 2.0 m/s: between 1.2 and 3.0)
    state.lateralSpeed = 2.0;
    updateDriftScore(state, entrySlip, exitSlip, dt);
    expect(state.isDrifting).toBe(true);
    expect(state.driftScore).toBeGreaterThan(0);
  });

  it('exits drift and resets score when lateral speed falls below exit threshold', () => {
    state.lateralSpeed = 3.5;
    updateDriftScore(state, entrySlip, exitSlip, dt);
    expect(state.isDrifting).toBe(true);

    // Fall below exit threshold
    state.lateralSpeed = 1.0;
    updateDriftScore(state, entrySlip, exitSlip, dt);
    expect(state.isDrifting).toBe(false);
    expect(state.driftScore).toBe(0);
    expect(state.driftMultiplier).toBe(1.0);
  });

  it('increases multiplier for each whole second sustained', () => {
    state.lateralSpeed = 4.0;

    // Simulate 2.5 seconds
    for (let i = 0; i < 150; i++) {
      updateDriftScore(state, entrySlip, exitSlip, dt);
    }

    // At 2.5s, 1.0 + floor(2.5) = 3.0
    expect(state.driftMultiplier).toBe(3.0);
  });
});
