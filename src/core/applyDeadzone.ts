/**
 * Applies a deadzone to an input value and rescales the remaining range
 * to [0, 1] (or [-1, 1] for signed inputs) so there is no discontinuity at the edge.
 *
 * @param value Raw input value between -1 and 1
 * @param deadzone Deadzone threshold (default 0.15)
 * @returns Rescaled value between -1 and 1
 */
export function applyDeadzone(value: number, deadzone = 0.15): number {
  const abs = Math.abs(value);
  if (abs <= deadzone) {
    return 0;
  }
  const scaled = (abs - deadzone) / (1 - deadzone);
  const clamped = scaled > 1 ? 1 : scaled;
  return value < 0 ? -clamped : clamped;
}
