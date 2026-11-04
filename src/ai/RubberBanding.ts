import { clamp } from '../core/clamp';
import { AI_RUBBER_BAND_MAX_SCALE, AI_RUBBER_BAND_RANGE_METERS } from './AiTuning';

/**
 * Computes a target speed multiplier based on the distance gap between AI and player.
 *
 * @param gapMeters AI race progress in meters minus player race progress in meters.
 *                  gap > 0: AI is ahead of player -> scale down (up to -8%).
 *                  gap < 0: AI is behind player -> scale up (up to +8%).
 * @param maxScale Maximum scaling effect (defaults to AI_RUBBER_BAND_MAX_SCALE).
 * @param rangeMeters Transition distance range (defaults to AI_RUBBER_BAND_RANGE_METERS).
 * @returns Multiplier for AI target speed (in range [1 - maxScale, 1 + maxScale]).
 */
export function computeRubberBandMultiplier(
  gapMeters: number,
  maxScale = AI_RUBBER_BAND_MAX_SCALE,
  rangeMeters = AI_RUBBER_BAND_RANGE_METERS,
): number {
  if (rangeMeters <= 0 || maxScale <= 0) {
    return 1.0;
  }

  // Normalized ratio in [-1, 1]
  const normalizedGap = clamp(gapMeters / rangeMeters, -1.0, 1.0);

  // Smooth S-curve (cubic hermite) maintaining sign
  const sign = Math.sign(normalizedGap);
  const absRatio = Math.abs(normalizedGap);
  const smooth = absRatio * absRatio * (3 - 2 * absRatio);

  return 1.0 - sign * smooth * maxScale;
}
