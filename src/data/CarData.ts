export interface CarData {
  /** Unique vehicle identifier (e.g. "kaze") */
  id: string;
  /** Human-readable vehicle display name */
  displayName: string;
  /** Vehicle mass in kilograms (kg). Starting value to tune. */
  mass: number;
  /** Top speed in meters per second (m/s). Starting value to tune. */
  topSpeed: number;
  /** Maximum speed when reversing in meters per second (m/s). Starting value to tune. */
  reverseTopSpeed: number;
  /** Backward acceleration in reverse in m/s^2. Starting value to tune. */
  reverseAccel: number;
  /** Distance between front and rear axles in meters (m). Starting value to tune. */
  wheelbase: number;
  /** Peak drive force at the wheels in Newtons (N). Starting value to tune. */
  engineForce: number;
  /** Normalized torque curve across speed buckets from 0 to topSpeed (dimensionless). */
  powerCurve: readonly number[];
  /** Aerodynamic drag coefficient factor (dimensionless). Starting value to tune. */
  drag: number;
  /** Base lateral tire grip acceleration in m/s^2. Starting value to tune. */
  grip: number;
  /** Lateral grip multiplier while drifting (0.0 to 1.0, dimensionless). Starting value to tune. */
  driftGripFactor: number;
  /** Maximum front wheel steering angle at low speed in radians (MAX_ANGLE, ~30 deg). Starting value to tune. */
  maxSteerAngle: number;
  /** Minimum front wheel steering angle at high speed in radians (MIN_ANGLE, ~5 deg). Starting value to tune. */
  minSteerAngle: number;
  /** Steering sign multiplier (+1 or -1). STEER_SIGN constant. */
  steerSign: number;
  /** Steering ramp press rate in units/s. PRESS_RATE constant. */
  steerPressRate: number;
  /** Steering ramp return rate in units/s. RETURN_RATE constant. */
  steerReturnRate: number;
  /** Yaw rate smoothing responsiveness factor in 1/s. YAW_RESPONSE constant. */
  yawResponse: number;
  /** Speed threshold below which heading yaw is suppressed to prevent spinning on spot in m/s. MIN_YAW_SPEED constant. */
  minYawSpeed: number;
  /** Steering sensitivity falloff with speed (dimensionless legacy field). Starting value to tune. */
  steerSpeedFalloff?: number;
  // Uppercase aliases for debug panel / tuning access
  STEER_SIGN?: number;
  PRESS_RATE?: number;
  RETURN_RATE?: number;
  MAX_ANGLE?: number;
  MIN_ANGLE?: number;
  YAW_RESPONSE?: number;
  MIN_YAW_SPEED?: number;
  /** Nitro acceleration strength factor (dimensionless multiplier). Starting value to tune. */
  nitroStrength: number;
  /** Nitro burn duration per full tank in seconds (s). Starting value to tune. */
  nitroDuration: number;
  /** Cooldown time after nitro depletion in seconds (s). Starting value to tune. */
  nitroCooldown: number;
  /** Maximum nitro tank capacity (dimensionless, 0.0 to 1.0). */
  maxNitro: number;
  /** Nitro recharge rate per second while drifting (units: 1/s, e.g. 0.25 = 25%/s). Starting value to tune. */
  nitroFillRate: number;
  /** Extra forward acceleration applied while nitro is active in m/s^2. Starting value to tune. */
  nitroBoostAccel: number;
  /** Top speed multiplier when nitro is active (e.g. 1.15 = 115% of top speed). Starting value to tune. */
  nitroBoostTopSpeed: number;
  /** Minimum lateral slip speed (m/s) required to enter drift mode. Starting value to tune. */
  driftEntrySlip: number;
  /** Lateral slip speed (m/s) below which drift state ends (hysteresis < driftEntrySlip). Starting value to tune. */
  driftExitSlip: number;
  /** Lateral grip multiplier when handbrake is engaged (0.0 to 1.0, dimensionless). Starting value to tune. */
  handbrakeGripFactor: number;
  /** Model asset paths for graphics detail tiers */
  models: { low: string; medium: string; high: string };
  /** Available vehicle paint finishes as hex colors */
  paints: readonly string[];
}

