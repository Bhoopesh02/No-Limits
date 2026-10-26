export interface CarStatLimit {
  readonly min: number;
  readonly max: number;
}

/**
 * Universal limits for upgradable car stats to prevent any upgrade tier
 * from breaking simulation stability or game balance.
 */
export const CAR_STAT_LIMITS: Record<string, CarStatLimit> = {
  topSpeed: { min: 40.0, max: 450.0 / 3.6 }, // 40 m/s (~144 km/h) to 450 km/h (125 m/s)
  reverseTopSpeed: { min: 4.0, max: 35.0 }, // m/s
  reverseAccel: { min: 1.0, max: 20.0 }, // m/s^2
  mass: { min: 800.0, max: 2500.0 }, // kg
  engineForce: { min: 4000.0, max: 25000.0 }, // N
  grip: { min: 3.0, max: 20.0 }, // m/s^2
  driftGripFactor: { min: 0.1, max: 0.95 },
  maxSteerAngle: { min: 0.2, max: 0.8 }, // radians (~11.5 deg to 45.8 deg)
  nitroStrength: { min: 1.0, max: 3.0 },
  nitroDuration: { min: 1.5, max: 8.0 }, // seconds
  nitroCooldown: { min: 2.0, max: 15.0 }, // seconds
  nitroBoostAccel: { min: 2.0, max: 25.0 }, // m/s^2
  nitroBoostTopSpeed: { min: 1.05, max: 1.4 },
};

/**
 * Clamps a numerical car stat to its configured safe ceiling and floor.
 * Note: Pure Math implementation to strictly abide by module boundary rules (data imports nothing).
 */
export function clampCarStat(key: string, value: number): number {
  const limit = CAR_STAT_LIMITS[key];
  if (!limit) {
    return value;
  }
  return Math.min(Math.max(value, limit.min), limit.max);
}
