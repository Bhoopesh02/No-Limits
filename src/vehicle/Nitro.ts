import { clamp } from '../core/clamp';
import { VehicleState } from './VehicleState';

export const MIN_NITRO_FIRE_THRESHOLD = 0.1; // Minimum 10% tank required to fire nitro

/**
 * Updates nitro tank level, active burn duration, and cooldown timer.
 *
 * Mechanics:
 * - Firing requires nitro amount >= MIN_NITRO_FIRE_THRESHOLD and cooldown timer == 0.
 * - While active, consumes fuel over nitroDuration.
 * - When depleted or active time ends, triggers cooldown.
 * - Drifting replenishes nitro at nitroFillRate.
 * - Nitro amount is strictly clamped between 0.0 and 1.0.
 *
 * Performance guarantee:
 * - Mutates state in place.
 * - Zero heap allocations.
 * - Pure and deterministic.
 */
export function updateNitro(
  state: VehicleState,
  wantsNitro: boolean,
  nitroDuration: number,
  nitroCooldown: number,
  nitroFillRate: number,
  maxNitro: number,
  dt: number,
): void {
  if (dt <= 0) return;

  // 1. Advance active cooldown timer if recovering
  if (state.nitroCooldownTimer > 0) {
    state.nitroCooldownTimer -= dt;
    if (state.nitroCooldownTimer <= 0) {
      state.nitroCooldownTimer = 0;
    }
  }

  // 2. Trigger nitro ignition if requested and ready (blocked while speed < 0 or in reverse)
  if (
    wantsNitro &&
    !state.isReversing &&
    state.forwardSpeed >= 0 &&
    state.speed >= 0 &&
    state.nitroActiveTime <= 0 &&
    state.nitroCooldownTimer <= 0 &&
    state.nitroAmount >= MIN_NITRO_FIRE_THRESHOLD
  ) {
    state.nitroActiveTime = nitroDuration * (state.nitroAmount / maxNitro);
  }

  // 3. Process active nitro burn
  if (state.nitroActiveTime > 0) {
    state.nitroActiveTime -= dt;
    const burnRate = 1.0 / Math.max(0.1, nitroDuration);
    state.nitroAmount -= burnRate * dt;

    if (state.nitroAmount <= 0 || state.nitroActiveTime <= 0) {
      state.nitroActiveTime = 0;
      state.nitroAmount = 0;
      state.nitroCooldownTimer = nitroCooldown;
    }
  } else {
    // 4. Refill nitro during active drifts when not currently firing (no growth in reverse)
    if (
      state.isDrifting &&
      !state.isReversing &&
      state.forwardSpeed > 0 &&
      state.nitroAmount < maxNitro
    ) {
      state.nitroAmount += nitroFillRate * dt;
    }

    // HOOK: Slipstream draft filling (Task 9 - AI and Drafting)
  }

  // 5. Ensure strict bounds [0, maxNitro]
  state.nitroAmount = clamp(state.nitroAmount, 0, maxNitro);
}