export const STEER_SIGN = 1;
export const PRESS_RATE = 4.0;
export const RETURN_RATE = 7.0;
export const MAX_ANGLE = (30 * Math.PI) / 180; // ~0.5236 rad (30 deg)
export const MIN_ANGLE = (5 * Math.PI) / 180; // ~0.0873 rad (5 deg)
export const YAW_RESPONSE = 12.0;
export const MIN_YAW_SPEED = 1.5;

/**
 * Default parameters for Kaze GT (Japanese sports coupe archetype).
 * Tuned starting values:
 * - 0 to 100 km/h: ~4.1 seconds (engineForce: 9100 N, mass: 1250 kg)
 * - Top speed: 290 km/h (~80.56 m/s)
 * - Handling: high responsiveness with predictable drift entry and catch
 */
export const DEFAULT_CAR_KAZE: CarData = {
  id: 'kaze',
  displayName: 'Kaze GT',
  mass: 1250, // kg
  topSpeed: 290 / 3.6, // 290 km/h in m/s (~80.5556 m/s) - starting value to tune
  reverseTopSpeed: 12, // m/s (~43.2 km/h) - starting value to tune
  reverseAccel: 4.37, // m/s^2 (~60% of launch accel: 0.6 * (9100 / 1250) ≈ 4.37 m/s^2) - starting value to tune
  wheelbase: 2.7, // meters (axles at z = -1.35 and +1.35)
  engineForce: 9100, // Newtons - produces 0-100 km/h in ~4.1s - starting value to tune
  powerCurve: [1.0, 0.95, 0.88, 0.76, 0.62, 0.45], // normalized torque - starting values to tune
  drag: 0.32, // starting value to tune
  grip: 8.5, // m/s^2 - starting value to tune
  driftGripFactor: 0.5, // grip multiplier when drifting - starting value to tune
  maxSteerAngle: MAX_ANGLE, // 30 deg (~0.5236 rad)
  minSteerAngle: MIN_ANGLE, // 5 deg (~0.0873 rad)
  steerSign: STEER_SIGN, // 1
  steerPressRate: PRESS_RATE, // 4.0 / s
  steerReturnRate: RETURN_RATE, // 7.0 / s
  yawResponse: YAW_RESPONSE, // 12.0
  minYawSpeed: MIN_YAW_SPEED, // 1.5 m/s
  steerSpeedFalloff: 0.45, // legacy field
  STEER_SIGN,
  PRESS_RATE,
  RETURN_RATE,
  MAX_ANGLE,
  MIN_ANGLE,
  YAW_RESPONSE,
  MIN_YAW_SPEED,
  nitroStrength: 1.5, // starting value to tune
  nitroDuration: 3.5, // seconds - starting value to tune
  nitroCooldown: 6.0, // seconds - starting value to tune
  maxNitro: 1.0, // normalized capacity
  nitroFillRate: 0.25, // 25% tank per second of drift - starting value to tune
  nitroBoostAccel: 8.5, // m/s^2 extra push - starting value to tune
  nitroBoostTopSpeed: 1.15, // 115% top speed cap - starting value to tune
  driftEntrySlip: 3.0, // m/s sideways slip to trigger drift - starting value to tune
  driftExitSlip: 1.2, // m/s sideways slip to exit drift (hysteresis) - starting value to tune
  handbrakeGripFactor: 0.2, // grip drops to 20% on handbrake - starting value to tune
  models: {
    low: '/assets/cars/kaze/car-kaze-low.glb',
    medium: '/assets/cars/kaze/car-kaze-med.glb',
    high: '/assets/cars/kaze/car-kaze-high.glb',
  },
  paints: ['#3DA5FF', '#FF4D5E', '#FFC933', '#F2F5FA', '#121722'],
};
