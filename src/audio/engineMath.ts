import { clamp } from '../core/clamp';

export interface LayerGains {
  idle: number;
  mid: number;
  high: number;
  noise: number;
}

export const IDLE_RPM = 850;
export const REDLINE_RPM = 8000;
export const MAX_RPM = 8350;

// Gear definitions: [minSpeed, maxSpeed, minRpm, maxRpm, upshiftSpeed, downshiftSpeed]
export const GEAR_DATA: readonly [number, number, number, number, number, number][] = [
  // 1: 0..16.5 m/s
  [0, 16.5, 850, 7800, 16.5, 0],
  // 2: 12..29 m/s
  [12, 29, 3100, 7800, 29, 12],
  // 3: 23..43 m/s
  [23, 43, 3300, 7800, 43, 23],
  // 4: 35..58 m/s
  [35, 58, 3600, 7800, 58, 35],
  // 5: 48..71 m/s
  [48, 71, 3900, 7800, 71, 48],
  // 6: 60..86 m/s
  [60, 86, 4200, 8200, 999, 60],
];

/**
 * Pure calculation: Determine current gear with shift hysteresis.
 */
export function calculateGear(speed: number, currentGear: number, isReversing: boolean): number {
  if (isReversing || speed < -0.2) return -1;
  const absSpeed = Math.abs(speed);
  if (absSpeed < 0.2) return 1;

  let gear = clamp(currentGear, 1, 6);
  const data = GEAR_DATA[gear - 1];

  // Upshift check
  if (gear < 6 && absSpeed >= data[4]) {
    gear++;
  }
  // Downshift check
  else if (gear > 1 && absSpeed <= data[5]) {
    gear--;
  }

  return gear;
}

/**
 * Pure calculation: Target RPM from vehicle speed, gear, and throttle.
 */
export function calculateTargetRpm(speed: number, throttle: number, gear: number): number {
  const absSpeed = Math.abs(speed);

  // Reverse gear
  if (gear === -1) {
    const t = clamp(absSpeed / 12, 0, 1);
    return IDLE_RPM + t * 4500;
  }

  // Stationary launch / burnout
  if (absSpeed < 1.5) {
    if (throttle > 0.05) {
      return IDLE_RPM + throttle * 4800;
    }
    return IDLE_RPM;
  }

  // In forward gear
  const gIndex = clamp(gear - 1, 0, 5);
  const [minSpd, maxSpd, minR, maxR] = GEAR_DATA[gIndex];
  const t = clamp((absSpeed - minSpd) / (maxSpd - minSpd), 0, 1);
  return minR + t * (maxR - minR);
}

/**
 * Pure calculation: Engine firing fundamental frequency for a 6-cylinder 4-stroke engine.
 */
export function calculateFundamentalFrequency(rpm: number, cylinders = 6): number {
  return (Math.max(100, rpm) / 60) * (cylinders / 2);
}

/**
 * Pure calculation: Multi-layer crossfading gains based on RPM and throttle.
 */
export function calculateLayerGains(rpm: number, throttle = 0): LayerGains {
  const clampedRpm = clamp(rpm, IDLE_RPM, MAX_RPM);

  // 1. Idle layer: 1.0 below 1200 RPM, decays to 0 at 2800 RPM
  let idle = 0;
  if (clampedRpm <= 1200) {
    idle = 1.0;
  } else if (clampedRpm < 2800) {
    idle = 1.0 - (clampedRpm - 1200) / 1600;
  }

  // 2. Mid layer: rises from 1600 (0.0) to 3800 (1.0), plateaus to 5500, fades by 7500
  let mid = 0;
  if (clampedRpm >= 1600 && clampedRpm < 3800) {
    mid = (clampedRpm - 1600) / 2200;
  } else if (clampedRpm >= 3800 && clampedRpm <= 5500) {
    mid = 1.0;
  } else if (clampedRpm > 5500 && clampedRpm < 7500) {
    mid = 1.0 - (clampedRpm - 5500) / 2000;
  }

  // 3. High screamer layer: fades in at 4200 (0.0), hits 1.0 at 7000+
  let high = 0;
  if (clampedRpm >= 4200) {
    high = clamp((clampedRpm - 4200) / 2800, 0, 1.0);
  }

  // 4. Induction noise: proportional to throttle and RPM
  const normRpm = (clampedRpm - IDLE_RPM) / (REDLINE_RPM - IDLE_RPM);
  const noise = clamp(throttle, 0, 1) * (0.15 + 0.35 * normRpm);

  return { idle, mid, high, noise };
}
