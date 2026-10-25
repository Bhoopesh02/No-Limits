export interface CarData {
  /** Unique vehicle identifier (e.g. "kaze") */
  id: string;
  /** Human-readable vehicle display name */
  displayName: string;
  /** Vehicle mass in kilograms (kg). Starting value to tune. */
  mass: number;
  /** Top speed in meters per second (m/s). Starting value to tune. */
  topSpeed: number;
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
  /** Maximum front wheel steering angle in radians (rad). Starting value to tune. */
  maxSteerAngle: number;
  /** Steering sensitivity falloff with speed (dimensionless). Starting value to tune. */
  steerSpeedFalloff: number;
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
  wheelbase: 2.65, // meters - starting value to tune
  engineForce: 9100, // Newtons - produces 0-100 km/h in ~4.1s - starting value to tune
  powerCurve: [1.0, 0.95, 0.88, 0.76, 0.62, 0.45], // normalized torque - starting values to tune
  drag: 0.32, // starting value to tune
  grip: 8.5, // m/s^2 - starting value to tune
  driftGripFactor: 0.5, // grip multiplier when drifting - starting value to tune
  maxSteerAngle: 0.55, // ~31.5 degrees in radians - starting value to tune
  steerSpeedFalloff: 0.45, // starting value to tune
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
