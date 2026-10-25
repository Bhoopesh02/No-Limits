export type SpeedUnit = 'km/h' | 'mph';

export const KMH_TO_MPH_FACTOR = 0.621371192237334;

export function convertSpeed(speedKmh: number, targetUnit: SpeedUnit): number {
  if (targetUnit === 'km/h') {
    return Math.round(speedKmh);
  }
  return Math.round(speedKmh * KMH_TO_MPH_FACTOR);
}
