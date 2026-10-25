/**
 * Deterministically steps an analog steering value toward target (-1, 0, or 1)
 * over a specified ramp duration per fixed simulation step.
 *
 * @param currentSteer Current steering value in [-1, 1]
 * @param steerLeft Whether the steer left button is held
 * @param steerRight Whether the steer right button is held
 * @param fixedDt Simulation delta time in seconds (e.g. 1/60)
 * @param rampTimeSec Time to reach full deflection in seconds (default ~150 ms = 0.15)
 * @param releaseTimeSec Time to return to center on release in seconds (default ~80 ms = 0.08)
 * @returns Updated steering value in [-1, 1]
 */
export function stepSteeringRamp(
  currentSteer: number,
  steerLeft: boolean,
  steerRight: boolean,
  fixedDt: number,
  rampTimeSec = 0.15,
  releaseTimeSec = 0.08,
): number {
  let target = 0;
  if (steerLeft && !steerRight) {
    target = -1;
  } else if (steerRight && !steerLeft) {
    target = 1;
  }

  if (currentSteer === target) {
    return target;
  }

  // Faster centering on release, smooth ramp when steering into turn
  const isReturningToZero =
    target === 0 || (currentSteer !== 0 && Math.sign(currentSteer) !== Math.sign(target));
  const rate = isReturningToZero ? 1 / releaseTimeSec : 1 / rampTimeSec;
  const maxStep = rate * fixedDt;

  if (currentSteer < target) {
    const next = currentSteer + maxStep;
    return next > target ? target : next;
  } else {
    const next = currentSteer - maxStep;
    return next < target ? target : next;
  }
}
