import { VehicleState } from './VehicleState';

/**
 * Calculates vehicle slip angle (radians) between velocity vector and chassis heading.
 * slipAngle = atan2(lateralSpeed, forwardSpeed)
 */
export function calculateSlipAngle(lateralSpeed: number, forwardSpeed: number): number {
  const safeForward = Math.max(0.1, Math.abs(forwardSpeed));
  return Math.abs(Math.atan2(lateralSpeed, safeForward));
}

/**
 * Updates vehicle drift state and accumulates drift score based on slip angle and speed.
 * Uses hysteresis (entrySlipThreshold > exitSlipThreshold) to eliminate flickering around limits.
 *
 * Performance guarantee:
 * - Mutates state in place.
 * - Zero heap allocations.
 * - Pure and deterministic.
 */
export function updateDriftScore(
  state: VehicleState,
  entrySlipThreshold: number,
  exitSlipThreshold: number,
  dt: number,
): void {
  if (dt <= 0) return;

  const absLateral = Math.abs(state.lateralSpeed);

  // Hysteresis threshold check (drift only forward)
  if (!state.isDrifting) {
    if (absLateral >= entrySlipThreshold && state.forwardSpeed > 3.0 && !state.isReversing) {
      state.isDrifting = true;
      state.driftTime = 0;
      state.driftScore = 0;
      state.driftMultiplier = 1.0;
    }
  } else {
    if (absLateral < exitSlipThreshold || state.forwardSpeed < 1.0 || state.isReversing) {
      state.isDrifting = false;
      state.driftTime = 0;
      state.driftScore = 0;
      state.driftMultiplier = 1.0;
    }
  }

  // Accumulate drift score while drifting (guaranteeing forward motion only)
  if (state.isDrifting && !state.isReversing && state.forwardSpeed > 0) {
    state.driftTime += dt;
    // Multiplier rises for each whole second sustained (+1x per second, starting at 1.0)
    state.driftMultiplier = 1.0 + Math.floor(state.driftTime);

    const slipAngle = calculateSlipAngle(state.lateralSpeed, state.forwardSpeed);
    // Score formula from Plan section 7: slipAngle * speed * dt (scaled by 100 for integer-like arcade points)
    const pointsDelta = slipAngle * Math.max(0, state.speed) * state.driftMultiplier * 100.0 * dt;
    state.driftScore += pointsDelta;
  }
}
