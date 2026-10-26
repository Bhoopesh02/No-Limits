export interface SpringState1D {
  position: number;
  velocity: number;
}

export function clampDeltaTime(dt: number, maxDt = 0.1): number {
  if (dt <= 0 || isNaN(dt)) return 0;
  return dt > maxDt ? maxDt : dt;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculates normalized eased speed (0..1) with quadratic ease-out.
 * Effect is strong early and flattens near top speed.
 */
export function calcEasedSpeed(speed: number, topSpeed: number): number {
  if (topSpeed <= 0) return 0;
  const target = clamp01(speed / topSpeed);
  return 1 - (1 - target) * (1 - target);
}

/**
 * Frame-rate independent exponential smoothing of normalized speed factor.
 */
export function stepSpeedFactor(
  currentFactor: number,
  speed: number,
  topSpeed: number,
  dt: number,
  speedSmooth = 4,
): number {
  if (dt <= 0) return currentFactor;
  const eased = calcEasedSpeed(speed, topSpeed);
  return currentFactor + (eased - currentFactor) * (1 - Math.exp(-speedSmooth * dt));
}

/**
 * Interpolates between two angles in radians along the shortest arc.
 */
export function lerpAngle(fromRad: number, toRad: number, t: number): number {
  const twoPi = Math.PI * 2;
  let diff = (toRad - fromRad) % twoPi;
  diff = ((diff + Math.PI * 3) % twoPi) - Math.PI;
  return fromRad + diff * t;
}

/**
 * Calculates responsive vertical FOV in degrees.
 * When the viewport aspect ratio is narrow (e.g. mobile portrait or split screen),
 * widens the vertical FOV so the car and road remain visible, maintaining
 * at least minHfovDeg horizontal field of view.
 */
export function calcResponsiveVfov(baseVfovDeg: number, aspect: number, minHfovDeg = 75): number {
  if (aspect <= 0) return baseVfovDeg;

  const baseVfovRad = (baseVfovDeg * Math.PI) / 180;
  const currentHfovRad = 2 * Math.atan(aspect * Math.tan(baseVfovRad / 2));
  const minHfovRad = (minHfovDeg * Math.PI) / 180;

  if (currentHfovRad < minHfovRad) {
    // Widen vertical FOV to preserve minimum horizontal FOV
    const neededVfovRad = 2 * Math.atan(Math.tan(minHfovRad / 2) / aspect);
    return (neededVfovRad * 180) / Math.PI;
  }

  return baseVfovDeg;
}

/**
 * Calculates dynamic FOV increase based on vehicle speed.
 * Gives a dynamic sense of speed and motion.
 */
export function calcSpeedFov(
  baseVfovDeg: number,
  speed: number,
  maxSpeed: number,
  maxDeltaDeg = 12,
): number {
  if (maxSpeed <= 0 || speed <= 0) return baseVfovDeg;
  const ratio = Math.min(1, Math.max(0, speed / maxSpeed));
  return baseVfovDeg + ratio * maxDeltaDeg;
}

/**
 * Combined responsive and speed-widened camera FOV.
 */
export function calcCameraFov(
  baseVfovDeg: number,
  aspect: number,
  speed: number,
  maxSpeed: number,
  minHfovDeg = 75,
  maxSpeedDeltaDeg = 12,
): number {
  const responsiveBase = calcResponsiveVfov(baseVfovDeg, aspect, minHfovDeg);
  return calcSpeedFov(responsiveBase, speed, maxSpeed, maxSpeedDeltaDeg);
}

/**
 * Step a 1D damped spring smoothly toward target.
 * Uses semi-implicit Euler integration with clamped dt for absolute numerical stability.
 */
export function stepSpring1D(
  current: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
  maxDt = 0.1,
): SpringState1D {
  const safeDt = clampDeltaTime(dt, maxDt);
  const displacement = target - current;
  const springForce = displacement * stiffness;
  const dampingForce = -velocity * damping;
  const acceleration = springForce + dampingForce;

  const newVelocity = velocity + acceleration * safeDt;
  const newPosition = current + newVelocity * safeDt;

  return {
    position: newPosition,
    velocity: newVelocity,
  };
}
